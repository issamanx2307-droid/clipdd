"""
Chat views — user chat (Gemini AI) and admin chat management.
"""
import logging
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .models import ChatSession, ChatMessage
from .views_shared import check_admin

logger = logging.getLogger(__name__)

# ── User chat prompts ────────────────────────────────────────────────────────

USER_SYSTEM_PROMPT = """คุณคือ ClipDD Assistant ผู้ช่วย AI อัจฉริยะประจำ clipdd.com

=== ClipDD คืออะไร ===
บริการสร้างคลิปขายของ TikTok อัตโนมัติด้วย AI — ไม่ต้องถ่ายวิดีโอเอง ไม่ต้องมีทักษะตัดต่อ แค่ใส่ชื่อสินค้า AI ทำให้ทุกอย่าง

=== ขั้นตอนการสร้างคลิป ===
1. สมัครสมาชิก / เข้าสู่ระบบ
2. ใส่ชื่อสินค้า + จุดเด่น + เลือกโทนคลิป
3. อัปโหลดรูปสินค้า (ไม่บังคับ)
4. AI เขียนสคริปต์ → เสียงพากย์ → วิดีโอ → MP4

=== ราคา / แพ็กเกจ ===
- Free: 1 คลิปฟรี ไม่ต้องใส่บัตรเครดิต
- Pro 299 บาท/เดือน: ไม่จำกัดคลิป + ทุก feature

=== ต้องส่งต่อ human (ขึ้นต้นด้วย ESCALATE:) ===
- ขอเงินคืน / refund / คืนเครดิต
- ปัญหาการชำระเงิน / payment
- complain รุนแรง หรือด่าทอ
- ต้องการ invoice / ใบเสร็จ

=== กฎ ===
- ตอบภาษาไทย กระชับ เป็นมิตร ไม่เกิน 4-5 ประโยค
- ถ้าไม่รู้จริงๆ ให้บอกตรงๆ อย่าเดา"""

ESCALATE_KEYWORDS = ['คืนเงิน', 'refund', 'จ่ายเงิน', 'payment', 'โกง', 'แย่มาก',
                     'ไม่พอใจมาก', 'ร้องเรียน', 'ฟ้อง', 'ใบเสร็จ', 'invoice']

USER_TOOLS = [
    {"name": "get_project_status",
     "description": "ดู status ของ project",
     "parameters": {"type": "object", "properties": {"project_id": {"type": "integer"}}, "required": ["project_id"]}},
    {"name": "get_user_credits",
     "description": "ดูเครดิตคงเหลือ",
     "parameters": {"type": "object", "properties": {}}},
]


def _call_user_function(name, args, user):
    if name == "get_user_credits":
        return {"credits": user.credits, "plan": user.plan}
    if name == "get_project_status":
        from apps.projects.models import Project
        from apps.video_engine.utils import absolute_media_url
        try:
            p = Project.objects.get(pk=args.get("project_id"), user=user)
            d = {"id": p.id, "product": p.product_name, "status": p.status}
            try:
                d["progress"] = p.render_job.progress
                d["error"] = p.render_job.error
            except Exception:
                pass
            try:
                d["video_url"] = absolute_media_url(p.video.video_url)
            except Exception:
                pass
            return d
        except Project.DoesNotExist:
            return {"error": "ไม่พบโปรเจค"}
    return {"error": "unknown function"}


# ── User Chat Views ──────────────────────────────────────────────────────────

