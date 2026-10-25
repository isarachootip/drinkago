import React, { useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { StaffSession } from '../api/role-api';

interface Props {
  targetRole: 'warehouse' | 'admin';
  onLoginSuccess: (session: StaffSession) => void;
  onNotify: (msg: string) => void;
}

export const StaffLoginCard: React.FC<Props> = ({ targetRole, onLoginSuccess, onNotify }) => {
  const [username, setUsername] = useState(targetRole === 'admin' ? 'admin' : 'warehouse');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return onNotify('กรุณากรอก Username และ Password');
    setBusy(true);
    try {
      const session = await adminMgmtApi.login(username.trim(), password);
      if (targetRole === 'admin' && session.user.role !== 'admin') {
        onNotify('บัญชีนี้ไม่ใช่สิทธิ์แอดมิน (Admin)');
        return;
      }
      if (targetRole === 'warehouse' && !['warehouse', 'admin'].includes(session.user.role)) {
        onNotify('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานส่วนคลังสินค้า');
        return;
      }
      onLoginSuccess(session);
      onNotify(`เข้าสู่ระบบสำเร็จ: ${session.user.name} (${session.user.role})`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #DCE4EC',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 24px rgba(15,34,54,0.08)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F2236' }}>
            เข้าสู่ระบบ{targetRole === 'admin' ? 'ผู้ดูแลหลังบ้าน (Admin)' : 'คลังสินค้า (Warehouse)'}
          </div>
          <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 4 }}>
            กรุณายืนยันตัวตนด้วย Username และ Password
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#33475B' }}>ชื่อผู้ใช้ (Username)</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="เช่น admin หรือ warehouse"
            autoComplete="username"
            style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          style={{
            minHeight: 46,
            borderRadius: 12,
            border: 'none',
            background: '#1A56B0',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          {busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบหลังบ้าน'}
        </button>
      </form>
    </div>
  );
};
