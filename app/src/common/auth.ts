import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'node:crypto';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { users } from '../db/schema';
import { verifyStaffToken } from './password';

export type Role = 'customer' | 'warehouse' | 'rider' | 'admin';
export type User = typeof users.$inferSelect;

export interface AuthContext {
  lineUserId: string;
  displayName?: string;
  /** null = ยืนยันตัวตนกับ LINE แล้วแต่ยังไม่ลงทะเบียนในระบบ */
  user: User | null;
}

const ROLES_KEY = 'roles';
const PUBLIC_KEY = 'public';
const ALLOW_UNREGISTERED_KEY = 'allowUnregistered';

/** จำกัดบทบาทที่เรียก endpoint ได้ บทบาทอ่านจากฐานข้อมูลเสมอ ไม่เชื่อค่าจาก client */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const AllowUnregistered = () => SetMetadata(ALLOW_UNREGISTERED_KEY, true);

export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  return ctx.switchToHttp().getRequest().auth;
});
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): User => {
  return ctx.switchToHttp().getRequest().auth.user;
});

const LINE_JWKS = createRemoteJWKSet(new URL('https://api.line.me/oauth2/v2.1/certs'));

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const req = ctx.switchToHttp().getRequest();
    const identity = await this.identify(req.headers);
    const [user] = await this.db.select().from(users).where(eq(users.lineUserId, identity.lineUserId)).limit(1);
    req.auth = { ...identity, user: user && user.active ? user : null } satisfies AuthContext;

    if (!req.auth.user) {
      if (this.reflector.getAllAndOverride<boolean>(ALLOW_UNREGISTERED_KEY, targets)) return true;
      throw new ForbiddenException({ code: 'NOT_REGISTERED', message: 'ยังไม่ได้ลงทะเบียน' });
    }
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    if (roles && !roles.includes(req.auth.user.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN_ROLE', message: 'ไม่มีสิทธิ์ใช้งานส่วนนี้' });
    }
    return true;
  }

  private async identify(headers: Record<string, string | undefined>) {
    const auth = headers['authorization'];
    if (auth?.startsWith('Bearer ')) {
      const staff = await verifyStaffToken(auth.slice(7), this.cfg.DEV_AUTH_KEY ?? this.cfg.LINE_CHANNEL_SECRET);
      if (staff) return { lineUserId: staff.lineUserId };
    }
    if (this.cfg.AUTH_MODE === 'dev') {
      const key = this.cfg.DEV_AUTH_KEY;
      if (key && !safeEqual(headers['x-dev-key'] ?? '', key)) {
        throw new UnauthorizedException('ต้องส่ง header x-dev-key ที่ถูกต้อง');
      }
      const id = headers['x-dev-user'];
      if (!id) throw new UnauthorizedException('ต้องส่ง header x-dev-user (โหมดพัฒนา)');
      return { lineUserId: id };
    }
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('ต้องส่ง LINE ID token หรือเข้าสู่ระบบ');
    try {
      const { payload } = await jwtVerify(auth.slice(7), LINE_JWKS, {
        issuer: 'https://access.line.me',
        audience: this.cfg.LINE_LOGIN_CHANNEL_ID,
      });
      return { lineUserId: String(payload.sub), displayName: payload.name as string | undefined };
    } catch {
      throw new UnauthorizedException('LINE ID token ไม่ถูกต้องหรือหมดอายุ');
    }
  }
}

function safeEqual(a: string, b: string) {
  const h = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(h(a), h(b));
}
