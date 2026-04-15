from django.conf import settings
from apps.support.views import _get_maintenance_mode
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Project, ProductImage, GeneratedImage
from .serializers import ProjectSerializer, CreateProjectSerializer, GeneratedImageSerializer
from apps.video_engine.tasks import generate_script_task, generate_video_task
from apps.video_engine.utils import normalize_script_data


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        user = request.user
        # Maintenance mode — read from DB (instant toggle), fallback to env var
        if _get_maintenance_mode() and not user.is_staff:
            return Response(
                {'detail': 'ระบบอยู่ระหว่างการพัฒนา กรุณารอสักครู่ — เร็วๆ นี้จะเปิดให้ใช้งาน 🔧'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if user.credits <= 0:
            return Response({'detail': 'เครดิตหมดแล้ว กรุณาอัพเกรดแพลน'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreateProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(user=user)

        # Save uploaded images with type
        product_image = request.FILES.get('product_image')
        person_image = request.FILES.get('person_image')
        if product_image:
            ProductImage.objects.create(project=project, image=product_image, image_type='product')
        if person_image:
            ProductImage.objects.create(project=project, image=person_image, image_type='person')

        # Deduct credit — generate script first (user will approve before video)
        user.credits -= 1
        user.save(update_fields=['credits'])
        generate_script_task.apply_async(args=[project.id], queue='video')

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)


class ScriptPreviewView(APIView):
    """Return current script data for user to review/edit."""

    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        try:
            script_data = project.render_job.script_data or {}
        except Exception:
            script_data = {}

        return Response({
            'status': project.status,
            'script': script_data,
        })


class ApproveScriptView(APIView):
    """User approves (and optionally edits) the AI script, then video generation starts."""

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        if project.status != 'awaiting_script_approval':
            return Response({'detail': 'ไม่สามารถยืนยันได้ตอนนี้'}, status=status.HTTP_400_BAD_REQUEST)

        # Save edited script into RenderJob
        edited_script = request.data.get('script', {})
        try:
            render_job = project.render_job
            existing_script = render_job.script_data or {}
            merged_script = {
                **existing_script,
                **(edited_script or {}),
                'overlay': {
                    **(existing_script.get('overlay') or {}),
                    **((edited_script or {}).get('overlay') or {}),
                }
            }
            if 'body' in (edited_script or {}):
                merged_script['body'] = edited_script.get('body') or []
            render_job.script_data = normalize_script_data(
                merged_script,
                project.duration or 15,
                project.product_name,
            )
            render_job.save(update_fields=['script_data'])
        except Exception:
            return Response({'detail': 'ไม่พบข้อมูล render job'}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger video generation
        project.status = 'generating_video'
        project.save(update_fields=['status'])
        generate_video_task.apply_async(args=[project.id], queue='video')

        return Response({'detail': 'กำลังสร้างวิดีโอ...'})


class RedoVideoView(APIView):
    """Re-trigger video generation (back to script approval step)."""

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        if project.status not in ('done', 'failed'):
            return Response({'detail': 'ไม่สามารถ redo ได้ตอนนี้'}, status=status.HTTP_400_BAD_REQUEST)

        # Go back to script approval with existing script
        project.status = 'awaiting_script_approval'
        project.save(update_fields=['status'])
        return Response({'detail': 'กลับไปหน้าตรวจสอบข้อความ'})


class ProjectImagesView(APIView):
    """Legacy endpoint kept for compatibility."""

    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'status': project.status, 'images': [], 'can_regenerate': False})


class VoicePreviewView(APIView):
    """
    POST /api/voice-preview/
    Body: {"speaker": "1"}
    Returns: {"audio_url": "https://..."}
    Calls Botnoi TTS with a fixed Thai sample sentence.
    Requires user auth (Token).
    """
    SAMPLE_TEXT = 'สวัสดีค่ะ ยินดีต้อนรับสู่ ClipDD ระบบสร้างคลิปขายของอัตโนมัติด้วย AI'

    def post(self, request):
        import requests as _req
        from django.conf import settings as _settings

        speaker = str(request.data.get('speaker', '1')).strip()
        if not speaker.isdigit() or int(speaker) < 1 or int(speaker) > 8:
            return Response({'detail': 'speaker ต้องเป็น 1-8'}, status=status.HTTP_400_BAD_REQUEST)

        botnoi_token = getattr(_settings, 'BOTNOI_API_KEY', '').strip()
        if not botnoi_token:
            return Response({'detail': 'BOTNOI_API_KEY ไม่ได้ตั้งค่า'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            resp = _req.post(
                'https://api-voice.botnoi.ai/openapi/v1/generate_audio',
                headers={'botnoi-token': botnoi_token, 'Content-Type': 'application/json'},
                json={
                    'text': self.SAMPLE_TEXT,
                    'speaker': speaker,
                    'volume': 1,
                    'speed': 1,
                    'type_media': 'mp3',
                    'save_file': 'true',
                    'language': 'th',
                },
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            # Botnoi returns 'audio_url' or 'file' depending on API version
            audio_url = data.get('audio_url') or data.get('file')
            if not audio_url:
                return Response({'detail': f'Botnoi ไม่ส่ง audio URL — keys: {list(data.keys())}'}, status=status.HTTP_502_BAD_GATEWAY)
            return Response({'audio_url': audio_url})
        except _req.exceptions.RequestException as e:
            return Response({'detail': f'Botnoi error: {e}'}, status=status.HTTP_502_BAD_GATEWAY)
