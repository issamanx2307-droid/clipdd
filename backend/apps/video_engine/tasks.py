import os
import json
import logging
import subprocess
import tempfile
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_script_with_ai(product_name, key_points, tone, duration):
    """Generate script using OpenAI or fallback to template."""
    scene_count = 4 if duration <= 15 else 6
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""คุณคือผู้เชี่ยวชาญทำคลิป TikTok สายขายของในประเทศไทย

สร้างสคริปต์คลิปสั้น {duration} วินาที เพื่อ "ขายสินค้า"

สินค้า: {product_name}
จุดเด่น: {key_points}
โทน: {tone} (urgency=เร่งด่วน, review=รีวิวจริง, drama=ดราม่า)
จำนวน scenes: {scene_count}

เงื่อนไข:
- Hook 3 วินาทีแรกต้อง "หยุดคนดูให้ได้"
- ใช้ภาษาไทยง่าย ๆ เหมือนแม่ค้า TikTok
- มีอารมณ์ (ตกใจ/รีบ/ว้าว)
- มี CTA ชัด เช่น "กดตะกร้า"
- body มีจำนวน {scene_count - 2} ประโยค (ให้ครบ {scene_count} scenes รวม hook และ cta)

ตอบเป็น JSON:
{{
  "hook": "...",
  "body": ["{scene_count-2} ประโยค"],
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
        return _template_script(product_name, tone, scene_count)


def _template_script(product_name, tone, scene_count=4):
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
    body_pool = [
        f'ใช้แล้วเห็นผลจริง ไม่โกหก',
        f'ของ {product_name} คุณภาพดีมาก',
        f'ราคาคุ้มมาก ส่งฟรีด้วย',
        f'มีรีวิวจากลูกค้าจริงหลายพันคน',
    ]
    body = body_pool[:scene_count - 2]
    return {
        'hook': hooks.get(tone, hooks['urgency']),
        'body': body,
        'cta': ctas.get(tone, ctas['urgency']),
        'hashtags': ['#TikTokขายของ', f'#{product_name.replace(" ", "")}', '#ของดีบอกต่อ'],
    }


def generate_voice(text, output_path):
    """Generate Thai TTS audio."""
    from gtts import gTTS
    tts = gTTS(text=text, lang='th', slow=False)
    tts.save(output_path)
    return output_path


def download_template_video(url, output_path):
    """Download video from URL using yt-dlp (supports TikTok, YouTube, direct links)."""
    try:
        import yt_dlp
        ydl_opts = {
            'outtmpl': output_path,
            'format': 'mp4/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'quiet': True,
            'no_warnings': True,
            'merge_output_format': 'mp4',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        if os.path.exists(output_path):
            return output_path
        # yt-dlp sometimes appends extension
        for ext in ['.mp4', '.mkv', '.webm']:
            p = output_path + ext
            if os.path.exists(p):
                os.rename(p, output_path)
                return output_path
    except Exception as e:
        logger.warning(f"yt-dlp failed ({e}), trying direct download")

    # Fallback: direct HTTP download
    try:
        r = requests.get(url, stream=True, timeout=30)
        r.raise_for_status()
        with open(output_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return output_path
    except Exception as e:
        logger.error(f"Direct download failed: {e}")
        return None


def render_video_ffmpeg(audio_path, output_path, scenes, template_video=None):
    """
    Create video with background, audio, and captions.
    If template_video is provided: use it as background (loop/trim to fit).
    Otherwise: use solid color background.
    scenes: [{'text': '...', 'duration': N}, ...]
    """
    font_path = '/usr/share/fonts/truetype/tlwg/Loma.ttf'
    total_duration = sum(s['duration'] for s in scenes)

    # Build drawtext filter chains
    filter_chains = []
    current_time = 0
    for scene in scenes:
        end_time = current_time + scene['duration']
        clean_text = scene['text'].replace("'", "\\'").replace(":", "\\:")
        chain = (
            f"drawtext=fontfile='{font_path}':text='{clean_text}':"
            f"fontcolor=white:fontsize=72:x=(w-tw)/2:y=(h*0.72):"
            f"enable='between(t,{current_time},{end_time})':"
            f"borderw=4:bordercolor=black@0.7:"
            f"box=1:boxcolor=black@0.4:boxborderw=12"
        )
        filter_chains.append(chain)
        current_time = end_time

    drawtext_filter = ",".join(filter_chains)

    if template_video and os.path.exists(template_video):
        # Use template video as background: scale to 1080x1920, loop, trim
        vf = (
            f"scale=1080:1920:force_original_aspect_ratio=increase,"
            f"crop=1080:1920,setpts=PTS-STARTPTS,"
            + drawtext_filter
        )
        cmd = [
            'ffmpeg', '-y',
            '-stream_loop', '-1', '-i', template_video,
            '-i', audio_path,
            '-vf', vf,
            '-t', str(total_duration),
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-shortest',
            output_path,
        ]
    else:
        # Solid dark background
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', f'color=c=0x1E293B:size=1080x1920:rate=25:duration={total_duration}',
            '-i', audio_path,
            '-vf', drawtext_filter,
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-shortest',
            output_path,
        ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True)
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

        target_duration = project.duration or 15  # 15 or 30 seconds

        # 1. Generate script
        script_data = generate_script_with_ai(
            project.product_name,
            project.key_points,
            project.tone,
            target_duration,
        )

        full_text = ' '.join([script_data['hook']] + script_data['body'] + [script_data['cta']])

        script = Script.objects.create(
            project=project,
            hook=script_data['hook'],
            full_text=full_text,
            hashtags=script_data['hashtags'],
        )

        scenes_text = [script_data['hook']] + script_data['body'] + [script_data['cta']]
        scene_duration = round(target_duration / len(scenes_text))

        for i, text in enumerate(scenes_text, 1):
            Scene.objects.create(script=script, scene_order=i, text=text, duration=scene_duration)

        render_job.progress = 35
        render_job.save()

        # 2. Setup paths
        media_dir = settings.MEDIA_ROOT
        os.makedirs(media_dir / 'audio', exist_ok=True)
        os.makedirs(media_dir / 'videos', exist_ok=True)
        os.makedirs(media_dir / 'templates', exist_ok=True)

        audio_path    = str(media_dir / f'audio/project_{project_id}.mp3')
        video_path    = str(media_dir / f'videos/project_{project_id}.mp4')
        template_path = str(media_dir / f'templates/project_{project_id}.mp4')

        # 3. Download template video if URL provided
        template_local = None
        if project.template_url:
            render_job.progress = 40
            render_job.save()
            result = download_template_video(project.template_url, template_path)
            if result:
                template_local = template_path
            else:
                logger.warning(f"Template download failed for project {project_id}, using solid bg")

        # 4. Generate voice
        render_job.progress = 55
        render_job.save()
        generate_voice(full_text, audio_path)

        render_job.progress = 70
        render_job.save()

        # 5. Render video
        scenes_data = [{'text': t, 'duration': scene_duration} for t in scenes_text]
        success = render_video_ffmpeg(audio_path, video_path, scenes_data, template_local)

        if not success:
            raise Exception('FFmpeg rendering failed')

        render_job.progress = 95
        render_job.save()

        # 6. Save output
        VideoOutput.objects.update_or_create(
            project=project,
            defaults={
                'video_url': f'/media/videos/project_{project_id}.mp4',
                'audio_url': f'/media/audio/project_{project_id}.mp3',
                'duration': target_duration,
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
