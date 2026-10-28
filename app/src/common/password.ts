import { jwtVerify, SignJWT } from 'jose';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const STAFF_ISSUER = 'drinkgo-staff';
const DEFAULT_LINK_SECRET = 'drinkgo-default-customer-link-hmac-2026';

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

function resolveLinkSecret(rawSecret?: string): string {
  return rawSecret || process.env.DEV_AUTH_KEY || process.env.LINE_CHANNEL_SECRET || DEFAULT_LINK_SECRET;
}

export function signCustomerLinkToken(lineUserId: string, rawSecret?: string): string {
  const b64 = Buffer.from(lineUserId, 'utf8').toString('base64url');
  const sig = createHmac('sha256', resolveLinkSecret(rawSecret)).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyCustomerLinkToken(token: string | undefined | null, rawSecret?: string): string | null {
  if (!token || !token.includes('.')) return null;
  const [b64, givenSig] = token.split('.');
  if (!b64 || !givenSig) return null;
  try {
    const expectedSig = createHmac('sha256', resolveLinkSecret(rawSecret)).update(b64).digest();
    const givenBuf = Buffer.from(givenSig, 'base64url');
    if (expectedSig.length !== givenBuf.length || !timingSafeEqual(expectedSig, givenBuf)) return null;
    const lineUserId = Buffer.from(b64, 'base64url').toString('utf8');
    return lineUserId.length > 0 ? lineUserId : null;
  } catch {
    return null;
  }
}

export function buildSignedCustomerUrl(publicWebUrl: string, lineUserId: string, rawSecret?: string): string {
  const cleanWeb = publicWebUrl.replace(/\/+$/, '');
  const token = signCustomerLinkToken(lineUserId, rawSecret);
  return `${cleanWeb}/?lineUserId=${encodeURIComponent(lineUserId)}&lineToken=${encodeURIComponent(token)}`;
}
