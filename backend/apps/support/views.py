import logging
import secrets
import urllib.request
import urllib.error
import json as json_lib
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings
from django.utils import timezone
from apps.video_engine.utils import absolute_media_url
from .models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# USER CHAT — system prompt + tools
# ─────────────────────────────────────────────

USER_SYSTEM_PROMPT = """คุณคือ ClipDD Assistant ผู้ช่วย AI อัจฉริยะประจำ clipdd.com

=== ClipDD คืออะไร ===
บริการสร้างคลิปขายของ TikTok อัตโนมัติด้วย AI — ไม่ต้องถ่ายวิดีโอเอง ไม่ต้องมีทักษะตัดต่อ แค่ใส่ชื่อสินค้า AI ทำให้ทุกอย่าง

=== ขั้นตอนการสร้างคลิป (ครบวงจร) ===
1. สมัครสมาชิก / เข้าสู่ระบบ
2. ใส่ชื่อสินค้า + จุดเด่น + เลือกโทนคลิป (เร่งด่วน / รีวิว / ดราม่า)
3. อัปโหลดรูปสินค้า (ไม่บังคับ แต่ช่วยให้ AI เข้าใจสินค้าได้ดีขึ้น)
4. AI วิเคราะห์สินค้าและเขียน Prompt → Flux Schnell สร้างภาพสินค้า 2 แบบ (ใช้เวลา ~30 วินาที)
5. เลือกภาพที่ชอบ → กด "สร้างคลิป"
6. AI เขียนสคริปต์ขาย → สร้างเสียงพากย์ภาษาไทย → Kling AI สร้างวิดีโอเคลื่อนไหว → ใส่คำบรรยาย
7. คลิปพร้อมดาวน์โหลด (ใช้เวลา ~3-5 นาที)

=== เวลาที่ใช้ ===
- สร้างภาพ: 30-60 วินาที
- สร้างคลิป 15 วินาที: 3-5 นาที
- สร้างคลิป 30 วินาที: 5-8 นาที

=== คุณภาพที่คาดหวังได้ ===
- ภาพสินค้า: สวยงาม professional สไตล์ TikTok ขายของ
- วิดีโอ: ภาพเคลื่อนไหวจาก Kling AI v1.5 Pro คุณภาพสูง
- เสียง: TTS ภาษาไทยชัดเจน หลายเสียงให้เลือก
- ข้อความ: คำบรรยายซ้อนทับ ใหญ่ อ่านง่าย เหมาะ TikTok
- ขนาด: MP4 9:16 (portrait) พร้อมลงโซเชียล

=== โทนคลิป 4 แบบ ===
- เร่งด่วน (Urgency): FOMO สูง กดออเดอร์ทันที สีสดใส พลังงานสูง
- รีวิว (Review): น่าเชื่อถือ สะอาด มืออาชีพ เหมือนรีวิวจริง
- ดราม่า (Drama): Before/After อารมณ์แรง contrast สูง
- Unboxing: แกะกล่อง reveal ความประหลาดใจ

=== ราคา / แพ็กเกจ ===
- Free: 1 คลิปฟรี ไม่ต้องใส่บัตรเครดิต
- Pro 299 บาท/เดือน: ไม่จำกัดคลิป + ทุก feature
- ความยาว: 15 หรือ 30 วินาที

=== FAQ ที่พบบ่อย ===
Q: ทำไมคลิปยังไม่เสร็จ?
A: คลิปปกติใช้ 3-5 นาที ถ้าเกิน 10 นาทีให้เช็ค status ด้วย get_project_status() หรือ refresh หน้า

Q: ภาพไม่ตรงกับสินค้า ทำยังไง?
A: อัปโหลดรูปสินค้าจริงด้วย หรือกด "สร้างภาพใหม่" เพื่อให้ AI ลองอีกรอบ

Q: คลิปใช้กับโซเชียลไหนได้บ้าง?
A: TikTok, Reels, Shorts — ขนาด 9:16 portrait เหมาะทุก platform

Q: เปลี่ยนเสียงพากย์ได้ไหม?
A: ได้ มีเสียงให้เลือกหลายแบบในหน้าสร้างคลิป

=== สิ่งที่คุณทำได้ ===
- อธิบายวิธีใช้งาน, ฟีเจอร์, ราคา ตอบตรง FAQ
- เช็ค status โปรเจคด้วย get_project_status()
- เช็คเครดิตด้วย get_user_credits()

=== ต้องส่งต่อ human (ขึ้นต้นด้วย ESCALATE:) ===
- ขอเงินคืน / refund / คืนเครดิต
- ปัญหาการชำระเงิน / payment
- complain รุนแรง หรือด่าทอ
- ต้องการ invoice / ใบเสร็จ

=== กฎ ===
- ตอบภาษาไทย กระชับ เป็นมิตร ไม่เกิน 4-5 ประโยค
- ถ้าไม่รู้จริงๆ ให้บอกตรงๆ อย่าเดา
- ถ้าต้องส่งต่อ human ให้ขึ้นต้นด้วย ESCALATE: ตามด้วยสรุปปัญหา"""

