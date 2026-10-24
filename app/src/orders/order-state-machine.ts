/**
 * Order state machine ตามเอกสารออกแบบ (หัวข้อ Order State Machine)
 * ไฟล์นี้เป็น pure function ไม่แตะฐานข้อมูล เพื่อให้ทดสอบกฎได้ตรงๆ
 */

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'BAG_COLLECTED'
  | 'BAG_RETURNED'
  | 'CLOSED'
  | 'CLOSED_WITH_RETURN'
  | 'CANCELLED';

export type ActorRole = 'customer' | 'warehouse' | 'rider' | 'admin' | 'system';

export interface Evidence {
  photoUrl?: string;
  lat?: number;
  lng?: number;
}

interface TransitionRule {
  roles: ActorRole[];
  /** ต้องแนบรูปถ่าย + พิกัด GPS (ขั้น 4, 6, 7, 8) */
  requiresEvidence?: 'photo+gps' | 'photo';
  /** ไรเดอร์ต้องเป็นคนที่ได้รับมอบหมายออเดอร์นี้ */
  assignedRiderOnly?: boolean;
}

/** ตารางการเปลี่ยนสถานะที่อนุญาต: from -> to -> กฎ */
export const TRANSITIONS: Partial<Record<OrderStatus, Partial<Record<OrderStatus, TransitionRule>>>> = {
  PENDING: {
    CONFIRMED: { roles: ['warehouse', 'admin'] }, // ขั้น 2
    CANCELLED: { roles: ['customer', 'admin'] },
  },
  CONFIRMED: {
    PACKED: { roles: ['warehouse', 'admin', 'rider'], assignedRiderOnly: true }, // ขั้น 3 (พนักงานขนส่งกดน้ำ หรือคลังจัดของ)
    CANCELLED: { roles: ['admin'] },
  },
  PACKED: {
    PICKED_UP: { roles: ['rider'], requiresEvidence: 'photo+gps', assignedRiderOnly: true }, // ขั้น 4
    CANCELLED: { roles: ['admin'] },
  },
  PICKED_UP: {
    OUT_FOR_DELIVERY: { roles: ['rider'], assignedRiderOnly: true }, // ขั้น 5
  },
  OUT_FOR_DELIVERY: {
    DELIVERED: { roles: ['rider'], requiresEvidence: 'photo+gps', assignedRiderOnly: true }, // ขั้น 6
    FAILED_DELIVERY: { roles: ['rider'], requiresEvidence: 'photo+gps', assignedRiderOnly: true },
  },
  FAILED_DELIVERY: {
    CONFIRMED: { roles: ['admin'] }, // นัดส่งใหม่
    CANCELLED: { roles: ['admin'] },
  },
  DELIVERED: {
    CLOSED: { roles: ['system'] }, // ไม่มีถุงคืน
    BAG_COLLECTED: { roles: ['rider'], requiresEvidence: 'photo+gps', assignedRiderOnly: true }, // ขั้น 7
  },
  BAG_COLLECTED: {
    BAG_RETURNED: { roles: ['warehouse', 'admin'], requiresEvidence: 'photo' }, // ขั้น 8
  },
  BAG_RETURNED: {
    CLOSED_WITH_RETURN: { roles: ['system', 'admin'] }, // system เมื่อยอดตรง, admin เมื่อเคลียร์ยอดไม่ตรง
  },
};

export const TERMINAL: OrderStatus[] = ['CLOSED', 'CLOSED_WITH_RETURN', 'CANCELLED'];

export class TransitionError extends Error {
  constructor(
    public readonly code: 'INVALID_TRANSITION' | 'FORBIDDEN_ROLE' | 'NOT_ASSIGNED_RIDER' | 'EVIDENCE_REQUIRED',
    message: string,
  ) {
    super(message);
  }
}

export interface TransitionCheck {
  from: OrderStatus;
  to: OrderStatus;
  role: ActorRole;
  actorId?: string;
  assignedRiderId?: string | null;
  evidence?: Evidence;
}

/** ตรวจว่าการเปลี่ยนสถานะทำได้หรือไม่ โยน TransitionError ถ้าไม่ได้ */
export function assertTransition(c: TransitionCheck): TransitionRule {
  const rule = TRANSITIONS[c.from]?.[c.to];
  if (!rule) {
    throw new TransitionError('INVALID_TRANSITION', `เปลี่ยนสถานะจาก ${c.from} เป็น ${c.to} ไม่ได้`);
  }
  if (!rule.roles.includes(c.role)) {
    throw new TransitionError('FORBIDDEN_ROLE', `บทบาท ${c.role} เปลี่ยนเป็น ${c.to} ไม่ได้`);
  }
  if (rule.assignedRiderOnly && c.role === 'rider' && (!c.assignedRiderId || c.assignedRiderId !== c.actorId)) {
    throw new TransitionError('NOT_ASSIGNED_RIDER', 'ออเดอร์นี้ไม่ได้มอบหมายให้ไรเดอร์คนนี้');
  }
  if (rule.requiresEvidence) {
    const e = c.evidence ?? {};
    const hasPhoto = typeof e.photoUrl === 'string' && e.photoUrl.length > 0;
    const hasGps = Number.isFinite(e.lat) && Number.isFinite(e.lng);
    if (!hasPhoto || (rule.requiresEvidence === 'photo+gps' && !hasGps)) {
      throw new TransitionError(
        'EVIDENCE_REQUIRED',
        rule.requiresEvidence === 'photo+gps' ? 'ต้องแนบรูปถ่ายและพิกัด GPS' : 'ต้องแนบรูปถ่าย',
      );
    }
  }
  return rule;
}

export function canTransition(c: TransitionCheck): boolean {
  try {
    assertTransition(c);
    return true;
  } catch {
    return false;
  }
}
