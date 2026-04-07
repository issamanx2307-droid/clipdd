from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import RenderJob, VideoOutput
from apps.projects.models import Project


class RenderStatusView(APIView):
    def get(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)

        data = {'project_status': project.status}

        try:
            job = project.render_job
            data['render_status'] = job.status
            data['progress'] = job.progress
            data['error'] = job.error
        except RenderJob.DoesNotExist:
            data['render_status'] = 'not_started'

        try:
            output = project.video
            data['video_url'] = output.video_url
            data['audio_url'] = output.audio_url
            data['duration'] = output.duration
        except VideoOutput.DoesNotExist:
            data['video_url'] = None

        return Response(data)
