import { buildSignedCustomerUrl } from '../common/password';

export interface LineAutoReplyInput {
  customerName: string;
  lineUserId: string;
  oaBasicId: string;
  publicWebUrl: string;
  bagBalance: number;
  latestOrder: {
    code: string;
    status: string;
    deliveryOtp: string;
  } | null;
}

/**
 * สร้างข้อความตอบกลับอัตโนมัติในแชท LINE OA (Pure Function)
 * แสดงรหัสออเดอร์ล่าสุด, รหัส OTP 4 หลัก, ยอดถุงค้างสะสม และลิงก์สั่งน้ำที่ผูกบัญชี LINE แล้ว
 */
export function formatLineAutoReply(input: LineAutoReplyInput): string {
  const link = buildSignedCustomerUrl(input.publicWebUrl, input.lineUserId);

  const lines: string[] = [
    `สวัสดีคุณ ${input.customerName} 💧 ยินดีต้อนรับสู่ Drink&Go (${input.oaBasicId})`,
  ];

  if (input.latestOrder) {
    lines.push(`📦 ออเดอร์ล่าสุด: #${input.latestOrder.code} (${input.latestOrder.status})`);
    lines.push(`🔑 รหัส OTP 4 หลักสำหรับแจ้งไรเดอร์: ${input.latestOrder.deliveryOtp}`);
  } else {
    lines.push('📋 ยังไม่มีประวัติคำสั่งซื้อ');
  }

  lines.push(`🛍️ ยอดถุงค้างสะสม: ${input.bagBalance} ใบ`);
  lines.push(`🛒 กดสั่งน้ำ/ติดตามสถานะ (ผูกบัญชี LINE ของคุณแล้ว):\n${link}`);

  return lines.join('\n');
}
