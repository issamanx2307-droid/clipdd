import os
import logging
import base64
import json
import fal_client
from django.conf import settings

logger = logging.getLogger(__name__)


def _set_fal_key():
    os.environ['FAL_KEY'] = settings.FAL_KEY


def _read_fal_response(resp):
    if resp.ok:
        return resp.json()

    detail = ''
    try:
        payload = resp.json()
        if isinstance(payload, dict):
            detail = (
                payload.get('detail')
                or payload.get('error')
                or payload.get('message')
                or json.dumps(payload, ensure_ascii=False)
            )
        else:
            detail = json.dumps(payload, ensure_ascii=False)
    except ValueError:
        detail = (resp.text or '').strip()

    detail = detail[:400] if detail else f'HTTP {resp.status_code}'
    raise Exception(f'fal.ai request failed ({resp.status_code}): {detail}')


def analyze_and_write_prompt(product_name, key_points, tone, uploaded_image_paths=None, include_person=True):
    """
    Use GPT-4o-mini (vision) to analyze product + reference images,
    then write an optimized Flux Schnell prompt.
    include_person=True → prompt includes a real person using/holding the product (default).
    Returns: str prompt
    """
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    tone_map = {
        'urgency': 'เร่งด่วน น่าซื้อ สีสดใส พลังงานสูง',
        'review':  'น่าเชื่อถือ สะอาด มืออาชีพ',
        'drama':   'ดราม่า อารมณ์แรง contrast สูง',
        'unbox':   'ตื่นเต้น สดใส น่าสนใจ',
    }
    tone_desc = tone_map.get(tone, tone_map['urgency'])

    messages = [
        {
            "role": "user",
            "content": []
        }
    ]

    # Add reference images if provided
    if uploaded_image_paths:
        for img_path in uploaded_image_paths[:2]:
            try:
                with open(img_path, 'rb') as f:
                    img_data = base64.b64encode(f.read()).decode('utf-8')
                ext = img_path.rsplit('.', 1)[-1].lower()
                mime = f"image/{'jpeg' if ext in ['jpg','jpeg'] else ext}"
                messages[0]['content'].append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{img_data}"}
                })
            except Exception as e:
                logger.warning(f"Could not load image {img_path}: {e}")

    ref_note = "มีภาพสินค้าต้นฉบับแนบมาด้วย นำมาใช้เป็น reference สไตล์และสีสัน" if uploaded_image_paths else "ไม่มีภาพต้นฉบับ ให้จินตนาการภาพสินค้าจากชื่อและจุดเด่น"

    if include_person:
        person_note = """- ต้องมีคนในภาพ: สาวไทยอายุ 20-30 ปี สวย natural กำลังถือหรือใช้สินค้า
- คนต้องเด่นชัด มองเห็นหน้าและมือพร้อมสินค้า
- ท่าทาง: เป็นธรรมชาติ เช่น ถือสินค้าหันหน้าตรง หรือยิ้มมองกล้อง
- สไตล์: lifestyle photography, influencer-style, TikTok creator look
- ไม่ใส่ข้อความในภาพ"""
    else:
        person_note = """- สไตล์: commercial product-only photography, clean and professional
- ไม่มีคนในภาพ เน้นสินค้าอย่างเดียว
- ไม่ใส่ข้อความในภาพ"""

    messages[0]['content'].append({
        "type": "text",
        "text": f"""คุณเป็นผู้เชี่ยวชาญเขียน prompt สำหรับ Flux image generation เพื่อสร้างภาพขาย TikTok ไทย

สินค้า: {product_name}
จุดเด่น: {key_points or 'ไม่ระบุ'}
โทน: {tone_desc}
{ref_note}

เขียน prompt ภาษาอังกฤษสำหรับ Flux Schnell:
{person_note}
- แสง: bright, dramatic lighting
- พื้นหลัง: clean gradient หรือ lifestyle background ที่เหมาะกับสินค้า
- คุณภาพ: sharp, vibrant, 9:16 portrait

ตอบเฉพาะ prompt เท่านั้น ไม่ต้องอธิบาย ความยาวไม่เกิน 150 คำ"""
    })

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=200,
    )
    return response.choices[0].message.content.strip()


def generate_images_flux(prompt, num_images=2):
    """
    Generate images using Flux Schnell via fal.ai.
    Returns: list of image URLs
    """
    _set_fal_key()

    result = fal_client.run(
        "fal-ai/flux/schnell",
        arguments={
            "prompt": prompt,
            "num_images": num_images,
            "image_size": "portrait_4_3",  # closest to 9:16
            "num_inference_steps": 4,
            "enable_safety_checker": True,
        }
    )

    urls = [img['url'] for img in result.get('images', [])]
    logger.info(f"Flux generated {len(urls)} images")
    return urls


