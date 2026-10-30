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
import { IconAlert, IconCards, IconGrid, IconPackage, IconRefresh, IconShield } from '../components/icons/ActionIcons';
import { IconBook, IconCalendar, IconDroplet, IconHome, IconLogout, IconTruck, IconUser } from '../components/icons/Icons';
import { AdminViewMode, getSavedViewMode, parseViewMode, saveViewMode } from '../components/ViewModeToggle';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  staffSession: StaffSession;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

type AdminSection = 'users' | 'products' | 'events' | 'stations' | 'riders' | 'customers' | 'orders' | 'training';

export const AdminPage: React.FC<Props> = ({ staffSession, onLogout, onNotify }) => {
  const { t } = useI18n();
  const [section, setSection] = useState<AdminSection>('users');
  const [viewMode, setViewMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [mismatches, setMismatches] = useState<StaffOrder[]>([]);

  const handleViewModeChange = (next: AdminViewMode) => {
    saveViewMode(next);
    setViewMode(next);
    void adminMgmtApi.savePreferences(next).catch(() => {});
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

  const tabs: Array<{ id: AdminSection; label: string; icon: React.ReactNode }> = [
    { id: 'users', label: t('adminTabUsers'), icon: <IconUser size={14} /> },
    { id: 'products', label: t('adminTabProducts'), icon: <IconPackage size={14} /> },
    { id: 'events', label: t('adminTabEvents'), icon: <IconCalendar size={14} /> },
    { id: 'stations', label: t('adminTabStations'), icon: <IconDroplet size={14} /> },
    { id: 'riders', label: t('adminTabRiders'), icon: <IconTruck size={14} /> },
    { id: 'customers', label: t('adminTabCustomers'), icon: <IconHome size={14} /> },
    { id: 'orders', label: t('adminTabOrders', { count: mismatches.length }), icon: <IconAlert size={14} /> },
    { id: 'training', label: t('adminTabTraining'), icon: <IconBook size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{t('adminHeaderTitle')}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              <IconShield size={13} style={{ color: '#34D399' }} />
              <span>
                {t('topUserLabel')}: <strong style={{ color: '#F8FAFC' }}>{staffSession.user.name}</strong> ({staffSession.user.username || staffSession.user.role})
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', background: '#1E293B', padding: 3, borderRadius: 8, gap: 2, border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => handleViewModeChange('card')}
                className="dg-btn-icon"
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: viewMode === 'card' ? '#1D4ED8' : 'transparent', color: viewMode === 'card' ? '#FFFFFF' : '#CBD5E1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                <IconCards size={13} />
                <span>{t('adminCardView')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className="dg-btn-icon"
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: viewMode === 'grid' ? '#1D4ED8' : 'transparent', color: viewMode === 'grid' ? '#FFFFFF' : '#CBD5E1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                <IconGrid size={13} />
                <span>{t('adminGridView')}</span>
              </button>
            </div>
            <button type="button" onClick={loadAdmin} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid #334155', background: '#1E293B', color: '#E2E8F0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <IconRefresh size={13} />
              <span>{t('adminRefreshBtn')}</span>
            </button>
            <button type="button" onClick={onLogout} className="dg-btn-icon" style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.3)', background: 'transparent', color: '#FCA5A5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <IconLogout size={13} />
              <span>{t('topLogout')}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 6 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className="dg-btn-icon"
              style={{
                minHeight: 36,
                borderRadius: 8,
                border: section === tab.id ? '1px solid #1D4ED8' : '1px solid #334155',
                background: section === tab.id ? '#1D4ED8' : '#1E293B',
                color: section === tab.id ? '#FFFFFF' : '#CBD5E1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
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
