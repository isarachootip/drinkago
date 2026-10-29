export const THAI_MONTHS_SHORT = [
  'มกรา',
  'กุมภา',
  'มีนา',
  'เมษา',
  'พฤษภา',
  'มิถุนา',
  'กรกฎา',
  'สิงหา',
  'กันยา',
  'ตุลา',
  'พฤศจิกา',
  'ธันวา',
] as const;

const THAI_MONTH_PATTERNS: { index: number; regex: RegExp }[] = [
  { index: 1, regex: /(มกราคม|มกรา|ม\.ค\.?)/i },
  { index: 2, regex: /(กุมภาพันธ์|กุมภา|ก\.พ\.?)/i },
  { index: 3, regex: /(มีนาคม|มีนา|มี\.ค\.?)/i },
  { index: 4, regex: /(เมษายน|เมษา|เม\.ย\.?)/i },
  { index: 5, regex: /(พฤษภาคม|พฤษภา|พ\.ค\.?)/i },
  { index: 6, regex: /(มิถุนายน|มิถุนา|มิ\.ย\.?)/i },
  { index: 7, regex: /(กรกฎาคม|กรกฎา|ก\.ค\.?)/i },
  { index: 8, regex: /(สิงหาคม|สิงหา|ส\.ค\.?)/i },
  { index: 9, regex: /(กันยายน|กันยา|ก\.ย\.?)/i },
  { index: 10, regex: /(ตุลาคม|ตุลา|ต\.ค\.?)/i },
  { index: 11, regex: /(พฤศจิกายน|พฤศจิกา|พ\.ย\.?)/i },
  { index: 12, regex: /(ธันวาคม|ธันวา|ธ\.ค\.?)/i },
];

export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const MINUTE_OPTIONS: string[] = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export function isoDateToThaiLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate.trim();
  const yearCe = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const monthName = THAI_MONTHS_SHORT[monthIdx];
  if (!monthName || day < 1 || day > 31) return isoDate.trim();
  const yearBe = yearCe >= 2400 ? yearCe : yearCe + 543;
  return `${day} ${monthName} ${yearBe}`;
}

export function thaiLabelToIsoDate(label: string): string {
  const trimmed = label.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const numbers = trimmed.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const day = Math.min(31, Math.max(1, Number(numbers[0])));
    const rawYear = Number(numbers[numbers.length - 1]);
    const yearCe = rawYear >= 2400 ? rawYear - 543 : rawYear < 100 ? 2000 + rawYear : rawYear;
    const foundMonth = THAI_MONTH_PATTERNS.find((m) => m.regex.test(trimmed))?.index ?? 3;
    return `${String(yearCe).padStart(4, '0')}-${String(foundMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return '2026-03-17';
}

export function normalizeTimeParts(rawTime: string): { hour: string; minute: string; display: string } {
  const cleaned = rawTime.trim().replace(/[^0-9.:]/g, '');
  const parts = cleaned.split(/[.:]/);
  const h = Math.min(23, Math.max(0, Number(parts[0] ?? 10) || 0));
  const m = Math.min(59, Math.max(0, Number(parts[1] ?? 0) || 0));
  const hour = String(h).padStart(2, '0');
  const minute = String(m).padStart(2, '0');
  return { hour, minute, display: `${hour}.${minute}` };
}

export function getBangkokTodayIso(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 7 * 3600_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export type EventWindowCategory = 'within_30d' | 'future_beyond_30d' | 'past';

export function classifyEventWindow(eventDate: string, todayIso: string = getBangkokTodayIso()): EventWindowCategory {
  const iso = thaiLabelToIsoDate(eventDate);
  if (iso < todayIso) return 'past';
  const endIso = addDaysIso(todayIso, 30);
  return iso <= endIso ? 'within_30d' : 'future_beyond_30d';
}

export function resolveInitialEventsViewMode(search?: string): '30d' | 'all' {
  try {
    const raw = search !== undefined ? search : typeof window !== 'undefined' ? window.location.search : '';
    if (!raw) return '30d';
    const params = new URLSearchParams(raw.startsWith('?') ? raw : `?${raw}`);
    if (params.get('view')?.trim().toLowerCase() === 'all') return 'all';
    const liffState = params.get('liff.state');
    if (liffState) {
      const qIdx = liffState.indexOf('?');
      const stateQuery = qIdx >= 0 ? liffState.slice(qIdx + 1) : liffState;
      if (new URLSearchParams(stateQuery).get('view')?.trim().toLowerCase() === 'all') return 'all';
    }
    return '30d';
  } catch {
    return '30d';
  }
}

export function filterAndSortEvents<T extends { id: number; eventDate: string; eventTime: string }>(
  events: T[],
  mode: '30d' | 'all',
  todayIso: string = getBangkokTodayIso(),
): T[] {
  const decorated = events.map((ev) => {
    const iso = thaiLabelToIsoDate(ev.eventDate);
    const { hour, minute } = normalizeTimeParts(ev.eventTime);
    const category = classifyEventWindow(ev.eventDate, todayIso);
    return { ev, iso, timeKey: `${hour}:${minute}`, category };
  });

  const filtered = mode === '30d' ? decorated.filter((x) => x.category === 'within_30d') : decorated;

  filtered.sort((a, b) => {
    const aPast = a.category === 'past' ? 1 : 0;
    const bPast = b.category === 'past' ? 1 : 0;
    if (aPast !== bPast) return aPast - bPast;
    if (aPast === 1) {
      if (a.iso !== b.iso) return b.iso.localeCompare(a.iso);
      return b.timeKey.localeCompare(a.timeKey);
    }
    if (a.iso !== b.iso) return a.iso.localeCompare(b.iso);
    if (a.timeKey !== b.timeKey) return a.timeKey.localeCompare(b.timeKey);
    return a.ev.id - b.ev.id;
  });

  return filtered.map((x) => x.ev);
}