class ChatView(APIView):
    def post(self, request):
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'กรุณาพิมพ์ข้อความ'}, status=400)

        session, _ = ChatSession.objects.get_or_create(user=request.user)
        ChatMessage.objects.create(session=session, role='user', content=user_message)
        session.admin_unread += 1
        session.save(update_fields=['admin_unread', 'last_message_at'])

        if session.human_takeover:
            return Response({
                'reply': '⏳ ทีมงานได้รับข้อความแล้ว กำลังตอบกลับในไม่ช้า...',
                'escalate': False,
                'human_takeover': True,
            })

        needs_escalate = any(k in user_message.lower() for k in ESCALATE_KEYWORDS)
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)

            db_messages = session.messages.order_by('-created_at')[:20]
            history = []
            for m in reversed(list(db_messages)):
                if m.role == 'user':
                    history.append({'role': 'user', 'parts': [m.content]})
                elif m.role in ('ai', 'admin'):
                    history.append({'role': 'model', 'parts': [m.content]})

            model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                system_instruction=USER_SYSTEM_PROMPT,
                tools=[{"function_declarations": USER_TOOLS}] if not needs_escalate else None,
            )
            chat = model.start_chat(history=history[:-1])
            response = chat.send_message(user_message)

            reply_text = None
            for part in response.parts:
                if hasattr(part, 'function_call') and part.function_call.name:
                    fc = part.function_call
                    fn_result = _call_user_function(fc.name, dict(fc.args), request.user)
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

            ChatMessage.objects.create(session=session, role='ai', content=reply_text, escalate=escalate)
            return Response({'reply': reply_text, 'escalate': escalate, 'human_takeover': escalate})

        except Exception as e:
            logger.error(f"Gemini error: {e}")
            reply = 'ขออภัย ระบบขัดข้องชั่วคราว กรุณาลองใหม่'
            ChatMessage.objects.create(session=session, role='ai', content=reply)
            return Response({'reply': reply, 'escalate': False})


class ChatPollView(APIView):
    def get(self, request):
        try:
            session = request.user.chat_session
            new_msgs = session.messages.filter(role='admin').order_by('-created_at')[:5]
            if session.user_unread > 0:
                session.user_unread = 0
                session.save(update_fields=['user_unread'])
            return Response({
                'human_takeover': session.human_takeover,
                'new_messages': [{'id': m.id, 'role': m.role, 'content': m.content, 'created_at': m.created_at} for m in reversed(new_msgs)],
            })
        except Exception:
            logger.exception('ChatPollView error')
            return Response({'human_takeover': False, 'new_messages': []})


# ── Admin Chat Views ─────────────────────────────────────────────────────────

class AdminChatListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        f = request.query_params.get('filter', 'all')
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = 20
        offset = (page - 1) * page_size

        qs = ChatSession.objects.select_related('user').prefetch_related('messages').order_by('-last_message_at')
        if f == 'escalated':
            qs = qs.filter(human_takeover=True)
        elif f == 'unread':
            qs = qs.filter(admin_unread__gt=0)

        total = qs.count()
        sessions = qs[offset:offset + page_size]

        data = []
        for s in sessions:
            # Use prefetched messages — no extra query per session
            msgs = list(s.messages.all())
            last = msgs[-1] if msgs else None
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

        return Response({
            'results': data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'has_next': (offset + page_size) < total,
        })


class AdminChatDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, session_id):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            session = ChatSession.objects.select_related('user').get(pk=session_id)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

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
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'detail': 'กรุณาพิมพ์ข้อความ'}, status=400)

        try:
            session = ChatSession.objects.get(pk=session_id)
        except ChatSession.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)

        msg = ChatMessage.objects.create(session=session, role='admin', content=content)
        session.human_takeover = True
        session.user_unread += 1
        session.save(update_fields=['human_takeover', 'user_unread', 'last_message_at'])

        return Response({'id': msg.id, 'role': 'admin', 'content': msg.content, 'created_at': msg.created_at})


class AdminReleaseChatView(APIView):
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


# ── Admin AI Assistant ────────────────────────────────────────────────────────

ADMIN_SYSTEM_PROMPT = """คุณคือ ClipDD Admin AI ผู้ช่วยแอดมินสำหรับระบบ clipdd.com

=== สถาปัตยกรรมระบบ ===
- Frontend: Next.js 14 (App Router) รัน Docker container
- Backend: Django + DRF + Gunicorn รัน Docker container ชื่อ "web"
- Worker: Celery + Redis สำหรับ async tasks
- DB: PostgreSQL
- AI Pipeline: GPT-4o-mini → Botnoi TTS → Kling v2 (fal.ai) → FFmpeg

=== Status ของ Project ===
pending → generating_script → awaiting_script_approval → generating_video → awaiting_kling → done / failed

=== กฎ ===
- ตอบภาษาไทย กระชับ เป็นมิตร
- ถ้าถามปัญหา ให้ดึงข้อมูลจริงมาก่อนแล้ววิเคราะห์"""

