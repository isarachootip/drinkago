import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse<Response>();

    const rawKey = req.headers['idempotency-key'] ?? req.headers['x-idempotency-key'];
    const key = typeof rawKey === 'string' ? rawKey.trim() : null;
    const userId = req.auth?.user?.id;

    if (!key || !userId) {
      return next.handle();
    }

    const endpoint = `${req.method} ${req.route?.path ?? req.path}`;
    const cached = await this.idempotency.check(userId, key, endpoint, req.body);

    if (cached) {
      res.status(cached.status);
      return of(cached.body);
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        const statusCode = res.statusCode || 200;
        await this.idempotency.save(userId, key, endpoint, req.body, statusCode, responseBody);
      }),
    );
  }
}
