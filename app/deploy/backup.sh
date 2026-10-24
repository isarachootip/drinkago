#!/bin/sh
# สำรองฐานข้อมูลรายวัน เก็บย้อนหลัง 14 วัน
# ตั้ง cron: 0 3 * * * /opt/drinkgo/app/deploy/backup.sh >> /var/log/drinkgo-backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/drinkgo-$(date +%Y%m%d-%H%M).sql.gz"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_dump -U drinkgo drinkgo | gzip > "$FILE"
find backups -name 'drinkgo-*.sql.gz' -mtime +14 -delete
echo "backup ok: $FILE"
