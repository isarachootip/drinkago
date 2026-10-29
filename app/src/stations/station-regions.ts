export const STATION_REGIONS = [
  'BANGKOK',
  'CENTRAL',
  'NORTH',
  'NORTHEAST',
  'EAST',
  'SOUTH',
] as const;

export type StationRegion = (typeof STATION_REGIONS)[number];

export interface StationRegionMeta {
  code: StationRegion;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
}

export const STATION_REGION_META: Record<StationRegion, StationRegionMeta> = {
  BANGKOK: {
    code: 'BANGKOK',
    label: 'กรุงเทพฯ และปริมณฑล',
    shortLabel: 'กรุงเทพฯ',
    emoji: '🏙️',
    color: '#0B6E8A',
  },
  CENTRAL: {
    code: 'CENTRAL',
    label: 'ภาคกลาง',
    shortLabel: 'ภาคกลาง',
    emoji: '🌾',
    color: '#1A56B0',
  },
  NORTH: {
    code: 'NORTH',
    label: 'ภาคเหนือ',
    shortLabel: 'ภาคเหนือ',
    emoji: '⛰️',
    color: '#1E7B45',
  },
  NORTHEAST: {
    code: 'NORTHEAST',
    label: 'ภาคอีสาน',
    shortLabel: 'ภาคอีสาน',
    emoji: '🦖',
    color: '#B45309',
  },
  EAST: {
    code: 'EAST',
    label: 'ภาคตะวันออก',
    shortLabel: 'ภาคตะวันออก',
    emoji: '🌊',
    color: '#0284C7',
  },
  SOUTH: {
    code: 'SOUTH',
    label: 'ภาคใต้',
    shortLabel: 'ภาคใต้',
    emoji: '🏝️',
    color: '#7C3AED',
  },
};

export function isStationRegion(value: string | null | undefined): value is StationRegion {
  return Boolean(value && (STATION_REGIONS as readonly string[]).includes(value));
}

export function getStationRegionMeta(region?: string | null): StationRegionMeta {
  return isStationRegion(region) ? STATION_REGION_META[region] : STATION_REGION_META.BANGKOK;
}

const REGION_KEYWORDS: Array<{ region: StationRegion; pattern: RegExp }> = [
  {
    region: 'NORTH',
    pattern: /ภาคเหนือ|เชียงใหม่|เชียงราย|ลำปาง|ลำพูน|แพร่|น่าน|พะเยา|แม่ฮ่องสอน|พิษณุโลก|ตาก|อุตรดิตถ์|สุโขทัย|เพชรบูรณ์/,
  },
  {
    region: 'NORTHEAST',
    pattern: /ภาคอีสาน|ตะวันออกเฉียงเหนือ|ขอนแก่น|อุดรธานี|นครราชสีมา|โคราช|อุบลราชธานี|บุรีรัมย์|สุรินทร์|ศรีสะเกษ|สกลนคร|หนองคาย|ร้อยเอ็ด|มหาสารคาม|เลย|ชัยภูมิ|นครพนม|กาฬสินธุ์|ยโสธร|มุกดาหาร|หนองบัวลำภู|อำนาจเจริญ|บึงกาฬ/,
  },
  {
    region: 'EAST',
    pattern: /ภาคตะวันออก|ชลบุรี|พัทยา|ระยอง|จันทบุรี|ตราด|ฉะเชิงเทรา|ปราจีนบุรี|สระแก้ว/,
  },
  {
    region: 'SOUTH',
    pattern: /ภาคใต้|สงขลา|หาดใหญ่|ภูเก็ต|สุราษฎร์ธานี|นครศรีธรรมราช|กระบี่|พังงา|ตรัง|ชุมพร|ระนอง|พัทลุง|สตูล|ปัตตานี|ยะลา|นราธิวาส/,
  },
  {
    region: 'BANGKOK',
    pattern: /กรุงเทพ|กทม|ปริมณฑล|นนทบุรี|ปทุมธานี|สมุทรปราการ|สมุทรสาคร|นครปฐม|เขตคลองเตย|เขตสวนหลวง|เขตบางเขน|เขตทุ่งครุ|เขตลาดพร้าว|เขตห้วยขวาง|เขตจตุจักร|เขตบางแค|เขตบางขุนเทียน|เขตลาดกระบัง/,
  },
  {
    region: 'CENTRAL',
    pattern: /ภาคกลาง|พระนครศรีอยุธยา|อยุธยา|อุทัยธานี|สระบุรี|ลพบุรี|อ่างทอง|สิงห์บุรี|ชัยนาท|นครสวรรค์|กำแพงเพชร|พิจิตร|สุพรรณบุรี|กาญจนบุรี|ราชบุรี|เพชรบุรี|ประจวบคีรีขันธ์|สมุทรสงคราม|นครนายก/,
  },
];

export function inferStationRegion(name: string, addressDetail: string): StationRegion {
  const combined = `${name} ${addressDetail}`;
  for (const entry of REGION_KEYWORDS) {
    if (entry.pattern.test(combined)) return entry.region;
  }
  return 'BANGKOK';
}

export function parseStationRegionFromText(text: string): StationRegion | null {
  const cleaned = text.trim();
  if (/กรุงเทพ|กทม|ปริมณฑล/i.test(cleaned)) return 'BANGKOK';
  if (/ภาคเหนือ/i.test(cleaned)) return 'NORTH';
  if (/ภาคอีสาน|ตะวันออกเฉียงเหนือ/i.test(cleaned)) return 'NORTHEAST';
  if (/ภาคตะวันออก/i.test(cleaned)) return 'EAST';
  if (/ภาคใต้/i.test(cleaned)) return 'SOUTH';
  if (/ภาคกลาง/i.test(cleaned)) return 'CENTRAL';
  return null;
}
