import os
import json
import logging
import subprocess
import tempfile
import requests
from pathlib import Path
from celery import shared_task
from django.conf import settings
from .utils import normalize_script_data, _template_script

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# FONT PATHS (Thai fonts available in container)
# ─────────────────────────────────────────────
FONT_BOLD   = '/usr/share/fonts/truetype/tlwg/Loma-Bold.ttf'
FONT_NORMAL = '/usr/share/fonts/truetype/tlwg/Loma.ttf'
FONT_TITLE  = '/usr/share/fonts/truetype/tlwg/Umpush-Bold.ttf'

# Webhook URL that fal.ai will POST to when Kling finishes
KLING_WEBHOOK_URL = 'https://clipdd.com/api/webhook/kling/'


# ─────────────────────────────────────────────
# STEP 1 — AI: Generate script + overlay data (single call, fully synced)
# ─────────────────────────────────────────────

def generate_script_with_ai(product_name, key_points, tone, duration, include_person=True):
    """
    Single GPT call that returns:
    - TTS-ready full_text (will drive audio duration)
    - scenes with per-scene timing estimates
    - motion_prompt aligned to the script tone
    - overlay data: hook_line, product_label, cta_line, hashtags
    """
    scene_count = 4 if duration <= 15 else 6
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        tone_map = {
            'urgency': 'เร่งด่วน FOMO สูง กดออเดอร์ทันที',
            'review':  'รีวิวจริง น่าเชื่อถือ มืออาชีพ',
            'drama':   'ดราม่า Before/After อารมณ์แรง',
            'unbox':   'Unboxing แกะกล่อง ตื่นเต้น',
        }
        tone_desc = tone_map.get(tone, tone_map['urgency'])

        person_instruction = (
            "- motion_prompt ต้องมีคน: สาวไทยสวย กำลังถือหรือใช้สินค้า ท่าทางเป็นธรรมชาติ (influencer style)"
            if include_person else
            "- motion_prompt เน้นสินค้าอย่างเดียว ไม่ต้องมีคน"
        )

        prompt = f"""คุณคือผู้เชี่ยวชาญสร้างคลิปขายของ TikTok ภาษาไทย

สินค้า: {product_name}
จุดเด่น: {key_points or 'ไม่ระบุ'}
โทน: {tone_desc}
ความยาวคลิป: {duration} วินาที
จำนวน scene: {scene_count}
มีคนในคลิป: {'ใช่' if include_person else 'ไม่ใช่'}

สร้างข้อมูลทั้งหมดนี้ในครั้งเดียว เพื่อให้เสียงพากย์ ภาพ และ overlay สอดคล้องกัน:

ตอบเป็น JSON เท่านั้น:
{{
  "hook":   "ประโยคเปิด 3-5 วินาที หยุดคนดูได้",
  "body":   ["ประโยคกลาง 1", "ประโยคกลาง 2"],
  "cta":    "ประโยคปิด กระตุ้นซื้อ",
  "scenes": [
    {{"text": "ข้อความแต่ละ scene", "sec": 2.5}}
  ],
  "motion_prompt": "English Kling prompt, {'include a beautiful Thai woman naturally holding/using the product, camera slowly zooms in on her face and the product, warm TikTok lifestyle lighting' if include_person else 'cinematic product-only reveal, smooth camera motion, no people'}",
  "overlay": {{
    "hook_line":     "ข้อความ hook สั้นๆ บนหน้าจอ ไม่เกิน 20 ตัวอักษร เช่น หยุดก่อน!!",
    "product_label": "ชื่อสินค้าสั้นๆ เช่น ครีมกันแดด SPF50",
    "cta_line":      "ข้อความ CTA สั้นๆ เช่น กดตะกร้าด่วนเลย!",
    "hashtags":      ["#TikTokขายของ", "#สินค้าขายดี"]
  }},
  "hashtags": ["#TikTokขายของ", "#ของดีบอกต่อ"]
}}

กฎสำคัญ:
- scenes ต้องมีจำนวนเท่ากับ {scene_count} และ sum(sec) ≈ {duration * 0.7:.0f} วินาที (เหลือที่สำหรับ Ken Burns)
{person_instruction}
- overlay.hook_line ต้องสั้น กระชับ ดึงดูด ไม่มีอีโมจิ
- ตอบ JSON เท่านั้น ไม่มีข้อความอื่น"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        logger.info(f"Script generated for {product_name}: hook={data.get('hook','')[:40]}")
        return data

    except Exception as e:
        logger.warning(f"GPT failed, using template: {e}")
        return _template_script(product_name, tone, scene_count, duration)


# _template_script and normalize_script_data are now in utils.py (imported above)


# ─────────────────────────────────────────────
# STEP 2 — VOICE
# ─────────────────────────────────────────────

def generate_voice(text, output_path, voice='nova'):
    """
    Generate Thai TTS.
    - If voice is a Botnoi speaker_id (numeric string like '1','3','8') → use Botnoi Voice API
    - Otherwise → use OpenAI TTS (nova/shimmer/onyx/echo)
    Returns output_path.
    """
    voice = str(voice or 'nova')
    if voice.isdigit():
        try:
            return _generate_voice_botnoi(text, output_path, speaker=voice)
        except requests.RequestException as exc:
            logger.warning(
                "Botnoi TTS failed for speaker=%s, falling back to OpenAI voice nova: %s",
                voice,
                exc,
            )
            return _generate_voice_openai(text, output_path, voice='nova')
    return _generate_voice_openai(text, output_path, voice=voice)


def _generate_voice_botnoi(text, output_path, speaker='1'):
    """Generate TTS via Botnoi Voice API. Downloads mp3 to output_path."""
    botnoi_token = getattr(settings, 'BOTNOI_API_KEY', '')
    resp = requests.post(
        'https://api-voice.botnoi.ai/openapi/v1/generate_audio',
        headers={
            'botnoi-token': botnoi_token,
            'Content-Type': 'application/json',
        },
        json={
            'text': text,
            'speaker': str(speaker),
            'volume': 1,
            'speed': 1,
            'type_media': 'mp3',
            'save_file': 'true',
            'language': 'th',
            'page': 'user',
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    audio_url = data.get('audio_url')
    if not audio_url:
        raise Exception(f'Botnoi TTS: no audio_url in response: {data}')
    download_file(audio_url, output_path)
    logger.info(f"Botnoi TTS done: speaker={speaker} points_left={data.get('point')}")
    return output_path


def _generate_voice_openai(text, output_path, voice='nova'):
    """Generate TTS via OpenAI. Falls back if Botnoi not selected."""
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.audio.speech.create(
        model='tts-1',
        voice=voice,
        input=text,
        speed=1.05,
    )
    response.stream_to_file(output_path)
    return output_path


def get_audio_duration(audio_path):
    """Return duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', audio_path],
            capture_output=True, text=True, timeout=15
        )
        return float(result.stdout.strip())
    except Exception as e:
        logger.warning(f"ffprobe failed: {e}")
        return 10.0  # fallback


