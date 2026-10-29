import liff from '@line/liff';
import { z } from 'zod';
import { loadDevSettings } from '../api/client';
import { requestJson, saveStaffSession, StaffSession } from '../api/role-api';
import {
  CUSTOMER_USER_STORAGE_KEY,
  LINE_TOKEN_STORAGE_KEY,
  resolveInitialOrderId,
  resolveInitialQueryTab,
} from './session-gate';

export const lineAuthConfigSchema = z.object({
  liffId: z.string().nullable(),
  loginChannelId: z.string().nullable(),
  oauthEnabled: z.boolean(),
  oaBasicId: z.string().optional(),
});

export type LineAuthConfig = z.infer<typeof lineAuthConfigSchema>;

const liffSessionResponseSchema = z.object({
  token: z.string(),
  lineToken: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string().nullable().optional(),
    lineUserId: z.string(),
    name: z.string(),
    role: z.enum(['customer', 'warehouse', 'rider', 'admin']),
  }),
});

let liffInitializedFor: string | null = null;

async function ensureLiffReady(liffId: string): Promise<void> {
  if (liffInitializedFor === liffId) return;
  await liff.init({ liffId });
  liffInitializedFor = liffId;
}

export async function fetchLineAuthConfig(): Promise<LineAuthConfig> {
  const raw = await requestJson('/auth/line/config');
  return lineAuthConfigSchema.parse(raw);
}

export function buildWebLineOauthStartUrl(apiBaseUrl: string, tab = 'shop', orderId?: string | null): string {
  const base = apiBaseUrl.replace(/\/+$/, '');
  const orderSuffix = orderId ? `&orderId=${encodeURIComponent(orderId)}` : '';
  return `${base}/auth/line/start?tab=${encodeURIComponent(tab)}${orderSuffix}`;
}

export async function tryAutoLoginWithLiff(): Promise<{ session: StaffSession; lineToken: string } | null> {
  try {
    const cfg = await fetchLineAuthConfig();
    if (!cfg.liffId) return null;

    await ensureLiffReady(cfg.liffId);
    if (liff.isInClient() && !liff.isLoggedIn()) {
      liff.login();
      return null;
    }
    if (!liff.isLoggedIn()) return null;

    const idToken = liff.getIDToken();
    if (!idToken) return null;

    const rawRes = await requestJson('/auth/line/liff', {
      method: 'POST',
      body: { idToken },
    });
    const parsed = liffSessionResponseSchema.parse(rawRes);
    try {
      localStorage.setItem(LINE_TOKEN_STORAGE_KEY, parsed.lineToken);
      localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, parsed.user.lineUserId);
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const activeTab = resolveInitialQueryTab();
        const activeOrderId = resolveInitialOrderId();
        const url = new URL(window.location.href);
        for (const key of ['code', 'state', 'liff.state', 'liffClientId', 'liffRedirectUri']) {
          url.searchParams.delete(key);
        }
        if (activeTab && !url.searchParams.get('tab')) url.searchParams.set('tab', activeTab);
        if (activeOrderId && !url.searchParams.get('orderId')) url.searchParams.set('orderId', activeOrderId);
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch {
      // ignore storage/history errors
    }
    return {
      session: { token: parsed.token, user: parsed.user },
      lineToken: parsed.lineToken,
    };
  } catch {
    return null;
  }
}

export async function startLineLogin(tab = 'shop', onNotify?: (msg: string) => void): Promise<void> {
  try {
    const targetTab = resolveInitialQueryTab() ?? tab;
    const targetOrderId = resolveInitialOrderId();
    const orderQuery = targetOrderId ? `&orderId=${encodeURIComponent(targetOrderId)}` : '';
    const cfg = await fetchLineAuthConfig();
    if (cfg.liffId) {
      await ensureLiffReady(cfg.liffId);
      if (!liff.isLoggedIn()) {
        const host = window.location.hostname.toLowerCase();
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        if (isLocal && cfg.oauthEnabled) {
          const s = loadDevSettings();
          window.location.href = buildWebLineOauthStartUrl(s.apiBaseUrl, targetTab, targetOrderId);
          return;
        }
        liff.login(
          isLocal
            ? undefined
            : { redirectUri: `${window.location.origin}/?tab=${encodeURIComponent(targetTab)}${orderQuery}` },
        );
        return;
      }
      const exchanged = await tryAutoLoginWithLiff();
      if (exchanged) {
        saveStaffSession(exchanged.session);
        window.location.reload();
        return;
      }
    }
    if (cfg.oauthEnabled) {
      const s = loadDevSettings();
      window.location.href = buildWebLineOauthStartUrl(s.apiBaseUrl, targetTab, targetOrderId);
      return;
    }
    onNotify?.('กำลังรอตั้งค่า LINE_LOGIN_CHANNEL_SECRET หรือ LINE_LIFF_ID บนเซิร์ฟเวอร์ (ระหว่างนี้เข้าผ่านแชท LINE OA @157iywjs ได้ทันที)');
  } catch (e) {
    onNotify?.(e instanceof Error ? e.message : 'ไม่สามารถเชื่อมต่อระบบ LINE Login ได้');
  }
}

export function safeLiffLogout(): void {
  try {
    if (liffInitializedFor && !liff.isInClient() && liff.isLoggedIn()) {
      liff.logout();
    }
  } catch {
    // ignore if LIFF not initialized
  }
}
