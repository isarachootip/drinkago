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

const THAI_MONTH_PATTERNS: Array<{ month: number; regex: RegExp }> = [
  { month: 1, regex: /(มกราคม|มกรา|ม\.ค\.?)/i },
  { month: 2, regex: /(กุมภาพันธ์|กุมภา|ก\.พ\.?)/i },
  { month: 3, regex: /(มีนาคม|มีนา|มี\.ค\.?)/i },
  { month: 4, regex: /(เมษายน|เมษา|เม\.ย\.?)/i },
  { month: 5, regex: /(พฤษภาคม|พฤษภา|พ\.ค\.?)/i },
  { month: 6, regex: /(มิถุนายน|มิถุนา|มิ\.ย\.?)/i },
  { month: 7, regex: /(กรกฎาคม|กรกฎา|ก\.ค\.?)/i },
  { month: 8, regex: /(สิงหาคม|สิงหา|ส\.ค\.?)/i },
  { month: 9, regex: /(กันยายน|กันยา|ก\.ย\.?)/i },
  { month: 10, regex: /(ตุลาคม|ตุลา|ต\.ค\.?)/i },
  { month: 11, regex: /(พฤศจิกายน|พฤศจิกา|พ\.ย\.?)/i },
  { month: 12, regex: /(ธันวาคม|ธันวา|ธ\.ค\.?)/i },
];

function toValidIsoDate(yearCe: number, month: number, day: number): string | null {
  if (yearCe < 1900 || yearCe > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(yearCe, month - 1, day));
  if (check.getUTCFullYear() !== yearCe || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return `${String(yearCe).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeYearCe(rawYear: number): number {
  if (rawYear >= 2400) return rawYear - 543;
  if (rawYear < 100) return rawYear >= 60 ? 2500 + rawYear - 543 : 2000 + rawYear;
  return rawYear;
}

export function parseMeetupEventIsoDate(eventDate: string): string | null {
  const trimmed = eventDate.trim();
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    return toValidIsoDate(normalizeYearCe(Number(isoMatch[1])), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (slashMatch) {
    return toValidIsoDate(normalizeYearCe(Number(slashMatch[3])), Number(slashMatch[2]), Number(slashMatch[1]));
  }

  const monthEntry = THAI_MONTH_PATTERNS.find((m) => m.regex.test(trimmed));
  const numbers = trimmed.match(/\d+/g);
  if (!monthEntry || !numbers || numbers.length < 2) return null;

  const day = Number(numbers[0]);
  const yearCe = normalizeYearCe(Number(numbers[numbers.length - 1]));
  return toValidIsoDate(yearCe, monthEntry.month, day);
}

export function isoDateToThaiLabel(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate.trim();
  const yearBe = Number(match[1]) + 543;
  const monthName = THAI_MONTHS_SHORT[Number(match[2]) - 1];
  const day = Number(match[3]);
  return monthName ? `${day} ${monthName} ${yearBe}` : isoDate.trim();
}

export function getBangkokIsoDate(now: Date = new Date()): string {
  const bkkMs = now.getTime() + 7 * 3600_000;
  const d = new Date(bkkMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDaysIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function normalizeMeetupTimeKey(rawTime: string): string {
  const parts = rawTime.trim().replace(/[^0-9.:]/g, '').split(/[.:]/);
  const h = Math.min(23, Math.max(0, Number(parts[0] ?? 0) || 0));
  const m = Math.min(59, Math.max(0, Number(parts[1] ?? 0) || 0));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface MeetupDateFilterOptions {
  window?: '30d' | 'all';
  todayIso?: string;
  days?: number;
}

export function filterAndSortMeetupEvents<T extends { id: number; eventDate: string; eventTime: string }>(
  events: T[],
  opts?: MeetupDateFilterOptions,
): T[] {
  const windowMode = opts?.window ?? 'all';
  const todayIso = opts?.todayIso ?? getBangkokIsoDate();
  const endIso = addDaysIsoDate(todayIso, opts?.days ?? 30);

  const decorated = events.map((ev) => ({
    ev,
    iso: parseMeetupEventIsoDate(ev.eventDate),
    timeKey: normalizeMeetupTimeKey(ev.eventTime),
  }));

  const filtered = windowMode === '30d'
    ? decorated.filter((x) => x.iso !== null && x.iso >= todayIso && x.iso <= endIso)
    : decorated;

  filtered.sort((a, b) => {
    const isoA = a.iso ?? '9999-99-99';
    const isoB = b.iso ?? '9999-99-99';
    if (isoA !== isoB) return isoA.localeCompare(isoB);
    if (a.timeKey !== b.timeKey) return a.timeKey.localeCompare(b.timeKey);
    return a.ev.id - b.ev.id;
  });

  return filtered.map((x) => x.ev);
}
