import React from 'react';

interface Props {
  onOpenStaffLogin: () => void;
  onUnlockDemo: () => void;
}

export const ProductionEntryGate: React.FC<Props> = ({ onOpenStaffLogin, onUnlockDemo }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, gap: 16 }}>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #DCE4EC',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
          boxShadow: '0 8px 24px rgba(15,34,54,0.06)',
        }}
      >
        <div style={{ fontSize: 42 }}>💧</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F2236' }}>Drink&Go Delivery</div>
        <div style={{ fontSize: 13, color: '#4A5B6E', lineHeight: 1.5 }}>
          ระบบสั่งน้ำดื่มและติดตามสถานะการจัดส่งผ่าน LINE Official Account เพื่อความปลอดภัยของข้อมูลลูกค้า กรุณาเข้าใช้งานผ่านลิงก์ในห้องแชท LINE OA
        </div>

        <a
          href="https://line.me/R/ti/p/@157iywjs"
          target="_blank"
          rel="noreferrer"
          style={{
            width: '100%',
            minHeight: 46,
            borderRadius: 12,
            background: '#06C755',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            marginTop: 4,
          }}
        >
          💬 เปิดแชท LINE OA (@157iywjs)
        </a>

        <button
          type="button"
          onClick={onOpenStaffLogin}
          style={{
            width: '100%',
            minHeight: 44,
            borderRadius: 12,
            border: '1px solid #1A56B0',
            background: '#EBF3FE',
            color: '#1A56B0',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          🔐 เข้าสู่ระบบพนักงาน / ไรเดอร์ / แอดมิน
        </button>

        <button
          type="button"
          onClick={onUnlockDemo}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#64748B',
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          🧪 ทดลองใช้งานโหมดสาธิต (Demo Customer)
        </button>
      </div>
    </div>
  );
};
