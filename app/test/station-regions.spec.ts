import { ZodError } from 'zod';
import { loadConfig } from '../src/config';
import { SAMPLE_STATIONS } from '../src/db/seed-stations';
import {
  buildStationRegionPickerFlex,
  buildStationsCarouselFlex,
} from '../src/line/line-stations.templates';
import { LineWebhookController } from '../src/line/line-webhook.controller';
import {
  getStationRegionMeta,
  inferStationRegion,
  parseStationRegionFromText,
  STATION_REGIONS,
  StationRegion,
} from '../src/stations/station-regions';
import { StationsController } from '../src/stations/stations.controller';
import { StationsService } from '../src/stations/stations.service';

describe('Station Regions & LINE Regional Station Discovery', () => {
  it('STATION_REGIONS & inferStationRegion: จัดหมวดหมู่กรุงเทพฯ และ 5 ภูมิภาคจากชื่อสาขาและที่อยู่ได้แม่นยำ', () => {
    expect(STATION_REGIONS).toEqual(['BANGKOK', 'CENTRAL', 'NORTH', 'NORTHEAST', 'EAST', 'SOUTH']);
    expect(getStationRegionMeta('BANGKOK').label).toContain('กรุงเทพฯ');

    expect(inferStationRegion('ตู้กดน้ำสาขารามอินทรา 57', 'เขตบางเขน กรุงเทพฯ')).toBe('BANGKOK');
    expect(inferStationRegion('ตู้กดน้ำสาขาปากเกร็ด', 'อ.ปากเกร็ด จ.นนทบุรี')).toBe('BANGKOK');
    expect(inferStationRegion('ตู้กดน้ำสาขาเชียงใหม่', 'อ.เมืองเชียงใหม่ จ.เชียงใหม่')).toBe('NORTH');
    expect(inferStationRegion('ตู้กดน้ำสาขาขอนแก่น', 'ถนนมิตรภาพ จ.ขอนแก่น')).toBe('NORTHEAST');
    expect(inferStationRegion('ตู้กดน้ำสาขาพัทยากลาง', 'อ.บางละมุง จ.ชลบุรี')).toBe('EAST');
    expect(inferStationRegion('ตู้กดน้ำสาขาหาดใหญ่', 'อ.หาดใหญ่ จ.สงขลา')).toBe('SOUTH');
    expect(inferStationRegion('ตู้กดน้ำสาขาอยุธยา', 'จ.พระนครศรีอยุธยา')).toBe('CENTRAL');
  });

  it('parseStationRegionFromText: แยกคำค้นหาภูมิภาคจากข้อความแชท และคืน null เมื่อเป็นคำค้นหาตู้ทั่วไป', () => {
    expect(parseStationRegionFromText('ค้นหาตู้เติมน้ำทั่วไทย')).toBeNull();
    expect(parseStationRegionFromText('ตู้เติมน้ำกรุงเทพ')).toBe('BANGKOK');
    expect(parseStationRegionFromText('ตู้ภาคเหนือ')).toBe('NORTH');
    expect(parseStationRegionFromText('ตู้ภาคอีสาน')).toBe('NORTHEAST');
    expect(parseStationRegionFromText('ตู้ภาคตะวันออก')).toBe('EAST');
    expect(parseStationRegionFromText('ตู้ภาคใต้')).toBe('SOUTH');
    expect(parseStationRegionFromText('ตู้ภาคกลาง')).toBe('CENTRAL');
  });

  it('buildStationRegionPickerFlex: สร้างการ์ดเลือกกรุงเทพฯ และ 5 ภูมิภาค พร้อมนับจำนวนสาขาและลิงก์หน้าเว็บ ?tab=stations', () => {
    const sample = SAMPLE_STATIONS.map((s, i) => ({ id: i + 1, ...s, bagBalance: 50 }));
    const msg = buildStationRegionPickerFlex(sample, 'https://idrink.tamadee.online', 'U_cust_region');
    expect(msg.type).toBe('flex');
    expect(msg.contents.type).toBe('bubble');
    const json = JSON.stringify(msg);
    expect(json).toContain('action=stations_by_region&region=BANGKOK');
    expect(json).toContain('10 สาขา');
    expect(json).toContain('action=stations_by_region&region=SOUTH');
    expect(json).toContain('1 สาขา');
    expect(json).toContain('tab=stations');

    for (const item of msg.quickReply?.items ?? []) {
      expect(item.action.label.length).toBeLessThanOrEqual(20);
    }
  });

  it('buildStationsCarouselFlex: รองรับกรณี 0 สาขา และกรณีเกิน 12 สาขาจะสร้างการ์ดใบที่ 12 ลิงก์เปิดเว็บโดยไม่เกินเพดาน LINE', () => {
    const emptyMsg = buildStationsCarouselFlex([], { subtitle: 'ภาคใต้', region: 'SOUTH', publicWebUrl: 'https://idrink.tamadee.online' });
    expect(emptyMsg.contents.type).toBe('bubble');
    expect(JSON.stringify(emptyMsg)).toContain('action=find_stations');

    const manyStations = Array.from({ length: 14 }, (_, idx) => ({
      id: idx + 1,
      code: `ST-${String(idx + 1).padStart(2, '0')}`,
      name: `สาขากรุงเทพ ${idx + 1}`,
      addressDetail: `เขตที่ ${idx + 1} กรุงเทพฯ`,
      region: 'BANGKOK' as const,
      lat: 13.7 + idx * 0.01,
      lng: 100.5 + idx * 0.01,
      bagBalance: 50,
    }));
    const carouselMsg = buildStationsCarouselFlex(manyStations, {
      region: 'BANGKOK',
      publicWebUrl: 'https://idrink.tamadee.online',
      lineUserId: 'U_cust_many',
    });
    const bubbles = (carouselMsg.contents as { contents: unknown[] }).contents;
    expect(bubbles).toHaveLength(12);
    expect(JSON.stringify(bubbles[11])).toContain('region=BANGKOK');
  });

  it('StationsController & LineWebhookController: ตรวจสอบ Zod Query/Body และตอบกลับเมนูเลือกภาค -> ตู้ตามภาคครบทั้ง 15 สาขา', async () => {
    const allSeeded = SAMPLE_STATIONS.map((s, idx) => ({
      id: idx + 1,
      ...s,
      active: true,
      createdAt: new Date(),
      bagBalance: 50,
    }));
    const mockStationsSvc = {
      listStations: async (filter?: { region?: StationRegion; activeOnly?: boolean }) =>
        allSeeded.filter((s) => (!filter?.region || s.region === filter.region) && (!filter?.activeOnly || s.active)),
      createStation: async (dto: { code: string; name: string; addressDetail: string; region?: StationRegion; lat: number; lng: number }) => ({
        id: 99,
        ...dto,
        region: dto.region ?? inferStationRegion(dto.name, dto.addressDetail),
        active: true,
        createdAt: new Date(),
        bagBalance: 0,
      }),
    } as unknown as StationsService;

    const stCtrl = new StationsController(mockStationsSvc);
    expect(await stCtrl.listStations({ region: 'BANGKOK', activeOnly: 'true' })).toHaveLength(10);
    expect((await stCtrl.listStations({ region: 'SOUTH', activeOnly: 'true' }))[0].code).toBe('ST-14');
    expect(() => stCtrl.listStations({ region: 'INVALID' })).toThrow(ZodError);
    const created = await stCtrl.createStation({ code: 'ST-99', name: 'สาขาภูเก็ต', addressDetail: 'อ.เมือง จ.ภูเก็ต', lat: 7.88, lng: 98.39 });
    expect(created.region).toBe('SOUTH');

    const mockDb = {
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => [{ webhookEventId: 'ev1' }] }) }) }),
    };
    const mockStatusSvc = {
      ensureCustomerFromLine: async (lineUserId: string) => ({ id: 'u1', lineUserId, role: 'customer' as const, name: 'ลูกค้า', active: true }),
    };
    const mockCart = { getSession: async () => ({ state: null, items: [], tempData: {} }) };
    const cfg = loadConfig({ AUTH_MODE: 'dev', PUBLIC_WEB_URL: 'https://idrink.tamadee.online' } as unknown as NodeJS.ProcessEnv);
    const webhook = new LineWebhookController(
      mockDb as never, cfg, {} as never, mockStationsSvc, mockCart as never, {} as never, {} as never, {} as never, mockStatusSvc as never,
    );

    const [pickerReplies] = await webhook.process([{ type: 'postback', webhookEventId: 'ev-1', source: { userId: 'U_1' }, postback: { data: 'action=find_stations' } }]);
    expect(JSON.stringify(pickerReplies)).toContain('action=stations_by_region&region=BANGKOK');
    expect(JSON.stringify(pickerReplies)).toContain('10 สาขา');

    const [southReplies] = await webhook.process([{ type: 'postback', webhookEventId: 'ev-2', source: { userId: 'U_1' }, postback: { data: 'action=stations_by_region&region=SOUTH' } }]);
    expect(JSON.stringify(southReplies)).toContain('ST-14');
    expect(JSON.stringify(southReplies)).toContain('สงขลา-หาดใหญ่');

    const [northTextReplies] = await webhook.process([{ type: 'message', webhookEventId: 'ev-3', source: { userId: 'U_1' }, message: { type: 'text', text: 'ค้นหาตู้ภาคเหนือ' } }]);
    expect(JSON.stringify(northTextReplies)).toContain('ST-11');
  });
});