ESCALATE_KEYWORDS = ['คืนเงิน','refund','จ่ายเงิน','payment','โกง','แย่มาก',
                     'ไม่พอใจมาก','ร้องเรียน','ฟ้อง','ใบเสร็จ','invoice']

USER_TOOLS = [
    {"name": "get_project_status",
     "description": "ดู status ของ project",
     "parameters": {"type": "object", "properties": {"project_id": {"type": "integer"}}, "required": ["project_id"]}},
    {"name": "get_user_credits",
     "description": "ดูเครดิตคงเหลือ",
     "parameters": {"type": "object", "properties": {}}},
]

def call_user_function(name, args, user):
    if name == "get_user_credits":
        return {"credits": user.credits, "plan": user.plan}
    if name == "get_project_status":
        from apps.projects.models import Project
        try:
            p = Project.objects.get(pk=args.get("project_id"), user=user)
            d = {"id": p.id, "product": p.product_name, "status": p.status}
            try: d["progress"] = p.render_job.progress; d["error"] = p.render_job.error
            except: pass
            try:
                d["video_url"] = absolute_media_url(p.video.video_url)
            except Exception:
                pass
            return d
        except Project.DoesNotExist:
            return {"error": "ไม่พบโปรเจค"}
    return {"error": "unknown function"}


# ─────────────────────────────────────────────
# ADMIN AI — system prompt + tools
# ─────────────────────────────────────────────

ADMIN_SYSTEM_PROMPT = """คุณคือ ClipDD Admin AI ผู้ช่วยแอดมินสำหรับระบบ clipdd.com

=== สถาปัตยกรรมระบบ ===
- Frontend: Next.js 14 (App Router) รัน Docker container
- Backend: Django + DRF + Gunicorn รัน Docker container ชื่อ "web"
- Worker: Celery + Redis สำหรับ async tasks (generate_script_task, generate_video_task, assemble_video_task)
- DB: PostgreSQL
- AI Pipeline:
    • GPT-4o-mini → เขียน script + overlay data
    • Botnoi Voice / OpenAI TTS → เสียงพากย์ภาษาไทย
    • Kling AI v2 via Fal.ai → วิดีโอ (image-to-video หรือ text-to-video)
    • FFmpeg → Ken Burns + Pillow overlay + drawtext subtitle → MP4 สุดท้าย
- Chat Support: Gemini 2.0 Flash (user AI) / คุณ (admin AI)

=== Flow การสร้างคลิป ===
1. User กรอกชื่อสินค้า + เลือกโทน + อัปโหลดรูปสินค้า/คน (ไม่บังคับ)
2. generate_script_task: GPT เขียน script → status = 'awaiting_script_approval'
3. User ดู/แก้ไข script แล้วกด อนุมัติ
4. generate_video_task: TTS + ส่ง Kling v2 async → worker หยุด รอ webhook
5. fal.ai POST ไปยัง /api/webhook/kling/ เมื่อ Kling เสร็จ
6. assemble_video_task: Download Kling + Ken Burns + Pillow overlay + FFmpeg → MP4
7. status = 'done' → User ดาวน์โหลด

=== Status ของ Project ===
pending → generating_script → awaiting_script_approval → generating_video → awaiting_kling → done / failed

=== สิ่งที่คุณทำได้ ===
- ดึงข้อมูลสถิติระบบด้วย get_stats()
- ดูรายการ projects ด้วย get_projects(status, limit)
- ดู failed projects พร้อม error message ด้วย get_failed_projects(limit)
- ดูรายการ users ด้วย get_users(limit)
- ดู chat sessions ด้วย get_chat_sessions(filter, limit)

=== ปัญหาที่พบบ่อย ===
- Celery worker ค้าง: project stuck ใน generating_script/generating_video นาน → แนะนำ restart worker
- Kling timeout: fal.ai ใช้เวลานาน > 8 นาที → poll_kling_fallback task จะเตะอีกครั้ง
- FFmpeg error: ไฟล์เสียงหรือภาพเสีย → check media volume
- DB connection: PostgreSQL restart → check clipdd-db-1 container
- Redis: Celery ไม่รับงาน → check clipdd-redis-1 container

=== กฎ ===
- ตอบภาษาไทย กระชับ เป็นมิตร
- ถ้าถามปัญหา ให้ดึงข้อมูลจริงมาก่อนแล้ววิเคราะห์
- ให้คำแนะนำ Docker commands เมื่อจำเป็น"""

