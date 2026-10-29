import React, { useCallback, useEffect, useState } from 'react';
import { loadDevSettings, riderActions, saveDevSettings, syncOfflineQueue } from './api/client';
import { DevAuthSettings } from './api/schemas';
import { customerApi, loadStaffSession, saveStaffSession, StaffSession } from './api/role-api';
import { AdminTrainingPanel } from './components/AdminTrainingPanel';
import { DevSettingsModal } from './components/DevSettingsModal';
import { FailDeliveryModal } from './components/FailDeliveryModal';
import { PickupModal } from './components/PickupModal';
import { ProductionEntryGate } from './components/ProductionEntryGate';
import { StaffLoginCard } from './components/StaffLoginCard';
import { TopAuthBar } from './components/TopAuthBar';
import { safeLiffLogout, tryAutoLoginWithLiff } from './domain/liff-auth';
import {
  AppRoleTab, clearAllAuthSessions, CUSTOMER_USER_STORAGE_KEY, isDemoUnlocked,
  resolveActiveIdentity, resolveInitialCustomerSession, resolveInitialOrderId, resolveInitialQueryTab,
  shouldOpenStaffLoginInitially, shouldRequireEntryGate, unlockDemoMode, UserRole,
} from './domain/session-gate';
import { resolveInitialRegionParam } from './domain/station-regions';
import { resolveInitialEventsViewMode } from './domain/thai-datetime';
import { useRiderWorkspace } from './hooks/useRiderWorkspace';
import { AdminPage } from './pages/AdminPage';
import { CustomerEventsPage } from './pages/CustomerEventsPage';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerStationsPage } from './pages/CustomerStationsPage';
import { CustomerTrackPage } from './pages/CustomerTrackPage';
import { RiderJobsPage } from './pages/RiderJobsPage';
import { RiderPodPage } from './pages/RiderPodPage';

