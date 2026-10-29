import { ZodError } from 'zod';
import { loadConfig } from '../src/config';
import {
  addDaysIsoDate,
  filterAndSortMeetupEvents,
  getBangkokIsoDate,
  parseMeetupEventIsoDate,
} from '../src/events/meetup-date';
import { MeetupEventsController } from '../src/events/meetup-events.controller';
import { MeetupEventItem, MeetupEventsService } from '../src/events/meetup-events.service';
import { buildMeetupEventsFlex } from '../src/line/line-discovery.templates';
import { LineWebhookController } from '../src/line/line-webhook.controller';

describe('Meetup Events 1-Month (30-Day) Window & LINE Discovery', () => {
  it('parseMeetupEventIsoDate & getBangkokIsoDate: แปลงวันที่ภาษาไทย พ.ศ. และคำนวณวันตามเวลาไทย (UTC+7) ได้แม่นยำ', () => {
    expect(parseMeetupEventIsoDate('17 มีนา 2569')).toBe('2026-03-17');
    expect(parseMeetupEventIsoDate('29 ตุลา 2569')).toBe('2026-10-29');
    expect(parseMeetupEventIsoDate('5 พ.ย. 2569')).toBe('2026-11-05');
    expect(parseMeetupEventIsoDate('28 พฤศจิกายน 2569')).toBe('2026-11-28');
    expect(parseMeetupEventIsoDate('2026-11-15')).toBe('2026-11-15');
    expect(parseMeetupEventIsoDate('15/11/2569')).toBe('2026-11-15');
    expect(parseMeetupEventIsoDate('ยังไม่ระบุวัน')).toBeNull();

    expect(getBangkokIsoDate(new Date('2026-10-29T18:30:00.000Z'))).toBe('2026-10-30');
    expect(addDaysIsoDate('2026-10-29', 30)).toBe('2026-11-28');
  });

  it('filterAndSortMeetupEvents: กรองเฉพาะกิจกรรมตั้งแต่วันนี้ถึงอีก 30 วันข้างหน้า และเรียงวัน-เวลาที่ใกล้ที่สุดขึ้นก่อน', () => {
    const mk = (id: number, eventDate: string, eventTime: string): MeetupEventItem => ({
      id,
      title: `งาน #${id}`,
      eventDate,
      eventTime,
      locationName: `สถานที่ #${id}`,
      contactPhone: '0634455',
      mapUrl: 'https://maps.google.com',
      active: true,
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    const items = [
      mk(1, '28 ตุลา 2569', '10.00'), // เมื่อวาน -> ต้องถูกตัดออก
      mk(2, '29 พฤศจิกา 2569', '10.00'), // อีก 31 วัน -> เกิน 30 วัน ต้องถูกตัดออก
      mk(3, '28 พฤศจิกา 2569', '10.00'), // อีก 30 วันพอดี -> แสดง
      mk(4, '29 ตุลา 2569', '14.30'), // วันนี้ช่วงบ่าย -> แสดงลำดับ 2
      mk(5, '29 ตุลา 2569', '09.00'), // วันนี้ช่วงเช้า -> แสดงลำดับ 1
    ];

    const win30 = filterAndSortMeetupEvents(items, { window: '30d', todayIso: '2026-10-29' });
    expect(win30.map((e) => e.id)).toEqual([5, 4, 3]);

    const allSorted = filterAndSortMeetupEvents(items, { window: 'all', todayIso: '2026-10-29' });
    expect(allSorted.map((e) => e.id)).toEqual([1, 5, 4, 3, 2]);
  });

  it('buildMeetupEventsFlex: กรณีไม่มีกิจกรรมใน 1 เดือน แสดงข้อความแจ้งเตือนและปุ่มเปิดหน้าเว็บ ?tab=events&view=all', () => {
    const emptyFlex = buildMeetupEventsFlex([], 'https://idrink.tamadee.online', 'U_cust_ev');
    const json = JSON.stringify(emptyFlex);
    expect(json).toContain('1 เดือน');
    expect(json).toContain('tab=events&view=all');
  });

  it('MeetupEventsController & LineWebhookController: ตรวจ Zod Query และดึงเฉพาะรายการช่วง 30 วันเมื่อกดปุ่มกิจกรรมพบปะใน LINE', async () => {
    const sampleAll: MeetupEventItem[] = [
      {
        id: 1, title: 'งานเก่าเดือนมีนา', eventDate: '17 มีนา 2569', eventTime: '10.00',
        locationName: 'โรงแรมเดิม', contactPhone: '0634455', mapUrl: 'https://maps.google.com', active: true, createdAt: '2026-03-01T00:00:00Z',
      },
      {
        id: 2, title: 'งานเดือนนี้', eventDate: '10 พฤศจิกา 2569', eventTime: '10.00',
        locationName: 'ศูนย์ประชุมขอนแก่น', contactPhone: '0812223333', mapUrl: 'https://maps.google.com', active: true, createdAt: '2026-10-29T00:00:00Z',
      },
    ];
    const mockEventsSvc = {
      listPublic: async (opts?: { window?: '30d' | 'all' }) =>
        filterAndSortMeetupEvents(sampleAll, { window: opts?.window ?? 'all', todayIso: '2026-10-29' }),
    } as unknown as MeetupEventsService;

    const ctrl = new MeetupEventsController(mockEventsSvc);
    expect(await ctrl.listPublicEvents({ window: '30d' })).toHaveLength(1);
    expect(await ctrl.listPublicEvents({})).toHaveLength(2);
    expect(() => ctrl.listPublicEvents({ window: 'INVALID' })).toThrow(ZodError);

    const mockDb = {
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => [{ webhookEventId: 'ev1' }] }) }) }),
    };
    const mockStatusSvc = {
      ensureCustomerFromLine: async (lineUserId: string) => ({ id: 'u1', lineUserId, role: 'customer' as const, name: 'ลูกค้า', active: true }),
    };
    const mockCart = { getSession: async () => ({ state: null, items: [], tempData: {} }) };
    const cfg = loadConfig({ AUTH_MODE: 'dev', PUBLIC_WEB_URL: 'https://idrink.tamadee.online' } as unknown as NodeJS.ProcessEnv);
    const webhook = new LineWebhookController(
      mockDb as never, cfg, mockEventsSvc, {} as never, mockCart as never, {} as never, {} as never, {} as never, mockStatusSvc as never,
    );

    const [replies] = await webhook.process([{ type: 'postback', webhookEventId: 'ev-m1', source: { userId: 'U_1' }, postback: { data: 'action=events' } }]);
    const replyJson = JSON.stringify(replies);
    expect(replyJson).toContain('ศูนย์ประชุมขอนแก่น');
    expect(replyJson).not.toContain('งานเก่าเดือนมีนา');
  });
});
