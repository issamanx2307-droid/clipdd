import os
import json
import logging
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_script_with_ai(product_name, key_points, tone):
    """Generate script using OpenAI or fallback to template."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""คุณคือผู้เชี่ยวชาญทำคลิป TikTok สายขายของในประเทศไทย

สร้างสคริปต์คลิปสั้น 15–25 วินาที เพื่อ "ขายสินค้า"

สินค้า: {product_name}
จุดเด่น: {key_points}
โทน: {tone} (urgency=เร่งด่วน, review=รีวิวจริง, drama=ดราม่า)

เงื่อนไข:
- Hook 3 วินาทีแรกต้อง "หยุดคนดูให้ได้"
- ใช้ภาษาไทยง่าย ๆ เหมือนแม่ค้า TikTok
- มีอารมณ์ (ตกใจ/รีบ/ว้าว)
- มี CTA ชัด เช่น "กดตะกร้า"
- ไม่ยาวเกิน 4–5 ประโยค

ตอบเป็น JSON:
{{
  "hook": "...",
  "body": ["...", "..."],
  "cta": "...",
  "hashtags": ["#...", "#..."]
}}"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.warning(f"OpenAI failed, using template: {e}")
        return _template_script(product_name, tone)


def _template_script(product_name, tone):
    hooks = {
        'urgency': f'หยุดก่อน!! {product_name} กำลังฮิตมาก',
        'review':  f'ลองแล้วตกใจมาก! {product_name} ดีจริงๆ',
        'drama':   f'ฉันเคยไม่เชื่อ จนได้ลอง {product_name}',
    }
    ctas = {
        'urgency': 'ของกำลังหมด! กดตะกร้าตอนนี้เลย',
        'review':  'ลองดูแล้วจะรู้ว่าดีแค่ไหน กดตะกร้าเลย',
        'drama':   'ชีวิตเปลี่ยนเลยจริงๆ กดตะกร้าด่วน',
    }
    return {
        'hook': hooks.get(tone, hooks['urgency']),
        'body': [
            f'ใช้แล้วเห็นผลจริง ไม่โกหก',
            f'ของ {product_name} คุณภาพดีมาก',
        ],
        'cta': ctas.get(tone, ctas['urgency']),
        'hashtags': ['#TikTokขายของ', f'#{product_name.replace(" ", "")}', '#ของดีบอกต่อ'],
    }


def generate_voice(text, output_path):
    """Generate Thai TTS audio."""
    from gtts import gTTS
    tts = gTTS(text=text, lang='th', slow=False)
    tts.save(output_path)
    return output_path


def render_video_ffmpeg(audio_path, output_path, scenes):
    """
    Create a premium video with background, audio, and captions (subtitles).
    scenes: list of dicts [{'text': '...', 'duration': 4}, ...]
    """
    # Font path from fonts-thai-tlwg package on Debian/Ubuntu
    font_path = '/usr/share/fonts/truetype/tlwg/Loma.ttf'
    
    # Base background (Premium Dark Grey-Blue)
    # Filter to build captions on top of background
    filter_chains = []
    current_time = 0
    total_duration = sum(s['duration'] for s in scenes)
    
    for i, scene in enumerate(scenes):
        end_time = current_time + scene['duration']
        # Escape single quotes and colons for ffmpeg
        clean_text = scene['text'].replace("'", "'\\\\''").replace(":", "\\:")
        
        # Drawtext filter for each scene
        # x=(w-tw)/2, y=(h-th)/2 centers the text
        # enable='between(t,start,end)' controls timing
        chain = (
            f"drawtext=fontfile='{font_path}':text='{clean_text}':"
            f"fontcolor=white:fontsize=80:x=(w-tw)/2:y=(h-th)/2-100:"
            f"enable='between(t,{current_time},{end_time})':"
            f"borderw=3:bordercolor=black@0.5"
        )
        filter_chains.append(chain)
        current_time = end_time

    filter_complex = ",".join(filter_chains)
    
    cmd = [
        'ffmpeg', '-y',
        # Input 1: Color background (9:16 portrait)
        '-f', 'lavfi', '-i', f'color=c=0x1E293B:size=1080x1920:rate=25:duration={total_duration}',
        # Input 2: Audio
        '-i', audio_path,
        # Filter complex for captions
        '-vf', filter_complex,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-shortest',
        output_path
    ]
    
    import subprocess
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg error: {e.stderr.decode()}")
        return False


@shared_task(bind=True, max_retries=3, queue='video')
def generate_video_task(self, project_id):
    from apps.projects.models import Project
    from apps.scripts.models import Script, Scene
    from apps.video_engine.models import RenderJob, VideoOutput

    project = Project.objects.get(pk=project_id)
    render_job, _ = RenderJob.objects.get_or_create(project=project)

    try:
        render_job.status = 'processing'
        render_job.progress = 10
        render_job.save()

        # 1. Generate script
        script_data = generate_script_with_ai(
            project.product_name,
            project.key_points,
            project.tone,
        )

        full_text = ' '.join([script_data['hook']] + script_data['body'] + [script_data['cta']])

        script = Script.objects.create(
            project=project,
            hook=script_data['hook'],
            full_text=full_text,
            hashtags=script_data['hashtags'],
        )

        scenes_text = [script_data['hook']] + script_data['body'] + [script_data['cta']]
        for i, text in enumerate(scenes_text, 1):
            Scene.objects.create(
                script=script,
                scene_order=i,
                text=text,
                duration=4,
            )

        render_job.progress = 40
        render_job.save()

        # 2. Generate voice
        media_dir = settings.MEDIA_ROOT
        os.makedirs(media_dir / 'audio', exist_ok=True)
        os.makedirs(media_dir / 'videos', exist_ok=True)

        audio_path = str(media_dir / f'audio/project_{project_id}.mp3')
        video_path = str(media_dir / f'videos/project_{project_id}.mp4')

        generate_voice(full_text, audio_path)

        render_job.progress = 70
        render_job.save()

        # 3. Render video
        scenes_data = [{'text': s, 'duration': 4} for s in scenes_text]
        success = render_video_ffmpeg(audio_path, video_path, scenes_data)

        if not success:
            raise Exception('FFmpeg rendering failed')

        render_job.progress = 95
        render_job.save()

        # 4. Save output
        VideoOutput.objects.update_or_create(
            project=project,
            defaults={
                'video_url': f'/media/videos/project_{project_id}.mp4',
                'audio_url': f'/media/audio/project_{project_id}.mp3',
                'duration': len(scenes_text) * 4,
            }
        )

        project.status = 'done'
        project.save(update_fields=['status'])

        render_job.status = 'done'
        render_job.progress = 100
        render_job.save()

        return f'Video generated for project {project_id}'

    except Exception as exc:
        render_job.status = 'failed'
        render_job.error = str(exc)
        render_job.save()

        project.status = 'failed'
        project.save(update_fields=['status'])

        logger.error(f'Video generation failed for project {project_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)
