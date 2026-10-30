import { TranslationKey } from '../i18n';

export const STATION_REGIONS = [
  'BANGKOK',
  'CENTRAL',
  'NORTH',
  'NORTHEAST',
  'EAST',
  'SOUTH',
] as const;

export type StationRegion = (typeof STATION_REGIONS)[number];
export type StationRegionFilter = 'ALL' | StationRegion;

export interface StationRegionMeta {
  code: StationRegion;
  label: string;
  shortLabel: string;
  emoji: string;
  translationKey: TranslationKey;
  color: string;
  bg: string;
}

export const STATION_REGION_META: Record<StationRegion, StationRegionMeta> = {
  BANGKOK: { code: 'BANGKOK', label: 'กรุงเทพฯ และปริมณฑล', shortLabel: 'กรุงเทพฯ', emoji: '', translationKey: 'regionBangkok', color: '#0F172A', bg: '#F1F5F9' },
  CENTRAL: { code: 'CENTRAL', label: 'ภาคกลาง', shortLabel: 'ภาคกลาง', emoji: '', translationKey: 'regionCentral', color: '#1D4ED8', bg: '#EFF6FF' },
  NORTH: { code: 'NORTH', label: 'ภาคเหนือ', shortLabel: 'ภาคเหนือ', emoji: '', translationKey: 'regionNorth', color: '#047857', bg: '#ECFDF5' },
  NORTHEAST: { code: 'NORTHEAST', label: 'ภาคอีสาน', shortLabel: 'ภาคอีสาน', emoji: '', translationKey: 'regionNortheast', color: '#B45309', bg: '#FFFBEB' },
  EAST: { code: 'EAST', label: 'ภาคตะวันออก', shortLabel: 'ภาคตะวันออก', emoji: '', translationKey: 'regionEast', color: '#0369A1', bg: '#F0F9FF' },
  SOUTH: { code: 'SOUTH', label: 'ภาคใต้', shortLabel: 'ภาคใต้', emoji: '', translationKey: 'regionSouth', color: '#4338CA', bg: '#EEF2FF' },
};

export interface RegionStationLike {
  code: string;
  name: string;
  addressDetail: string;
  region?: string | null;
}

export function isStationRegion(val: string | null | undefined): val is StationRegion {
  return Boolean(val && (STATION_REGIONS as readonly string[]).includes(val));
}

export function getStationRegionMeta(region?: string | null): StationRegionMeta {
  return isStationRegion(region) ? STATION_REGION_META[region] : STATION_REGION_META.BANGKOK;
}

export function resolveInitialRegionParam(search?: string): StationRegionFilter {
  try {
    const raw = search !== undefined ? search : typeof window !== 'undefined' ? window.location.search : '';
    if (!raw) return 'ALL';
    const params = new URLSearchParams(raw.startsWith('?') ? raw : `?${raw}`);
    const direct = params.get('region')?.trim().toUpperCase();
    if (isStationRegion(direct)) return direct;
    const liffState = params.get('liff.state');
    if (liffState) {
      const qIdx = liffState.indexOf('?');
      const stateQuery = qIdx >= 0 ? liffState.slice(qIdx + 1) : liffState;
      const fromState = new URLSearchParams(stateQuery).get('region')?.trim().toUpperCase();
      if (isStationRegion(fromState)) return fromState;
    }
    return 'ALL';
  } catch {
    return 'ALL';
  }
}

export function countStationsByRegion<T extends RegionStationLike>(stations: T[]): Record<StationRegionFilter, number> {
  const counts: Record<StationRegionFilter, number> = {
    ALL: stations.length,
    BANGKOK: 0,
    CENTRAL: 0,
    NORTH: 0,
    NORTHEAST: 0,
    EAST: 0,
    SOUTH: 0,
  };
  for (const st of stations) {
    const code = getStationRegionMeta(st.region).code;
    counts[code] += 1;
  }
  return counts;
}

export function filterStationsByRegionAndQuery<T extends RegionStationLike>(
  stations: T[],
  region: StationRegionFilter,
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  return stations.filter((st) => {
    const meta = getStationRegionMeta(st.region);
    if (region !== 'ALL' && meta.code !== region) return false;
    if (!q) return true;
    const haystack = `${st.code} ${st.name} ${st.addressDetail} ${meta.label} ${meta.shortLabel}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function groupStationsByRegion<T extends RegionStationLike>(
  stations: T[],
): Array<{ region: StationRegion; meta: StationRegionMeta; items: T[] }> {
  const map = new Map<StationRegion, T[]>();
  for (const r of STATION_REGIONS) map.set(r, []);
  for (const st of stations) {
    const code = getStationRegionMeta(st.region).code;
    map.get(code)?.push(st);
  }
  return STATION_REGIONS
    .map((region) => ({ region, meta: STATION_REGION_META[region], items: map.get(region) ?? [] }))
    .filter((group) => group.items.length > 0);
}
