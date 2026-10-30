import { describe, expect, it } from 'vitest';
import {
  buildCustomerMapsUrl,
  buildStationMapsUrl,
  DEFAULT_FALLBACK_COORDS,
  formatJobDistanceLabel,
  getStepInlineNavTarget,
  isFallbackCoordinates,
  pickPreferredAddress,
  validateAddressDraft,
} from '../src/domain/navigation';

describe('Rider & Customer Google Maps Navigation Domain', () => {
  it('ตรวจจับพิกัดสำรองเริ่มต้น (13.7563, 100.5018) แยกจากพิกัดปักหมุดจริงได้ถูกต้อง', () => {
    expect(isFallbackCoordinates(DEFAULT_FALLBACK_COORDS.lat, DEFAULT_FALLBACK_COORDS.lng)).toBe(true);
    expect(isFallbackCoordinates(13.75631, 100.50181)).toBe(true);
    expect(isFallbackCoordinates(13.7058, 100.6012)).toBe(false);
    expect(isFallbackCoordinates(13.777, 100.5736)).toBe(false);
  });

  it('สร้างลิงก์ Google Maps นำทางไปตู้กดน้ำจากพิกัดจริง หรือ fallback ชื่อสาขาเมื่อไม่มีพิกัด', () => {
    expect(
      buildStationMapsUrl({
        code: 'ST-06',
        name: 'ตู้กดน้ำสาขารัชดาภิเษก-ห้วยขวาง',
        addressDetail: 'ถนนประชาราษฎร์บำเพ็ญ',
        lat: 13.777,
        lng: 100.5736,
      }),
    ).toBe('https://www.google.com/maps/dir/?api=1&destination=13.777,100.5736');

    expect(
      buildStationMapsUrl({
        name: 'ตู้กดน้ำสาขาสุขุมวิท 50',
        addressDetail: 'แขวงพระโขนง กรุงเทพฯ',
        lat: null,
        lng: null,
      }),
    ).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('ตู้กดน้ำสาขาสุขุมวิท 50 แขวงพระโขนง กรุงเทพฯ')}`,
    );

    expect(buildStationMapsUrl(null)).toBeNull();
  });

  it('นำทางไปบ้านลูกค้าด้วยพิกัด GPS เมื่อปักหมุดจริง และสลับไปค้นหาตามข้อความที่อยู่อัตโนมัติเมื่อลูกค้าข้ามการแชร์ GPS', () => {
    const pinned = buildCustomerMapsUrl({
      label: 'บ้าน',
      detail: 'สุขุมวิท 50 แขวงพระโขนง',
      lat: 13.7058,
      lng: 100.6012,
    });
    expect(pinned).toEqual({
      url: 'https://www.google.com/maps/dir/?api=1&destination=13.7058,100.6012',
      mode: 'gps',
    });

    const skippedGps = buildCustomerMapsUrl({
      label: 'บ้าน',
      detail: 'สุขุมวิท 50 แขวงพระโขนง',
      lat: 13.7563,
      lng: 100.5018,
    });
    expect(skippedGps).toEqual({
      url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('สุขุมวิท 50 แขวงพระโขนง')}`,
      mode: 'address_query',
    });

    const placeholderOnly = buildCustomerMapsUrl({
      label: 'บ้าน (LINE)',
      detail: 'กรุณาตรวจสอบที่อยู่จัดส่ง',
      lat: 13.7563,
      lng: 100.5018,
    });
    expect(placeholderOnly.mode).toBe('gps');
  });

  it('แสดงป้ายระยะทางตามจริงเมื่อมีหมุด GPS และไม่แสดง "0 ม." หลอกตาเมื่อเป็นพิกัดสำรอง', () => {
    expect(
      formatJobDistanceLabel(13.7563, 100.5018, {
        detail: 'สุขุมวิท 50 แขวงพระโขนง',
        lat: 13.7563,
        lng: 100.5018,
      }),
    ).toBe('นำทางตามชื่อที่อยู่');

    const realDist = formatJobDistanceLabel(13.7563, 100.5018, {
      detail: 'สุขุมวิท 50 แขวงพระโขนง',
      lat: 13.7058,
      lng: 100.6012,
    });
    expect(realDist).toMatch(/กม\.$/);
  });

  it('กำหนดปุ่มเปิด Google Maps ภายในกรอบขั้นตอนที่กำลังทำ (ขั้นที่ 2 -> ตู้กดน้ำ, ขั้นที่ 4 และ 5 -> บ้านลูกค้า)', () => {
    expect(getStepInlineNavTarget(1)).toBeNull();
    expect(getStepInlineNavTarget(2)).toBe('station');
    expect(getStepInlineNavTarget(3)).toBeNull();
    expect(getStepInlineNavTarget(4)).toBe('customer');
    expect(getStepInlineNavTarget(5)).toBe('customer');
  });

  it('เลือกที่อยู่ล่าสุดที่ใช้งานได้ของลูกค้าแทนที่อยู่ตั้งต้น และตรวจสอบฟอร์มที่อยู่/พิกัดก่อนบันทึก', () => {
    const list = [
      { id: 'a1', label: 'บ้าน (LINE)', detail: 'กรุณาตรวจสอบที่อยู่จัดส่ง', lat: 13.7563, lng: 100.5018 },
      { id: 'a2', label: 'บ้าน', detail: '88/12 ซอยสุขุมวิท 50 แขวงพระโขนง', lat: 13.7058, lng: 100.6012 },
    ];
    expect(pickPreferredAddress(list)?.id).toBe('a2');
    expect(pickPreferredAddress(list, 'a1')?.id).toBe('a1');

    expect(
      validateAddressDraft({
        label: '  บ้าน  ',
        detail: '  88/12 ซอยสุขุมวิท 50  ',
        lat: 13.7058,
        lng: 100.6012,
        note: '  รั้วสีขาว  ',
      }),
    ).toEqual({
      ok: true,
      value: {
        label: 'บ้าน',
        detail: '88/12 ซอยสุขุมวิท 50',
        lat: 13.7058,
        lng: 100.6012,
        note: 'รั้วสีขาว',
      },
    });

    expect(
      validateAddressDraft({ label: 'บ้าน', detail: 'สั้น', lat: 13.7, lng: 100.5 }).ok,
    ).toBe(false);
  });
});
