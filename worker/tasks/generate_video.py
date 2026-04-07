from celery import shared_task
from apps.projects.models import Project
from apps.scripts.models import Script, Scene
from apps.video_engine.models import RenderJob, VideoOutput
from core.ai.script_generator import generate_script
from gtts import gTTS
import os, subprocess

@shared_task(bind=True)
def generate_video_task(self, project_id: int):
    project = Project.objects.get(id=project_id)
    job = RenderJob.objects.get(project=project)

    try:
        # 1. Generate script
        job.status = 'processing'; job.progress = 10; job.save()
        result = generate_script(project.product_name, project.key_points, project.tone)

        script = Script.objects.create(
            project=project,
            hook=result['hook'],
            full_text=' '.join(result['body']),
            hashtags=result.get('hashtags', [])
        )
        for i, text in enumerate([result['hook']] + result['body'] + [result['cta']]):
            Scene.objects.create(script=script, scene_order=i, text=text, duration=3)

        job.progress = 40; job.save()

        # 2. TTS
        full_text = result['hook'] + ' ' + ' '.join(result['body']) + ' ' + result['cta']
        audio_path = f"/tmp/voice_{project_id}.mp3"
        tts = gTTS(text=full_text, lang='th')
        tts.save(audio_path)
        job.progress = 70; job.save()

        # 3. Render (placeholder - ใส่ FFmpeg จริงได้ภายหลัง)
        output_path = f"/tmp/output_{project_id}.mp4"
        job.progress = 90; job.save()

        # 4. Save output
        VideoOutput.objects.create(project=project, video_url=output_path, audio_url=audio_path)
        job.status = 'done'; job.progress = 100; job.save()
        project.status = 'done'; project.save()

    except Exception as e:
        job.status = 'failed'; job.error = str(e); job.save()
        project.status = 'failed'; project.save()
        raise