ADMIN_TOOLS = [
    {"name": "get_stats",
     "description": "ดูสถิติระบบทั้งหมด: users, projects, videos, chats",
     "parameters": {"type": "object", "properties": {}}},
    {"name": "get_projects",
     "description": "ดูรายการ projects",
     "parameters": {"type": "object", "properties": {
         "status": {"type": "string", "description": "filter by status: pending, generating_images, awaiting_selection, generating_video, done, failed (optional)"},
         "limit": {"type": "integer", "description": "จำนวน records (default 10)"}
     }}},
    {"name": "get_failed_projects",
     "description": "ดู projects ที่ failed พร้อม error message",
     "parameters": {"type": "object", "properties": {
         "limit": {"type": "integer", "description": "จำนวน records (default 10)"}
     }}},
    {"name": "get_users",
     "description": "ดูรายการ users",
     "parameters": {"type": "object", "properties": {
         "limit": {"type": "integer", "description": "จำนวน records (default 10)"}
     }}},
    {"name": "get_chat_sessions",
     "description": "ดู chat sessions",
     "parameters": {"type": "object", "properties": {
         "filter": {"type": "string", "description": "all, escalated, unread (default: all)"},
         "limit": {"type": "integer", "description": "จำนวน records (default 10)"}
     }}},
]

def call_admin_function(name, args):
    from apps.users.models import User
    from apps.projects.models import Project

    if name == "get_stats":
        today = timezone.now().date()
        try:
            from apps.video_engine.models import VideoOutput
            videos = VideoOutput.objects.count()
        except: videos = 0
        return {
            "users_total": User.objects.count(),
            "users_today": User.objects.filter(created_at__date=today).count(),
            "projects_total": Project.objects.count(),
            "projects_today": Project.objects.filter(created_at__date=today).count(),
            "videos_total": videos,
            "chats_total": ChatSession.objects.count(),
            "chats_escalated": ChatSession.objects.filter(human_takeover=True).count(),
            "projects_by_status": {s: Project.objects.filter(status=s).count()
                for s in ['pending','generating_images','awaiting_selection','generating_video','done','failed']},
        }

    if name == "get_projects":
        qs = Project.objects.select_related('user').order_by('-created_at')
        if args.get('status'):
            qs = qs.filter(status=args['status'])
        qs = qs[:args.get('limit', 10)]
        return [{"id": p.id, "product": p.product_name, "status": p.status,
                 "user": p.user.email, "created_at": str(p.created_at)[:16]} for p in qs]

    if name == "get_failed_projects":
        qs = Project.objects.select_related('user').filter(status='failed').order_by('-created_at')[:args.get('limit', 10)]
        result = []
        for p in qs:
            d = {"id": p.id, "product": p.product_name, "user": p.user.email, "created_at": str(p.created_at)[:16]}
            try: d["error"] = p.render_job.error
            except: d["error"] = None
            result.append(d)
        return result

    if name == "get_users":
        qs = User.objects.order_by('-created_at')[:args.get('limit', 10)]
        return [{"id": u.id, "email": u.email, "name": u.name,
                 "plan": u.plan, "credits": u.credits, "created_at": str(u.created_at)[:16]} for u in qs]

    if name == "get_chat_sessions":
        f = args.get('filter', 'all')
        qs = ChatSession.objects.select_related('user').order_by('-last_message_at')
        if f == 'escalated': qs = qs.filter(human_takeover=True)
        elif f == 'unread': qs = qs.filter(admin_unread__gt=0)
        qs = qs[:args.get('limit', 10)]
        return [{"id": s.id, "user": s.user.email, "human_takeover": s.human_takeover,
                 "admin_unread": s.admin_unread, "last_message_at": str(s.last_message_at)[:16]} for s in qs]

    return {"error": "unknown function"}



# ─────────────────────────────────────────────
# USER CHAT VIEWS
# ─────────────────────────────────────────────

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
                    fn_result = call_user_function(fc.name, dict(fc.args), request.user)
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
        except:
            return Response({'human_takeover': False, 'new_messages': []})


# ─────────────────────────────────────────────
# ADMIN VIEWS
# ─────────────────────────────────────────────

ADMIN_PASSWORD = getattr(settings, 'ADMIN_PANEL_PASSWORD', '') or ''

def check_admin(request):
    """
    Admin auth via X-Admin-Token. Token is still sent in the header (visible on HTTPS
    only to TLS); use compare_digest to avoid timing leaks vs plain ==.
    """
    correct = ADMIN_PASSWORD
    if not correct:
        return False
    token = request.headers.get('X-Admin-Token') or ''
    try:
        return secrets.compare_digest(token, correct)
    except (TypeError, ValueError):
        return False


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

        f = request.query_params.get('filter', 'all')
        qs = ChatSession.objects.select_related('user').order_by('-last_message_at')
        if f == 'escalated': qs = qs.filter(human_takeover=True)
        elif f == 'unread': qs = qs.filter(admin_unread__gt=0)
        sessions = qs[:50]

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