export const App: React.FC = () => {
  const [custSession, setCustSession] = useState(() => resolveInitialCustomerSession());
  const [demoUnlocked, setDemoUnlocked] = useState<boolean>(() => isDemoUnlocked());
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => loadStaffSession());
  const [detectedLineRole, setDetectedLineRole] = useState<UserRole>('customer');
  const [detectedLineName, setDetectedLineName] = useState<string | null>(null);
  const [showStaffLogin, setShowStaffLogin] = useState<boolean>(() => shouldOpenStaffLoginInitially());
  const [showTraining, setShowTraining] = useState<boolean>(false);
  const [adminViewTab, setAdminViewTab] = useState<AppRoleTab>('admin');
  const [custScreen, setCustScreen] = useState<'shop' | 'track' | 'stations' | 'events'>(() => resolveInitialQueryTab() ?? 'shop');
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(() => resolveInitialOrderId());
  const [liffChecking, setLiffChecking] = useState<boolean>(() => shouldRequireEntryGate({ hostname: window.location.hostname, hasLineToken: custSession.hasLineToken, hasStaffSession: Boolean(staffSession), demoUnlocked }));
  const [settings, setSettings] = useState<DevAuthSettings>(() => loadDevSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showNotice = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 4000);
  }, []);
  const customerUser = staffSession?.user.role === 'customer' ? staffSession.user.lineUserId : custSession.customerUser;

  useEffect(() => {
    if (staffSession) { setLiffChecking(false); return; }
    void tryAutoLoginWithLiff().then((res) => {
      if (res) { saveStaffSession(res.session); setStaffSession(res.session); setCustSession({ customerUser: res.session.user.lineUserId, hasLineToken: true }); }
    }).finally(() => setLiffChecking(false));
    if (!shouldRequireEntryGate({ hostname: window.location.hostname, hasLineToken: custSession.hasLineToken, hasStaffSession: false, demoUnlocked })) {
      customerApi.getMe(custSession.customerUser)
        .then((me) => { setDetectedLineName(me.name || null); setDetectedLineRole(me.role === 'admin' || me.role === 'warehouse' || me.role === 'rider' ? me.role : 'customer'); })
        .catch(() => { setDetectedLineName(null); setDetectedLineRole('customer'); });
    }
  }, [custSession.customerUser, custSession.hasLineToken, demoUnlocked, staffSession]);

  const identity = resolveActiveIdentity({
    staffUser: staffSession?.user ?? null, customerUser, detectedLineName, detectedLineRole, hasLineToken: custSession.hasLineToken,
  });
  const isStaffManager = identity.role === 'admin' || identity.role === 'warehouse';
  const activeTab: AppRoleTab = isStaffManager ? adminViewTab : identity.appTab;

  const rider = useRiderWorkspace({ activeTab, settings, staffSession, detectedLineRole, customerUser, showNotice });

  const handleLoginSuccess = (s: StaffSession) => {
    saveStaffSession(s); setStaffSession(s); setShowStaffLogin(false); setShowTraining(false);
    if (s.user.role === 'customer') {
      try { localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, s.user.lineUserId); } catch { /* ignore */ }
      setCustSession({ customerUser: s.user.lineUserId, hasLineToken: false }); setCustScreen('shop');
    } else if (s.user.role === 'admin' || s.user.role === 'warehouse') {
      setAdminViewTab('admin');
    } else if (s.user.role === 'rider') {
      rider.setRiderScreen('jobs');
    }
  };

  const handleLogout = () => {
    safeLiffLogout(); clearAllAuthSessions(); saveStaffSession(null); setStaffSession(null);
    setCustSession({ customerUser: 'dev-customer', hasLineToken: false });
    setDetectedLineName(null); setDetectedLineRole('customer'); setDemoUnlocked(false);
    setShowTraining(false); setShowStaffLogin(true);
    showNotice('ออกจากระบบแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีที่ต้องการทดสอบ');
  };

  return (
    <div style={{ maxWidth: activeTab === 'admin' || showTraining ? 960 : 460, minHeight: '100vh', margin: '0 auto', background: '#F3F7FA', display: 'flex', flexDirection: 'column', boxShadow: '0 0 24px rgba(15,34,54,0.12)', transition: 'max-width 0.2s ease' }}>
      <TopAuthBar
        identity={identity} activeTab={activeTab} showTraining={showTraining}
        onSelectTab={(t) => { setShowTraining(false); setShowStaffLogin(false); setAdminViewTab(t); }}
        onToggleTraining={() => setShowTraining((v) => !v)} onOpenLogin={() => { setShowTraining(false); setShowStaffLogin(true); }}
        onLogout={handleLogout} onOpenSettings={() => setShowSettings(true)}
      />

      {rider.offlineCount > 0 && (
        <div style={{ background: '#FFB3CB', color: '#0F2236', padding: '8px 14px', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📡 รอซิงก์ {rider.offlineCount} รายการ</span>
          <button type="button" onClick={async () => { const { synced, remaining } = await syncOfflineQueue(settings); showNotice(`ซิงก์สำเร็จ ${synced} รายการ (ค้าง ${remaining} รายการ)`); await rider.loadJobs(); }} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#0F2236', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ซิงก์ทันที</button>
        </div>
      )}

      {toast && <div style={{ background: '#17613A', color: '#FFFFFF', padding: '10px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{toast}</div>}

      {showTraining ? (
        <div style={{ padding: 16 }}><AdminTrainingPanel initialRole={activeTab} onClose={() => setShowTraining(false)} /></div>
      ) : showStaffLogin ? (
        <StaffLoginCard targetRole="any" onLoginSuccess={handleLoginSuccess} onCancel={() => setShowStaffLogin(false)} onNotify={showNotice} />
      ) : liffChecking ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontWeight: 600, color: '#1A56B0' }}>🔄 กำลังเชื่อมบัญชี LINE ของคุณ...</div>
      ) : shouldRequireEntryGate({ hostname: window.location.hostname, hasLineToken: custSession.hasLineToken, hasStaffSession: Boolean(staffSession), demoUnlocked }) ? (
        <ProductionEntryGate onOpenStaffLogin={() => setShowStaffLogin(true)} onUnlockDemo={() => { unlockDemoMode(); setDemoUnlocked(true); }} onNotify={showNotice} />
      ) : (
        <>
          {activeTab === 'customer' && (custScreen === 'events' ? (
            <CustomerEventsPage initialViewMode={resolveInitialEventsViewMode()} onBackToShop={() => setCustScreen('shop')} onNotify={showNotice} />
          ) : custScreen === 'stations' ? (
            <CustomerStationsPage initialRegion={resolveInitialRegionParam()} onBackToShop={() => setCustScreen('shop')} onNotify={showNotice} />
          ) : custScreen === 'shop' ? (
            <CustomerOrderPage key={customerUser} customerUser={customerUser} onOrderCreated={(id) => { setTrackedOrderId(id); setCustScreen('track'); }} onGoTrack={() => setCustScreen('track')} onGoStations={() => setCustScreen('stations')} onGoEvents={() => setCustScreen('events')} onNotify={showNotice} />
          ) : (
            <CustomerTrackPage key={customerUser} customerUser={customerUser} initialOrderId={trackedOrderId} onBackToShop={() => setCustScreen('shop')} onNotify={showNotice} />
          ))}
          {activeTab === 'rider' && (rider.riderScreen === 'jobs' || !rider.activeJob ? (
            <RiderJobsPage jobs={rider.jobs} selectedJob={rider.activeJob} selectedDetail={rider.selectedDetail} settings={settings} loading={rider.loading} onSelectJob={(j) => rider.setSelectedJobId(j.id)} onPrimaryAction={rider.handlePrimaryAction} onOpenSettings={() => setShowSettings(true)} onRefresh={() => rider.loadJobs(settings)} />
          ) : (
            <RiderPodPage job={rider.activeJob} detail={rider.selectedDetail} settings={settings} onBack={() => rider.setRiderScreen('jobs')} onDeliver={async (p) => { if (!rider.activeJob) return; const r = await riderActions.deliver(rider.activeJob.id, p); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `ส่งออเดอร์ #${rider.activeJob.code} สำเร็จ!`); rider.setRiderScreen('jobs'); await rider.loadJobs(); }} onOpenFailModal={() => rider.setFailJob(rider.activeJob)} />
          ))}
          {activeTab === 'admin' && (staffSession && (staffSession.user.role === 'admin' || staffSession.user.role === 'warehouse') ? (
            <AdminPage staffSession={staffSession} onLogout={handleLogout} onNotify={showNotice} />
          ) : (
            <StaffLoginCard targetRole="admin" onLoginSuccess={handleLoginSuccess} onCancel={() => setAdminViewTab('customer')} onNotify={showNotice} />
          ))}
        </>
      )}
      {showSettings && <DevSettingsModal settings={settings} onSave={(next) => { saveDevSettings(next); setSettings(next); }} onClose={() => setShowSettings(false)} />}
      {rider.pickupJob && <PickupModal job={rider.pickupJob} settings={settings} onConfirm={async (ev) => { if (!rider.pickupJob) return; const r = await riderActions.pickup(rider.pickupJob.id, ev); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `รับสินค้า #${rider.pickupJob.code} เรียบร้อย`); await rider.loadJobs(); }} onClose={() => rider.setPickupJob(null)} />}
      {rider.failJob && <FailDeliveryModal job={rider.failJob} settings={settings} onSubmitFail={async (p) => { if (!rider.failJob) return; const r = await riderActions.fail(rider.failJob.id, p); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `บันทึกส่งไม่สำเร็จ #${rider.failJob.code} แล้ว`); rider.setRiderScreen('jobs'); await rider.loadJobs(); }} onClose={() => rider.setFailJob(null)} />}
    </div>
  );
};
