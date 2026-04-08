import logging
import urllib.request
import urllib.error
import json as json_lib
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.conf import settings
from django.utils import timezone
from .models import ChatSession, ChatMessage

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# USER CHAT — system prompt + tools
# ─────────────────────────────────────────────

USER_SYSTEM_PROMPT = """คุณคือ ClipDD Assistant ผู้ช่วย AI สำหรับ clipdd.com

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
            try: d["video_url"] = p.video.video_url
            except: pass
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
- Worker: Celery + Redis สำหรับ async tasks (generate_images_task, generate_video_task)
- DB: PostgreSQL
- AI Pipeline: GPT-4o-mini (script/prompt) → Flux Schnell via Fal.ai (image gen) → Kling AI v1.5 via Fal.ai (video) → OpenAI TTS (voice) → FFmpeg (Ken Burns + subtitles)
- Chat Support: Gemini 2.0 Flash (user AI) / คุณ (admin AI)

=== Flow การสร้างคลิป ===
1. User กรอกชื่อสินค้า → generate_images_task ทำงาน
2. GPT-4o-mini วิเคราะห์และเขียน prompt → Flux Schnell สร้างภาพ 2 ใบ
3. User เลือกภาพ → generate_video_task ทำงาน
4. สร้าง script → TTS voice → Kling AI (video 10-20s) → FFmpeg Ken Burns → stitch → drawtext subtitle
5. Video พร้อม → user ดาวน์โหลด

=== Status ของ Project ===
- pending → generating_images → awaiting_selection → generating_video → done / failed

=== สิ่งที่คุณทำได้ ===
- ดึงข้อมูลสถิติระบบด้วย get_stats()
- ดูรายการ projects ด้วย get_projects(status, limit)
- ดู failed projects พร้อม error message ด้วย get_failed_projects(limit)
- ดูรายการ users ด้วย get_users(limit)
- ดู chat sessions ด้วย get_chat_sessions(filter, limit)

=== ปัญหาที่พบบ่อย ===
- Celery worker ค้าง: project stuck ใน generating_images/generating_video นาน → แนะนำ restart worker
- Kling timeout: Fal.ai ใช้เวลานาน > 5 นาที → check FAL_KEY, Fal.ai quota
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


def _call_gemini(system_prompt, history, user_message, tools=None):
    """Shared Gemini call helper. Returns reply_text."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name='gemini-2.0-flash',
        system_instruction=system_prompt,
        tools=[{"function_declarations": tools}] if tools else None,
    )
    chat = model.start_chat(history=history)
    response = chat.send_message(user_message)

    # Handle function calls
    for part in response.parts:
        if hasattr(part, 'function_call') and part.function_call.name:
            fc = part.function_call
            fn_result = yield (fc.name, dict(fc.args))  # generator: caller provides result
            fn_response = chat.send_message(
                genai.protos.Content(parts=[genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=fc.name, response={"result": fn_result}
                    )
                )])
            )
            return fn_response.text

    return response.text


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

ADMIN_PASSWORD = settings.ADMIN_PANEL_PASSWORD

def check_admin(request):
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
    """Fetch API credit balances from OpenAI and Fal.ai."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        result = {}

        # OpenAI — credit grants (prepaid balance)
        try:
            openai_key = settings.OPENAI_API_KEY
            req = urllib.request.Request(
                'https://api.openai.com/dashboard/billing/credit_grants',
                headers={'Authorization': f'Bearer {openai_key}'}
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                data = json_lib.loads(r.read())
                result['openai'] = {
                    'total_granted': data.get('total_granted', 0),
                    'total_used': data.get('total_used', 0),
                    'total_available': data.get('total_available', 0),
                    'currency': 'USD',
                    'status': 'ok',
                }
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # Pay-as-you-go: try subscription endpoint
                try:
                    req2 = urllib.request.Request(
                        'https://api.openai.com/dashboard/billing/subscription',
                        headers={'Authorization': f'Bearer {settings.OPENAI_API_KEY}'}
                    )
                    with urllib.request.urlopen(req2, timeout=8) as r2:
                        data2 = json_lib.loads(r2.read())
                        result['openai'] = {
                            'plan': data2.get('plan', {}).get('title', 'Pay-as-you-go'),
                            'hard_limit_usd': data2.get('hard_limit_usd'),
                            'soft_limit_usd': data2.get('soft_limit_usd'),
                            'status': 'payg',
                        }
                except Exception as e2:
                    result['openai'] = {'status': 'error', 'detail': str(e2)}
            else:
                result['openai'] = {'status': 'error', 'detail': str(e)}
        except Exception as e:
            result['openai'] = {'status': 'error', 'detail': str(e)}

        # Fal.ai — user profile/balance
        try:
            fal_key = settings.FAL_KEY
            req = urllib.request.Request(
                'https://rest.alpha.fal.ai/v1/user/balance',
                headers={'Authorization': f'Key {fal_key}'}
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                data = json_lib.loads(r.read())
                result['fal'] = {'balance': data.get('balance'), 'currency': 'USD', 'status': 'ok'}
        except urllib.error.HTTPError as e:
            body = e.read().decode() if hasattr(e, 'read') else ''
            result['fal'] = {'status': 'error', 'detail': f'HTTP {e.code}', 'body': body[:200]}
        except Exception as e:
            result['fal'] = {'status': 'error', 'detail': str(e)}

        # Gemini — no credit API, return config info
        result['gemini'] = {
            'model': 'gemini-2.0-flash',
            'status': 'active',
            'note': 'Google AI ไม่มี balance API',
        }

        return Response(result)
