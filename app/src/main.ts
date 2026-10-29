import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { loadConfig } from './config';
import { seed } from './db/seed';

async function bootstrap() {
  const cfg = loadConfig();
  await seed(cfg.DATABASE_URL);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(cfg), { rawBody: true });

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const publicDir = join(__dirname, '..', 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir);
  }

  const origins =
    cfg.CORS_ORIGINS === '*'
      ? true
      : cfg.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-line-token',
      'x-dev-user',
      'x-dev-key',
      'Idempotency-Key',
      'x-idempotency-key',
    ],
  });

  app.enableShutdownHooks();
  await app.listen(cfg.PORT, '0.0.0.0');
  console.log(`Drink&Go API พร้อมที่ http://0.0.0.0:${cfg.PORT} (AUTH_MODE=${cfg.AUTH_MODE})`);
}
void bootstrap();
