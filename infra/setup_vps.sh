#!/bin/bash
# =============================================
# ClipDD - VPS Initial Setup Script
# รันครั้งเดียวบน Ubuntu 22.04 ใหม่ๆ
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

# 3. Install tools
apt install -y git certbot python3-certbot-nginx

# 4. Stop & disable system nginx (เราจะใช้ Docker nginx แทน)
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# 5. Get SSL cert (ก่อน start Docker nginx)
echo ""
echo "=== ขอ SSL Certificate ==="
echo "รัน: certbot certonly --standalone -d clipdd.com -d www.clipdd.com"
echo "แล้วค่อย deploy ด้วย infra/deploy.sh"
echo ""

# 6. Clone repo
mkdir -p /var/www
cd /var/www
if [ -d clipdd ]; then
  echo "Repo already exists, pulling..."
  cd clipdd && git pull
else
  git clone https://github.com/issamanx2307-droid/clipdd.git
  cd clipdd
fi

# 7. Setup .env
cp .env.example .env

echo ""
echo "=== ติดตั้งเสร็จแล้ว! ==="
echo "ขั้นตอนถัดไป:"
echo "  1. nano /var/www/clipdd/.env              (ใส่ค่าจริง)"
echo "  2. certbot certonly --standalone -d clipdd.com -d www.clipdd.com"
echo "  3. bash /var/www/clipdd/infra/deploy.sh   (deploy)"
