import React, { useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { StaffSession } from '../api/role-api';

interface Props {
  targetRole?: 'rider' | 'admin' | 'warehouse' | 'staff' | 'any';
  onLoginSuccess: (session: StaffSession) => void;
  onCancel?: () => void;
  onNotify: (msg: string) => void;
}

const QUICK_ACCOUNTS = [
  { label: '👑 Admin (admin)', user: 'admin', pass: 'admin1234' },
  { label: '🛵 Rider (rider)', user: 'rider', pass: 'rider1234' },
  { label: '📦 คลัง (warehouse)', user: 'warehouse', pass: 'warehouse1234' },
  { label: '🏠 ลูกค้า (customer)', user: 'customer', pass: 'customer1234' },
];

export const StaffLoginCard: React.FC<Props> = ({ targetRole = 'any', onLoginSuccess, onCancel, onNotify }) => {
  const [username, setUsername] = useState(targetRole === 'admin' ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return onNotify('กรุณากรอก Username และ Password');
    setBusy(true);
    try {
      const session = await adminMgmtApi.login(username.trim(), password);
      if (targetRole === 'admin' && session.user.role !== 'admin' && session.user.role !== 'warehouse') {
        onNotify('บัญชีนี้ไม่ใช่สิทธิ์ผู้ดูแลหลังบ้าน (Admin / Warehouse)');
        return;
      }
      onLoginSuccess(session);
      onNotify(`เข้าสู่ระบบสำเร็จ: ${session.user.name} (${session.user.role.toUpperCase()})`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #DCE4EC',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 24px rgba(15,34,54,0.08)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 4 }}>🔑</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F2236' }}>
            เข้าสู่ระบบ / สลับผู้ใช้งาน (ทุกบทบาท)
          </div>
          <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 4 }}>
            รองรับทั้ง ลูกค้า (Customer), ไรเดอร์ (Rider), คลัง (Warehouse) และ แอดมิน (Admin)
          </div>
        </div>

        <div style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>⚡ ปุ่มช่วยกรอกบัญชีมาตรฐานสำหรับทดสอบ:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {QUICK_ACCOUNTS.map((acc) => (
              <button
                key={acc.user}
                type="button"
                onClick={() => {
                  setUsername(acc.user);
                  setPassword(acc.pass);
                }}
                style={{ minHeight: 32, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: username === acc.user ? '#E0F2FE' : '#FFFFFF', color: '#0F2236', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#33475B' }}>ชื่อผู้ใช้ (Username)</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="กรอก Username ที่ตั้งไว้ในระบบ"
            autoComplete="username"
            style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#33475B' }}>รหัสผ่าน (Password)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="กรอกรหัสผ่าน"
            autoComplete="current-password"
            style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD', fontSize: 14 }}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          style={{ minHeight: 46, borderRadius: 12, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 2 }}
        >
          {busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบตามสิทธิ์ผู้ใช้'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ minHeight: 38, borderRadius: 10, border: '1px solid #DCE4EC', background: '#F8FAFC', color: '#4A5B6E', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ← ยกเลิก / กลับหน้าหลัก
          </button>
        )}
      </form>
    </div>
  );
};
