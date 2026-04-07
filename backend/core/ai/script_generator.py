import os
from openai import OpenAI
import json

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MASTER_PROMPT = """คุณคือผู้เชี่ยวชาญทำคลิป TikTok สายขายของในประเทศไทย
สร้างสคริปต์คลิปสั้น 15-25 วินาที เพื่อขายสินค้า

สินค้า: {product_name}
จุดเด่น: {key_points}
โทน: {tone}

เงื่อนไข:
- Hook 3 วินาทีแรกต้องหยุดคนดูได้
- ใช้ภาษาไทยง่ายๆ เหมือนแม่ค้า TikTok
- มี CTA ชัด เช่น "กดตะกร้า"
- ไม่ยาวเกิน 4-5 ประโยค

ตอบเป็น JSON เท่านั้น:
{{"hook": "...", "body": ["...", "..."], "cta": "...", "hashtags": ["#..."]}}"""

def generate_script(product_name: str, key_points: str, tone: str = "urgency") -> dict:
    prompt = MASTER_PROMPT.format(
        product_name=product_name,
        key_points=key_points,
        tone=tone
    )
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
