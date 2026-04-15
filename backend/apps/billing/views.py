import os
from django.conf import settings as django_settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Subscription, UsageLog, CreditOrder, CREDIT_PACKAGES


class BillingStatusView(APIView):
    def get(self, request):
        user = request.user
        data = {
            'plan': user.plan,
            'credits': user.credits,
        }
        try:
            sub = user.subscription
            data['subscription'] = {
                'status': sub.status,
                'end_date': sub.end_date,
            }
        except Subscription.DoesNotExist:
            data['subscription'] = None

        usage = UsageLog.objects.filter(user=user).order_by('-created_at')[:10]
        data['recent_usage'] = [
            {'action': u.action, 'credits_used': u.credits_used, 'created_at': u.created_at}
            for u in usage
        ]
        return Response(data)


class CreditOrderView(APIView):
    """User: create order (POST) or list own orders (GET)."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        orders = CreditOrder.objects.filter(user=request.user)
        return Response([_serialize_order(o, request) for o in orders])

    def post(self, request):
        package = str(request.data.get('package', '')).strip()
        if package not in CREDIT_PACKAGES:
            return Response({'detail': 'package ต้องเป็น 1 หรือ 5'}, status=status.HTTP_400_BAD_REQUEST)

        slip = request.FILES.get('slip_image')
        if not slip:
            return Response({'detail': 'กรุณาแนบสลิปโอนเงิน'}, status=status.HTTP_400_BAD_REQUEST)

        pkg = CREDIT_PACKAGES[package]
        order = CreditOrder.objects.create(
            user=request.user,
            package=package,
            credits=pkg['credits'],
            amount=pkg['amount'],
            slip_image=slip,
        )
        return Response(
            {'id': order.id, 'status': 'pending', 'detail': 'ส่งสลิปเรียบร้อย — รอแอดมินตรวจสอบภายใน 24 ชั่วโมง'},
            status=status.HTTP_201_CREATED,
        )


class PublicPaymentSettingsView(APIView):
    """Public — returns bank details + QR URL for the topup page."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        from apps.support.models import SiteContent
        try:
            obj = SiteContent.objects.get(key='payment_settings')
            data = obj.content or {}
        except SiteContent.DoesNotExist:
            data = {}
        return Response({
            'bank_name': data.get('bank_name', 'ธนาคารออมสิน (GSB)'),
            'account': data.get('account', '020 481 751 756'),
            'account_name': data.get('account_name', 'นางสาวพัทธนันท์ ป้อมสุวรรณ'),
            'qr_url': data.get('qr_url') or None,
        })


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _serialize_order(o, request):
    slip_url = None
    if o.slip_image:
        try:
            slip_url = request.build_absolute_uri(o.slip_image.url)
        except Exception:
            pass
    return {
        'id': o.id,
        'package': o.package,
        'credits': o.credits,
        'amount': o.amount,
        'status': o.status,
        'admin_note': o.admin_note,
        'slip_url': slip_url,
        'created_at': o.created_at.strftime('%d %b %Y %H:%M'),
    }
