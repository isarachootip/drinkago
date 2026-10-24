import { createHmac } from 'node:crypto';
import { verifyLineSignature } from '../src/line/line-webhook.controller';
import { assertTransition, canTransition, TRANSITIONS, TransitionError } from '../src/orders/order-state-machine';

const ev = { photoUrl: 'https://x/p.jpg', lat: 13.7, lng: 100.5 };

describe('order state machine', () => {
  it('ทางหลักครบ 8 ขั้น เดินได้ตามบทบาทที่ถูกต้อง (ทั้งคลังและไรเดอร์กดขั้น 3 ได้)', () => {
    expect(canTransition({ from: 'PENDING', to: 'CONFIRMED', role: 'warehouse' })).toBe(true);
    expect(canTransition({ from: 'CONFIRMED', to: 'PACKED', role: 'warehouse' })).toBe(true);
    expect(canTransition({ from: 'CONFIRMED', to: 'PACKED', role: 'admin' })).toBe(true);
    expect(canTransition({ from: 'CONFIRMED', to: 'PACKED', role: 'rider', actorId: 'r1', assignedRiderId: 'r1' })).toBe(true);
    expect(canTransition({ from: 'PACKED', to: 'PICKED_UP', role: 'rider', actorId: 'r1', assignedRiderId: 'r1', evidence: ev })).toBe(true);
    expect(canTransition({ from: 'PICKED_UP', to: 'OUT_FOR_DELIVERY', role: 'rider', actorId: 'r1', assignedRiderId: 'r1' })).toBe(true);
    expect(canTransition({ from: 'OUT_FOR_DELIVERY', to: 'DELIVERED', role: 'rider', actorId: 'r1', assignedRiderId: 'r1', evidence: ev })).toBe(true);
    expect(canTransition({ from: 'DELIVERED', to: 'BAG_COLLECTED', role: 'rider', actorId: 'r1', assignedRiderId: 'r1', evidence: ev })).toBe(true);
    expect(canTransition({ from: 'BAG_COLLECTED', to: 'BAG_RETURNED', role: 'warehouse', evidence: { photoUrl: ev.photoUrl } })).toBe(true);
    expect(canTransition({ from: 'BAG_RETURNED', to: 'CLOSED_WITH_RETURN', role: 'system' })).toBe(true);
    expect(canTransition({ from: 'DELIVERED', to: 'CLOSED', role: 'system' })).toBe(true);
  });

  it('ห้ามข้ามขั้น', () => {
    expect(() => assertTransition({ from: 'PENDING', to: 'DELIVERED', role: 'admin' })).toThrow(
      expect.objectContaining({ code: 'INVALID_TRANSITION' }),
    );
  });

  it('สถานะปิดแล้วเปลี่ยนต่อไม่ได้', () => {
    for (const from of ['CLOSED', 'CLOSED_WITH_RETURN', 'CANCELLED'] as const) {
      expect(TRANSITIONS[from]).toBeUndefined();
    }
  });

  it('บทบาทไม่ถูกต้องถูกปฏิเสธ', () => {
    expect(() => assertTransition({ from: 'PENDING', to: 'CONFIRMED', role: 'rider' })).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN_ROLE' }),
    );
    // ไรเดอร์ปิดงานเองไม่ได้ ต้องเป็นระบบ
    expect(() => assertTransition({ from: 'DELIVERED', to: 'CLOSED', role: 'rider' })).toThrow(TransitionError);
  });

  it('ไรเดอร์ที่ไม่ได้รับมอบหมายทำงานแทนไม่ได้ (รวมถึงขั้น 3 กดน้ำ)', () => {
    expect(() =>
      assertTransition({ from: 'CONFIRMED', to: 'PACKED', role: 'rider', actorId: 'r2', assignedRiderId: 'r1' }),
    ).toThrow(expect.objectContaining({ code: 'NOT_ASSIGNED_RIDER' }));
    expect(() =>
      assertTransition({ from: 'CONFIRMED', to: 'PACKED', role: 'rider', actorId: 'r1', assignedRiderId: null }),
    ).toThrow(expect.objectContaining({ code: 'NOT_ASSIGNED_RIDER' }));
    expect(() =>
      assertTransition({ from: 'PACKED', to: 'PICKED_UP', role: 'rider', actorId: 'r2', assignedRiderId: 'r1', evidence: ev }),
    ).toThrow(expect.objectContaining({ code: 'NOT_ASSIGNED_RIDER' }));
  });

  it('ขั้น 4, 6, 7 ต้องมีรูปและ GPS ขั้น 8 ต้องมีรูป', () => {
    const base = { role: 'rider' as const, actorId: 'r1', assignedRiderId: 'r1' };
    const needEvidence = expect.objectContaining({ code: 'EVIDENCE_REQUIRED' });
    expect(() => assertTransition({ ...base, from: 'PACKED', to: 'PICKED_UP' })).toThrow(needEvidence);
    expect(() => assertTransition({ ...base, from: 'OUT_FOR_DELIVERY', to: 'DELIVERED', evidence: { photoUrl: ev.photoUrl } })).toThrow(needEvidence);
    expect(() => assertTransition({ ...base, from: 'DELIVERED', to: 'BAG_COLLECTED', evidence: { lat: 1, lng: 1 } })).toThrow(needEvidence);
    expect(() => assertTransition({ from: 'BAG_COLLECTED', to: 'BAG_RETURNED', role: 'warehouse' })).toThrow(needEvidence);
  });
});

describe('LINE webhook signature', () => {
  it('ตรวจ HMAC-SHA256 ถูกต้อง', () => {
    const body = Buffer.from('{"events":[]}');
    const sig = createHmac('sha256', 'secret').update(body).digest('base64');
    expect(verifyLineSignature(body, sig, 'secret')).toBe(true);
    expect(verifyLineSignature(body, sig, 'other')).toBe(false);
    expect(verifyLineSignature(body, undefined, 'secret')).toBe(false);
    expect(verifyLineSignature(body, 'bm9wZQ==', 'secret')).toBe(false);
  });
});
