import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings
from django.utils import timezone
from .models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """คุณคือ ClipDD Assistant ผู้ช่วย AI สำหรับ clipdd.com

=== เกี่ยวกับ ClipDD ===
- บริการสร้างคลิปขายของ TikTok อัตโนมัติด้วย AI
- สมัครฟรีได้ 1 คลิป ไม่ต้องใส่บัตรเครดิต
- แพ็กเกจ Pro 299 บาท/เดือน ไม่จำกัดคลิป
- ความยาวคลิป: 15 วินาที หรือ 30 วินาที
- Flow: ใส่ชื่อสินค้า → AI สร้างภาพ 2 ใบ → เลือกภาพ → AI สร้างคลิป

=== สิ่งที่คุณทำได้เอง ===
- อธิบายวิธีใช้งาน, ฟีเจอร์, ราคา
- แก้ไข prompt สินค้า
- เช็ค status โปรเจคด้วย get_project_status()
- เช็คเครดิตด้วย get_user_credits()

=== ต้องส่งต่อ human (ขึ้นต้นด้วย ESCALATE:) ===
- ขอเงินคืน / refund
- ปัญหาการชำระเงิน / payment
- complain รุนแรง หรือด่าทอ
- ต้องการ invoice / ใบเสร็จ

=== กฎ ===
- ตอบภาษาไทย กระชับ เป็นมิตร ไม่เกิน 3-4 ประโยค
- ถ้าต้องส่งต่อ human ให้ขึ้นต้นด้วย ESCALATE: ตามด้วยสรุปปัญหา"""

ESCALATE_KEYWORDS = ['คืนเงิน','refund','จ่ายเงิน','payment','โกง','แย่มาก',
                     'ไม่พอใจมาก','ร้องเรียน','ฟ้อง','ใบเสร็จ','invoice']

TOOLS = [
    {"name": "get_project_status",
     "description": "ดู status ของ project",
     "parameters": {"type": "object", "properties": {"project_id": {"type": "integer"}}, "required": ["project_id"]}},
    {"name": "get_user_credits",
     "description": "ดูเครดิตคงเหลือ",
     "parameters": {"type": "object", "properties": {}}},
]

def call_function(name, args, user):
    if name == "get_user_credits":
        return {"credits": user.credits, "plan": user.plan}
    if name == "get_project_status":
        from apps.projects.models import Project
        try:
            p = Project.objects.get(pk=args.get("project_id"), user=user)
            d = {"id": p.id, "product": p.product_name, "status": p.status}
            try: d["progress"] = p.render_job.progress; d["error"] = p.render_job.error
            except: pass
            try: d["video_url"] = p.video.video_url
            except: pass
            return d
        except Project.DoesNotExist:
            return {"error": "ไม่พบโปรเจค"}
    return {"error": "unknown function"}


# ─────────────────────────────────────────────
# USER CHAT
# ─────────────────────────────────────────────

class ChatView(APIView):
    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'กรุณาพิมพ์ข้อความ'}, status=400)

        # Get or create session
        session, _ = ChatSession.objects.get_or_create(user=request.user)

        # Save user message
        ChatMessage.objects.create(session=session, role='user', content=user_message)
        session.admin_unread += 1
        session.save(update_fields=['admin_unread', 'last_message_at'])

        # Human takeover mode → queue for admin
        if session.human_takeover:
            return Response({
                'reply': '⏳ ทีมงานได้รับข้อความแล้ว กำลังตอบกลับในไม่ช้า...',
                'escalate': False,
                'human_takeover': True,
            })

        # Call Gemini
        needs_escalate = any(k in user_message.lower() for k in ESCALATE_KEYWORDS)
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)

            # Build history from DB (last 10 messages)
            db_messages = session.messages.order_by('-created_at')[:20]
            history = []
            for m in reversed(list(db_messages)):
                if m.role == 'user':
                    history.append({'role': 'user', 'parts': [m.content]})
                elif m.role in ('ai', 'admin'):
                    history.append({'role': 'model', 'parts': [m.content]})

            model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                system_instruction=SYSTEM_PROMPT,
                tools=[{"function_declarations": TOOLS}] if not needs_escalate else None,
            )
            chat = model.start_chat(history=history[:-1])  # exclude latest user msg
            response = chat.send_message(user_message)

            reply_text = None
            fn_result = None

            for part in response.parts:
                if hasattr(part, 'function_call') and part.function_call.name:
                    fc = part.function_call
                    fn_result = call_function(fc.name, dict(fc.args), request.user)
                    fn_response = chat.send_message(
                        genai.protos.Content(parts=[genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=fc.name, response={"result": fn_result}
                            )
                        )])
                    )
                    reply_text = fn_response.text
                    break

            if reply_text is None:
                reply_text = response.text

            escalate = needs_escalate or reply_text.startswith('ESCALATE:')

            if escalate:
                summary = reply_text.replace('ESCALATE:', '').strip()
                reply_text = f'ขออภัยครับ เรื่องนี้ต้องการทีมงานดูแล กรุณารอสักครู่ ทีมงานจะตอบกลับโดยเร็ว\n\n(สรุปปัญหา: {summary})'
                session.human_takeover = True
                session.save(update_fields=['human_takeover'])

            # Save AI reply
            ChatMessage.objects.create(session=session, role='ai', content=reply_text, escalate=escalate)

            return Response({'reply': reply_text, 'escalate': escalate, 'human_takeover': escalate})

        except Exception as e:
            logger.error(f"Gemini error: {e}")
            reply = 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่'
            ChatMessage.objects.create(session=session, role='ai', content=reply)
            return Response({'reply': reply, 'escalate': False})


