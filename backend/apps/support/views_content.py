"""
Content views — site content, clip thumbnails, system status, maintenance.
"""
import logging
import urllib.request
import urllib.error
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from .models import SiteContent, ClipThumbnail
from .views_shared import check_admin, _get_maintenance_mode, _auto_trigger_maintenance

logger = logging.getLogger(__name__)

# ── Site Content defaults ────────────────────────────────────────────────────

DEFAULT_SITE_CONTENT = {
    'hero': {
        'badge': 'มีร้านค้าใช้งานแล้ว 1,000+ ร้าน',
        'title_line1': 'สร้างคลิปขายของ',
        'title_accent': 'TikTok อัตโนมัติ',
        'title_sub': 'ด้วย AI ใน 60 วินาที',
        'desc': 'ใส่สินค้า → AI เขียนสคริปต์ + พากย์เสียง + ตัดต่อวิดีโอให้อัตโนมัติ\nไม่ต้องมีทักษะตัดต่อ · ไม่ต้องจ้างช่างวิดีโอ',
        'cta_primary': 'สมัครฟรี — ลองสร้าง 1 คลิป',
        'cta_secondary': 'เข้าระบบสร้างคลิป →',
        'note': '✓ ฟรี 1 คลิปแรก · ✓ ไม่ต้องบัตรเครดิต · ✓ เริ่มได้ทันที',
    },
    'stats': [
        {'value': '1,000+', 'label': 'ร้านค้าใช้งาน'},
        {'value': '50,000+', 'label': 'คลิปที่สร้างแล้ว'},
        {'value': '< 1 นาที', 'label': 'เวลาสร้างคลิป'},
        {'value': '4.9 ★', 'label': 'คะแนนความพึงพอใจ'},
    ],
    'deals': [],
    'articles': [],
    'pricing': [],
    'testimonials': [],
}


class PublicSiteContentView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        result = {}
        for key, default in DEFAULT_SITE_CONTENT.items():
            try:
                obj = SiteContent.objects.get(key=key)
                result[key] = obj.content
            except SiteContent.DoesNotExist:
                result[key] = default
        return Response(result)


