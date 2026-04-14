# ClipDD — แผนงานพัฒนาและแก้ไขระบบ

> **สำหรับ AI ทุกตัวที่จะมาช่วยแก้โค้ด:** อ่านไฟล์นี้ก่อนเสมอ เพื่อเข้าใจ context, สถานะปัจจุบัน, และสิ่งที่รอการแก้ไข

---

## สถานะระบบปัจจุบัน (อัปเดต: 2026-04-14)

ระบบอยู่ระหว่างการพัฒนา — **ยังไม่เปิดให้ผู้ใช้ทั่วไปสร้างคลิปได้**  
Admin user สำหรับทดสอบ: `issamanx2307@gmail.com` (is_staff=True, credits=9999)

### Tech Stack
- **Frontend:** Next.js 14 App Router, CSS Modules, dark theme (#09090f bg, #E53E3E accent)
- **Backend:** Django + DRF, Celery (queue: default, video), PostgreSQL, Redis
- **AI Services:** OpenAI GPT-4o-mini (script), GPT-4o Vision (person image), OpenAI TTS / Botnoi (voice), Fal.ai Kling v2 (video)
- **Infra:** Docker Compose on VPS 187.127.107.228 (SSH port 2222), repo at /var/www/clipdd
- **Admin panel:** /mantapa

---

## Flow การสร้างคลิป (ภาพรวม)

```
[User กรอกฟอร์ม]
      ↓
POST /api/projects/  →  สร้าง Project, หัก 1 credit, queue generate_script_task
      ↓
generate_script_task (Celery)  →  GPT เขียนสคริปต์ JSON
      ↓
[User ตรวจ/แก้ไขสคริปต์]
      ↓
POST /api/projects/{id}/approve-script/  →  queue generate_video_task
      ↓
generate_video_task Phase 1  →  Vision + TTS + ส่งงานให้ Kling (async)
      ↓
[รอ webhook จาก Fal.ai ~3-5 นาที]
      ↓
POST /api/webhook/kling/  →  queue assemble_video_task
      ↓
assemble_video_task Phase 2  →  Download Kling + Ken Burns + Pillow overlay + FFmpeg
      ↓
[คลิปพร้อม — ผู้ใช้ดาวน์โหลดได้]
```

---

## สิ่งที่ทำเสร็จแล้ว ✅

- [x] Dark theme ทั้งเว็บ (#09090f, #E53E3E)
- [x] Clip thumbnails system (อัปโหลด/ลบจาก admin, แสดงบนหน้าแรก)
- [x] คำบรรยาย (caption) ใต้คลิปในหน้า admin + gallery
- [x] หน้า /clips gallery (hero, grid, caption, hover-to-play)
- [x] หน้า /clips/[id] (video player + share link button)
- [x] Deep link sharing — แชร์ URL แล้วเปิดมาที่คลิปนั้นตรง
- [x] Maintenance mode ควบคุมด้วย env var `MAINTENANCE_MODE=true/false`
- [x] is_staff ใน UserSerializer (frontend อ่านได้จาก localStorage)
- [x] ตัด 30s clip option ออก เหลือ 15s เท่านั้น
- [x] `/api/system-status/` endpoint (public, returns {maintenance: bool})
- [x] Admin tab persistence (localStorage)

---

## รอการแก้ไข — เรียงตามความสำคัญ

---

### 🔴 P1 — แก้ก่อนเปิดระบบให้ user จริง

#### 1. Refund เครดิตถ้า generation ล้มเหลว
**ปัญหา:** ตอนนี้หัก 1 credit ตอน POST /api/projects/ ทันที  
ถ้า GPT ล้มเหลว / Kling timeout / FFmpeg crash → เครดิตหายโดยไม่ได้คลิป  

**ไฟล์ที่ต้องแก้:**
- `backend/apps/video_engine/tasks.py` — ใน generate_script_task และ assemble_video_task
- ตรง except block ที่ set status='failed' ให้เพิ่ม: `user.credits += 1; user.save(update_fields=['credits'])`

**Logic ที่ถูกต้อง:**
```
POST /api/projects/ → สร้าง Project (ยังไม่หักเครดิต)
generate_script_task สำเร็จ → หัก 1 credit  (หรือ)
assemble_video_task สำเร็จ → หัก 1 credit
ถ้าขั้นตอนไหน fail → ไม่หัก / คืน credit
```
หมายเหตุ: ต้องรอระบบ credit/payment เสร็จก่อน — พักไว้ก่อน

---

#### 2. Script Re-generate ไม่เสียเครดิตซ้ำ
**ปัญหา:** ถ้าสคริปต์ออกมาไม่ดี ต้องสร้าง project ใหม่ = เสียเครดิตอีก 1  

**ไฟล์ที่ต้องแก้:**
- `backend/apps/projects/views.py` — เพิ่ม endpoint `POST /api/projects/{id}/regenerate-script/`
  - ไม่หักเครดิตเพิ่ม
  - reset script_data, queue generate_script_task ใหม่
- `frontend/app/create/page.jsx` — เพิ่มปุ่ม "เขียนสคริปต์ใหม่" ใน stage awaiting_script_approval

---

### 🟡 P2 — แก้หลังเปิดระบบ

#### 3. OG Meta Tags สำหรับ Clip Sharing
**ปัญหา:** แชร์ลิ้งค์ /clips/[id] ใน LINE/Facebook → ไม่มี preview รูป/ชื่อ เป็นแค่ลิ้งค์เปล่า  

**ไฟล์ที่ต้องแก้:**
- `frontend/app/clips/[id]/page.jsx` — เปลี่ยนเป็น server component หรือเพิ่ม generateMetadata()
- เพิ่ม og:title, og:description, og:image (ใช้ thumbnail URL)

**วิธีทำ (Next.js 14):**
```js
// app/clips/[id]/page.jsx
export async function generateMetadata({ params }) {
  const clips = await fetch(`${process.env.SITE_URL}/api/clip-thumbnails/`).then(r=>r.json())
  const clip = clips.find(c => c.id === parseInt(params.id))
  return {
    title: clip?.title || 'คลิปขำๆ — ClipDD',
    openGraph: { images: [clip?.file_url] }
  }
}
```
หมายเหตุ: ต้องเปลี่ยน page จาก 'use client' → แยก server/client component

---

#### 4. หน้า "คลิปของฉัน" / Project History
**ปัญหา:** ถ้า user ปิด browser ระหว่างสร้าง กลับมาไม่รู้ว่าคลิปเสร็จหรือยัง  
ไม่มีทางกลับมา download คลิปเก่าได้  

**ไฟล์ที่ต้องสร้าง:**
- `frontend/app/projects/page.jsx` — แสดงรายการ project ทั้งหมด + status + download link
- เรียก `GET /api/projects/` (มีอยู่แล้วใน backend)
- แสดง status: draft / generating_script / awaiting_script_approval / generating_video / done / failed

---

#### 5. Polling Fallback เร็วขึ้น
**ปัญหา:** poll_kling_fallback เตะตอน 480 วินาที (8 นาที)  
แต่ Kling ปกติเสร็จใน 3-5 นาที — ถ้า webhook หาย user รอนานเกินจำเป็น  

**ไฟล์ที่ต้องแก้:**
- `backend/apps/video_engine/tasks.py` — หา `poll_kling_fallback` task
- เปลี่ยน countdown จาก 480 → 300 วินาที (5 นาที)

---

#### 6. Webhook Authentication (Fal.ai Signature)
**ปัญหา:** POST /api/webhook/kling/ ไม่มี auth — ใครก็ POST ได้  
**ความเสี่ยงตอนนี้: ต่ำ** เพราะตรวจ request_id ใน DB อยู่แล้ว  

**ไฟล์ที่ต้องแก้:**
- `backend/apps/video_engine/views.py` — KlingWebhookView.post()
- เพิ่มตรวจ header `X-Fal-Signature` กับ FAL_WEBHOOK_SECRET จาก env
- เพิ่ม `FAL_WEBHOOK_SECRET` ใน .env.example

---

### 🔵 P3 — Nice to Have / Scale

#### 7. Media Storage → S3 / Cloudflare R2
**ปัญหา:** ไฟล์ media เก็บบน VPS local volume  
ถ้า server พัง / ย้าย server → ไฟล์หายหมด  
ตอนนี้รองรับแล้วใน settings (USE_S3 flag) แต่ยังไม่ได้เปิดใช้  

**ไฟล์ที่ต้องแก้:**
- `backend/config/settings.py` — configure django-storages S3 backend
- `.env` — เพิ่ม AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME

---

#### 8. Progress Detail ระหว่างสร้างวิดีโอ
**ปัญหา:** user เห็นแค่ "กำลังสร้าง" ไม่รู้ว่าอยู่ขั้นไหน  
render_job.progress field มีอยู่แล้ว (0-100) แต่ไม่ได้ใช้ใน frontend  

**ไฟล์ที่ต้องแก้:**
- `frontend/app/create/page.jsx` — อ่าน progress จาก /api/projects/{id}/render/ แสดง progress bar
- แสดง sub-step text: "กำลังสร้างเสียง..." / "กำลังส่ง Kling..." / "กำลังประกอบวิดีโอ..."

---

#### 9. Email Verification หลัง Register
**ปัญหา:** ตอนนี้สมัครเสร็จใช้ได้เลย ไม่ verify email  
Bot สามารถสมัครได้ไม่จำกัด  

**ไฟล์ที่ต้องแก้:**
- `backend/apps/users/views.py` — RegisterView: ส่ง verification email
- เพิ่ม email_verified flag ใน User model + migration

---

## วิธีเปิด/ปิด Maintenance Mode

```bash
# SSH เข้า VPS
ssh -p 2222 root@187.127.107.228

# เปิดระบบให้ทุกคนใช้ได้
echo "MAINTENANCE_MODE=false" >> /var/www/clipdd/.env
# หรือแก้ไฟล์ .env แล้ว:
docker compose -f /var/www/clipdd/docker-compose.yml restart web worker
# ไม่ต้อง rebuild — restart เพียงพอ

# ปิดระบบ
# แก้ MAINTENANCE_MODE=true ใน .env แล้ว restart
```

---

## คำสั่ง Deploy ที่ใช้บ่อย

```bash
# Deploy เฉพาะ frontend (เปลี่ยนโค้ด Next.js)
ssh -p 2222 root@187.127.107.228 "cd /var/www/clipdd && git pull && docker compose build frontend && docker compose up -d frontend"

# Deploy เฉพาะ backend (เปลี่ยนโค้ด Django)
ssh -p 2222 root@187.127.107.228 "cd /var/www/clipdd && git pull && docker compose build web worker && docker compose up -d web worker"

# Deploy ทั้งหมด
ssh -p 2222 root@187.127.107.228 "cd /var/www/clipdd && git pull && docker compose build web worker frontend && docker compose up -d"

# Restart ไม่ต้อง rebuild (เช่น เปลี่ยนแค่ env var)
ssh -p 2222 root@187.127.107.228 "docker compose -f /var/www/clipdd/docker-compose.yml restart web worker"

# Run migration
ssh -p 2222 root@187.127.107.228 "docker exec clipdd-web-1 python manage.py migrate"

# Django shell
ssh -p 2222 root@187.127.107.228 "docker exec clipdd-web-1 python manage.py shell"
```

---

## โครงสร้างไฟล์สำคัญ

```
repo/
├── frontend/app/
│   ├── page.jsx              ← Landing page (dark theme, clip thumbnails)
│   ├── page.module.css       ← CSS สำหรับ landing
│   ├── create/page.jsx       ← หน้าสร้างคลิป (form → script → video → done)
│   ├── clips/page.jsx        ← Gallery คลิปขำๆ
│   ├── clips/[id]/page.jsx   ← Individual clip viewer + share button
│   └── mantapa/page.jsx      ← Admin panel
│
├── backend/
│   ├── config/settings.py    ← Django settings (MAINTENANCE_MODE, SITE_URL, ฯลฯ)
│   ├── apps/projects/
│   │   ├── models.py         ← Project, ProductImage, GeneratedImage
│   │   ├── views.py          ← ProjectListCreateView, ScriptPreviewView, ApproveScriptView
│   │   └── serializers.py
│   ├── apps/video_engine/
│   │   ├── tasks.py          ← generate_script_task, generate_video_task, assemble_video_task
│   │   ├── utils.py          ← normalize_script_data, build_overlay_frame, ken_burns_segment
│   │   └── models.py         ← RenderJob, VideoOutput, Script
│   ├── apps/users/
│   │   ├── models.py         ← User (email, credits, plan, is_staff)
│   │   └── serializers.py    ← UserSerializer (รวม is_staff)
│   └── apps/support/
│       ├── views.py          ← SystemStatusView, ClipThumbnailView, SiteContentView, ฯลฯ
│       ├── urls.py
│       └── models.py         ← ClipThumbnail, SiteContent, ChatSession, ChatMessage
│
├── .env.example              ← Template env vars (รวม MAINTENANCE_MODE)
├── docker-compose.yml
└── PLAN.md                   ← ไฟล์นี้
```

---

## หมายเหตุสำคัญสำหรับ AI

1. **CSS Modules** — ห้ามใช้ `:root` selector ใน .module.css ไม่รองรับใน Next.js
2. **Dark theme** — bg `#09090f`, card `#111827`, border `#1e293b`, accent red `#E53E3E`
3. **Admin auth** — ใช้ header `X-Admin-Token` ไม่ใช่ JWT, ค่าอยู่ใน env `ADMIN_PANEL_PASSWORD`
4. **User auth** — DRF Token auth, เก็บใน localStorage key `cd_token` และ `cd_user`
5. **Media files** — Named Docker volume `media:/app/media`, serve ที่ `SITE_URL/media/...`
6. **Migration** — ทุกครั้งที่แก้ model ต้อง `makemigrations` + `migrate` บน VPS ด้วย
7. **Celery queue** — task สร้างคลิปต้องส่งเข้า queue='video' เสมอ
8. **ภาษา** — UI ทั้งหมดเป็นภาษาไทย, GPT prompt ภาษาไทย, Kling motion prompt ภาษาอังกฤษ