class ChatPollView(APIView):
    """Poll for new admin replies."""
    def get(self, request):
        try:
            session = request.user.chat_session
            new_msgs = session.messages.filter(role='admin').order_by('-created_at')[:5]
            if session.user_unread > 0:
                session.user_unread = 0
                session.save(update_fields=['user_unread'])
            return Response({
                'human_takeover': session.human_takeover,
                'new_messages': [{'role': m.role, 'content': m.content, 'created_at': m.created_at} for m in reversed(new_msgs)],
            })
        except:
            return Response({'human_takeover': False, 'new_messages': []})


# ─────────────────────────────────────────────
# ADMIN VIEWS
# ─────────────────────────────────────────────

ADMIN_PASSWORD = settings.ADMIN_PANEL_PASSWORD

def check_admin(request):
    """Simple token check via header X-Admin-Token."""
    return request.headers.get('X-Admin-Token') == ADMIN_PASSWORD


class AdminDashboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        from apps.users.models import User
        from apps.projects.models import Project
        from apps.video_engine.models import VideoOutput

        today = timezone.now().date()
        return Response({
            'users_total': User.objects.count(),
            'users_today': User.objects.filter(created_at__date=today).count(),
            'projects_total': Project.objects.count(),
            'projects_today': Project.objects.filter(created_at__date=today).count(),
            'videos_total': VideoOutput.objects.count(),
            'chats_total': ChatSession.objects.count(),
            'chats_unread': ChatSession.objects.filter(admin_unread__gt=0).count(),
            'chats_escalated': ChatSession.objects.filter(human_takeover=True).count(),
            'projects_by_status': {
                s: Project.objects.filter(status=s).count()
                for s in ['done', 'failed', 'generating_video', 'awaiting_selection']
            },
        })


class AdminChatListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        sessions = ChatSession.objects.select_related('user').order_by('-last_message_at')[:50]
        data = []
        for s in sessions:
            last = s.messages.last()
            data.append({
                'id': s.id,
                'user_email': s.user.email,
                'user_name': s.user.name,
                'human_takeover': s.human_takeover,
                'admin_unread': s.admin_unread,
                'last_message': last.content[:80] if last else '',
                'last_role': last.role if last else '',
                'last_message_at': s.last_message_at,
            })
        return Response(data)


class AdminChatDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, session_id):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            session = ChatSession.objects.select_related('user').get(pk=session_id)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

        # Reset unread
        session.admin_unread = 0
        session.save(update_fields=['admin_unread'])

        messages = session.messages.all()
        return Response({
            'session_id': session.id,
            'user_email': session.user.email,
            'user_name': session.user.name,
            'human_takeover': session.human_takeover,
            'messages': [{'id': m.id, 'role': m.role, 'content': m.content, 'escalate': m.escalate, 'created_at': m.created_at} for m in messages],
        })

    def post(self, request, session_id):
        """Admin reply."""
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'detail': 'กรุณาพิมพ์ข้อความ'}, status=400)

        try:
            session = ChatSession.objects.get(pk=session_id)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

        # Save admin message + set human_takeover
        msg = ChatMessage.objects.create(session=session, role='admin', content=content)
        session.human_takeover = True
        session.user_unread += 1
        session.save(update_fields=['human_takeover', 'user_unread', 'last_message_at'])

        return Response({'id': msg.id, 'role': 'admin', 'content': msg.content, 'created_at': msg.created_at})


class AdminReleaseChatView(APIView):
    """Release human_takeover → AI handles again."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, session_id):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            session = ChatSession.objects.get(pk=session_id)
            session.human_takeover = False
            session.save(update_fields=['human_takeover'])
            return Response({'detail': 'AI กลับมาตอบแล้ว'})
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
