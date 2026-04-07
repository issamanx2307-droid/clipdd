#!/bin/bash
# =============================================
# ClipDD - VPS Setup Script
# รันบน Ubuntu 22.04 (Hostinger VPS)
# SSH: ssh root@187.127.107.228
# =============================================

set -e
echo "=== ClipDD VPS Setup ==="

# 1. Update system
apt update && apt upgrade -y

# 2. Install Docker
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Install git & certbot
apt install -y git certbot python3-certbot-nginx

# 4. Clone repo
cd /var/www
git clone https://github.com/issamanx2307-droid/clipdd.git
cd clipdd

# 5. Setup .env
cp .env.example .env
echo ""
echo "=== !! แก้ไข .env ก่อน deploy !!"
echo "รัน: nano /var/www/clipdd/.env"
echo ""
echo "=== ติดตั้งเสร็จแล้ว! ==="
echo "ขั้นต่อไป:"
echo "  1. nano .env          (ใส่ค่าจริง)"
echo "  2. docker compose up --build -d"
echo "  3. certbot --nginx -d clipdd.com -d www.clipdd.com"
