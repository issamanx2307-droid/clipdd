import os
import logging
import base64
import fal_client
from django.conf import settings

logger = logging.getLogger(__name__)


def _set_fal_key():
    os.environ['FAL_KEY'] = settings.FAL_KEY


def analyze_and_write_prompt(product_name, key_points, tone, uploaded_image_paths=None):
    """
    Use GPT-4o-mini (vision) to analyze product + reference images,
    then write an optimized Flux Schnell prompt.
    Returns: str prompt
    """
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    tone_map = {
        'urgency': 'เร่งด่วน น่าซื้อ สีสดใส พลังงานสูง',
        'review':  'น่าเชื่อถือ สะอาด มืออาชีพ',
        'drama':   'ดราม่า อารมณ์แรง contrast สูง',
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

    messages[0]['content'].append({
        "type": "text",
        "text": f"""คุณเป็นผู้เชี่ยวชาญเขียน prompt สำหรับ Flux image generation เพื่อสร้างภาพสินค้าขาย TikTok ไทย

สินค้า: {product_name}
จุดเด่น: {key_points or 'ไม่ระบุ'}
โทน: {tone_desc}
{ref_note}

เขียน prompt ภาษาอังกฤษสำหรับ Flux Schnell:
- สไตล์: commercial product photography, TikTok-ready
- แสง: bright, dramatic lighting
- พื้นหลัง: clean gradient หรือ lifestyle background ที่เหมาะกับสินค้า
- คุณภาพ: sharp, vibrant, 9:16 portrait
- ไม่ต้องมีข้อความในภาพ

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
    Generate video from image using Kling v1.5 via fal.ai (image-to-video).
    Returns: video URL (str) or None
    """
    _set_fal_key()

    # Kling duration must be "5" or "10"
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
