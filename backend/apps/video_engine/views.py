import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import RenderJob, VideoOutput
from apps.projects.models import Project

logger = logging.getLogger(__name__)


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
            data['progress']      = job.progress
            data['error']         = job.error
        except RenderJob.DoesNotExist:
            data['render_status'] = 'not_started'

        try:
            output = project.video
            data['video_url'] = output.video_url
            data['audio_url'] = output.audio_url
            data['duration']  = output.duration
        except VideoOutput.DoesNotExist:
            data['video_url'] = None
        try:
            data['hashtags'] = (project.render_job.script_data or {}).get('hashtags', [])
        except RenderJob.DoesNotExist:
            data['hashtags'] = []

        return Response(data)


class KlingWebhookView(APIView):
    """
    Receives POST from fal.ai when a Kling video is ready.
    fal.ai payload:
    {
      "request_id": "...",
      "status": "OK",
      "payload": { "video": { "url": "https://..." } }
    }
    Finds the matching RenderJob and triggers assemble_video_task (Phase 2).
    No authentication — fal.ai cannot send tokens.
    Security: only valid request_id in DB is accepted.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        logger.info(f"Kling webhook received: {str(data)[:300]}")
        provider_status = str(data.get('status', '') or '').upper()

        # fal.ai sends request_id at root level
        request_id = data.get('request_id')
        if not request_id:
            logger.warning("Kling webhook: no request_id in payload")
            return Response({'ok': False, 'error': 'missing request_id'}, status=400)

        # Find matching RenderJob
        try:
            render_job = RenderJob.objects.get(kling_request_id=request_id)
        except RenderJob.DoesNotExist:
            logger.warning(f"Kling webhook: no RenderJob for request_id={request_id}")
            return Response({'ok': False, 'error': 'request_id not found'}, status=404)

        # Already assembled (duplicate webhook call)
        if render_job.status in ('assembling', 'done'):
            logger.info(f"Kling webhook: already {render_job.status}, skipping")
            return Response({'ok': True, 'skipped': True})

        if provider_status in {'IN_QUEUE', 'QUEUED', 'RUNNING', 'PROCESSING', 'IN_PROGRESS'}:
            logger.info(f"Kling webhook: request_id={request_id} still in progress ({provider_status})")
            return Response({'ok': True, 'waiting': True})

        # Extract video URL — fal.ai wraps result in "payload"
        payload    = data.get('payload', data)
        video_info = payload.get('video', {})
        video_url  = video_info.get('url') if isinstance(video_info, dict) else None

        if not video_url:
            # Some fal.ai versions put it at root
            video_url = data.get('video', {}).get('url')

        if not video_url:
            if provider_status and provider_status not in {'OK', 'COMPLETED', 'SUCCESS'}:
                logger.error(f"Kling webhook failed with status={provider_status}: {str(data)[:400]}")
                render_job.status = 'failed'
                render_job.error  = f'Kling failed with status={provider_status}'
                render_job.save()
                render_job.project.status = 'failed'
                render_job.project.save(update_fields=['status'])
                return Response({'ok': False, 'error': provider_status}, status=400)

            logger.error(f"Kling webhook: no video URL in payload: {str(data)[:400]}")
            render_job.status = 'failed'
            render_job.error  = f'Webhook received but no video URL: {str(data)[:200]}'
            render_job.save()
            render_job.project.status = 'failed'
            render_job.project.save(update_fields=['status'])
            return Response({'ok': False, 'error': 'no video URL'}, status=400)

        logger.info(f"Kling webhook OK: project={render_job.project_id} video_url={video_url}")

        # Trigger Phase 2
        from .tasks import assemble_video_task
        assemble_video_task.delay(render_job.project_id, video_url)

        return Response({'ok': True})
