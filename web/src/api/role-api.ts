import { z } from 'zod';
import { loadLineToken } from '../domain/session-gate';
import { ApiClientError, loadDevSettings } from './client';
import {
  addressSchema,
  BagSummary,
  bagSummarySchema,
  CustomerAddress,
  DevAuthSettings,
  EvidenceInput,
  OrderDetail,
  orderDetailSchema,
  OrderEvent,
  orderEventSchema,
  OrderStatus,
  Product,
  productSchema,
  RiderUser,
  riderUserSchema,
  StaffOrder,
  staffOrderSchema,
  SuggestedStation,
  suggestedStationSchema,
} from './schemas';

export const STAFF_SESSION_KEY = 'drinkgo_staff_session_v1';

export interface StaffSession {
  token: string;
  user: {
    id: string;
    username?: string | null;
    lineUserId: string;
    name: string;
    role: 'customer' | 'warehouse' | 'rider' | 'admin';
  };
}

export function loadStaffSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}

export function saveStaffSession(session: StaffSession | null): void {
  if (!session) localStorage.removeItem(STAFF_SESSION_KEY);
  else localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
}

export async function requestJson<T>(
  path: string,
  opts: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    userOverride?: string;
    useStaffToken?: boolean;
    settings?: DevAuthSettings;
  } = {},
): Promise<T> {
  const s = opts.settings ?? loadDevSettings();
  const headers: Record<string, string> = {
    'x-dev-user': opts.userOverride ?? s.devUser,
  };
  const staffSession = loadStaffSession();
  const lineToken = loadLineToken();
  if (staffSession?.token && (opts.useStaffToken || opts.userOverride === 'dev-admin' || opts.userOverride === 'dev-warehouse')) {
    headers['authorization'] = `Bearer ${staffSession.token}`;
  } else if (lineToken) {
    headers['x-line-token'] = lineToken;
  }
  if (s.devKey) headers['x-dev-key'] = s.devKey;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${s.apiBaseUrl}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      String(data.code ?? 'HTTP_ERROR'),
      String(data.message ?? 'เกิดข้อผิดพลาดในการเชื่อมต่อ'),
    );
  }
  return data as T;
}

export const customerApi = {
  getMe: (user = 'dev-customer') =>
    requestJson<{ id: string; name: string; phone: string; role: string; creditLimitSatang: number }>('/me', { userOverride: user }),

  register: (input: { name: string; phone: string }, user = 'dev-customer') =>
    requestJson<{ id: string; name: string }>('/me/register', {
      method: 'POST',
      body: { ...input, pdpaConsent: true },
      userOverride: user,
    }),

  listAddresses: async (user = 'dev-customer'): Promise<CustomerAddress[]> =>
    z.array(addressSchema).parse(await requestJson('/me/addresses', { userOverride: user })),

  addAddress: async (
    body: { label: string; detail: string; lat: number; lng: number; note?: string },
    user = 'dev-customer',
  ): Promise<CustomerAddress> =>
    addressSchema.parse(await requestJson('/me/addresses', { method: 'POST', body, userOverride: user })),

  listProducts: async (user = 'dev-customer'): Promise<Product[]> =>
    z.array(productSchema).parse(await requestJson('/products', { userOverride: user })),

  suggestStations: async (lat: number, lng: number, user = 'dev-customer'): Promise<SuggestedStation[]> =>
    z.array(suggestedStationSchema).parse(await requestJson(`/stations/suggest?lat=${lat}&lng=${lng}`, { userOverride: user })),

  getBags: async (user = 'dev-customer'): Promise<BagSummary> =>
    bagSummarySchema.parse(await requestJson('/me/bags', { userOverride: user })),

  createOrder: (
    body: {
      addressId: string;
      stationId?: number;
      items: { productId: number; qty: number }[];
      expectBagReturn: number;
      paymentMethod: 'CASH' | 'PROMPTPAY' | 'CREDIT';
      autoConfirm?: boolean;
    },
    user = 'dev-customer',
  ) => requestJson<StaffOrder>('/orders', { method: 'POST', body: { autoConfirm: true, ...body }, userOverride: user }),

  reorder: (body: { expectBagReturn?: number; addressId?: string; stationId?: number }, user = 'dev-customer') =>
    requestJson<StaffOrder>('/orders/reorder', { method: 'POST', body: { autoConfirm: true, ...body }, userOverride: user }),

  myOrders: async (user = 'dev-customer'): Promise<StaffOrder[]> =>
    z.array(staffOrderSchema).parse(await requestJson('/orders/mine', { userOverride: user })),

  getOrder: async (orderId: string, user = 'dev-customer'): Promise<OrderDetail> =>
    orderDetailSchema.parse(await requestJson(`/orders/${orderId}`, { userOverride: user })),

  getEvents: async (orderId: string, user = 'dev-customer'): Promise<OrderEvent[]> =>
    z.array(orderEventSchema).parse(await requestJson(`/orders/${orderId}/events`, { userOverride: user })),

  submitSlip: (orderId: string, slipUrl: string, ref?: string, user = 'dev-customer') =>
    requestJson(`/orders/${orderId}/payment-slip`, { method: 'POST', body: { slipUrl, ref }, userOverride: user }),

  cancelOrder: (orderId: string, note?: string, user = 'dev-customer') =>
    requestJson(`/orders/${orderId}/cancel`, { method: 'POST', body: { note }, userOverride: user }),
};

