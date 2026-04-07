# ClipDD — AI-powered TikTok Clip Generator

> สร้างคลิปขายของ TikTok อัตโนมัติ สำหรับแม่ค้าไทย

## ใส่สินค้า → ได้คลิปพร้อมโพสต์ใน 1 นาที

---

## Tech Stack
- **Backend**: Django + Django REST Framework
- **Worker**: Celery + Redis
- **Frontend**: Next.js (Landing + Dashboard)
- **Video**: FFmpeg + gTTS
- **DB**: PostgreSQL
- **Storage**: MinIO / S3
- **Infra**: Docker + Nginx on Hostinger VPS

## Project Structure
```
clipdd/
├── backend/        # Django API
├── worker/         # Celery tasks
├── frontend/       # Next.js
└── infra/          # Docker + Nginx
```

## Quick Start
```bash
cp .env.example .env
docker compose up --build
```
