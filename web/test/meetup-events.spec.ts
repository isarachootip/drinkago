import { describe, expect, it } from 'vitest';
import {
  classifyEventWindow,
  filterAndSortEvents,
  getBangkokTodayIso,
  resolveInitialEventsViewMode,
} from '../src/domain/thai-datetime';

describe('Frontend Meetup Events 1-Month (30-Day) Window', () => {
  it('classifyEventWindow & getBangkokTodayIso: จำแนกสถานะกิจกรรม (ใน 30 วัน / ล่วงหน้าเกิน 30 วัน / ผ่านไปแล้ว)', () => {
    expect(getBangkokTodayIso(new Date('2026-10-29T18:30:00.000Z'))).toBe('2026-10-30');
    expect(classifyEventWindow('28 ตุลา 2569', '2026-10-29')).toBe('past');
    expect(classifyEventWindow('29 ตุลา 2569', '2026-10-29')).toBe('within_30d');
    expect(classifyEventWindow('28 พฤศจิกา 2569', '2026-10-29')).toBe('within_30d');
    expect(classifyEventWindow('29 พฤศจิกา 2569', '2026-10-29')).toBe('future_beyond_30d');
  });

  it('filterAndSortEvents & resolveInitialEventsViewMode: กรองช่วง 1 เดือน เรียงวันใกล้สุดขึ้นก่อน และอ่านพารามิเตอร์ ?view=all', () => {
    expect(resolveInitialEventsViewMode('?tab=events&view=all')).toBe('all');
    expect(resolveInitialEventsViewMode('?liff.state=%3Ftab%3Devents%26view%3Dall')).toBe('all');
    expect(resolveInitialEventsViewMode('?tab=events')).toBe('30d');

    const sample = [
      { id: 1, eventDate: '17 มีนา 2569', eventTime: '10.00' },
      { id: 2, eventDate: '15 ธันวา 2569', eventTime: '10.00' },
      { id: 3, eventDate: '5 พฤศจิกา 2569', eventTime: '14.00' },
      { id: 4, eventDate: '5 พฤศจิกา 2569', eventTime: '09.30' },
    ];

    const win30 = filterAndSortEvents(sample, '30d', '2026-10-29');
    expect(win30.map((x) => x.id)).toEqual([4, 3]);

    const allList = filterAndSortEvents(sample, 'all', '2026-10-29');
    expect(allList.map((x) => x.id)).toEqual([4, 3, 2, 1]);
  });
});