# ─────────────────────────────────────────────
# STEP 3 — PILLOW OVERLAY (Thai-safe)
# ─────────────────────────────────────────────

def build_overlay_frame(overlay_data, width=1080, height=1920, tone='urgency'):
    """
    Draw TikTok-style overlay on a transparent PNG using Pillow.
    Returns path to PNG file.
    Overlay layout (top → bottom):
      - Top band: hook_line (large, bold, semi-transparent dark bg)
      - Bottom area: product_label + cta_line + hashtags
    """
    from PIL import Image, ImageDraw, ImageFont

    # Tone color scheme
    TONE_COLORS = {
        'urgency': {'accent': (255, 80,  30),  'bg': (180, 30,  10,  200)},
        'review':  {'accent': (34,  197, 94),  'bg': (10,  120, 60,  200)},
        'drama':   {'accent': (168, 85,  247), 'bg': (80,  20,  140, 200)},
        'unbox':   {'accent': (245, 158, 11),  'bg': (140, 80,  10,  200)},
    }
    colors = TONE_COLORS.get(tone, TONE_COLORS['urgency'])
    accent = colors['accent']
    bg_rgba = colors['bg']

    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def load_font(path, size):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()

    font_hook    = load_font(FONT_TITLE,  88)
    font_product = load_font(FONT_BOLD,   62)
    font_cta     = load_font(FONT_BOLD,   58)
    font_hash    = load_font(FONT_NORMAL, 40)

    hook_line     = overlay_data.get('hook_line', '')
    product_label = overlay_data.get('product_label', '')
    cta_line      = overlay_data.get('cta_line', '')
    hashtags      = ' '.join(overlay_data.get('hashtags', []))

    # ── TOP BAND: hook_line ──────────────────────────────────
    top_pad   = 80
    band_h    = 130
    draw.rectangle([(0, top_pad), (width, top_pad + band_h)], fill=bg_rgba)
    draw.rectangle([(0, top_pad), (10, top_pad + band_h)], fill=accent + (255,))

    bbox = draw.textbbox((0, 0), hook_line, font=font_hook)
    tw = bbox[2] - bbox[0]
    tx = (width - tw) // 2
    ty = top_pad + (band_h - (bbox[3] - bbox[1])) // 2
    draw.text((tx+3, ty+3), hook_line, font=font_hook, fill=(0, 0, 0, 160))
    draw.text((tx, ty), hook_line, font=font_hook, fill=(255, 255, 255, 255))

    # ── BOTTOM SECTION ───────────────────────────────────────
    bottom_start = height - 340
    bottom_bg    = (0, 0, 0, 170)
    draw.rectangle([(0, bottom_start), (width, height)], fill=bottom_bg)

    y = bottom_start + 28
    bbox = draw.textbbox((0, 0), product_label, font=font_product)
    tw = bbox[2] - bbox[0]
    tx = (width - tw) // 2
    draw.text((tx+2, y+2), product_label, font=font_product, fill=(0, 0, 0, 150))
    draw.text((tx, y), product_label, font=font_product, fill=(255, 255, 255, 255))

    y += (bbox[3] - bbox[1]) + 14
    draw.rectangle([(80, y), (width - 80, y + 3)], fill=accent + (200,))
    y += 18

    bbox = draw.textbbox((0, 0), cta_line, font=font_cta)
    tw = bbox[2] - bbox[0]
    tx = (width - tw) // 2
    draw.text((tx+2, y+2), cta_line, font=font_cta, fill=(0, 0, 0, 150))
    draw.text((tx, y), cta_line, font=font_cta, fill=accent + (255,))
    y += (bbox[3] - bbox[1]) + 14

    if hashtags:
        bbox = draw.textbbox((0, 0), hashtags, font=font_hash)
        tw = bbox[2] - bbox[0]
        tx = (width - tw) // 2
        draw.text((tx, y), hashtags, font=font_hash, fill=(200, 200, 200, 180))

    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    img.save(tmp.name, 'PNG')
    return tmp.name


