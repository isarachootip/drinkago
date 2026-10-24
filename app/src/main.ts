import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap() {
  const cfg = loadConfig();
  const app = await NestFactory.create(AppModule.forRoot(cfg), { rawBody: true });

  app.use(helmet());

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
      'x-dev-user',
      'x-dev-key',
      'Idempotency-Key',
      'x-idempotency-key',
    ],
  });

  app.enableShutdownHooks();
  await app.listen(cfg.PORT);
  console.log(`Drink&Go API พร้อมที่ http://localhost:${cfg.PORT} (AUTH_MODE=${cfg.AUTH_MODE})`);
}
void bootstrap();
