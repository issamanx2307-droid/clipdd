#!/usr/bin/env bash
# ClipDD standard deploy script
# Usage: ./deploy.sh [--no-cache]
set -e

NO_CACHE=""
if [[ "$1" == "--no-cache" ]]; then
  NO_CACHE="--no-cache"
  echo "Building with --no-cache"
fi

echo "=== [1/4] Git pull ==="
git stash 2>/dev/null || true
git pull origin master

echo "=== [2/4] Build containers ==="
docker compose build $NO_CACHE web frontend

echo "=== [3/4] Restart containers ==="
docker compose stop web frontend
docker compose rm -f web frontend
docker compose up -d web frontend
docker restart clipdd-nginx-1

echo "=== [4/4] Migrate ==="
sleep 5
docker exec clipdd-web-1 python manage.py migrate

echo ""
echo "Deploy complete. Check: https://clipdd.com"
