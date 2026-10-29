import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { staffApi, StaffSession } from '../api/role-api';
import { StaffOrder } from '../api/schemas';
import { AdminCustomersPanel } from '../components/AdminCustomersPanel';
import { AdminEventsPanel } from '../components/AdminEventsPanel';
import { AdminOrdersPanel } from '../components/AdminOrdersPanel';
import { AdminProductsPanel } from '../components/AdminProductsPanel';
import { AdminRidersPanel } from '../components/AdminRidersPanel';
import { AdminStationsPanel } from '../components/AdminStationsPanel';
import { AdminTrainingPanel } from '../components/AdminTrainingPanel';
import { AdminUsersPanel } from '../components/AdminUsersPanel';
import { AdminViewMode, getSavedViewMode, parseViewMode, saveViewMode } from '../components/ViewModeToggle';

interface Props {
  staffSession: StaffSession;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

type AdminSection = 'users' | 'products' | 'events' | 'stations' | 'riders' | 'customers' | 'orders' | 'training';

export const AdminPage: React.FC<Props> = ({ staffSession, onLogout, onNotify }) => {
  const [section, setSection] = useState<AdminSection>('users');
  const [viewMode, setViewMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [mismatches, setMismatches] = useState<StaffOrder[]>([]);

  const handleViewModeChange = (next: AdminViewMode) => {
    saveViewMode(next);
    setViewMode(next);
    void adminMgmtApi.savePreferences(next).catch(() => {
      // Fallback to localStorage if offline
    });
  };

  const loadAdmin = useCallback(async () => {
    try {
      const [all, mis, prefs] = await Promise.all([
        staffApi.listOrders(undefined, 'dev-admin'),
        staffApi.bagMismatches(),
        adminMgmtApi.getPreferences().catch(() => null),
      ]);
      setOrders(all);
      setMismatches(mis);
      if (prefs?.viewMode) {
        const mode = parseViewMode(prefs.viewMode);
        saveViewMode(mode);
        setViewMode(mode);
      }
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', background: '#1C3550', padding: 3, borderRadius: 10, gap: 3, border: '1px solid #33475B' }}>
              <button
                type="button"
                onClick={() => handleViewModeChange('card')}
                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: viewMode === 'card' ? '#0B6E8A' : 'transparent', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                ▦ การ์ด (Card)
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: viewMode === 'grid' ? '#0B6E8A' : 'transparent', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                ☰ ตาราง (Grid)
              </button>
            </div>
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
            { id: 'events', label: '📅 กิจกรรมพบปะ' },
            { id: 'stations', label: '🚰 ตู้กดน้ำ & สต็อกถุง' },
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
        {section === 'users' && <AdminUsersPanel onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
        {section === 'products' && <AdminProductsPanel onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
        {section === 'events' && <AdminEventsPanel onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
        {section === 'stations' && <AdminStationsPanel onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
        {section === 'riders' && <AdminRidersPanel onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
        {section === 'customers' && <AdminCustomersPanel onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
        {section === 'orders' && (
          <AdminOrdersPanel orders={orders} mismatches={mismatches} onRefresh={loadAdmin} onNotify={onNotify} viewMode={viewMode} onViewModeChange={handleViewModeChange} />
        )}
        {section === 'training' && <AdminTrainingPanel initialRole="admin" />}
      </div>
    </div>
  );
};