def generate_video_kling(image_url, motion_prompt, duration_seconds=10):
    """
    [SYNC - legacy] Generate video from image using Kling v1.5 via fal.ai.
    Blocks until complete (~3-6 min). Use submit_video_kling() for async.
    Returns: video URL (str) or None
    """
    _set_fal_key()

    kling_duration = "10" if duration_seconds >= 8 else "5"

    result = fal_client.run(
        "fal-ai/kling-video/v1.5/pro/image-to-video",
        arguments={
            "image_url": image_url,
            "prompt": motion_prompt,
            "duration": kling_duration,
            "aspect_ratio": "9:16",
        }
    )

    video_url = result.get('video', {}).get('url')
    logger.info(f"Kling generated video: {video_url}")
    return video_url


def submit_video_kling(image_url, motion_prompt, webhook_url, duration_seconds=10):
    """
    [ASYNC] Submit Kling job to fal.ai queue.
    Returns request_id immediately — does NOT wait for video.
    fal.ai will POST to webhook_url when done.

    NOTE: fal.ai requires webhook as a QUERY PARAMETER (?fal_webhook=URL),
    NOT as a body field.
    """
    import requests as _requests
    from urllib.parse import quote

    _set_fal_key()
    fal_key = os.environ.get('FAL_KEY', '')
    kling_duration = "10" if duration_seconds >= 8 else "5"

    # webhook must be a query param — fal.ai ignores it in the body
    queue_url = (
        "https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video"
        f"?fal_webhook={quote(webhook_url, safe='')}"
    )

    resp = _requests.post(
        queue_url,
        headers={
            "Authorization": f"Key {fal_key}",
            "Content-Type": "application/json",
        },
        json={
            "image_url":    image_url,
            "prompt":       motion_prompt,
            "duration":     kling_duration,
            "aspect_ratio": "9:16",
        },
        timeout=30,
    )
    data = _read_fal_response(resp)
    request_id = data.get("request_id")
    logger.info(f"Kling submitted async, request_id={request_id}, webhook={webhook_url}")
    return request_id


def analyze_person_image_with_vision(image_path):
    """
    Use GPT-4o Vision to analyze a person image and return a text description
    for use in the Kling motion prompt.
    Returns: str description (English)
    """
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    try:
        with open(image_path, 'rb') as f:
            img_data = base64.b64encode(f.read()).decode('utf-8')
        ext = image_path.rsplit('.', 1)[-1].lower()
        mime = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"

        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{img_data}"}
                    },
                    {
                        "type": "text",
                        "text": """Describe this person precisely for use in a Kling v2 video generation prompt.
Include: gender, approximate age, ethnicity, face features, hair (length/color/style), clothing (color/style/fabric), accessories, skin tone, overall vibe/energy.
Write in English only. Be specific and visual — this description will be used to recreate this person realistically in AI video.
Example: 'a Thai woman in her late 20s, long straight black hair, fair skin, wearing a fitted coral-pink crop top and high-waist jeans, natural makeup with glossy lips, confident and friendly expression, influencer aesthetic'"""
                    }
                ]
            }],
            max_tokens=150,
        )
        description = response.choices[0].message.content.strip()
        logger.info(f"Person description: {description}")
        return description
    except Exception as e:
        logger.warning(f"Person image analysis failed: {e}")
        return "a young Thai woman in her 20s, natural and friendly appearance"


def generate_motion_prompt_for_kling(product_name, key_points, tone, extra_requirements=None, person_description=None, include_person=True):
    """
    Use GPT-4o-mini to generate an optimized Kling v2 motion prompt.
    Returns: str (English prompt)
    """
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    tone_map = {
        'urgency': 'urgent, high-energy, vibrant colors, fast-paced TikTok commercial',
        'review':  'trustworthy, clean, professional review-style',
        'drama':   'dramatic, emotional, high contrast, cinematic storytelling',
        'unbox':   'exciting unboxing reveal, dynamic, joyful, curiosity-building',
    }
    tone_desc = tone_map.get(tone, tone_map['urgency'])

    if include_person:
        person_part = (
            f"The main subject is {person_description}. She is naturally holding or using the product."
            if person_description
            else "Include a beautiful young Thai woman naturally holding or using the product."
        )
    else:
        person_part = "No people in the video. Focus entirely on the product."

    extra_part = f"\nAdditional requirements: {extra_requirements}" if extra_requirements else ""

    tone_camera = {
        'urgency': 'fast dynamic push-in, slight handheld energy, quick rack focus on product',
        'review':  'slow steady zoom in, deliberate and confident camera movement, close-up detail shots',
        'drama':   'dramatic slow motion, sweeping cinematic pan, extreme close-up for impact',
        'unbox':   'revealing camera tilt-up or pull-back, curious exploratory movement, POV-style',
    }
    tone_light = {
        'urgency': 'vibrant warm-toned studio lighting, saturated colors, high contrast, commercial pop',
        'review':  'soft natural daylight or ring light, clean neutral tones, product details sharp',
        'drama':   'moody side lighting with warm accent, deep shadows, cinematic color grade',
        'unbox':   'bright cheerful overexposed look, clean white or pastel background, joyful energy',
    }
    cam   = tone_camera.get(tone, tone_camera['urgency'])
    light = tone_light.get(tone, tone_light['urgency'])

    prompt_text = f"""You are an expert Kling v2 video prompt engineer specializing in TikTok product commercials.

Write a Kling v2 motion prompt for this product video. Be highly specific and visual.

PRODUCT: {product_name}
KEY FEATURES: {key_points or 'not specified'}
TONE/STYLE: {tone_desc}
SUBJECT: {person_part}
CAMERA: {cam}
LIGHTING: {light}{extra_part}

REQUIREMENTS:
- 9:16 portrait format (TikTok vertical)
- No text, watermarks, or UI elements in the video
- Photorealistic quality, cinematic look
- Motion must feel intentional and smooth
- Colors should be vivid and attention-grabbing
- Background must complement the product (not distract)
- Every detail matters: describe textures, reflections, depth of field if relevant

Reply with ONLY the Kling prompt in English. 100-150 words. No explanation, no labels."""

    try:
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[{"role": "user", "content": prompt_text}],
            max_tokens=220,
        )
        result = response.choices[0].message.content.strip()
        logger.info(f"Kling v2 motion prompt generated: {result[:80]}")
        return result
    except Exception as e:
        logger.warning(f"Motion prompt generation failed: {e}")
        if include_person:
            return (
                f"A beautiful young Thai woman holding {product_name}, "
                f"TikTok lifestyle photography, bright warm lighting, "
                f"smooth camera zoom in, clean background, vibrant and sharp, 9:16 portrait"
            )
        return (
            f"A cinematic product-only commercial for {product_name}, "
            f"bright warm lighting, smooth camera zoom in, clean background, "
            f"vibrant and sharp, 9:16 portrait, no people"
        )


