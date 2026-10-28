import { OrderStatus } from '../api/schemas';

export type RiderStepState = 'done' | 'current' | 'locked';
export type RiderTargetLocation = 'station' | 'customer';

export interface RiderWorkflowStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  actionLabel: string;
  buttonColor: string;
  state: RiderStepState;
  targetLocation: RiderTargetLocation;
}

export function getRiderCurrentStepNumber(status: OrderStatus, isClaimed = true): number {
  switch (status) {
    case 'CONFIRMED':
      return isClaimed ? 2 : 1;
    case 'PACKED':
      return 3;
    case 'PICKED_UP':
      return 4;
    case 'OUT_FOR_DELIVERY':
      return 5;
    default:
      return 6;
  }
}

export function getRiderTargetLocation(status: OrderStatus, isClaimed = true): RiderTargetLocation {
  return getRiderCurrentStepNumber(status, isClaimed) <= 3 ? 'station' : 'customer';
}

const STEP_DEFINITIONS: Omit<RiderWorkflowStep, 'state'>[] = [
  {
    stepNumber: 1,
    title: 'ขั้นที่ 1 · รับงานเข้าตัว',
    subtitle: 'กดรับงานเพื่อจองคิวไปกดน้ำที่ตู้',
    actionLabel: '🙋‍♂️ กดรับงานนี้ (เริ่มขั้นที่ 1)',
    buttonColor: '#C2255C',
    targetLocation: 'station',
  },
  {
    stepNumber: 2,
    title: 'ขั้นที่ 2 · ไปตู้กดน้ำ & กดน้ำบรรจุถัง',
    subtitle: 'เดินทางไปที่ตู้กดน้ำต้นทางและกดน้ำตามรายการ',
    actionLabel: '🚰 กดน้ำที่ตู้เสร็จแล้ว (ยืนยันขั้นที่ 2)',
    buttonColor: '#0B6E8A',
    targetLocation: 'station',
  },
  {
    stepNumber: 3,
    title: 'ขั้นที่ 3 · ถ่ายรูปรับน้ำขึ้นรถ + GPS',
    subtitle: 'ถ่ายรูปถังน้ำที่หน้าตู้กดน้ำเป็นหลักฐานก่อนออกรถ',
    actionLabel: '📷 ถ่ายรูปรับน้ำขึ้นรถ (ยืนยันขั้นที่ 3)',
    buttonColor: '#1A56B0',
    targetLocation: 'station',
  },
  {
    stepNumber: 4,
    title: 'ขั้นที่ 4 · เริ่มออกเดินทางไปบ้านลูกค้า',
    subtitle: 'ออกจากตู้กดน้ำ มุ่งหน้าไปตามพิกัดบ้านลูกค้า',
    actionLabel: '🛵 เริ่มวิ่งส่งไปบ้านลูกค้า (ยืนยันขั้นที่ 4)',
    buttonColor: '#1A56B0',
    targetLocation: 'customer',
  },
  {
    stepNumber: 5,
    title: 'ขั้นที่ 5 · ส่งน้ำถึงมือลูกค้า + OTP + รับถุงคืน',
    subtitle: 'ถ่ายรูปส่งน้ำ กรอกรหัส OTP 4 หลัก และบันทึกถุงคืน',
    actionLabel: '✅ ถึงบ้านลูกค้า · ส่งน้ำ & รับถุงคืน (ขั้นที่ 5)',
    buttonColor: '#1E7B45',
    targetLocation: 'customer',
  },
];

export function getRiderWorkflowSteps(status: OrderStatus, isClaimed = true): RiderWorkflowStep[] {
  const currentStep = getRiderCurrentStepNumber(status, isClaimed);
  return STEP_DEFINITIONS.map((def) => ({
    ...def,
    state: def.stepNumber < currentStep ? 'done' : def.stepNumber === currentStep ? 'current' : 'locked',
  }));
}
