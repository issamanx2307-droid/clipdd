from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Project
from .serializers import ProjectSerializer, CreateProjectSerializer
from apps.video_engine.tasks import generate_video_task


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.credits <= 0:
            raise Exception('เครดิตหมดแล้ว กรุณาอัพเกรดแพลน')
        project = serializer.save(user=user)
        # Deduct credit and kick off task
        user.credits -= 1
        user.save(update_fields=['credits'])
        generate_video_task.apply_async(args=[project.id], queue='video')

    def create(self, request, *args, **kwargs):
        serializer = CreateProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        project = Project.objects.filter(user=request.user).latest('created_at')
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)