ADMIN_TOOLS = [
    {"name": "get_stats", "description": "ดูสถิติระบบทั้งหมด",
     "parameters": {"type": "object", "properties": {}}},
    {"name": "get_projects", "description": "ดูรายการ projects",
     "parameters": {"type": "object", "properties": {
         "status": {"type": "string"},
         "limit": {"type": "integer"},
     }}},
    {"name": "get_failed_projects", "description": "ดู projects ที่ failed พร้อม error",
     "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}}},
    {"name": "get_users", "description": "ดูรายการ users",
     "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}}},
    {"name": "get_chat_sessions", "description": "ดู chat sessions",
     "parameters": {"type": "object", "properties": {
         "filter": {"type": "string"},
         "limit": {"type": "integer"},
     }}},
]


def _call_admin_function(name, args):
    from apps.users.models import User
    from apps.projects.models import Project
    from .models import ChatSession

    if name == "get_stats":
        from django.utils import timezone
        today = timezone.now().date()
        try:
            from apps.video_engine.models import VideoOutput
            videos = VideoOutput.objects.count()
        except Exception:
            videos = 0
        return {
            "users_total": User.objects.count(),
            "users_today": User.objects.filter(created_at__date=today).count(),
            "projects_total": Project.objects.count(),
            "projects_today": Project.objects.filter(created_at__date=today).count(),
            "videos_total": videos,
            "chats_total": ChatSession.objects.count(),
            "chats_escalated": ChatSession.objects.filter(human_takeover=True).count(),
            "projects_by_status": {s: Project.objects.filter(status=s).count()
                for s in ['pending', 'generating_video', 'done', 'failed']},
        }

    if name == "get_projects":
        qs = Project.objects.select_related('user').order_by('-created_at')
        if args.get('status'):
            qs = qs.filter(status=args['status'])
        return [{"id": p.id, "product": p.product_name, "status": p.status,
                 "user": p.user.email, "created_at": str(p.created_at)[:16]}
                for p in qs[:args.get('limit', 10)]]

    if name == "get_failed_projects":
        qs = (Project.objects.select_related('user', 'render_job')
              .filter(status='failed').order_by('-created_at')[:args.get('limit', 10)])
        return [{"id": p.id, "product": p.product_name, "user": p.user.email,
                 "error": getattr(getattr(p, 'render_job', None), 'error', None),
                 "created_at": str(p.created_at)[:16]} for p in qs]

    if name == "get_users":
        qs = User.objects.order_by('-created_at')[:args.get('limit', 10)]
        return [{"id": u.id, "email": u.email, "credits": u.credits,
                 "created_at": str(u.created_at)[:16]} for u in qs]

    if name == "get_chat_sessions":
        f = args.get('filter', 'all')
        qs = ChatSession.objects.select_related('user').order_by('-last_message_at')
        if f == 'escalated':
            qs = qs.filter(human_takeover=True)
        elif f == 'unread':
            qs = qs.filter(admin_unread__gt=0)
        return [{"id": s.id, "user": s.user.email, "human_takeover": s.human_takeover,
                 "admin_unread": s.admin_unread} for s in qs[:args.get('limit', 10)]]

    return {"error": "unknown function"}


class AdminAIChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        user_message = request.data.get('message', '').strip()
        history = request.data.get('history', [])
        if not user_message:
            return Response({'error': 'กรุณาพิมพ์ข้อความ'}, status=400)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)

            gemini_history = [
                {'role': 'user' if m.get('role') == 'user' else 'model',
                 'parts': [m.get('content', '')]}
                for m in history
            ]

            model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                system_instruction=ADMIN_SYSTEM_PROMPT,
                tools=[{"function_declarations": ADMIN_TOOLS}],
            )
            chat = model.start_chat(history=gemini_history)
            response = chat.send_message(user_message)

            reply_text = None
            for part in response.parts:
                if hasattr(part, 'function_call') and part.function_call.name:
                    fc = part.function_call
                    fn_result = _call_admin_function(fc.name, dict(fc.args))
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

            return Response({'reply': reply_text})

        except Exception as e:
            logger.error(f"Admin AI error: {e}")
            return Response({'reply': f'ขออภัย เกิดข้อผิดพลาด: {str(e)}'})