def submit_kling_v2_text_to_video(prompt, webhook_url, duration_seconds=10):
    """
    [ASYNC] Submit Kling v2.0 text-to-video job to fal.ai queue.
    Returns request_id immediately.
    """
    import requests as _requests
    from urllib.parse import quote

    _set_fal_key()
    fal_key = os.environ.get('FAL_KEY', '')
    kling_duration = "10" if duration_seconds >= 8 else "5"

    queue_url = (
        "https://queue.fal.run/fal-ai/kling-video/v2/master/text-to-video"
        f"?fal_webhook={quote(webhook_url, safe='')}"
    )

    resp = _requests.post(
        queue_url,
        headers={
            "Authorization": f"Key {fal_key}",
            "Content-Type": "application/json",
        },
        json={
            "prompt":       prompt,
            "duration":     kling_duration,
            "aspect_ratio": "9:16",
        },
        timeout=30,
    )
    data = _read_fal_response(resp)
    request_id = data.get("request_id")
    logger.info(f"Kling v2 text-to-video submitted, request_id={request_id}, webhook={webhook_url}")
    return request_id


def submit_kling_v2_image_to_video(image_url, prompt, webhook_url, duration_seconds=10):
    """
    [ASYNC] Submit Kling v2.0 image-to-video job to fal.ai queue.
    Uses provided image as the starting frame.
    Returns request_id immediately.
    """
    import requests as _requests
    from urllib.parse import quote

    _set_fal_key()
    fal_key = os.environ.get('FAL_KEY', '')
    kling_duration = "10" if duration_seconds >= 8 else "5"

    queue_url = (
        "https://queue.fal.run/fal-ai/kling-video/v2/master/image-to-video"
        f"?fal_webhook={quote(webhook_url, safe='')}"
    )

    resp = _requests.post(
        queue_url,
        headers={
            "Authorization": f"Key {fal_key}",
            "Content-Type": "application/json",
        },
        json={
            "image_url":    image_url,
            "prompt":       prompt,
            "duration":     kling_duration,
            "aspect_ratio": "9:16",
        },
        timeout=30,
    )
    data = _read_fal_response(resp)
    request_id = data.get("request_id")
    logger.info(f"Kling v2 image-to-video submitted, request_id={request_id}, webhook={webhook_url}")
    return request_id


def poll_kling_v2_result(request_id, mode='text-to-video'):
    """
    [POLLING FALLBACK] Fetch Kling v2 result for a request_id.
    mode: 'text-to-video' or 'image-to-video'
    Returns video_url or None if not ready.
    """
    _set_fal_key()
    endpoint = f"fal-ai/kling-video/v2/master/{mode}"
    try:
        result = fal_client.result(endpoint, request_id)
        video_url = result.get('video', {}).get('url')
        logger.info(f"Kling v2 poll result: request_id={request_id} url={video_url}")
        return video_url
    except Exception as e:
        logger.warning(f"Kling v2 poll failed for {request_id}: {e}")
        return None


def poll_kling_result(request_id):
    """
    [POLLING FALLBACK] Fetch Kling result for a request_id.
    Used when webhook is not received (e.g. fal.ai retry failed).
    Returns video_url or None if not ready.
    """
    _set_fal_key()
    try:
        result = fal_client.result(
            "fal-ai/kling-video/v1.5/pro/image-to-video",
            request_id,
        )
        video_url = result.get('video', {}).get('url')
        logger.info(f"Kling poll result: request_id={request_id} url={video_url}")
        return video_url
    except Exception as e:
        logger.warning(f"Kling poll failed for {request_id}: {e}")
        return None
