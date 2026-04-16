"""
Order & payment views — admin order management and payment settings.
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.db import transaction
from django.db.models import F
from .models import SiteContent
from .views_shared import check_admin

logger = logging.getLogger(__name__)


class AdminDashboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        from django.utils import timezone
        from apps.users.models import User
        from apps.projects.models import Project
        from apps.video_engine.models import VideoOutput
        from .models import ChatSession

        today = timezone.now().date()

        failed_qs = (
            Project.objects
            .select_related('render_job', 'user')
            .filter(status='failed')
            .order_by('-created_at')[:5]
        )
        recent_failures = []
        for p in failed_qs:
            err = getattr(getattr(p, 'render_job', None), 'error', '') or ''
            recent_failures.append({
                'id': p.id, 'product': p.product_name,
                'user': p.user.email, 'error': err[:200],
                'created_at': p.created_at.strftime('%d/%m %H:%M'),
            })

        return Response({
            'users_total': User.objects.count(),
            'users_today': User.objects.filter(created_at__date=today).count(),
            'projects_total': Project.objects.count(),
            'projects_today': Project.objects.filter(created_at__date=today).count(),
            'videos_total': VideoOutput.objects.count(),
            'chats_total': ChatSession.objects.count(),
            'chats_unread': ChatSession.objects.filter(admin_unread__gt=0).count(),
            'chats_escalated': ChatSession.objects.filter(human_takeover=True).count(),
            'projects_by_status': {
                s: Project.objects.filter(status=s).count()
                for s in ['done', 'failed', 'generating_video', 'awaiting_script_approval', 'generating_script']
            },
            'recent_failures': recent_failures,
        })


class AdminOrderListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        from apps.billing.models import CreditOrder

        status_filter = request.query_params.get('status', 'pending')
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = 50
        offset = (page - 1) * page_size

        qs = CreditOrder.objects.select_related('user')
        if status_filter != 'all':
            qs = qs.filter(status=status_filter)
        qs = qs.order_by('-created_at')

        total = qs.count()
        result = []
        for o in qs[offset:offset + page_size]:
            slip_url = None
            if o.slip_image:
                try:
                    slip_url = request.build_absolute_uri(o.slip_image.url)
                except Exception:
                    pass
            result.append({
                'id': o.id,
                'user_email': o.user.email,
                'user_name': getattr(o.user, 'name', '') or o.user.email,
                'user_credits': o.user.credits,
                'package': o.package,
                'credits': o.credits,
                'amount': o.amount,
                'status': o.status,
                'admin_note': o.admin_note,
                'slip_url': slip_url,
                'created_at': o.created_at.strftime('%d %b %Y %H:%M'),
            })

        return Response({
            'results': result,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_next': (offset + page_size) < total,
        })


class AdminOrderActionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        from apps.billing.models import CreditOrder
        from apps.users.models import User

        try:
            order = CreditOrder.objects.select_related('user').get(pk=pk)
        except CreditOrder.DoesNotExist:
            return Response({'detail': 'ไม่พบ order'}, status=404)

        if order.status != 'pending':
            return Response({'detail': f'order นี้ดำเนินการแล้ว ({order.status})'}, status=400)

        action = request.data.get('action')
        note = str(request.data.get('note', '')).strip()

        if action == 'approve':
            with transaction.atomic():
                order.status = 'approved'
                order.admin_note = note
                order.save(update_fields=['status', 'admin_note'])
                # Atomic credit addition — prevent race condition
                User.objects.filter(pk=order.user_id).update(credits=F('credits') + order.credits)
                order.refresh_from_db(fields=[])  # refresh user for response
                updated_user = User.objects.get(pk=order.user_id)
            return Response({
                'detail': f'อนุมัติแล้ว — เพิ่ม {order.credits} เครดิตให้ {order.user.email} (รวม {updated_user.credits})',
            })

        elif action == 'reject':
            order.status = 'rejected'
            order.admin_note = note or 'สลิปไม่ถูกต้อง'
            order.save(update_fields=['status', 'admin_note'])
            return Response({'detail': f'ปฏิเสธ order #{pk}'})

        else:
            return Response({'detail': 'action ต้องเป็น approve หรือ reject'}, status=400)


class AdminPaymentSettingsView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            obj = SiteContent.objects.get(key='payment_settings')
            return Response(obj.content or {})
        except SiteContent.DoesNotExist:
            return Response({
                'bank_name': 'ธนาคารออมสิน (GSB)',
                'account': '020 481 751 756',
                'account_name': 'นางสาวพัทธนันท์ ป้อมสุวรรณ',
                'qr_url': None,
            })

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        try:
            obj = SiteContent.objects.get(key='payment_settings')
            existing = obj.content or {}
        except SiteContent.DoesNotExist:
            obj = None
            existing = {}

        qr_url = existing.get('qr_url')
        qr_file = request.FILES.get('qr_image')
        if qr_file:
            import os as _os
            qr_dir = _os.path.join(settings.MEDIA_ROOT, 'payment')
            _os.makedirs(qr_dir, exist_ok=True)
            qr_path = _os.path.join(qr_dir, 'qr_code.png')
            with open(qr_path, 'wb') as f:
                for chunk in qr_file.chunks():
                    f.write(chunk)
            qr_url = settings.MEDIA_URL.rstrip('/') + '/payment/qr_code.png'

        content = {
            'bank_name': request.data.get('bank_name', existing.get('bank_name', 'ธนาคารออมสิน (GSB)')),
            'account': request.data.get('account', existing.get('account', '020 481 751 756')),
            'account_name': request.data.get('account_name', existing.get('account_name', 'นางสาวพัทธนันท์ ป้อมสุวรรณ')),
            'qr_url': qr_url,
        }

        if obj:
            obj.content = content
            obj.save(update_fields=['content'])
        else:
            SiteContent.objects.create(key='payment_settings', content=content)

        return Response({'detail': 'บันทึกสำเร็จ'})
