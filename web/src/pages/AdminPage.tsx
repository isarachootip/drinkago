import React, { useCallback, useEffect, useState } from 'react';
import { staffApi, StaffSession } from '../api/role-api';
import { StaffOrder } from '../api/schemas';
import { AdminCustomersPanel } from '../components/AdminCustomersPanel';
import { AdminOrdersPanel } from '../components/AdminOrdersPanel';
import { AdminProductsPanel } from '../components/AdminProductsPanel';
import { AdminRidersPanel } from '../components/AdminRidersPanel';
import { AdminStationsPanel } from '../components/AdminStationsPanel';
import { AdminTrainingPanel } from '../components/AdminTrainingPanel';
import { AdminUsersPanel } from '../components/AdminUsersPanel';

interface Props {
  staffSession: StaffSession;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

type AdminSection = 'users' | 'products' | 'stations' | 'riders' | 'customers' | 'orders' | 'training';

export const AdminPage: React.FC<Props> = ({ staffSession, onLogout, onNotify }) => {
  const [section, setSection] = useState<AdminSection>('users');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [mismatches, setMismatches] = useState<StaffOrder[]>([]);

  const loadAdmin = useCallback(async () => {
    try {
      const [all, mis] = await Promise.all([
        staffApi.listOrders(undefined, 'dev-admin'),
        staffApi.bagMismatches(),
      ]);
      setOrders(all);
      setMismatches(mis);
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'โหลดข้อมูลแอดมินไม่สำเร็จ');
    }
  }, [onNotify]);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#0F2236', color: '#FFFFFF', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>ระบบบริหารจัดการหลังบ้าน (Backend Web)</div>
            <div style={{ fontSize: 12, color: '#A8E6C1' }}>
              🔐 ผู้ใช้งาน: <b>{staffSession.user.name}</b> ({staffSession.user.username || staffSession.user.role})
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={loadAdmin} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #33475B', background: '#1C3550', color: '#FFFFFF', fontSize: 12, cursor: 'pointer' }}>
              🔄 รีเฟรช
            </button>
            <button type="button" onClick={onLogout} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: '#C2255C', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              🚪 ออกจากระบบ
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 6 }}>
          {([
            { id: 'users', label: '👤 จัดการผู้ใช้ (CRUD)' },
            { id: 'products', label: '🛒 สินค้า & LINE Menu' },
            { id: 'stations', label: '🚰 ตู้กดน้ำ 15 สาขา' },
            { id: 'riders', label: '🛵 จัดการไรเดอร์' },
            { id: 'customers', label: '🏠 สมาชิก & วงเงิน' },
            { id: 'orders', label: `🚨 ออเดอร์ (${mismatches.length})` },
            { id: 'training', label: '📚 คู่มือ & Training (KM)' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              style={{
                minHeight: 38,
                borderRadius: 10,
                border: 'none',
                background: section === tab.id ? '#0B6E8A' : '#1C3550',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {section === 'users' && <AdminUsersPanel onNotify={onNotify} />}
        {section === 'products' && <AdminProductsPanel onNotify={onNotify} />}
        {section === 'stations' && <AdminStationsPanel onNotify={onNotify} />}
        {section === 'riders' && <AdminRidersPanel onNotify={onNotify} />}
        {section === 'customers' && <AdminCustomersPanel onNotify={onNotify} />}
        {section === 'orders' && (
          <AdminOrdersPanel orders={orders} mismatches={mismatches} onRefresh={loadAdmin} onNotify={onNotify} />
        )}
        {section === 'training' && <AdminTrainingPanel initialRole="admin" />}
      </div>
    </div>
  );
};