# ─────────────────────────────────────────────
# STEP 4 — KEN BURNS segment
# ─────────────────────────────────────────────

def ken_burns_segment(image_path, duration, output_path, zoom_direction='in'):
    """Create Ken Burns pan/zoom from static image."""
    if zoom_direction == 'in':
        zoompan = "zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=25"
    else:
        zoompan = "zoompan=z='if(lte(zoom,1.0),1.5,max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=25"

    frames = int(duration * 25)
    vf = zoompan.format(frames=frames)
    cmd = ['ffmpeg', '-y', '-loop', '1', '-i', image_path,
           '-vf', vf, '-t', str(duration),
           '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', output_path]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        logger.error(f"Ken Burns error: {result.stderr.decode()[-300:]}")
    return result.returncode == 0


# ─────────────────────────────────────────────
# STEP 5 — FINAL RENDER: Kling + Ken Burns + Overlay + Audio + Subtitles
# ─────────────────────────────────────────────

def render_final_video(kling_path, kb_path, overlay_png,
                       audio_path, output_path, scenes,
                       kling_duration, kb_duration, audio_duration):
    """
    Pipeline:
    1. Concat Kling + Ken Burns → raw video
    2. Overlay PNG (Pillow-rendered, Thai-safe) on every frame
    3. Add audio (drives final length via -shortest)
    4. Burn subtitles via drawtext (timestamps from scenes)
    """
    font_path = FONT_BOLD

    # ── 1. Concat ────────────────────────────────────────────
    concat_file = output_path + '.concat.txt'
    concat_tmp  = output_path + '.concat.mp4'
    with open(concat_file, 'w') as f:
        f.write(f"file '{kling_path}'\n")
        f.write(f"file '{kb_path}'\n")

    r1 = subprocess.run(
        ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_file,
         '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', concat_tmp],
        capture_output=True
    )
    if r1.returncode != 0:
        logger.error(f"Concat error: {r1.stderr.decode()[-300:]}")
        return False

    # ── 2. Overlay PNG + Subtitles + Audio ───────────────────
    sub_parts = []
    t = 0.0
    for scene in scenes:
        text = scene.get('text', '')
        dur  = float(scene.get('sec', 2.5))
        end  = t + dur
        safe = text.replace("'", "\u2019").replace(":", "\\:").replace("\\", "\\\\")
        sub_parts.append(
            f"drawtext=fontfile='{font_path}'"
            f":text='{safe}'"
            f":fontcolor=white:fontsize=52"
            f":x=(w-tw)/2:y=h*0.55"
            f":enable='between(t,{t:.2f},{end:.2f})'"
            f":borderw=3:bordercolor=black@0.9"
            f":box=1:boxcolor=black@0.40:boxborderw=10"
        )
        t = end

    overlay_filter = (
        f"[0:v][1:v]overlay=0:0[ov];"
        f"[ov]{','.join(sub_parts)}[vout]"
    ) if sub_parts else "[0:v][1:v]overlay=0:0[vout]"

    cmd_final = [
        'ffmpeg', '-y',
        '-i', concat_tmp,
        '-i', overlay_png,
        '-i', audio_path,
        '-filter_complex', overlay_filter,
        '-map', '[vout]',
        '-map', '2:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest',
        output_path
    ]
    r2 = subprocess.run(cmd_final, capture_output=True)
    if r2.returncode != 0:
        logger.error(f"Final render error: {r2.stderr.decode()[-500:]}")
        return False

    for f in [concat_file, concat_tmp]:
        try: os.remove(f)
        except: pass
    try: os.remove(overlay_png)
    except: pass

    return True


