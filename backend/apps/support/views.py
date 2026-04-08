import json
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """คุณคือ ClipDD Assistant ผู้ช่วย AI สำหรับ clipdd.com

=== เกี่ยวกับ ClipDD ===
- บริการสร้างคลิปขายของ TikTok อัตโนมัติด้วย AI
- ลูกค้าใส่ชื่อสินค้า → AI สร้างภาพ 2 ใบ → เลือกภาพ → AI สร้างคลิป
- สมัครฟรีได้ 1 คลิป ไม่ต้องใส่บัตรเครดิต
- แพ็กเกจ Pro 299 บาท/เดือน ไม่จำกัดคลิป
- ความยาวคลิป: 15 วินาที หรือ 30 วินาที
- AI สร้างภาพด้วย Flux Schnell, วิดีโอด้วย Kling AI, เสียงด้วย OpenAI TTS

=== สิ่งที่คุณทำได้เอง ===
- อธิบายวิธีใช้งาน, ฟีเจอร์, ราคา
- แก้ไข prompt สินค้า (แนะนำให้ใส่จุดเด่นให้ละเอียดขึ้น)
- เช็ค status โปรเจคด้วย get_project_status()
- เช็คเครดิตด้วย get_user_credits()
- อธิบาย free tier และแผนราคา

=== ต้องส่งต่อ human (ตอบว่า ESCALATE) ===
- ขอเงินคืน / refund
- ปัญหาการชำระเงิน / payment
- complain รุนแรง หรือด่าทอ
- สอบถามเรื่อง invoice / ใบเสร็จ
- ต้องการสรุปข้อมูลลูกค้าให้เจ้าของธุรกิจ

=== กฎ ===
- ตอบภาษาไทย กระชับ เป็นมิตร
- ถ้าต้องส่งต่อ human ให้ขึ้นต้นด้วย "ESCALATE:" ตามด้วยสรุปปัญหา
- ถ้าใช้ function ให้เรียก function ก่อนตอบ"""

ESCALATE_KEYWORDS = ['คืนเงิน','refund','จ่ายเงิน','payment','โกง','แย่มาก',
                     'ไม่พอใจมาก','ร้องเรียน','ฟ้อง','ใบเสร็จ','invoice']

TOOLS = [
    {
        "name": "get_project_status",
        "description": "ดู status และ progress ของ project",
        "parameters": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "ID ของโปรเจค"}
            },
            "required": ["project_id"]
        }
    },
    {
        "name": "get_user_credits",
        "description": "ดูเครดิตคงเหลือของลูกค้า",
        "parameters": {"type": "object", "properties": {}}
    }
]

def call_function(name, args, user):
    if name == "get_user_credits":
        return {"credits": user.credits, "plan": user.plan}

    if name == "get_project_status":
        from apps.projects.models import Project
        try:
            project = Project.objects.get(pk=args.get("project_id"), user=user)
            data = {"id": project.id, "product": project.product_name, "status": project.status}
            try:
                data["progress"] = project.render_job.progress
                data["error"] = project.render_job.error
            except: pass
            try:
                data["video_url"] = project.video.video_url
            except: pass
            return data
        except Project.DoesNotExist:
            return {"error": "ไม่พบโปรเจคนี้"}

    return {"error": "unknown function"}


class ChatView(APIView):
    def post(self, request):
        user_message = request.data.get('message', '').strip()
        history = request.data.get('history', [])   # [{role, content}]

        if not user_message:
            return Response({'error': 'กรุณาพิมพ์ข้อความ'}, status=status.HTTP_400_BAD_REQUEST)

        # Quick escalation check
        lower = user_message.lower()
        needs_escalate = any(k in lower for k in ESCALATE_KEYWORDS)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)

            model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                system_instruction=SYSTEM_PROMPT,
                tools=[{"function_declarations": TOOLS}] if not needs_escalate else None,
            )

            # Build history for Gemini
            gemini_history = []
            for msg in history[-10:]:   # keep last 10 turns
                role = 'user' if msg['role'] == 'user' else 'model'
                gemini_history.append({'role': role, 'parts': [msg['content']]})

            chat = model.start_chat(history=gemini_history)
            response = chat.send_message(user_message)

            # Handle function calls
            reply_text = None
            fn_result = None

            for part in response.parts:
                if hasattr(part, 'function_call') and part.function_call.name:
                    fc = part.function_call
                    args = dict(fc.args)
                    fn_result = call_function(fc.name, args, request.user)

                    # Send function result back
                    import google.generativeai as genai2
                    from google.generativeai.types import content_types
                    fn_response = chat.send_message(
                        genai2.protos.Content(parts=[genai2.protos.Part(
                            function_response=genai2.protos.FunctionResponse(
                                name=fc.name,
                                response={"result": fn_result}
                            )
                        )])
                    )
                    reply_text = fn_response.text
                    break

            if reply_text is None:
                reply_text = response.text

            # Check escalation in reply
            escalate = needs_escalate or reply_text.startswith('ESCALATE:')
            if escalate:
                summary = reply_text.replace('ESCALATE:', '').strip()
                return Response({
                    'reply': f'ขออภัยครับ เรื่องนี้ต้องการความช่วยเหลือจากทีมงาน กรุณาติดต่อ support@clipdd.com\n\n({summary})',
                    'escalate': True,
                    'function_result': fn_result,
                })

            return Response({
                'reply': reply_text,
                'escalate': False,
                'function_result': fn_result,
            })

        except Exception as e:
            logger.error(f"Gemini chat error: {e}")
            return Response({'reply': 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง', 'escalate': False})
