import { z } from 'zod';
import { requestJson, StaffSession } from './role-api';
import { BagSummary, bagSummarySchema } from './schemas';

export const waterStationSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  addressDetail: z.string(),
  lat: z.number(),
  lng: z.number(),
  active: z.boolean(),
  bagBalance: z.number().int(),
});
export type WaterStation = z.infer<typeof waterStationSchema>;

export const stationLedgerEntrySchema = z.object({
  id: z.number().int(),
  stationId: z.number().int(),
  orderId: z.string().uuid().nullable().optional(),
  orderCode: z.string().nullable().optional(),
  customerId: z.string().uuid().nullable().optional(),
  customerName: z.string().nullable().optional(),
  movement: z.enum(['RESTOCK_IN', 'DISPENSED_OUT', 'RETURNED_IN', 'ADJUST']),
  qty: z.number().int(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type StationLedgerEntry = z.infer<typeof stationLedgerEntrySchema>;

export const managedRiderSchema = z.object({
  id: z.string().uuid(),
  lineUserId: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  active: z.boolean(),
});
export type ManagedRider = z.infer<typeof managedRiderSchema>;

export const managedCustomerSchema = z.object({
  id: z.string().uuid(),
  lineUserId: z.string(),
  name: z.string(),
  phone: z.string().nullable().optional(),
  creditLimitSatang: z.number().int(),
  creditUsedSatang: z.number().int(),
  bagBalance: z.number().int(),
  addressId: z.string().uuid().nullable().optional(),
  addressLabel: z.string(),
  addressDetail: z.string(),
  lat: z.number(),
  lng: z.number(),
  active: z.boolean(),
});
export type ManagedCustomer = z.infer<typeof managedCustomerSchema>;

export const managedUserSchema = z.object({
  id: z.string().uuid(),
  lineUserId: z.string(),
  username: z.string().nullable().optional(),
  role: z.enum(['customer', 'warehouse', 'rider', 'admin']),
  name: z.string(),
  phone: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  creditLimitSatang: z.number().int(),
  active: z.boolean(),
  hasPassword: z.boolean(),
});
export type ManagedUser = z.infer<typeof managedUserSchema>;

export const adminMgmtApi = {
  login: (username: string, password: string) =>
    requestJson<StaffSession>('/auth/login', { method: 'POST', body: { username, password } }),

  listUsers: async (): Promise<ManagedUser[]> =>
    z.array(managedUserSchema).parse(await requestJson('/admin/users', { useStaffToken: true, userOverride: 'dev-admin' })),

  createUser: async (body: {
    username?: string;
    password?: string;
    lineUserId?: string;
    role: 'customer' | 'warehouse' | 'rider' | 'admin';
    name: string;
    phone?: string;
    vehicle?: string;
    zone?: string;
    creditLimitSatang?: number;
  }): Promise<ManagedUser> =>
    managedUserSchema.parse(await requestJson('/admin/users', { method: 'POST', body, useStaffToken: true, userOverride: 'dev-admin' })),

  updateUser: async (
    id: string,
    body: Partial<{
      username: string | null;
      password: string;
      lineUserId: string;
      role: 'customer' | 'warehouse' | 'rider' | 'admin';
      name: string;
      phone: string | null;
      vehicle: string | null;
      zone: string | null;
      creditLimitSatang: number;
      active: boolean;
    }>,
  ): Promise<ManagedUser> =>
    managedUserSchema.parse(await requestJson(`/admin/users/${id}`, { method: 'PATCH', body, useStaffToken: true, userOverride: 'dev-admin' })),

  deleteUser: (id: string) =>
    requestJson<{ id: string; deleted: boolean; mode: 'HARD_DELETE' | 'SOFT_DELETE'; active: boolean }>(`/admin/users/${id}`, {
      method: 'DELETE',
      useStaffToken: true,
      userOverride: 'dev-admin',
    }),

  listStations: async (user = 'dev-admin'): Promise<WaterStation[]> =>
    z.array(waterStationSchema).parse(await requestJson('/stations', { userOverride: user })),

  createStation: async (
    body: { code: string; name: string; addressDetail: string; lat: number; lng: number },
    user = 'dev-admin',
  ): Promise<WaterStation> =>
    waterStationSchema.parse(await requestJson('/admin/stations', { method: 'POST', body, userOverride: user })),

  updateStation: async (
    id: number,
    body: Partial<{ name: string; addressDetail: string; lat: number; lng: number; active: boolean }>,
    user = 'dev-admin',
  ): Promise<WaterStation> =>
    waterStationSchema.parse(await requestJson(`/admin/stations/${id}`, { method: 'PATCH', body, userOverride: user })),

  addStationBags: (
    stationId: number,
    body: { movement: 'RESTOCK_IN' | 'ADJUST'; qty: number; note?: string },
    user = 'dev-admin',
  ) =>
    requestJson<{ stationId: number; bagBalance: number }>(`/admin/stations/${stationId}/bags`, {
      method: 'POST',
      body,
      userOverride: user,
    }),

  getStationLedger: async (stationId: number, user = 'dev-admin'): Promise<StationLedgerEntry[]> =>
    z.array(stationLedgerEntrySchema).parse(await requestJson(`/admin/stations/${stationId}/ledger`, { userOverride: user })),

  listRiders: async (user = 'dev-admin'): Promise<ManagedRider[]> =>
    z.array(managedRiderSchema).parse(await requestJson('/admin/riders', { userOverride: user })),

  createRider: async (
    body: { lineUserId: string; name: string; phone?: string; vehicle?: string; zone?: string },
    user = 'dev-admin',
  ): Promise<ManagedRider> =>
    managedRiderSchema.parse(await requestJson('/admin/riders', { method: 'POST', body, userOverride: user })),

  updateRider: async (
    id: string,
    body: Partial<{ name: string; phone: string; vehicle: string; zone: string; active: boolean }>,
    user = 'dev-admin',
  ): Promise<ManagedRider> =>
    managedRiderSchema.parse(await requestJson(`/admin/riders/${id}`, { method: 'PATCH', body, userOverride: user })),

  listCustomers: async (user = 'dev-admin'): Promise<ManagedCustomer[]> =>
    z.array(managedCustomerSchema).parse(await requestJson('/admin/customers', { userOverride: user })),

  createCustomer: (
    body: { lineUserId: string; name: string; phone: string; creditLimitSatang: number; addressDetail: string; lat: number; lng: number },
    user = 'dev-admin',
  ) => requestJson('/admin/customers', { method: 'POST', body, userOverride: user }),

  updateCustomer: (
    id: string,
    body: Partial<{ name: string; phone: string; creditLimitSatang: number; addressDetail: string; lat: number; lng: number; active: boolean }>,
    user = 'dev-admin',
  ) => requestJson(`/admin/customers/${id}`, { method: 'PATCH', body, userOverride: user }),

  getCustomerBags: async (customerId: string, user = 'dev-admin'): Promise<BagSummary> =>
    bagSummarySchema.parse(await requestJson(`/admin/customers/${customerId}/bags`, { userOverride: user })),
};