class AdminSiteContentView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        result = {}
        for key, default in DEFAULT_SITE_CONTENT.items():
            try:
                obj = SiteContent.objects.get(key=key)
                result[key] = {'content': obj.content, 'updated_at': obj.updated_at.isoformat(), 'is_custom': True}
            except SiteContent.DoesNotExist:
                result[key] = {'content': default, 'updated_at': None, 'is_custom': False}
        return Response(result)

    def put(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        key = request.data.get('key', '').strip()
        content = request.data.get('content')
        if not key or key not in DEFAULT_SITE_CONTENT:
            return Response({'detail': f'key ต้องเป็น: {", ".join(DEFAULT_SITE_CONTENT)}'}, status=400)
        if content is None:
            return Response({'detail': 'ต้องระบุ content'}, status=400)
        obj, _ = SiteContent.objects.update_or_create(key=key, defaults={'content': content})
        return Response({'detail': 'บันทึกสำเร็จ', 'key': key, 'updated_at': obj.updated_at.isoformat()})

    def delete(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        key = request.data.get('key', '').strip()
        if not key or key not in DEFAULT_SITE_CONTENT:
            return Response({'detail': 'key ไม่ถูกต้อง'}, status=400)
        SiteContent.objects.filter(key=key).delete()
        return Response({'detail': f'{key} รีเซ็ตเป็นค่าเริ่มต้นแล้ว'})


# ── Clip Thumbnails ──────────────────────────────────────────────────────────

def _thumbnail_url(image_path):
    return f"{settings.SITE_URL}/media/{image_path}"


class PublicClipThumbnailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        items = ClipThumbnail.objects.all()
        return Response([{
            'id': t.id, 'file_url': _thumbnail_url(t.image_path),
            'file_type': t.file_type, 'title': t.title,
            'category': t.category, 'order': t.order,
        } for t in items])


class AdminClipThumbnailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        items = ClipThumbnail.objects.all()
        return Response([{
            'id': t.id, 'file_url': _thumbnail_url(t.image_path),
            'file_type': t.file_type, 'title': t.title,
            'category': t.category, 'order': t.order,
            'created_at': t.created_at.isoformat(),
        } for t in items])

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        upload = request.FILES.get('image')
        if not upload:
            return Response({'detail': 'ต้องแนบไฟล์'}, status=400)

        ct = upload.content_type or ''
        if ct.startswith('video/'):
            file_type = 'video'
        elif ct.startswith('image/'):
            file_type = 'image'
        else:
            return Response({'detail': 'รองรับเฉพาะวิดีโอและรูปภาพ'}, status=400)

        import uuid
        ext = Path(upload.name).suffix.lower() or ('.mp4' if file_type == 'video' else '.jpg')
        filename = f"{uuid.uuid4().hex}{ext}"
        dest_dir = Path(settings.MEDIA_ROOT) / 'clip_thumbnails'
        dest_dir.mkdir(parents=True, exist_ok=True)
        with open(dest_dir / filename, 'wb') as f:
            for chunk in upload.chunks():
                f.write(chunk)

        image_path = f'clip_thumbnails/{filename}'
        t = ClipThumbnail.objects.create(
            image_path=image_path, file_type=file_type,
            title=request.data.get('title', '').strip(),
            category=request.data.get('category', '').strip(),
            order=int(request.data.get('order', 0) or 0),
        )
        return Response({'id': t.id, 'file_url': _thumbnail_url(t.image_path), 'file_type': t.file_type, 'title': t.title}, status=201)

    def delete(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        tid = request.data.get('id')
        if not tid:
            return Response({'detail': 'ต้องระบุ id'}, status=400)
        try:
            t = ClipThumbnail.objects.get(id=tid)
            try:
                fp = Path(settings.MEDIA_ROOT) / t.image_path
                if fp.exists():
                    fp.unlink()
            except Exception:
                pass
            t.delete()
            return Response({'detail': 'ลบสำเร็จ'})
        except ClipThumbnail.DoesNotExist:
            return Response({'detail': 'ไม่พบ thumbnail'}, status=404)


# ── System Status & Maintenance ──────────────────────────────────────────────

class SystemStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'maintenance': _get_maintenance_mode()})


class AdminMaintenanceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        obj = SiteContent.objects.filter(key='system_settings').first()
        content = obj.content if obj else {}
        return Response({
            'maintenance': _get_maintenance_mode(),
            'auto': bool(content.get('maintenance_auto', False)),
            'reason': content.get('maintenance_reason', ''),
            'triggered_at': content.get('maintenance_triggered_at', ''),
        })

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        value = bool(request.data.get('maintenance', True))
        obj, _ = SiteContent.objects.get_or_create(key='system_settings', defaults={'content': {}})
        obj.content = {**obj.content, 'maintenance': value, 'maintenance_auto': False,
                       'maintenance_reason': '', 'maintenance_triggered_at': ''}
        obj.save()
        return Response({'maintenance': value, 'auto': False})


# ── Admin Credits (API key status) ───────────────────────────────────────────

class AdminCreditsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        result = {}

        # OpenAI
        openai_key = getattr(settings, 'OPENAI_API_KEY', '')
        if openai_key:
            try:
                req = urllib.request.Request('https://api.openai.com/v1/models',
                                             headers={'Authorization': f'Bearer {openai_key}'})
                with urllib.request.urlopen(req, timeout=8):
                    pass
                result['openai'] = {'status': 'ok', 'key_valid': True}
            except urllib.error.HTTPError as e:
                result['openai'] = {'status': 'error', 'key_valid': e.code != 401, 'detail': f'HTTP {e.code}'}
            except Exception as e:
                result['openai'] = {'status': 'error', 'key_valid': False, 'detail': str(e)}
        else:
            result['openai'] = {'status': 'error', 'key_valid': False, 'detail': 'OPENAI_API_KEY ไม่ได้ตั้งค่า'}

        # Fal.ai
        fal_key = getattr(settings, 'FAL_KEY', '')
        if fal_key:
            try:
                req = urllib.request.Request('https://fal.run/health',
                                             headers={'Authorization': f'Key {fal_key}'})
                with urllib.request.urlopen(req, timeout=8):
                    pass
                result['fal'] = {'status': 'ok', 'key_valid': True}
            except urllib.error.HTTPError as e:
                result['fal'] = {'status': 'error' if e.code == 401 else 'ok',
                                  'key_valid': e.code != 401, 'detail': f'HTTP {e.code}'}
            except Exception as e:
                result['fal'] = {'status': 'error', 'key_valid': False, 'detail': str(e)}
        else:
            result['fal'] = {'status': 'error', 'key_valid': False, 'detail': 'FAL_KEY ไม่ได้ตั้งค่า'}

        # Gemini
        gemini_key = getattr(settings, 'GEMINI_API_KEY', '')
        if gemini_key:
            try:
                req_g = urllib.request.Request(
                    f'https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}')
                with urllib.request.urlopen(req_g, timeout=6):
                    result['gemini'] = {'status': 'active', 'key_valid': True, 'model': 'gemini-2.0-flash'}
            except urllib.error.HTTPError as e:
                result['gemini'] = {'status': 'error', 'key_valid': False, 'detail': f'HTTP {e.code}'}
            except Exception:
                result['gemini'] = {'status': 'active', 'key_valid': True, 'model': 'gemini-2.0-flash'}
        else:
            result['gemini'] = {'status': 'error', 'key_valid': False, 'detail': 'GEMINI_API_KEY ไม่ได้ตั้งค่า'}

        # Botnoi
        botnoi_key = getattr(settings, 'BOTNOI_API_KEY', '')
        result['botnoi'] = {'status': 'ok' if botnoi_key else 'error',
                            'key_valid': bool(botnoi_key),
                            'detail': '' if botnoi_key else 'BOTNOI_API_KEY ไม่ได้ตั้งค่า'}

        return Response(result)


# ── Demo Clips ────────────────────────────────────────────────────────────────

class AdminDemoClipView(APIView):
    permission_classes = [permissions.AllowAny]
    SLOTS = ['urgent', 'review', 'drama', 'unbox']

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        result = {}
        for slot in self.SLOTS:
            path = settings.MEDIA_ROOT / 'demos' / f'{slot}.mp4'
            if path.exists():
                stat = path.stat()
                result[slot] = {'exists': True, 'size_kb': stat.st_size // 1024,
                                 'updated_ts': stat.st_mtime, 'url': f'/media/demos/{slot}.mp4'}
            else:
                result[slot] = {'exists': False}
        return Response(result)

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        slot = request.data.get('slot', '').strip()
        file = request.FILES.get('file')
        if slot not in self.SLOTS:
            return Response({'detail': f'slot ต้องเป็น: {", ".join(self.SLOTS)}'}, status=400)
        if not file:
            return Response({'detail': 'กรุณาแนบไฟล์ video/mp4'}, status=400)
        if not file.name.lower().endswith('.mp4'):
            return Response({'detail': 'ไฟล์ต้องเป็น .mp4 เท่านั้น'}, status=400)

        dest = settings.MEDIA_ROOT / 'demos' / f'{slot}.mp4'
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        stat = dest.stat()
        return Response({'detail': 'อัปโหลดสำเร็จ', 'slot': slot,
                         'size_kb': stat.st_size // 1024, 'url': f'/media/demos/{slot}.mp4'})
