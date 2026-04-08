import os
import json
import logging
import subprocess
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# SCRIPT GENERATION
# ─────────────────────────────────────────────

def generate_script_with_ai(product_name, key_points, tone, duration):
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
- ใช้ภาษาไทยง่ายๆ เหมือนแม่ค้า TikTok
- body มีจำนวน {scene_count - 2} ประโยค
- มี CTA ชัด เช่น "กดตะกร้า"

ตอบเป็น JSON:
{{
  "hook": "...",
  "body": ["..."],
  "cta": "...",
  "hashtags": ["#...", "#..."],
  "motion_prompt": "short English prompt for product video motion, e.g. 'product gently rotating, soft light'"
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
    return {
        'hook': hooks.get(tone, hooks['urgency']),
        'body': body_pool[:scene_count - 2],
        'cta': ctas.get(tone, ctas['urgency']),
        'hashtags': ['#TikTokขายของ', f'#{product_name.replace(" ", "")}', '#ของดีบอกต่อ'],
        'motion_prompt': f'product shot of {product_name}, gentle zoom in, soft lighting, commercial style',
    }


# ─────────────────────────────────────────────
# VOICE GENERATION
# ─────────────────────────────────────────────

def generate_voice(text, output_path):
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.audio.speech.create(
        model="tts-1",
        voice="nova",   # nova = สมจริง เหมาะกับภาษาไทย
        input=text,
        speed=1.1,      # เร็วขึ้นนิดหน่อยให้ฟังดู energetic แบบ TikTok
    )
    response.stream_to_file(output_path)
    return output_path


# ─────────────────────────────────────────────
# VIDEO RENDERING (FFmpeg)
# ─────────────────────────────────────────────

def download_file(url, output_path):
    """Download any file from URL."""
    r = requests.get(url, stream=True, timeout=60)
    r.raise_for_status()
    with open(output_path, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    return output_path


def ken_burns_segment(image_path, duration, output_path, zoom_direction='in'):
    """Create a Ken Burns pan/zoom segment from a static image."""
    font_path = '/usr/share/fonts/truetype/tlwg/Loma.ttf'

    if zoom_direction == 'in':
        zoompan = "zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=25"
    else:
        zoompan = "zoompan=z='if(lte(zoom,1.0),1.5,max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=25"

    frames = duration * 25
    vf = zoompan.format(frames=frames)

    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-vf', vf,
        '-t', str(duration),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-an', output_path
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0


def render_final_video(kling_video_path, kb_video_path, audio_path, output_path, scenes, kling_duration, kb_duration):
    """
    Stitch Kling video + Ken Burns segment + audio + drawtext overlay.
    """
    font_path = '/usr/share/fonts/truetype/tlwg/Loma.ttf'

    # Build drawtext chains
    filter_chains = []
    current_time = 0
    total_duration = kling_duration + kb_duration
    scene_duration = total_duration / len(scenes)

    for scene in scenes:
        end_time = current_time + scene_duration
        clean_text = scene.replace("'", "\\'").replace(":", "\\:")
        filter_chains.append(
            f"drawtext=fontfile='{font_path}':text='{clean_text}':"
            f"fontcolor=white:fontsize=68:x=(w-tw)/2:y=(h*0.75):"
            f"enable='between(t,{current_time:.1f},{end_time:.1f})':"
            f"borderw=4:bordercolor=black@0.8:"
            f"box=1:boxcolor=black@0.45:boxborderw=14"
        )
        current_time = end_time

    drawtext = ",".join(filter_chains)

    # Concat list file
    concat_file = output_path + '.concat.txt'
    with open(concat_file, 'w') as f:
        f.write(f"file '{kling_video_path}'\n")
        f.write(f"file '{kb_video_path}'\n")

    # Temp concat (no audio, no text)
    concat_tmp = output_path + '.concat.mp4'
    cmd_concat = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_file,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', concat_tmp
    ]
    r1 = subprocess.run(cmd_concat, capture_output=True)
    if r1.returncode != 0:
        logger.error(f"Concat error: {r1.stderr.decode()}")
        return False

    # Final: add audio + drawtext
    cmd_final = [
        'ffmpeg', '-y',
        '-i', concat_tmp,
        '-i', audio_path,
        '-vf', drawtext,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-shortest',
        output_path
    ]
    r2 = subprocess.run(cmd_final, capture_output=True)
    if r2.returncode != 0:
        logger.error(f"Final render error: {r2.stderr.decode()}")
        return False

    # Cleanup
    for f in [concat_file, concat_tmp]:
        try: os.remove(f)
        except: pass

    return True


# ─────────────────────────────────────────────
# CELERY TASKS
# ─────────────────────────────────────────────

@shared_task(bind=True, max_retries=2, queue='video')
def generate_images_task(self, project_id, generation_round=1):
    """Generate 2 product images using Flux Schnell."""
    from apps.projects.models import Project, GeneratedImage
    from core.ai.image_generator import analyze_and_write_prompt, generate_images_flux

    project = Project.objects.get(pk=project_id)

    try:
        project.status = 'generating_images'
        project.save(update_fields=['status'])

        # Get uploaded image paths
        uploaded_paths = [
            str(settings.MEDIA_ROOT / img.image.name)
            for img in project.uploaded_images.all()
        ]

        # 1. GPT-4o-mini analyzes + writes prompt
        prompt = analyze_and_write_prompt(
            project.product_name,
            project.key_points,
            project.tone,
            uploaded_paths or None,
        )
        logger.info(f"Image prompt for project {project_id}: {prompt}")

        # 2. Flux Schnell generates 2 images
        image_urls = generate_images_flux(prompt, num_images=2)

        # 3. Save to DB
        for url in image_urls:
            GeneratedImage.objects.create(
                project=project,
                image_url=url,
                generation_round=generation_round,
            )

        project.status = 'awaiting_selection'
        project.save(update_fields=['status'])

        return {'status': 'ok', 'image_count': len(image_urls), 'round': generation_round}

    except Exception as exc:
        project.status = 'failed'
        project.save(update_fields=['status'])
        logger.error(f"Image generation failed for project {project_id}: {exc}")
        raise self.retry(exc=exc, countdown=15)


@shared_task(bind=True, max_retries=2, queue='video')
def generate_video_task(self, project_id):
    """
    Full video pipeline:
    1. Generate script (GPT-4o-mini)
    2. Generate voice (gTTS)
    3. Generate Kling video segment from selected image
    4. Generate Ken Burns segment from selected image
    5. Stitch + overlay text → final MP4
    """
    from apps.projects.models import Project, GeneratedImage
    from apps.scripts.models import Script, Scene
    from apps.video_engine.models import RenderJob, VideoOutput
    from core.ai.image_generator import generate_video_kling

    project = Project.objects.get(pk=project_id)
    render_job, _ = RenderJob.objects.get_or_create(project=project)

    try:
        render_job.status = 'processing'
        render_job.progress = 5
        render_job.save()

        project.status = 'generating_video'
        project.save(update_fields=['status'])

        target_duration = project.duration or 15  # 15 or 30

        # Kling duration + Ken Burns duration
        if target_duration == 15:
            kling_dur = 10
            kb_dur = 5
        else:  # 30
            kling_dur = 20   # 2x Kling 10s (handled below)
            kb_dur = 10

        # 1. Generate script
        script_data = generate_script_with_ai(
            project.product_name, project.key_points,
            project.tone, target_duration
        )
        scenes_text = [script_data['hook']] + script_data['body'] + [script_data['cta']]
        full_text = ' '.join(scenes_text)
        motion_prompt = script_data.get('motion_prompt', f'smooth cinematic motion of {project.product_name}')

        Script.objects.create(
            project=project,
            hook=script_data['hook'],
            full_text=full_text,
            hashtags=script_data['hashtags'],
        )
        render_job.progress = 15
        render_job.save()

        # 2. Setup dirs
        media_dir = settings.MEDIA_ROOT
        for d in ['audio', 'videos', 'kling', 'kenburns']:
            os.makedirs(media_dir / d, exist_ok=True)

        audio_path     = str(media_dir / f'audio/project_{project_id}.mp3')
        kb_path        = str(media_dir / f'kenburns/project_{project_id}.mp4')
        kling1_path    = str(media_dir / f'kling/project_{project_id}_1.mp4')
        kling2_path    = str(media_dir / f'kling/project_{project_id}_2.mp4')
        final_path     = str(media_dir / f'videos/project_{project_id}.mp4')

        # 3. Get selected image URL
        selected = project.generated_images.filter(is_selected=True).first()
        if not selected:
            selected = project.generated_images.order_by('-created_at').first()
        if not selected:
            raise Exception('No generated image found')

        image_url = selected.image_url

        # 4. Generate voice
        generate_voice(full_text, audio_path)
        render_job.progress = 25
        render_job.save()

        # 5. Kling video generation
        kling1_url = generate_video_kling(image_url, motion_prompt, duration_seconds=10)
        if not kling1_url:
            raise Exception('Kling video generation failed')

        download_file(kling1_url, kling1_path)
        render_job.progress = 55
        render_job.save()

        if target_duration == 30:
            # Second Kling for 30s
            kling2_url = generate_video_kling(image_url, f'continue motion, {motion_prompt}', duration_seconds=10)
            if kling2_url:
                download_file(kling2_url, kling2_path)
            else:
                kling2_path = kling1_path  # fallback: reuse first
            render_job.progress = 72
            render_job.save()

            # Concat 2 Kling clips
            kling_concat = str(media_dir / f'kling/project_{project_id}_concat.mp4')
            concat_file = kling_concat + '.txt'
            with open(concat_file, 'w') as f:
                f.write(f"file '{kling1_path}'\nfile '{kling2_path}'\n")
            subprocess.run([
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_file,
                '-c', 'copy', kling_concat
            ], capture_output=True)
            try: os.remove(concat_file)
            except: pass
            kling_final_path = kling_concat
        else:
            kling_final_path = kling1_path

        # 6. Ken Burns segment (static image + zoom)
        # Download image locally first
        local_img = str(media_dir / f'kling/project_{project_id}_img.jpg')
        download_file(image_url, local_img)
        ken_burns_segment(local_img, kb_dur, kb_path, zoom_direction='out')

        render_job.progress = 85
        render_job.save()

        # 7. Final stitch
        success = render_final_video(
            kling_final_path, kb_path, audio_path, final_path,
            scenes_text, kling_dur, kb_dur
        )
        if not success:
            raise Exception('FFmpeg final render failed')

        # 8. Save output
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
