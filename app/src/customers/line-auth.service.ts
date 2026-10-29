import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { User } from '../common/auth';
import { DomainError } from '../common/errors';
import { signCustomerLinkToken, signStaffToken } from '../common/password';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { addresses, users } from '../db/schema';

const ALLOWED_TABS = new Set(['shop', 'track', 'events', 'stations']);
const SAFE_ORDER_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const STATE_TTL_MS = 10 * 60 * 1000;

export function sanitizeRedirectTab(tab?: string | null): string {
  const clean = (tab ?? '').trim().toLowerCase();
  return ALLOWED_TABS.has(clean) ? clean : 'shop';
}

export function sanitizeOrderId(orderId?: string | null): string | undefined {
  const clean = (orderId ?? '').trim();
  return SAFE_ORDER_ID_RE.test(clean) ? clean : undefined;
}

export function signLineOauthState(
  input: string | { tab?: string | null; orderId?: string | null } | undefined,
  secret: string,
  nowMs = Date.now(),
): string {
  const tab = typeof input === 'string' ? input : input?.tab;
  const orderId = typeof input === 'object' && input !== null ? sanitizeOrderId(input.orderId) : undefined;
  const payload = JSON.stringify({
    t: sanitizeRedirectTab(tab),
    ...(orderId ? { o: orderId } : {}),
    n: randomBytes(8).toString('hex'),
    iat: nowMs,
  });
  const b64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyLineOauthState(
  state: string | undefined | null,
  secret: string,
  nowMs = Date.now(),
): { tab: string; orderId?: string } | null {
  if (!state || !state.includes('.')) return null;
  const [b64, givenSig] = state.split('.');
  if (!b64 || !givenSig) return null;
  try {
    const expected = createHmac('sha256', secret).update(b64).digest();
    const given = Buffer.from(givenSig, 'base64url');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as { t?: string; o?: string; iat?: number };
    if (typeof parsed.iat !== 'number' || Math.abs(nowMs - parsed.iat) > STATE_TTL_MS) return null;
    const orderId = sanitizeOrderId(parsed.o);
    return orderId ? { tab: sanitizeRedirectTab(parsed.t), orderId } : { tab: sanitizeRedirectTab(parsed.t) };
  } catch {
    return null;
  }
}

export function buildLineAuthorizeUrl(input: { channelId: string; callbackUrl: string; state: string }): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.channelId,
    redirect_uri: input.callbackUrl,
    state: input.state,
    scope: 'profile openid',
    bot_prompt: 'normal',
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

@Injectable()
export class LineAuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  getSigningSecret(): string {
    return this.cfg.DEV_AUTH_KEY ?? this.cfg.LINE_LOGIN_CHANNEL_SECRET ?? this.cfg.LINE_CHANNEL_SECRET ?? 'drinkgo-line-oauth-secret-2026';
  }

  getCallbackUrl(): string {
    return `${this.cfg.PUBLIC_WEB_URL.replace(/\/+$/, '')}/auth/line/callback`;
  }

  getEffectiveLoginChannelId(): string | null {
    const fromLiff = this.cfg.LINE_LIFF_ID?.split('-')[0]?.trim();
    if (fromLiff && /^\d+$/.test(fromLiff)) return fromLiff;
    return this.cfg.LINE_LOGIN_CHANNEL_ID || null;
  }

  getPublicConfig() {
    const channelId = this.getEffectiveLoginChannelId();
    const hasSecret = Boolean(this.cfg.LINE_LOGIN_CHANNEL_SECRET);
    return {
      liffId: this.cfg.LINE_LIFF_ID || null,
      loginChannelId: channelId,
      oauthEnabled: Boolean(channelId && hasSecret),
      oaBasicId: this.cfg.LINE_OA_BASIC_ID,
    };
  }

  async verifyIdTokenWithLine(idToken: string): Promise<{ lineUserId: string; displayName: string }> {
    const channelId = this.getEffectiveLoginChannelId();
    if (!channelId) {
      throw new DomainError(400, 'LINE_LOGIN_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID บนเซิร์ฟเวอร์');
    }
    const body = new URLSearchParams({ id_token: idToken, client_id: channelId });
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new DomainError(401, 'INVALID_LINE_TOKEN', 'LINE ID Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    }
    const data = (await res.json()) as { sub?: string; name?: string };
    if (!data.sub) {
      throw new DomainError(401, 'INVALID_LINE_TOKEN', 'ไม่พบรหัสผู้ใช้ LINE ใน Token');
    }
    return { lineUserId: data.sub, displayName: (data.name ?? '').trim() || 'ลูกค้า LINE' };
  }

  async exchangeOauthCode(code: string): Promise<{ lineUserId: string; displayName: string }> {
    const channelId = this.getEffectiveLoginChannelId();
    const channelSecret = this.cfg.LINE_LOGIN_CHANNEL_SECRET;
    if (!channelId || !channelSecret) {
      throw new DomainError(400, 'LINE_LOGIN_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID หรือ LINE_LOGIN_CHANNEL_SECRET');
    }
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getCallbackUrl(),
      client_id: channelId,
      client_secret: channelSecret,
    });
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!tokenRes.ok) {
      throw new DomainError(401, 'LINE_OAUTH_FAILED', 'แลกรับ Token จาก LINE ไม่สำเร็จ กรุณาตรวจสอบ Callback URL และ Channel Secret');
    }
    const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };
    if (tokens.id_token) return this.verifyIdTokenWithLine(tokens.id_token);
    if (!tokens.access_token) throw new DomainError(401, 'LINE_OAUTH_FAILED', 'ไม่ได้รับ Access Token จาก LINE');
    const profRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profRes.ok) throw new DomainError(401, 'LINE_PROFILE_FAILED', 'ดึงข้อมูลโปรไฟล์ LINE ไม่สำเร็จ');
    const prof = (await profRes.json()) as { userId?: string; displayName?: string };
    if (!prof.userId) throw new DomainError(401, 'LINE_PROFILE_FAILED', 'ไม่พบ LINE userId');
    return { lineUserId: prof.userId, displayName: (prof.displayName ?? '').trim() || 'ลูกค้า LINE' };
  }

  async findOrCreateUser(lineUserId: string, displayName: string): Promise<User> {
    const [existing] = await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1);
    if (existing) {
      if (!existing.active) throw new DomainError(403, 'ACCOUNT_DISABLED', 'บัญชีนี้ถูกระงับการใช้งาน');
      if (existing.name === 'ลูกค้า LINE' && displayName && displayName !== 'ลูกค้า LINE') {
        const [updated] = await this.db.update(users).set({ name: displayName }).where(eq(users.id, existing.id)).returning();
        return updated ?? existing;
      }
      return existing;
    }

    const [created] = await this.db
      .insert(users)
      .values({ lineUserId, role: 'customer', name: displayName || 'ลูกค้า LINE', phone: '0800000000', customerType: 'individual', pdpaConsentAt: new Date() })
      .onConflictDoNothing()
      .returning();

    const user = created ?? (await this.db.select().from(users).where(eq(users.lineUserId, lineUserId)).limit(1))[0];
    if (created) {
      await this.db.insert(addresses).values({ userId: created.id, label: 'บ้าน (LINE)', detail: 'กรุณาตรวจสอบที่อยู่จัดส่ง', lat: 13.7563, lng: 100.5018 });
    }
    return user;
  }

  async issueSession(user: User) {
    const secret = this.cfg.DEV_AUTH_KEY ?? this.cfg.LINE_CHANNEL_SECRET;
    const token = await signStaffToken({ id: user.id, lineUserId: user.lineUserId, role: user.role }, secret);
    const lineToken = signCustomerLinkToken(user.lineUserId, secret);
    const { passwordHash: _ignored, ...safeUser } = user;
    return { token, lineToken, user: safeUser };
  }
}
