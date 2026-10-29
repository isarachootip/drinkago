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
  color: string;
  bg: string;
}

export const STATION_REGION_META: Record<StationRegion, StationRegionMeta> = {
  BANGKOK: { code: 'BANGKOK', label: 'กรุงเทพฯ และปริมณฑล', shortLabel: 'กรุงเทพฯ', emoji: '🏙️', color: '#0B6E8A', bg: '#E0F2FE' },
  CENTRAL: { code: 'CENTRAL', label: 'ภาคกลาง', shortLabel: 'ภาคกลาง', emoji: '🌾', color: '#1A56B0', bg: '#DBEAFE' },
  NORTH: { code: 'NORTH', label: 'ภาคเหนือ', shortLabel: 'ภาคเหนือ', emoji: '⛰️', color: '#1E7B45', bg: '#DCFCE7' },
  NORTHEAST: { code: 'NORTHEAST', label: 'ภาคอีสาน', shortLabel: 'ภาคอีสาน', emoji: '🦖', color: '#B45309', bg: '#FEF3C7' },
  EAST: { code: 'EAST', label: 'ภาคตะวันออก', shortLabel: 'ภาคตะวันออก', emoji: '🌊', color: '#0284C7', bg: '#E0F2FE' },
  SOUTH: { code: 'SOUTH', label: 'ภาคใต้', shortLabel: 'ภาคใต้', emoji: '🏝️', color: '#7C3AED', bg: '#F3E8FF' },
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
