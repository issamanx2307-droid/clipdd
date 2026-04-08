from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Project, ProductImage, GeneratedImage
from .serializers import ProjectSerializer, CreateProjectSerializer, GeneratedImageSerializer
from apps.video_engine.tasks import generate_images_task, generate_video_task


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.credits <= 0:
            return Response({'detail': 'เครดิตหมดแล้ว กรุณาอัพเกรดแพลน'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreateProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(user=user)

        # Save uploaded reference images (max 2)
        images = request.FILES.getlist('images')
        for img_file in images[:2]:
            ProductImage.objects.create(project=project, image=img_file)

        # Deduct credit + start image generation
        user.credits -= 1
        user.save(update_fields=['credits'])
        generate_images_task.apply_async(args=[project.id, 1], queue='video')

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)


class RegenerateImagesView(APIView):
    """Regenerate 2 new images (max 2 extra rounds = round 2 and 3)."""

    def post(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        if project.status not in ('awaiting_selection', 'failed'):
            return Response({'detail': 'ไม่สามารถ regenerate ได้ตอนนี้'}, status=status.HTTP_400_BAD_REQUEST)

        max_round = project.generated_images.aggregate(
            m=__import__('django.db.models', fromlist=['Max']).Max('generation_round')
        )['m'] or 0

        if max_round >= 3:
            return Response({'detail': 'ใช้สิทธิ์ regenerate ครบ 2 ครั้งแล้ว'}, status=status.HTTP_400_BAD_REQUEST)

        project.status = 'generating_images'
        project.save(update_fields=['status'])
        generate_images_task.apply_async(args=[project.id, max_round + 1], queue='video')

        return Response({'detail': 'กำลังสร้างภาพใหม่...', 'round': max_round + 1})


class SelectImageView(APIView):
    """User selects one generated image to proceed to video."""

    def post(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        image_id = request.data.get('image_id')
        if not image_id:
            return Response({'detail': 'กรุณาระบุ image_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            image = GeneratedImage.objects.get(pk=image_id, project=project)
        except GeneratedImage.DoesNotExist:
            return Response({'detail': 'ไม่พบภาพ'}, status=status.HTTP_404_NOT_FOUND)

        # Mark selected
        project.generated_images.update(is_selected=False)
        image.is_selected = True
        image.save(update_fields=['is_selected'])

        # Start video generation
        from apps.video_engine.models import RenderJob
        RenderJob.objects.filter(project=project).delete()
        project.status = 'generating_video'
        project.save(update_fields=['status'])
        generate_video_task.apply_async(args=[project.id], queue='video')

        return Response({'detail': 'กำลังสร้างวิดีโอ...', 'image_id': image_id})


class ProjectImagesView(APIView):
    """Get all generated images for a project."""

    def get(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        images = project.generated_images.order_by('generation_round', 'id')
        return Response({
            'status': project.status,
            'images': GeneratedImageSerializer(images, many=True).data,
            'can_regenerate': project.generated_images.aggregate(
                m=__import__('django.db.models', fromlist=['Max']).Max('generation_round')
            )['m'] < 3 if project.generated_images.exists() else True,
        })
