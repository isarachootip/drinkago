import { z } from 'zod';
import { DevAuthSettings, EvidenceInput, OrderDetail, orderDetailSchema, RiderJob, riderJobSchema, uploadResponseSchema } from './schemas';
import { enqueueOfflineMutation, listOfflineMutations, removeOfflineMutation } from '../storage/offline-queue';

const SETTINGS_KEY = 'drinkgo_rider_dev_settings';
const defaultApiOrigin = typeof window !== 'undefined' && window.location.port !== '5173' ? window.location.origin : 'http://localhost:3000';
const buildTimeDevKey = (import.meta as unknown as { env?: { VITE_DEV_AUTH_KEY?: string } }).env?.VITE_DEV_AUTH_KEY ?? '';

export const DEFAULT_SETTINGS: DevAuthSettings = {
  apiBaseUrl: defaultApiOrigin, devUser: 'dev-rider', devKey: buildTimeDevKey, mockGps: true, mockLat: 13.7563, mockLng: 100.5018,
};

export function loadDevSettings(): DevAuthSettings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEY) : null;
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<DevAuthSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      devKey: saved.devKey || DEFAULT_SETTINGS.devKey,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDevSettings(next: DevAuthSettings): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly queuedOffline = false,
  ) {
    super(message);
  }
}

function buildHeaders(settings: DevAuthSettings, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (settings.devUser) headers['x-dev-user'] = settings.devUser;
  if (settings.devKey) headers['x-dev-key'] = settings.devKey;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('drinkgo_staff_session_v1') : null;
    if (raw) {
      const parsed = JSON.parse(raw) as { token?: string; user?: { role?: string; lineUserId?: string } };
      if (parsed.token && parsed.user?.role === 'rider') {
        headers['authorization'] = `Bearer ${parsed.token}`;
        if (parsed.user.lineUserId) headers['x-dev-user'] = parsed.user.lineUserId;
      }
    }
  } catch {
    // ignore invalid localStorage
  }
  return headers;
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchRiderJobs(settings = loadDevSettings()): Promise<RiderJob[]> {
  const res = await fetch(`${settings.apiBaseUrl}/rider/jobs`, {
    headers: buildHeaders(settings),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { code?: string; message?: string };
    throw new ApiClientError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'ดึงรายการงานไม่สำเร็จ');
  }
  return z.array(riderJobSchema).parse(data);
}

export async function fetchOrderDetail(orderId: string, settings = loadDevSettings()): Promise<OrderDetail> {
  const res = await fetch(`${settings.apiBaseUrl}/orders/${orderId}`, {
    headers: buildHeaders(settings),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { code?: string; message?: string };
    throw new ApiClientError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'ดึงรายละเอียดออเดอร์ไม่สำเร็จ');
  }
  return orderDetailSchema.parse(data);
}

export async function uploadEvidenceFile(file: Blob, filename = 'evidence.png', settings = loadDevSettings()): Promise<string> {
  const form = new FormData();
  form.append('file', file, filename);
  const res = await fetch(`${settings.apiBaseUrl}/uploads`, {
    method: 'POST',
    headers: buildHeaders(settings),
    body: form,
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { code?: string; message?: string };
    throw new ApiClientError(res.status, err.code ?? 'UPLOAD_ERROR', err.message ?? 'อัปโหลดรูปภาพไม่สำเร็จ');
  }
  return uploadResponseSchema.parse(data).url;
}

export async function postMutationWithOfflineSupport(
  endpoint: string,
  body: Record<string, unknown>,
  label: string,
  settings = loadDevSettings(),
  existingKey?: string,
): Promise<{ queued: boolean; data?: Record<string, unknown> }> {
  const idempotencyKey = existingKey ?? makeIdempotencyKey();
  try {
    const res = await fetch(`${settings.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(settings, {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      }),
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new ApiClientError(
        res.status,
        String(data.code ?? 'DOMAIN_ERROR'),
        String(data.message ?? 'คำขอถูกปฏิเสธ'),
      );
    }
    return { queued: false, data };
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    await enqueueOfflineMutation({
      idempotencyKey,
      endpoint,
      body,
      label,
      createdAt: Date.now(),
    });
    return { queued: true };
  }
}

export const riderActions = {
  claim: (orderId: string) =>
    postMutationWithOfflineSupport(`/orders/${orderId}/claim`, {}, `รับงาน #${orderId.slice(0, 6)}`),
  pack: (orderId: string) =>
    postMutationWithOfflineSupport(`/orders/${orderId}/pack`, {}, `กดน้ำ #${orderId.slice(0, 6)}`),
  pickup: (orderId: string, evidence: EvidenceInput) =>
    postMutationWithOfflineSupport(`/orders/${orderId}/pickup`, { evidence }, `รับสินค้า #${orderId.slice(0, 6)}`),
  start: (orderId: string) =>
    postMutationWithOfflineSupport(`/orders/${orderId}/start`, {}, `เริ่มวิ่งส่ง #${orderId.slice(0, 6)}`),
  deliver: (
    orderId: string,
    payload: { evidence: EvidenceInput; otp?: string; bagsCollected: number; bagPhotoUrl?: string },
  ) => postMutationWithOfflineSupport(`/orders/${orderId}/deliver`, { ...payload, autoCloseBags: true }, `ส่งน้ำ #${orderId.slice(0, 6)}`),
  fail: (orderId: string, payload: { evidence: EvidenceInput; reason: string }) =>
    postMutationWithOfflineSupport(`/orders/${orderId}/fail`, payload, `ส่งไม่สำเร็จ #${orderId.slice(0, 6)}`),
};

export async function syncOfflineQueue(settings = loadDevSettings()): Promise<{ synced: number; remaining: number }> {
  const items = await listOfflineMutations();
  let synced = 0;
  for (const item of items) {
    const res = await postMutationWithOfflineSupport(item.endpoint, item.body, item.label, settings, item.idempotencyKey);
    if (!res.queued) {
      await removeOfflineMutation(item.idempotencyKey);
      synced++;
    }
  }
  const left = await listOfflineMutations();
  return { synced, remaining: left.length };
}
