import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { Db, DB } from '../db/db';
import { idempotencyKeys } from '../db/schema';
import { DomainError } from './errors';

export interface IdempotentResult {
  status: number;
  body: unknown;
}

@Injectable()
export class IdempotencyService {
  constructor(@Inject(DB) private readonly db: Db) {}

  hashPayload(body: unknown): string {
    const json = JSON.stringify(body ?? {});
    return createHash('sha256').update(json).digest('hex');
  }

  async check(
    userId: string,
    key: string,
    endpoint: string,
    body: unknown,
  ): Promise<IdempotentResult | null> {
    const [existing] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)))
      .limit(1);

    if (!existing) {
      return null;
    }

    const currentHash = this.hashPayload(body);
    if (existing.requestHash !== currentHash) {
      throw new DomainError(
        422,
        'IDEMPOTENCY_PAYLOAD_MISMATCH',
        'Idempotency-Key นี้เคยถูกใช้กับข้อมูลคำขออื่นแล้ว',
      );
    }

    return {
      status: existing.responseStatus,
      body: existing.responseBody,
    };
  }

  async save(
    userId: string,
    key: string,
    endpoint: string,
    body: unknown,
    status: number,
    responseBody: unknown,
  ): Promise<void> {
    const requestHash = this.hashPayload(body);
    await this.db
      .insert(idempotencyKeys)
      .values({
        userId,
        key,
        endpoint,
        requestHash,
        responseStatus: status,
        responseBody,
      })
      .onConflictDoNothing();
  }
}
