import logging
import secrets
import urllib.request
import urllib.error
import json as json_lib
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.utils import timezone
from apps.video_engine.utils import absolute_media_url
from .models import ChatSession, ChatMessage, SiteContent, ClipThumbnail, Article
from apps.video_engine.models import RenderJob

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# SITE CONTENT DEFAULTS
# ─────────────────────────────────────────────

DEFAULT_SITE_CONTENT = {
    'hero': {
        'badge': 'มีร้านค้าใช้งานแล้ว 1,000+ ร้าน',
        'title_line1': 'สร้างคลิปขายของ',
        'title_accent': 'TikTok อัตโนมัติ',
        'title_sub': 'ด้วย AI ใน 60 วินาที',
        'desc': 'ใส่สินค้า → AI เขียนสคริปต์ + พากย์เสียง + ตัดต่อวิดีโอให้อัตโนมัติ\nไม่ต้องมีทักษะตัดต่อ · ไม่ต้องจ้างช่างวิดีโอ',
        'cta_primary': 'สมัครฟรี — ลองสร้าง 1 คลิป',
        'cta_secondary': 'เข้าระบบสร้างคลิป →',
        'note': '✓ ฟรี 1 คลิปแรก · ✓ ไม่ต้องบัตรเครดิต · ✓ เริ่มได้ทันที',
    },
    'stats': [
        {'value': '1,000+', 'label': 'ร้านค้าใช้งาน'},
        {'value': '50,000+', 'label': 'คลิปที่สร้างแล้ว'},
        {'value': '< 1 นาที', 'label': 'เวลาสร้างคลิป'},
        {'value': '4.9 ★', 'label': 'คะแนนความพึงพอใจ'},
    ],
    'deals': [
        {'id': 1, 'emoji': '💡', 'title': 'ไฟ Ring Light LED', 'desc': 'แสงสวย เซลฟี่คลิปชัด ขายของออนไลน์ดูน่าเชื่อถือขึ้น', 'price': '฿299', 'badge': 'ขายดี', 'bg': 'linear-gradient(135deg,#FFF7ED,#FED7AA)', 'url': '/deals'},
        {'id': 2, 'emoji': '🎙️', 'title': 'ไมโครโฟน Clip-on', 'desc': 'เสียงพากย์ใสชัด ไม่มีเสียงรบกวน เหมาะกับ TikTok Live', 'price': '฿490', 'badge': 'แนะนำ', 'bg': 'linear-gradient(135deg,#F5F3FF,#DDD6FE)', 'url': '/deals'},
        {'id': 3, 'emoji': '📱', 'title': 'ขาตั้งโทรศัพท์', 'desc': 'ถ่ายคลิปคนเดียวได้ มุมกล้องปรับได้ 360 องศา', 'price': '฿199', 'badge': 'ใหม่', 'bg': 'linear-gradient(135deg,#F0F9FF,#BAE6FD)', 'url': '/deals'},
        {'id': 4, 'emoji': '🎬', 'title': 'Green Screen ผ้าพื้นเขียว', 'desc': 'เปลี่ยนแบ็คกราวนด์ได้ทุกแบบ ทำ effect ดูโปร', 'price': '฿350', 'badge': 'ฮิต', 'bg': 'linear-gradient(135deg,#F0FDF4,#BBF7D0)', 'url': '/deals'},
    ],
    'articles': [
        {'id': 1, 'cat': 'เทคนิค TikTok', 'bg': 'linear-gradient(135deg,#FFF7ED,#FED7AA)', 'catColor': '#FF7A00', 'title': '10 วิธีเพิ่มยอดวิวคลิปสินค้าบน TikTok ให้ได้ล้านวิวใน 2025', 'excerpt': 'เทคนิคที่ร้านค้าหลายร้านใช้จนยอดขายพุ่ง ปรับได้ทันที', 'readTime': '5 นาที', 'url': '/articles'},
        {'id': 2, 'cat': 'สคริปต์คลิป', 'bg': 'linear-gradient(135deg,#F5F3FF,#DDD6FE)', 'catColor': '#7C3AED', 'title': 'สูตรเขียนสคริปต์ขายของสไตล์ Viral — Hook 3 วินาทีแรก', 'excerpt': 'โครงสร้างสคริปต์ที่ AI ของเราใช้ พร้อมตัวอย่างคลิปขายดีจริง', 'readTime': '7 นาที', 'url': '/articles'},
        {'id': 3, 'cat': 'เพิ่มยอดขาย', 'bg': 'linear-gradient(135deg,#F0FDF4,#BBF7D0)', 'catColor': '#059669', 'title': 'เปรียบเทียบ: ร้านที่ใช้ AI สร้างคลิปกับร้านที่ถ่ายเองธรรมดา', 'excerpt': 'เคสจริงจากร้านค้าใน ClipDD วิเคราะห์ยอดวิว engagement และ conversion', 'readTime': '6 นาที', 'url': '/articles'},
    ],
}

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
            except Exception: pass
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
            except Exception: d["error"] = None
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
        except Exception:
            logger.exception('ChatPollView error')
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
        from apps.video_engine.models import VideoOutput, RenderJob

        today = timezone.now().date()

        # Recent failed projects with error messages
        failed_qs = (
            Project.objects
            .select_related('render_job', 'user')
            .filter(status='failed')
            .order_by('-created_at')[:5]
        )
        recent_failures = []
        for p in failed_qs:
            err = ''
            try:
                err = p.render_job.error or ''
            except Exception:
                pass
            recent_failures.append({
                'id': p.id,
                'product': p.product_name,
                'user': p.user.email,
                'error': err[:200],
                'created_at': p.created_at.strftime('%d/%m %H:%M'),
            })

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
                for s in ['done', 'failed', 'generating_video', 'awaiting_script_approval', 'generating_script']
            },
            'recent_failures': recent_failures,
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

        # OpenAI — verify key + billing subscription + current month usage
        try:
            openai_key = getattr(settings, 'OPENAI_API_KEY', '')
            if not openai_key:
                raise ValueError('OPENAI_API_KEY ไม่ได้ตั้งค่า')
            req = urllib.request.Request(
                'https://api.openai.com/v1/models',
                headers={'Authorization': f'Bearer {openai_key}'}
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                pass  # 200 = key valid

            today = date.today()
            start = today.replace(day=1).strftime('%Y-%m-%d')
            end = today.strftime('%Y-%m-%d')

            # Subscription (credit limit)
            sub_data = {}
            try:
                req_sub = urllib.request.Request(
                    'https://api.openai.com/dashboard/billing/subscription',
                    headers={'Authorization': f'Bearer {openai_key}'}
                )
                with urllib.request.urlopen(req_sub, timeout=8) as rs:
                    sub_data = json_lib.loads(rs.read())
            except Exception:
                pass

            # Monthly usage
            usage_usd = None
            try:
                req_usage = urllib.request.Request(
                    f'https://api.openai.com/dashboard/billing/usage?start_date={start}&end_date={end}',
                    headers={'Authorization': f'Bearer {openai_key}'}
                )
                with urllib.request.urlopen(req_usage, timeout=8) as r2:
                    usage_data = json_lib.loads(r2.read())
                    usage_usd = round(usage_data.get('total_usage', 0) / 100, 4)
            except Exception:
                pass

            hard_limit = sub_data.get('hard_limit_usd')
            r = {'status': 'ok', 'key_valid': True}
            if usage_usd is not None:
                r['monthly_usage_usd'] = usage_usd
                r['period'] = f'{start} – {end}'
            if hard_limit:
                r['hard_limit_usd'] = round(float(hard_limit), 2)
                if usage_usd is not None:
                    r['remaining_usd'] = round(float(hard_limit) - usage_usd, 4)
            if usage_usd is None and not hard_limit:
                r['note'] = 'API Key ใช้งานได้ (ดู usage ที่ platform.openai.com/usage)'
            result['openai'] = r

        except urllib.error.HTTPError as e:
            result['openai'] = {'status': 'error', 'key_valid': False, 'detail': f'HTTP {e.code}'}
        except Exception as e:
            result['openai'] = {'status': 'error', 'key_valid': False, 'detail': str(e)}

        # Fal.ai — live account check via actual Kling endpoint
        # GET to the queue endpoint: 403 = locked/bad key, 4xx/5xx other = account OK
        fal_key = getattr(settings, 'FAL_KEY', '')
        if fal_key:
            LIVE_CHECK_URL = 'https://queue.fal.run/fal-ai/kling-video/v2/master/image-to-video'
            LOCK_KEYWORDS = ('locked', 'exhausted', 'billing', 'insufficient', 'payment required')
            try:
                req_live = urllib.request.Request(
                    LIVE_CHECK_URL,
                    headers={'Authorization': f'Key {fal_key}'},
                )
                try:
                    urllib.request.urlopen(req_live, timeout=6)
                    # 200 = account OK (unlikely for GET but handle it)
                    result['fal'] = {'status': 'ok', 'key_valid': True, 'balance': None,
                                     'note': 'ดู balance ที่ fal.ai/dashboard/billing'}
                except urllib.error.HTTPError as e:
                    body = ''
                    try:
                        body = e.read().decode('utf-8', errors='ignore').lower()
                    except Exception:
                        pass
                    if e.code == 403 and any(kw in body for kw in LOCK_KEYWORDS):
                        # Account locked — extract readable message
                        import re as _re
                        match = _re.search(r'reason["\s:]+([^"\.]+)', body)
                        reason = match.group(1).strip().capitalize() if match else 'Account locked / Exhausted balance'
                        result['fal'] = {
                            'status': 'error', 'key_valid': True, 'balance': None,
                            'detail': f'Fal.ai ถูกล็อค: {reason} — เติมเงินที่ fal.ai/dashboard/billing',
                        }
                    elif e.code in (401,):
                        result['fal'] = {'status': 'error', 'key_valid': False,
                                         'detail': f'FAL_KEY ไม่ถูกต้อง (HTTP {e.code})'}
                    else:
                        # 404, 405, 422 etc. = endpoint responded = account is accessible
                        result['fal'] = {'status': 'ok', 'key_valid': True, 'balance': None,
                                         'note': 'ดู balance ที่ fal.ai/dashboard/billing'}
            except Exception as e:
                result['fal'] = {'status': 'error', 'key_valid': False, 'detail': f'เชื่อมต่อ Fal.ai ไม่ได้: {e}'}

        else:
            result['fal'] = {'status': 'error', 'key_valid': False, 'detail': 'FAL_KEY ไม่ได้ตั้งค่า'}

        # Gemini — verify key by listing models
        gemini_key = getattr(settings, 'GEMINI_API_KEY', '')
        if gemini_key:
            try:
                req_g = urllib.request.Request(
                    f'https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}',
                )
                with urllib.request.urlopen(req_g, timeout=6) as rg:
                    result['gemini'] = {
                        'status': 'active',
                        'key_valid': True,
                        'model': 'gemini-2.0-flash',
                        'note': 'Free tier — ดูที่ aistudio.google.com',
                    }
            except urllib.error.HTTPError as e:
                result['gemini'] = {'status': 'error', 'key_valid': False, 'detail': f'HTTP {e.code}'}
            except Exception:
                result['gemini'] = {'status': 'active', 'key_valid': True, 'model': 'gemini-2.0-flash', 'note': 'Free tier'}
        else:
            result['gemini'] = {'status': 'error', 'key_valid': False, 'detail': 'GEMINI_API_KEY ไม่ได้ตั้งค่า'}

        # Botnoi (Thai TTS) — test key by generating 1 char, read rate-limit headers
        botnoi_key = getattr(settings, 'BOTNOI_API_KEY', '')
        if botnoi_key:
            try:
                import json as _json
                botnoi_payload = _json.dumps({
                    'text': 'ท', 'speaker': '1', 'volume': 1,
                    'speed': 1, 'type_media': 'mp3', 'save_file': False,
                }).encode()
                req_b = urllib.request.Request(
                    'https://api-voice.botnoi.ai/openapi/v1/generate_audio',
                    data=botnoi_payload,
                    headers={
                        'botnoi-token': botnoi_key,
                        'Content-Type': 'application/json',
                    },
                    method='POST',
                )
                with urllib.request.urlopen(req_b, timeout=10) as rb:
                    rl_limit = rb.headers.get('ratelimit-limit') or rb.headers.get('x-ratelimit-limit-minute')
                    rl_remaining = rb.headers.get('ratelimit-remaining') or rb.headers.get('x-ratelimit-remaining-minute')
                    result['botnoi'] = {
                        'status': 'ok',
                        'key_valid': True,
                        'rate_limit': rl_limit,
                        'rate_remaining': rl_remaining,
                        'note': 'ดูเครดิตจริงที่ botnoi.ai/dashboard',
                    }
            except urllib.error.HTTPError as e:
                if e.code == 402:
                    result['botnoi'] = {'status': 'error', 'key_valid': True, 'detail': 'เครดิตหมด (402 Payment Required)'}
                elif e.code == 401:
                    result['botnoi'] = {'status': 'error', 'key_valid': False, 'detail': 'Key ไม่ถูกต้อง (401)'}
                else:
                    result['botnoi'] = {'status': 'ok', 'key_valid': True, 'note': f'Key ใช้งานได้ (HTTP {e.code})'}
            except Exception as ex:
                result['botnoi'] = {'status': 'ok', 'key_valid': True, 'note': f'Key ตั้งค่าแล้ว — {str(ex)[:60]}'}
        else:
            result['botnoi'] = {'status': 'error', 'key_valid': False, 'detail': 'BOTNOI_API_KEY ไม่ได้ตั้งค่า'}

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


class PublicSiteContentView(APIView):
    """Public endpoint — returns all site content for landing page rendering."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        result = {}
        for key, default in DEFAULT_SITE_CONTENT.items():
            try:
                obj = SiteContent.objects.get(key=key)
                result[key] = obj.content
            except SiteContent.DoesNotExist:
                result[key] = default
        return Response(result)


class AdminSiteContentView(APIView):
    """Admin endpoint — get or update individual content blocks."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        result = {}
        for key, default in DEFAULT_SITE_CONTENT.items():
            try:
                obj = SiteContent.objects.get(key=key)
                result[key] = {
                    'content': obj.content,
                    'updated_at': obj.updated_at.isoformat(),
                    'is_custom': True,
                }
            except SiteContent.DoesNotExist:
                result[key] = {
                    'content': default,
                    'updated_at': None,
                    'is_custom': False,
                }
        return Response(result)

    def put(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        key = request.data.get('key', '').strip()
        content = request.data.get('content')
        if not key or key not in DEFAULT_SITE_CONTENT:
            return Response({'detail': f'key ต้องเป็น: {", ".join(DEFAULT_SITE_CONTENT)}'}, status=400)
        if content is None:
            return Response({'detail': 'ต้องระบุ content'}, status=400)
        obj, _ = SiteContent.objects.update_or_create(
            key=key,
            defaults={'content': content},
        )
        return Response({
            'detail': 'บันทึกสำเร็จ',
            'key': key,
            'updated_at': obj.updated_at.isoformat(),
        })

    def delete(self, request):
        """Reset a key back to default."""
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        key = request.data.get('key', '').strip()
        if not key or key not in DEFAULT_SITE_CONTENT:
            return Response({'detail': 'key ไม่ถูกต้อง'}, status=400)
        SiteContent.objects.filter(key=key).delete()
        return Response({'detail': f'{key} รีเซ็ตเป็นค่าเริ่มต้นแล้ว'})


def _thumbnail_url(image_path):
    return f"{settings.SITE_URL}/media/{image_path}"


class PublicClipThumbnailView(APIView):
    """Public — list clip thumbnails for landing page."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        items = ClipThumbnail.objects.all()
        return Response([{
            'id': t.id,
            'file_url': _thumbnail_url(t.image_path),
            'file_type': t.file_type,
            'title': t.title,
            'category': t.category,
            'order': t.order,
        } for t in items])


class AdminClipThumbnailView(APIView):
    """Admin — upload / list / delete clip thumbnails."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        items = ClipThumbnail.objects.all()
        return Response([{
            'id': t.id,
            'file_url': _thumbnail_url(t.image_path),
            'file_type': t.file_type,
            'title': t.title,
            'category': t.category,
            'order': t.order,
            'created_at': t.created_at.isoformat(),
        } for t in items])

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        upload = request.FILES.get('image')
        if not upload:
            return Response({'detail': 'ต้องแนบไฟล์'}, status=400)

        ct = upload.content_type or ''
        if ct.startswith('video/'):
            file_type = 'video'
        elif ct.startswith('image/'):
            file_type = 'image'
        else:
            return Response({'detail': 'รองรับเฉพาะวิดีโอ (mp4/mov/webm) และรูปภาพ (jpg/png/gif/webp)'}, status=400)

        import uuid
        ext = Path(upload.name).suffix.lower() or ('.mp4' if file_type == 'video' else '.jpg')
        filename = f"{uuid.uuid4().hex}{ext}"
        dest_dir = Path(settings.MEDIA_ROOT) / 'clip_thumbnails'
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / filename
        with open(dest, 'wb') as f:
            for chunk in upload.chunks():
                f.write(chunk)

        image_path = f'clip_thumbnails/{filename}'
        t = ClipThumbnail.objects.create(
            image_path=image_path,
            file_type=file_type,
            title=request.data.get('title', '').strip(),
            category=request.data.get('category', '').strip(),
            order=int(request.data.get('order', 0) or 0),
        )
        return Response({
            'id': t.id,
            'file_url': _thumbnail_url(t.image_path),
            'file_type': t.file_type,
            'title': t.title,
        }, status=201)

    def delete(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        tid = request.data.get('id')
        if not tid:
            return Response({'detail': 'ต้องระบุ id'}, status=400)
        try:
            t = ClipThumbnail.objects.get(id=tid)
            # Remove file
            try:
                fp = Path(settings.MEDIA_ROOT) / t.image_path
                if fp.exists():
                    fp.unlink()
            except Exception:
                pass
            t.delete()
            return Response({'detail': 'ลบสำเร็จ'})
        except ClipThumbnail.DoesNotExist:
            return Response({'detail': 'ไม่พบ thumbnail'}, status=404)


def _get_maintenance_mode():
    """Read maintenance mode from DB (SiteContent key=system_settings), fallback to env var."""
    obj = SiteContent.objects.filter(key='system_settings').first()
    if obj and 'maintenance' in obj.content:
        return bool(obj.content['maintenance'])
    return settings.MAINTENANCE_MODE


def _auto_trigger_maintenance(reason: str):
    """
    Called by Celery tasks when a critical pipeline failure occurs after max retries.
    Enables maintenance mode automatically and records the reason so admin can see it.
    """
    obj, _ = SiteContent.objects.get_or_create(key='system_settings', defaults={'content': {}})
    obj.content = {
        **obj.content,
        'maintenance': True,
        'maintenance_reason': str(reason)[:300],
        'maintenance_auto': True,
        'maintenance_triggered_at': timezone.now().strftime('%d/%m/%Y %H:%M'),
    }
    obj.save()
    logger.error(f'[AUTO-MAINTENANCE] ระบบถูกหยุดอัตโนมัติ: {reason[:120]}')


class SystemStatusView(APIView):
    """Public — returns current system maintenance status."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'maintenance': _get_maintenance_mode()})


class AdminMaintenanceView(APIView):
    """Admin — get or toggle maintenance mode (stored in DB, instant effect)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        obj = SiteContent.objects.filter(key='system_settings').first()
        content = obj.content if obj else {}
        return Response({
            'maintenance': _get_maintenance_mode(),
            'auto': bool(content.get('maintenance_auto', False)),
            'reason': content.get('maintenance_reason', ''),
            'triggered_at': content.get('maintenance_triggered_at', ''),
        })

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        value = bool(request.data.get('maintenance', True))
        obj, _ = SiteContent.objects.get_or_create(
            key='system_settings', defaults={'content': {}}
        )
        # Admin manually toggling → clear auto fields
        obj.content = {
            **obj.content,
            'maintenance': value,
            'maintenance_auto': False,
            'maintenance_reason': '',
            'maintenance_triggered_at': '',
        }
        obj.save()
        return Response({'maintenance': value, 'auto': False})


# ─────────────────────────────────────────────
# ADMIN — Payment Orders
# ─────────────────────────────────────────────

class AdminOrderListView(APIView):
    """Admin — list credit orders (default: pending only)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        from apps.billing.models import CreditOrder
        status_filter = request.query_params.get('status', 'pending')
        qs = CreditOrder.objects.select_related('user')
        if status_filter != 'all':
            qs = qs.filter(status=status_filter)
        qs = qs.order_by('-created_at')[:200]
        result = []
        for o in qs:
            slip_url = None
            if o.slip_image:
                try:
                    slip_url = request.build_absolute_uri(o.slip_image.url)
                except Exception:
                    pass
            result.append({
                'id': o.id,
                'user_email': o.user.email,
                'user_name': getattr(o.user, 'name', '') or o.user.email,
                'user_credits': o.user.credits,
                'package': o.package,
                'credits': o.credits,
                'amount': o.amount,
                'status': o.status,
                'admin_note': o.admin_note,
                'slip_url': slip_url,
                'created_at': o.created_at.strftime('%d %b %Y %H:%M'),
            })
        return Response(result)


class AdminOrderActionView(APIView):
    """Admin — approve or reject a CreditOrder."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        from apps.billing.models import CreditOrder
        try:
            order = CreditOrder.objects.select_related('user').get(pk=pk)
        except CreditOrder.DoesNotExist:
            return Response({'detail': 'ไม่พบ order'}, status=404)

        if order.status != 'pending':
            return Response(
                {'detail': f'order นี้ดำเนินการแล้ว ({order.status})'},
                status=400,
            )

        action = request.data.get('action')
        note = str(request.data.get('note', '')).strip()

        if action == 'approve':
            order.status = 'approved'
            order.admin_note = note
            order.save(update_fields=['status', 'admin_note'])
            order.user.credits += order.credits
            order.user.save(update_fields=['credits'])
            return Response({
                'detail': f'อนุมัติแล้ว — เพิ่ม {order.credits} เครดิตให้ {order.user.email} (รวม {order.user.credits})',
            })
        elif action == 'reject':
            order.status = 'rejected'
            order.admin_note = note or 'สลิปไม่ถูกต้อง'
            order.save(update_fields=['status', 'admin_note'])
            return Response({'detail': f'ปฏิเสธ order #{pk}'})
        else:
            return Response({'detail': 'action ต้องเป็น approve หรือ reject'}, status=400)


# ─────────────────────────────────────────────
# ADMIN — Payment Settings (bank + QR code)
# ─────────────────────────────────────────────

class AdminPaymentSettingsView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            obj = SiteContent.objects.get(key='payment_settings')
            return Response(obj.content or {})
        except SiteContent.DoesNotExist:
            return Response({
                'bank_name': 'ธนาคารออมสิน (GSB)',
                'account': '020 481 751 756',
                'account_name': 'นางสาวพัทธนันท์ ป้อมสุวรรณ',
                'qr_url': None,
            })

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)

        # Load existing content to preserve qr_url if no new file
        try:
            obj = SiteContent.objects.get(key='payment_settings')
            existing = obj.content or {}
        except SiteContent.DoesNotExist:
            obj = None
            existing = {}

        qr_url = existing.get('qr_url')
        qr_file = request.FILES.get('qr_image')
        if qr_file:
            import os as _os
            qr_dir = _os.path.join(settings.MEDIA_ROOT, 'payment')
            _os.makedirs(qr_dir, exist_ok=True)
            qr_path = _os.path.join(qr_dir, 'qr_code.png')
            with open(qr_path, 'wb') as f:
                for chunk in qr_file.chunks():
                    f.write(chunk)
            qr_url = settings.MEDIA_URL.rstrip('/') + '/payment/qr_code.png'

        content = {
            'bank_name': request.data.get('bank_name', existing.get('bank_name', 'ธนาคารออมสิน (GSB)')),
            'account': request.data.get('account', existing.get('account', '020 481 751 756')),
            'account_name': request.data.get('account_name', existing.get('account_name', 'นางสาวพัทธนันท์ ป้อมสุวรรณ')),
            'qr_url': qr_url,
        }

        if obj:
            obj.content = content
            obj.save(update_fields=['content'])
        else:
            SiteContent.objects.create(key='payment_settings', content=content)


# ─────────────────────────────────────────────
# ARTICLES — Public
# ─────────────────────────────────────────────

class PublicArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        articles = Article.objects.filter(is_published=True)
        data = [self._serialize(a) for a in articles]
        return Response(data)

    def _serialize(self, a):
        return {
            'id': a.id,
            'slug': a.slug,
            'title': a.title,
            'excerpt': a.excerpt,
            'category': a.category,
            'cat_color': a.cat_color,
            'cover_bg': a.cover_bg,
            'cover_image': a.cover_image,
            'read_time': a.read_time,
            'published_at': a.published_at.isoformat() if a.published_at else None,
        }


class PublicArticleDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            a = Article.objects.get(slug=slug, is_published=True)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        return Response({
            'id': a.id,
            'slug': a.slug,
            'title': a.title,
            'excerpt': a.excerpt,
            'content': a.content,
            'category': a.category,
            'cat_color': a.cat_color,
            'cover_bg': a.cover_bg,
            'cover_image': a.cover_image,
            'read_time': a.read_time,
            'meta_title': a.meta_title or a.title,
            'meta_description': a.meta_description or a.excerpt,
            'published_at': a.published_at.isoformat() if a.published_at else None,
        })


# ─────────────────────────────────────────────
# ARTICLES — Admin CRUD
# ─────────────────────────────────────────────

class AdminArticleListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        articles = Article.objects.all()
        data = [{
            'id': a.id, 'slug': a.slug, 'title': a.title,
            'category': a.category, 'cat_color': a.cat_color,
            'read_time': a.read_time, 'is_published': a.is_published,
            'published_at': a.published_at.isoformat() if a.published_at else None,
            'created_at': a.created_at.isoformat(),
        } for a in articles]
        return Response(data)

    def post(self, request):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        d = request.data
        slug = d.get('slug', '').strip()
        if not slug:
            return Response({'detail': 'slug จำเป็นต้องใส่'}, status=400)
        if Article.objects.filter(slug=slug).exists():
            return Response({'detail': f'slug "{slug}" มีอยู่แล้ว'}, status=400)
        is_pub = bool(d.get('is_published', False))
        a = Article.objects.create(
            title=d.get('title', '').strip(),
            slug=slug,
            excerpt=d.get('excerpt', '').strip(),
            content=d.get('content', '').strip(),
            category=d.get('category', '').strip(),
            cat_color=d.get('cat_color', '#FF7A00').strip(),
            cover_bg=d.get('cover_bg', 'linear-gradient(135deg,#FFF7ED,#FED7AA)').strip(),
            cover_image=d.get('cover_image', '').strip(),
            read_time=d.get('read_time', '5 นาที').strip(),
            meta_title=d.get('meta_title', '').strip(),
            meta_description=d.get('meta_description', '').strip(),
            is_published=is_pub,
            published_at=timezone.now() if is_pub else None,
        )
        return Response({'detail': 'สร้างบทความสำเร็จ', 'id': a.id}, status=201)


class AdminArticleDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            a = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        return Response({
            'id': a.id, 'slug': a.slug, 'title': a.title,
            'excerpt': a.excerpt, 'content': a.content,
            'category': a.category, 'cat_color': a.cat_color,
            'cover_bg': a.cover_bg, 'cover_image': a.cover_image,
            'read_time': a.read_time,
            'meta_title': a.meta_title, 'meta_description': a.meta_description,
            'is_published': a.is_published,
            'published_at': a.published_at.isoformat() if a.published_at else None,
        })

    def put(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            a = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        d = request.data
        new_slug = d.get('slug', a.slug).strip()
        if new_slug != a.slug and Article.objects.filter(slug=new_slug).exists():
            return Response({'detail': f'slug "{new_slug}" มีอยู่แล้ว'}, status=400)
        was_pub = a.is_published
        is_pub = bool(d.get('is_published', was_pub))
        a.title            = d.get('title', a.title).strip()
        a.slug             = new_slug
        a.excerpt          = d.get('excerpt', a.excerpt).strip()
        a.content          = d.get('content', a.content).strip()
        a.category         = d.get('category', a.category).strip()
        a.cat_color        = d.get('cat_color', a.cat_color).strip()
        a.cover_bg         = d.get('cover_bg', a.cover_bg).strip()
        a.cover_image      = d.get('cover_image', a.cover_image).strip()
        a.read_time        = d.get('read_time', a.read_time).strip()
        a.meta_title       = d.get('meta_title', a.meta_title).strip()
        a.meta_description = d.get('meta_description', a.meta_description).strip()
        a.is_published     = is_pub
        if is_pub and not was_pub:
            a.published_at = timezone.now()
        elif not is_pub:
            a.published_at = None
        a.save()
        return Response({'detail': 'อัปเดตบทความสำเร็จ'})

    def delete(self, request, pk):
        if not check_admin(request):
            return Response({'detail': 'Unauthorized'}, status=403)
        try:
            a = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({'detail': 'ไม่พบบทความ'}, status=404)
        a.delete()
        return Response({'detail': 'ลบบทความสำเร็จ'})

        return Response({'detail': 'บันทึกแล้ว', **content})