class AdminAIChatView(APIView):
    """Admin AI assistant — Gemini with system knowledge about ClipDD internals."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        user_message = request.data.get('message', '').strip()
        history = request.data.get('history', [])  # [{role, content}]
        if not user_message:
            return Response({'error': 'กรุณาพิมพ์ข้อความ'}, status=400)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)

            gemini_history = []
            for m in history:
                role = 'user' if m.get('role') == 'user' else 'model'
                gemini_history.append({'role': role, 'parts': [m.get('content', '')]})

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
                    fn_result = call_admin_function(fc.name, dict(fc.args))
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


class AdminCreditsView(APIView):
    """Fetch API credit/usage info from OpenAI and Fal.ai."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        from datetime import date
        result = {}

        # OpenAI — verify key + fetch current month usage
        try:
            openai_key = settings.OPENAI_API_KEY
            # Verify key is valid
            req = urllib.request.Request(
                'https://api.openai.com/v1/models',
                headers={'Authorization': f'Bearer {openai_key}'}
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                pass  # 200 = key valid

            # Fetch current month usage
            today = date.today()
            start = today.replace(day=1).strftime('%Y-%m-%d')
            end = today.strftime('%Y-%m-%d')
            req2 = urllib.request.Request(
                f'https://api.openai.com/dashboard/billing/usage?start_date={start}&end_date={end}',
                headers={'Authorization': f'Bearer {openai_key}'}
            )
            try:
                with urllib.request.urlopen(req2, timeout=8) as r2:
                    usage_data = json_lib.loads(r2.read())
                    total_usage_cents = usage_data.get('total_usage', 0)
                    result['openai'] = {
                        'status': 'ok',
                        'key_valid': True,
                        'monthly_usage_usd': round(total_usage_cents / 100, 4),
                        'period': f'{start} – {end}',
                    }
            except Exception:
                result['openai'] = {
                    'status': 'ok',
                    'key_valid': True,
                    'note': 'API Key ใช้งานได้ (ดู usage ที่ platform.openai.com/usage)',
                }

        except urllib.error.HTTPError as e:
            result['openai'] = {'status': 'error', 'key_valid': False, 'detail': f'HTTP {e.code}'}
        except Exception as e:
            result['openai'] = {'status': 'error', 'key_valid': False, 'detail': str(e)}

        # Fal.ai — no public balance API, just verify key is configured
        fal_key = settings.FAL_KEY
        if fal_key:
            result['fal'] = {
                'status': 'ok',
                'key_valid': True,
                'note': 'ดู balance ที่ fal.ai/dashboard/billing',
            }
        else:
            result['fal'] = {'status': 'error', 'key_valid': False, 'detail': 'FAL_KEY ไม่ได้ตั้งค่า'}

        # Gemini — no credit API
        result['gemini'] = {
            'model': 'gemini-2.0-flash',
            'status': 'active',
            'note': 'ไม่มี Balance API — ดูที่ aistudio.google.com',
        }

        return Response(result)


class AdminDemoClipView(APIView):
    """Upload or inspect demo clips for landing page."""
    permission_classes = [permissions.AllowAny]

    SLOTS = ['urgent', 'review', 'drama', 'unbox']

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        import time as time_mod
        result = {}
        for slot in self.SLOTS:
            path = settings.MEDIA_ROOT / 'demos' / f'{slot}.mp4'
            if path.exists():
                stat = path.stat()
                result[slot] = {
                    'exists': True,
                    'size_kb': stat.st_size // 1024,
                    'updated_ts': stat.st_mtime,
                    'url': f'/media/demos/{slot}.mp4',
                }
            else:
                result[slot] = {'exists': False}
        return Response(result)

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        slot = request.data.get('slot', '').strip()
        file = request.FILES.get('file')
        if slot not in self.SLOTS:
            return Response({'detail': f'slot ต้องเป็น: {", ".join(self.SLOTS)}'}, status=400)
        if not file:
            return Response({'detail': 'กรุณาแนบไฟล์ video/mp4'}, status=400)
        if not file.name.lower().endswith('.mp4'):
            return Response({'detail': 'ไฟล์ต้องเป็น .mp4 เท่านั้น'}, status=400)

        dest = settings.MEDIA_ROOT / 'demos' / f'{slot}.mp4'
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)

        stat = dest.stat()
        return Response({
            'detail': 'อัปโหลดสำเร็จ',
            'slot': slot,
            'size_kb': stat.st_size // 1024,
            'url': f'/media/demos/{slot}.mp4',
        })
