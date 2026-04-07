#!/bin/bash
# =============================================
# ClipDD - VPS Deploy Script
# Ubuntu 22.04 (Hostinger VPS)
# SSH: ssh root@<VPS_IP>
# =============================================
set -e

echo "=== ClipDD Deploy ==="

APP_DIR=/var/www/clipdd

# 1. Pull latest code
cd $APP_DIR
git pull origin main

# 2. Copy env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  กรุณาแก้ไข .env ก่อน:"
  echo "   nano $APP_DIR/.env"
  echo ""
  exit 1
fi

# 3. Stop system nginx (ถ้ารันอยู่)
if systemctl is-active --quiet nginx; then
  echo "Stopping system nginx..."
  systemctl stop nginx
  systemctl disable nginx
fi

# 4. Build & restart containers
docker compose down
docker compose build --no-cache
docker compose up -d

# 5. Wait for web to be healthy
echo "Waiting for services..."
sleep 10

# 6. Show status
docker compose ps
echo ""
echo "=== Deploy สำเร็จ! ==="
echo "เช็ค logs: docker compose logs -f web"
