import { jwtVerify, SignJWT } from 'jose';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const STAFF_ISSUER = 'drinkgo-staff';

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(plain: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hexHash] = storedHash.split(':');
  if (!salt || !hexHash) return false;
  try {
    const expected = Buffer.from(hexHash, 'hex');
    const actual = scryptSync(plain, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function getSecretKey(rawSecret?: string): Uint8Array {
  const effective = rawSecret && rawSecret.length >= 16 ? rawSecret : 'drinkgo-default-staff-jwt-secret-key-2026';
  return new TextEncoder().encode(effective);
}

export async function signStaffToken(
  payload: { id: string; lineUserId: string; role: string },
  rawSecret?: string,
): Promise<string> {
  return new SignJWT({ uid: payload.id, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(STAFF_ISSUER)
    .setSubject(payload.lineUserId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey(rawSecret));
}

export async function verifyStaffToken(
  token: string,
  rawSecret?: string,
): Promise<{ lineUserId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(rawSecret), { issuer: STAFF_ISSUER });
    if (!payload.sub || typeof payload.uid !== 'string') return null;
    return { lineUserId: String(payload.sub), userId: payload.uid };
  } catch {
    return null;
  }
}