export const staffApi = {
  listOrders: async (status?: OrderStatus, user = 'dev-warehouse'): Promise<StaffOrder[]> => {
    const q = status ? `?status=${status}` : '';
    return z.array(staffOrderSchema).parse(await requestJson(`/orders${q}`, { userOverride: user }));
  },

  listRiders: async (user = 'dev-warehouse'): Promise<RiderUser[]> =>
    z.array(riderUserSchema).parse(await requestJson('/riders', { userOverride: user })),

  confirmOrder: (orderId: string, user = 'dev-warehouse') =>
    requestJson(`/orders/${orderId}/confirm`, { method: 'POST', body: {}, userOverride: user }),

  packOrder: (orderId: string, user = 'dev-warehouse') =>
    requestJson(`/orders/${orderId}/pack`, { method: 'POST', body: {}, userOverride: user }),

  assignRider: (orderId: string, riderId: string, stationId?: number, user = 'dev-warehouse') =>
    requestJson(`/orders/${orderId}/assign`, { method: 'POST', body: { riderId, stationId }, userOverride: user }),

  receiveBags: (orderId: string, payload: { evidence: EvidenceInput; counted: number }, user = 'dev-warehouse') =>
    requestJson(`/orders/${orderId}/receive-bags`, { method: 'POST', body: payload, userOverride: user }),

  bagMismatches: async (): Promise<StaffOrder[]> =>
    z.array(staffOrderSchema).parse(await requestJson('/admin/bag-mismatches', { userOverride: 'dev-admin' })),

  resolveBags: (orderId: string, note: string) =>
    requestJson(`/orders/${orderId}/resolve-bags`, { method: 'POST', body: { note }, userOverride: 'dev-admin' }),

  verifyPayment: (orderId: string) =>
    requestJson(`/orders/${orderId}/verify-payment`, { method: 'POST', body: {}, userOverride: 'dev-admin' }),

  reschedule: (orderId: string, note?: string) =>
    requestJson(`/orders/${orderId}/reschedule`, { method: 'POST', body: { note }, userOverride: 'dev-admin' }),

  unlockOtp: (orderId: string) =>
    requestJson(`/orders/${orderId}/unlock-otp`, { method: 'POST', body: {}, userOverride: 'dev-admin' }),

  orderEvents: async (orderId: string): Promise<OrderEvent[]> =>
    z.array(orderEventSchema).parse(await requestJson(`/orders/${orderId}/events`, { userOverride: 'dev-admin' })),

  clearAllOrders: () =>
    requestJson<{ clearedOrders: number; restockedStations: number }>('/admin/orders/clear', {
      method: 'POST',
      body: {},
      useStaffToken: true,
      userOverride: 'dev-admin',
    }),
};
