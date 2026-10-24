# ติดตั้งบน VPS

ใช้ Docker Compose 3 ตัว: `db` (PostgreSQL, ไม่เปิดออกนอกเครื่อง), `api` (NestJS), `caddy` (HTTPS อัตโนมัติ)
LINE webhook และ LIFF ต้องใช้ HTTPS จึงต้องมีโดเมนชี้มาที่ VPS

## สิ่งที่ต้องมี

- VPS Linux (Ubuntu 22.04/24.04 แนะนำ) RAM 1 GB ขึ้นไป
- เปิดพอร์ต 80 และ 443 (และ 22 สำหรับ SSH)
- โดเมนหรือซับโดเมนที่ชี้ A record มาที่ IP ของ VPS
  ยังไม่มีโดเมน: ใช้ `<IP แบบขีด>.sslip.io` ได้เลย เช่น IP `203.0.113.10` → `203-0-113-10.sslip.io`

## ติดตั้งครั้งแรก

```bash
# 1) ติดตั้ง Docker (ข้ามถ้ามีแล้ว)
curl -fsSL https://get.docker.com | sh

# 2) เอาโค้ดขึ้น VPS (เลือกทางใดทางหนึ่ง)
#    ก. ผ่าน GitHub (private repo)
git clone git@github.com:<บัญชี>/drinkgo-api.git /opt/drinkgo/app
#    ข. ส่งจากเครื่อง Windows ด้วย scp (รันบนเครื่อง Windows, ไม่ต้องส่ง node_modules)
#    git archive --format=tar.gz -o drinkgo.tgz HEAD
#    scp drinkgo.tgz root@<IP>:/opt/drinkgo/   แล้วบน VPS: mkdir -p app && tar -xzf drinkgo.tgz -C app

cd /opt/drinkgo/app

# 3) ตั้งค่า
cp deploy/env.production.example .env.production
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 24)/" .env.production
sed -i "s/^DEV_AUTH_KEY=.*/DEV_AUTH_KEY=$(openssl rand -hex 32)/" .env.production
nano .env.production          # แก้ DOMAIN ให้ถูก
chmod 600 .env.production

# 4) เปิดระบบ (ตอนเริ่ม api จะรัน migration ให้เอง)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 5) ใส่ข้อมูลตั้งต้น (ผู้ใช้ทดสอบ + สินค้าตัวอย่าง) ทำครั้งเดียว
docker compose -f docker-compose.prod.yml --env-file .env.production exec api node dist/db/seed.js
```

ตรวจว่าใช้งานได้:

```bash
curl https://<DOMAIN>/health                       # {"ok":true}
KEY=$(grep ^DEV_AUTH_KEY .env.production | cut -d= -f2)
curl https://<DOMAIN>/products -H "x-dev-user: dev-admin" -H "x-dev-key: $KEY"
```

## ความปลอดภัยระหว่างยังไม่มีบัญชี LINE

โหมด `AUTH_MODE=dev` ให้ระบุตัวตนด้วย header `x-dev-user` ถ้าเปิดบนอินเทอร์เน็ตโดยไม่มีกุญแจ ใครก็สวมรอยเป็นแอดมินได้
ระบบจึง**ไม่ยอมเปิด**บนเซิร์ฟเวอร์ถ้าไม่ได้ตั้ง `DEV_AUTH_KEY` (อย่างน้อย 24 ตัว) และทุกคำขอต้องส่ง `x-dev-key` ตรงกัน
เก็บกุญแจนี้เป็นความลับ เมื่อมีบัญชี LINE ให้เปลี่ยนเป็น `AUTH_MODE=line` แล้วลบ `DEV_AUTH_KEY`

## งานประจำ

| งาน | คำสั่ง (รันใน /opt/drinkgo/app) |
|---|---|
| ดู log | `docker compose -f docker-compose.prod.yml logs -f api` |
| อัปเดตโค้ด | `git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` |
| สถานะ | `docker compose -f docker-compose.prod.yml ps` |
| สำรองข้อมูลทันที | `./deploy/backup.sh` (ไฟล์อยู่ใน `backups/`) |
| สำรองอัตโนมัติทุกวัน 03:00 | `crontab -e` แล้วเพิ่ม `0 3 * * * /opt/drinkgo/app/deploy/backup.sh >> /var/log/drinkgo-backup.log 2>&1` |
| กู้คืน | `gunzip -c backups/<ไฟล์>.sql.gz \| docker compose -f docker-compose.prod.yml exec -T db psql -U drinkgo drinkgo` |

ไฟล์สำรองอยู่บน VPS เครื่องเดียว ควรคัดลอกออกไปเก็บที่อื่นเป็นระยะ

## เมื่อมีบัญชี LINE

1. ใส่ `LINE_LOGIN_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` ใน `.env.production`
2. เปลี่ยน `AUTH_MODE=line` และลบ `DEV_AUTH_KEY`
3. ใน LINE Developers Console ตั้ง Webhook URL เป็น `https://<DOMAIN>/line/webhook` แล้วกด Verify
4. รัน `up -d` อีกครั้งให้ค่าใหม่มีผล
