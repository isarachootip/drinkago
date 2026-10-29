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
  { index: 1, regex: /(มกรา|ม\.ค\.)/i },
  { index: 2, regex: /(กุมภา|ก\.พ\.)/i },
  { index: 3, regex: /(มีนา|มี\.ค\.)/i },
  { index: 4, regex: /(เมษา|เม\.ย\.)/i },
  { index: 5, regex: /(พฤษภา|พ\.ค\.)/i },
  { index: 6, regex: /(มิถุนา|มิ\.ย\.)/i },
  { index: 7, regex: /(กรกฎา|ก\.ค\.)/i },
  { index: 8, regex: /(สิงหา|ส\.ค\.)/i },
  { index: 9, regex: /(กันยา|ก\.ย\.)/i },
  { index: 10, regex: /(ตุลา|ต\.ค\.)/i },
  { index: 11, regex: /(พฤศจิกา|พ\.ย\.)/i },
  { index: 12, regex: /(ธันวา|ธ\.ค\.)/i },
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