# ─────────────────────────────────────────────
# STEP 5b — RENDER: Kling only (no Ken Burns)
# Used when no product image was uploaded
# ─────────────────────────────────────────────

def render_kling_only(kling_path, overlay_png, audio_path, output_path, scenes):
    """
    Simplified render: Kling video + overlay PNG + subtitles + audio.
    No Ken Burns concat — just Kling video with overlay and audio.
    """
    font_path = FONT_BOLD

    sub_parts = []
    t = 0.0
    for scene in scenes:
        text = scene.get('text', '')
        dur  = float(scene.get('sec', 2.5))
        end  = t + dur
        safe = text.replace("'", "\u2019").replace(":", "\\:").replace("\\", "\\\\")
        sub_parts.append(
            f"drawtext=fontfile='{font_path}'"
            f":text='{safe}'"
            f":fontcolor=white:fontsize=52"
            f":x=(w-tw)/2:y=h*0.55"
            f":enable='between(t,{t:.2f},{end:.2f})'"
            f":borderw=3:bordercolor=black@0.9"
            f":box=1:boxcolor=black@0.40:boxborderw=10"
        )
        t = end

    overlay_filter = (
        f"[0:v][1:v]overlay=0:0[ov];"
        f"[ov]{','.join(sub_parts)}[vout]"
    ) if sub_parts else "[0:v][1:v]overlay=0:0[vout]"

    cmd = [
        'ffmpeg', '-y',
        '-stream_loop', '-1',
        '-i', kling_path,
        '-i', overlay_png,
        '-i', audio_path,
        '-filter_complex', overlay_filter,
        '-map', '[vout]',
        '-map', '2:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest',
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        logger.error(f"Kling-only render error: {result.stderr.decode()[-500:]}")
        return False

    try:
        os.remove(overlay_png)
    except Exception:
        pass
    return True


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def download_file(url, output_path):
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    with open(output_path, 'wb') as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    return output_path


# ─────────────────────────────────────────────
# CELERY TASK 0 — Generate Script Only (for user preview/edit)
# ─────────────────────────────────────────────

@shared_task(bind=True, max_retries=2, queue='video')
def generate_script_task(self, project_id):
    """
    GPT generates script + overlay data → saves to RenderJob.script_data
    → sets project.status = 'awaiting_script_approval'
    User can then edit the text before triggering video generation.
    """
    from apps.projects.models import Project
    from apps.video_engine.models import RenderJob

    project = Project.objects.get(pk=project_id)
    render_job, _ = RenderJob.objects.get_or_create(project=project)

    try:
        project.status = 'generating_script'
        project.save(update_fields=['status'])
        render_job.status = 'processing'
        render_job.progress = 5
        render_job.save()

        script_data = generate_script_with_ai(
            project.product_name, project.key_points,
            project.tone, project.duration or 15,
            include_person=project.include_person,
        )

        render_job.script_data = normalize_script_data(
            script_data,
            project.duration or 15,
            project.product_name,
        )
        render_job.status = 'pending'
        render_job.progress = 10
        render_job.save()

        project.status = 'awaiting_script_approval'
        project.save(update_fields=['status'])

        logger.info(f"Script ready for project {project_id}, awaiting approval")
        return f'Script generated for project {project_id}'

    except Exception as exc:
        render_job.status = 'failed'
        render_job.error = str(exc)
        render_job.save()
        project.status = 'failed'
        project.save(update_fields=['status'])
        logger.error(f'Script generation failed for project {project_id}: {exc}')
        raise self.retry(exc=exc, countdown=15)


# ─────────────────────────────────────────────
# CELERY TASK 1 — Phase 1: TTS + Submit Kling v2 (ASYNC)
# Worker is FREE after ~30s — no more 6-min block
# ─────────────────────────────────────────────

@shared_task(bind=True, max_retries=2, queue='video')
def generate_video_task(self, project_id):
    """
    Phase 1 — New async pipeline (no Flux, no image selection step):
    1. GPT → script + overlay data
    2. If person image uploaded → GPT-4o Vision → person description
    3. GPT → optimized Kling v2 motion prompt
    4. OpenAI TTS → audio
    5. Submit Kling v2 to fal.ai:
       - If product image uploaded → image-to-video (product as starting frame)
       - Otherwise → text-to-video
    6. Save state to DB → task ENDS, worker freed

    fal.ai will POST to /api/webhook/kling/ when done → triggers assemble_video_task.
    """
    from apps.projects.models import Project
    from apps.scripts.models import Script
    from apps.video_engine.models import RenderJob
    from core.ai.image_generator import (
        analyze_person_image_with_vision,
        generate_motion_prompt_for_kling,
        submit_kling_v2_text_to_video,
        submit_kling_v2_image_to_video,
    )

    project = Project.objects.get(pk=project_id)
    render_job, _ = RenderJob.objects.get_or_create(project=project)

    try:
        render_job.status   = 'processing'
        render_job.progress = 5
        render_job.save()

        project.status = 'generating_video'
        project.save(update_fields=['status'])

        target_duration = project.duration or 15
        media_dir = settings.MEDIA_ROOT
        for d in ['audio', 'videos', 'kling', 'kenburns']:
            os.makedirs(media_dir / d, exist_ok=True)

        # ── 1. Load approved script (set by ApproveScriptView) ──
        script_data = render_job.script_data or {}
        if not script_data:
            # Fallback: generate if not pre-approved (direct API call / legacy)
            script_data = generate_script_with_ai(
                project.product_name, project.key_points,
                project.tone, target_duration,
                include_person=project.include_person,
            )
        script_data = normalize_script_data(script_data, target_duration, project.product_name)

        hook      = script_data.get('hook', '')
        body      = script_data.get('body', [])
        cta       = script_data.get('cta', '')
        full_text = hook + ' ' + ' '.join(body) + ' ' + cta

        Script.objects.update_or_create(
            project=project,
            defaults={
                'hook':      hook,
                'full_text': full_text,
                'hashtags':  script_data.get('hashtags', []),
            }
        )
        render_job.progress = 12
        render_job.save()

        # ── 2. Analyze person image (if uploaded) ─────────────
        person_img = project.uploaded_images.filter(image_type='person').first() if project.include_person else None
        person_description = None
        if person_img:
            person_img_path = str(media_dir / person_img.image.name)
            person_description = analyze_person_image_with_vision(person_img_path)
            logger.info(f"Person description for project {project_id}: {person_description}")
        render_job.progress = 20
        render_job.save()

        # ── 3. Generate Kling v2 motion prompt ───────────────
        motion_prompt = generate_motion_prompt_for_kling(
            product_name=project.product_name,
            key_points=project.key_points,
            tone=project.tone,
            extra_requirements=project.extra_requirements or None,
            person_description=person_description,
            include_person=project.include_person,
        )
        logger.info(f"Motion prompt for project {project_id}: {motion_prompt[:100]}")
        render_job.progress = 28
        render_job.save()

        # ── 4. TTS ────────────────────────────────────────────
        audio_path = str(media_dir / f'audio/project_{project_id}.mp3')
        generate_voice(full_text, audio_path, voice=project.voice or 'nova')
        audio_duration = get_audio_duration(audio_path)
        logger.info(f"Audio duration for project {project_id}: {audio_duration:.2f}s")
        render_job.progress = 38
        render_job.save()

        # ── 5. Submit Kling v2 ASYNC ──────────────────────────
        product_img = project.uploaded_images.filter(image_type='product').first()
        kling_mode = 'image-to-video' if product_img else 'text-to-video'

        if product_img:
            # Build public URL for the product image
            product_image_url = f"https://clipdd.com/media/{product_img.image.name}"
            request_id = submit_kling_v2_image_to_video(
                image_url=product_image_url,
                prompt=motion_prompt,
                webhook_url=KLING_WEBHOOK_URL,
                duration_seconds=10,
            )
        else:
            request_id = submit_kling_v2_text_to_video(
                prompt=motion_prompt,
                webhook_url=KLING_WEBHOOK_URL,
                duration_seconds=10,
            )

        if not request_id:
            raise Exception('Kling v2 submit failed: no request_id returned')

        # ── 6. Save state to DB ───────────────────────────────
        render_job.kling_request_id = request_id
        render_job.script_data      = {**script_data, 'kling_mode': kling_mode}
        render_job.audio_duration   = audio_duration
        render_job.status           = 'awaiting_kling'
        render_job.progress         = 42
        render_job.save()

        project.status = 'generating_video'
        project.save(update_fields=['status'])

        logger.info(
            f"[Phase 1 DONE] project={project_id} mode={kling_mode} "
            f"kling_request_id={request_id} audio={audio_duration:.1f}s — worker freed"
        )

        # Schedule polling fallback in 8 min if webhook doesn't arrive
        poll_kling_fallback.apply_async(args=[project_id], countdown=480, queue='video')

        return f'Phase 1 done, Kling v2 {kling_mode} submitted (request_id={request_id})'

    except Exception as exc:
        render_job.status = 'failed'
        render_job.error  = str(exc)
        render_job.save()
        project.status = 'failed'
        project.save(update_fields=['status'])
        logger.error(f'Video Phase 1 failed for project {project_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)


# ─────────────────────────────────────────────
# CELERY TASK 3 — Phase 2: Assemble (triggered by Webhook)
# Ken Burns + Pillow overlay + FFmpeg
# ─────────────────────────────────────────────

@shared_task(bind=True, max_retries=2, queue='video')
def assemble_video_task(self, project_id, kling_video_url):
    """
    Phase 2 — triggered by KlingWebhookView after fal.ai POSTs back.
    Receives the ready Kling video URL and runs:
    - Download Kling video
    - Ken Burns segment
    - Pillow overlay PNG
    - FFmpeg: concat + overlay + subtitles + audio → final MP4
    """
    from apps.projects.models import Project
    from apps.video_engine.models import RenderJob, VideoOutput

    project   = Project.objects.get(pk=project_id)
    try:
        render_job = project.render_job
    except Exception:
        logger.error(f"assemble_video_task: no RenderJob for project {project_id}, aborting.")
        return f"No RenderJob for project {project_id}"

    try:
        render_job.status   = 'assembling'
        render_job.progress = 40
        render_job.save()

        # Restore state saved in Phase 1
        script_data    = render_job.script_data or {}
        audio_duration = render_job.audio_duration or 10.0
        target_duration = project.duration or 15

        scenes       = script_data.get('scenes', [])
        overlay_data = script_data.get('overlay', {
            'hook_line':     script_data.get('hook', '')[:20],
            'product_label': project.product_name,
            'cta_line':      script_data.get('cta', '')[:20],
            'hashtags':      script_data.get('hashtags', ['#TikTokขายของ']),
        })

        kling_dur = 10
        kb_dur = max(target_duration - kling_dur, 0)

        media_dir   = settings.MEDIA_ROOT
        audio_path  = str(media_dir / f'audio/project_{project_id}.mp3')
        kb_path     = str(media_dir / f'kenburns/project_{project_id}.mp4')
        kling1_path = str(media_dir / f'kling/project_{project_id}_1.mp4')
        final_path  = str(media_dir / f'videos/project_{project_id}.mp4')

        # ── 1. Download Kling video ───────────────────────────
        logger.info(f"Downloading Kling video: {kling_video_url}")
        download_file(kling_video_url, kling1_path)
        render_job.progress = 55
        render_job.save()

        # ── 2. Ken Burns segment (use uploaded product image if available) ──
        product_img = project.uploaded_images.filter(image_type='product').first()
        local_img   = str(media_dir / f'kling/project_{project_id}_img.jpg')
        has_kenburns = False

        if product_img:
            import shutil
            src = str(media_dir / product_img.image.name)
            if os.path.exists(src):
                shutil.copy2(src, local_img)
                has_kenburns = True
        elif project.generated_images.exists():
            # Legacy fallback: use generated image
            selected = project.generated_images.filter(is_selected=True).first() \
                       or project.generated_images.order_by('-created_at').first()
            if selected:
                download_file(selected.image_url, local_img)
                has_kenburns = True

        if has_kenburns:
            ken_burns_segment(local_img, kb_dur, kb_path, zoom_direction='out')
        render_job.progress = 72
        render_job.save()

        # ── 3. Pillow overlay PNG ─────────────────────────────
        overlay_png = build_overlay_frame(overlay_data, tone=project.tone)
        logger.info(f"Overlay PNG created: {overlay_png}")
        render_job.progress = 80
        render_job.save()

        # ── 4. Final FFmpeg render ────────────────────────────
        if has_kenburns:
            success = render_final_video(
                kling_path    = kling1_path,
                kb_path       = kb_path,
                overlay_png   = overlay_png,
                audio_path    = audio_path,
                output_path   = final_path,
                scenes        = scenes,
                kling_duration= kling_dur,
                kb_duration   = kb_dur,
                audio_duration= audio_duration,
            )
        else:
            success = render_kling_only(
                kling_path  = kling1_path,
                overlay_png = overlay_png,
                audio_path  = audio_path,
                output_path = final_path,
                scenes      = scenes,
            )
        if not success:
            raise Exception('FFmpeg final render failed')

        # ── 5. Save output ────────────────────────────────────
        VideoOutput.objects.update_or_create(
            project=project,
            defaults={
                'video_url': f'/media/videos/project_{project_id}.mp4',
                'audio_url': f'/media/audio/project_{project_id}.mp3',
                'duration':  target_duration,
            }
        )

        project.status      = 'done'
        project.save(update_fields=['status'])
        render_job.status   = 'done'
        render_job.progress = 100
        render_job.save()

        logger.info(f"[Phase 2 DONE] Video assembled for project {project_id}, audio={audio_duration:.1f}s")
        return f'Video assembled for project {project_id}'

    except Exception as exc:
        render_job.status = 'failed'
        render_job.error  = str(exc)
        render_job.save()
        project.status = 'failed'
        project.save(update_fields=['status'])
        logger.error(f'Video Phase 2 (assemble) failed for project {project_id}: {exc}')
        raise self.retry(exc=exc, countdown=30)


# ─────────────────────────────────────────────
# CELERY TASK 4 — Polling Fallback
# If fal.ai webhook was not received within 8 min, poll manually
# ─────────────────────────────────────────────

@shared_task(bind=True, max_retries=5, queue='video')
def poll_kling_fallback(self, project_id):
    """
    Fallback: poll fal.ai for Kling result if webhook never arrived.
    Runs 8 min after Phase 1. Retries every 2 min up to 5 times (total ~18 min).
    """
    from apps.video_engine.models import RenderJob
    from core.ai.image_generator import poll_kling_v2_result, poll_kling_result

    try:
        render_job = RenderJob.objects.get(project_id=project_id)
    except RenderJob.DoesNotExist:
        return 'No RenderJob found'

    # Only act if still waiting — webhook may have already fired
    if render_job.status != 'awaiting_kling':
        logger.info(f"[Poll fallback] project={project_id} status={render_job.status} — skipping (webhook already handled)")
        return f'Skipped (status={render_job.status})'

    request_id = render_job.kling_request_id
    if not request_id:
        logger.warning(f"[Poll fallback] project={project_id} has no kling_request_id")
        return 'No request_id'

    logger.info(f"[Poll fallback] Checking Kling result for project={project_id} request_id={request_id}")
    # Try Kling v2 first, fall back to v1.5
    script_data = render_job.script_data or {}
    kling_mode  = script_data.get('kling_mode', 'text-to-video')
    video_url   = poll_kling_v2_result(request_id, mode=kling_mode)
    if not video_url:
        video_url = poll_kling_result(request_id)  # v1.5 legacy fallback

    if video_url:
        logger.info(f"[Poll fallback] Got video URL, triggering assemble for project={project_id}")
        assemble_video_task.delay(project_id, video_url)
        return f'Fallback triggered assemble for project={project_id}'
    else:
        logger.info(f"[Poll fallback] Kling not ready yet for project={project_id}, will retry in 2 min")
        raise self.retry(countdown=120)  # retry in 2 minutes
