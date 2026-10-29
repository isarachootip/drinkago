import React, { useState } from 'react';
import { startLineLogin } from '../domain/liff-auth';

interface Props {
  onOpenStaffLogin: () => void;
  onUnlockDemo: () => void;
  onNotify?: (msg: string) => void;
}

export const ProductionEntryGate: React.FC<Props> = ({ onOpenStaffLogin, onUnlockDemo, onNotify }) => {
  const [busyLine, setBusyLine] = useState(false);

  const handleLineLogin = async () => {
    setBusyLine(true);
    try {
      await startLineLogin('shop', onNotify);
    } finally {
      setBusyLine(false);
    }
  };

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
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0F2236' }}>ilife · Drink&amp;Go Delivery</div>
        <div style={{ fontSize: 13, color: '#4A5B6E', lineHeight: 1.5 }}>
          เข้าสู่ระบบด้วยบัญชี LINE ของคุณเพื่อสั่งน้ำดื่ม ติดตามสถานะการจัดส่ง และดูรหัส OTP 4 หลักได้ทันที
        </div>

        <button
          type="button"
          onClick={handleLineLogin}
          disabled={busyLine}
          style={{
            width: '100%',
            minHeight: 48,
            borderRadius: 12,
            border: 'none',
            background: '#06C755',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            marginTop: 4,
            boxShadow: '0 4px 12px rgba(6,199,85,0.28)',
          }}
        >
          {busyLine ? 'กำลังเชื่อมต่อ LINE...' : '🟢 เข้าสู่ระบบด้วย LINE (Log in with LINE)'}
        </button>

        <a
          href="https://line.me/R/ti/p/@157iywjs"
          target="_blank"
          rel="noreferrer"
          style={{
            width: '100%',
            minHeight: 42,
            borderRadius: 12,
            border: '1px solid #06C755',
            background: '#E8F8EE',
            color: '#058C3B',
            fontWeight: 700,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          💬 เปิดแชทสั่งน้ำใน LINE OA (@157iywjs)
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
