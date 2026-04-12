"""
video_engine/utils.py
Utility functions shared between tasks.py and other modules.
Kept separate to avoid circular imports.
"""


def _template_script(product_name, tone, scene_count=4, duration=15):
    """Fallback script template when GPT fails."""
    hooks = {
        'urgency': f'หยุดก่อน! {product_name} กำลังหมด',
        'review':  f'ลองแล้วปัง! {product_name} ดีจริง',
        'drama':   f'ชีวิตเปลี่ยนเพราะ {product_name}',
        'unbox':   f'แกะกล่อง {product_name} มาดูกัน',
    }
    ctas = {
        'urgency': 'กดตะกร้าด่วนเลย!',
        'review':  'ลองดูแล้วจะรู้ กดสั่งเลย',
        'drama':   'อย่ารอช้า กดตะกร้าเดี๋ยวนี้',
        'unbox':   'สั่งได้เลยนะคะ กดตะกร้า',
    }
    hook = hooks.get(tone, hooks['urgency'])
    cta  = ctas.get(tone, ctas['urgency'])
    body = [f'{product_name} คุณภาพดีมาก', 'ราคาคุ้ม ส่งฟรี']
    seg  = (duration * 0.7) / scene_count
    scenes_text = [hook] + body[:scene_count-2] + [cta]
    scenes = [{"text": t, "sec": round(seg, 1)} for t in scenes_text[:scene_count]]
    return {
        'hook': hook,
        'body': body,
        'cta': cta,
        'scenes': scenes,
        'motion_prompt': f'smooth cinematic product reveal of {product_name}, gentle zoom in, soft commercial lighting',
        'overlay': {
            'hook_line': hook[:20],
            'product_label': product_name[:30],
            'cta_line': cta[:20],
            'hashtags': [f'#{product_name.replace(" ","")}', '#TikTokขายของ'],
        },
        'hashtags': [f'#{product_name.replace(" ","")}', '#TikTokขายของ', '#ของดีบอกต่อ'],
    }


def normalize_script_data(script_data, duration, product_name=''):
    """
    Normalize edited/generated script payload so downstream steps always have:
    hook/body/cta/overlay/hashtags/scenes
    """
    data = dict(script_data or {})
    hook = str(data.get('hook') or '').strip()
    raw_body = data.get('body') or []
    body = [str(item).strip() for item in raw_body if str(item).strip()] if isinstance(raw_body, list) else []
    cta = str(data.get('cta') or '').strip()

    overlay = data.get('overlay') if isinstance(data.get('overlay'), dict) else {}
    hashtags = data.get('hashtags') if isinstance(data.get('hashtags'), list) else []
    if not hashtags:
        hashtags = overlay.get('hashtags') if isinstance(overlay.get('hashtags'), list) else []
    if not hashtags:
        base_tag = f'#{product_name.replace(" ", "")}' if product_name else '#TikTokขายของ'
        hashtags = [base_tag, '#TikTokขายของ', '#ของดีบอกต่อ']

    scene_count = 4 if duration <= 15 else 6
    scene_texts = [part for part in [hook, *body, cta] if part][:scene_count]

    existing_scenes = data.get('scenes') if isinstance(data.get('scenes'), list) else []
    if len(existing_scenes) == len(scene_texts) and scene_texts:
        scenes = []
        for idx, text in enumerate(scene_texts):
            existing = existing_scenes[idx] if isinstance(existing_scenes[idx], dict) else {}
            scenes.append({
                'text': text,
                'sec': float(existing.get('sec', 2.5)),
            })
    elif scene_texts:
        seg = round((duration * 0.7) / len(scene_texts), 1)
        scenes = [{'text': text, 'sec': seg} for text in scene_texts]
    else:
        scenes = []

    return {
        **data,
        'hook': hook,
        'body': body,
        'cta': cta,
        'hashtags': hashtags,
        'scenes': scenes,
        'overlay': {
            **overlay,
            'hook_line': str(overlay.get('hook_line') or hook[:20]).strip(),
            'product_label': str(overlay.get('product_label') or product_name[:30]).strip(),
            'cta_line': str(overlay.get('cta_line') or cta[:25]).strip(),
            'hashtags': hashtags,
        },
    }


def absolute_media_url(url):
    """
    If url is relative (/media/...), prefix settings.SITE_URL.
    Already-absolute http(s) URLs are returned unchanged.
    """
    from django.conf import settings

    if not url:
        return None
    url = str(url).strip()
    if url.startswith(('http://', 'https://')):
        return url
    base = getattr(settings, 'SITE_URL', 'https://clipdd.com').rstrip('/')
    path = url if url.startswith('/') else f'/{url}'
    return f'{base}{path}'
