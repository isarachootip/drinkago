import { CustomerAddress } from '../api/schemas';
import { distanceMeters, formatDistance } from './geo';
import { RiderTargetLocation } from './rider-steps';

export const DEFAULT_FALLBACK_COORDS = {
  lat: 13.7563,
  lng: 100.5018,
} as const;

export const PLACEHOLDER_ADDRESS_DETAIL = 'กรุณาตรวจสอบที่อยู่จัดส่ง';

const COORD_EPSILON = 0.00005;

export interface StationNavInput {
  code?: string | null;
  name?: string | null;
  addressDetail?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface CustomerAddressNavInput {
  label?: string | null;
  detail?: string | null;
  lat: number;
  lng: number;
}

export interface CustomerMapsResolution {
  url: string;
  mode: 'gps' | 'address_query';
}

export function isFallbackCoordinates(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - DEFAULT_FALLBACK_COORDS.lat) <= COORD_EPSILON &&
    Math.abs(lng - DEFAULT_FALLBACK_COORDS.lng) <= COORD_EPSILON
  );
}

export function hasUsableAddressText(detail?: string | null): boolean {
  const clean = (detail ?? '').trim();
  if (clean === PLACEHOLDER_ADDRESS_DETAIL) return false;
  const baseChars = clean.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\s]/g, '');
  return baseChars.length >= 4;
}

export function buildStationMapsUrl(station?: StationNavInput | null): string | null {
  if (!station) return null;
  if (station.lat != null && station.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  }
  const textQuery = [station.name, station.addressDetail].map((s) => (s ?? '').trim()).filter(Boolean).join(' ');
  if (!textQuery) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(textQuery)}`;
}

export function buildCustomerMapsUrl(address: CustomerAddressNavInput): CustomerMapsResolution {
  if (isFallbackCoordinates(address.lat, address.lng) && hasUsableAddressText(address.detail)) {
    const cleanText = (address.detail ?? '').trim();
    return {
      url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanText)}`,
      mode: 'address_query',
    };
  }
  return {
    url: `https://www.google.com/maps/dir/?api=1&destination=${address.lat},${address.lng}`,
    mode: 'gps',
  };
}

export function formatJobDistanceLabel(
  originLat: number,
  originLng: number,
  address: CustomerAddressNavInput,
): string {
  if (isFallbackCoordinates(address.lat, address.lng) && hasUsableAddressText(address.detail)) {
    return 'นำทางตามชื่อที่อยู่';
  }
  return formatDistance(distanceMeters(originLat, originLng, address.lat, address.lng));
}

export function getStepInlineNavTarget(stepNumber: number): RiderTargetLocation | null {
  if (stepNumber === 2) return 'station';
  if (stepNumber === 4 || stepNumber === 5) return 'customer';
  return null;
}

export function pickPreferredAddress(
  addresses: CustomerAddress[],
  currentSelectedId?: string,
): CustomerAddress | null {
  if (addresses.length === 0) return null;
  if (currentSelectedId) {
    const matched = addresses.find((a) => a.id === currentSelectedId);
    if (matched) return matched;
  }
  for (let i = addresses.length - 1; i >= 0; i--) {
    if (hasUsableAddressText(addresses[i].detail)) {
      return addresses[i];
    }
  }
  return addresses[addresses.length - 1] ?? null;
}

export interface AddressDraftInput {
  label: string;
  detail: string;
  lat: number;
  lng: number;
  note?: string;
}

export type AddressDraftValidation =
  | { ok: true; value: { label: string; detail: string; lat: number; lng: number; note?: string } }
  | { ok: false; error: string };

export function validateAddressDraft(draft: AddressDraftInput): AddressDraftValidation {
  const label = draft.label.trim() || 'บ้าน';
  const detail = draft.detail.trim();
  const note = draft.note?.trim();
  if (label.length > 50) {
    return { ok: false, error: 'ชื่อสถานที่ต้องไม่เกิน 50 ตัวอักษร' };
  }
  if (!hasUsableAddressText(detail) || detail.length > 500) {
    return { ok: false, error: 'กรุณาระบุรายละเอียดที่อยู่จัดส่งให้ชัดเจน (บ้านเลขที่ ซอย ถนน)' };
  }
  if (!Number.isFinite(draft.lat) || draft.lat < -90 || draft.lat > 90) {
    return { ok: false, error: 'ค่า Latitude ไม่ถูกต้อง (-90 ถึง 90)' };
  }
  if (!Number.isFinite(draft.lng) || draft.lng < -180 || draft.lng > 180) {
    return { ok: false, error: 'ค่า Longitude ไม่ถูกต้อง (-180 ถึง 180)' };
  }
  return {
    ok: true,
    value: {
      label,
      detail,
      lat: Number(draft.lat.toFixed(6)),
      lng: Number(draft.lng.toFixed(6)),
      ...(note ? { note } : {}),
    },
  };
}
