import React, { useCallback, useEffect, useState } from 'react';
import { fetchOrderDetail, fetchRiderJobs, loadDevSettings, riderActions, saveDevSettings, syncOfflineQueue } from './api/client';
import { DevAuthSettings, OrderDetail, RiderJob } from './api/schemas';
import { customerApi, loadStaffSession, saveStaffSession, StaffSession } from './api/role-api';
import { AdminTrainingPanel } from './components/AdminTrainingPanel';
import { DevSettingsModal } from './components/DevSettingsModal';
import { FailDeliveryModal } from './components/FailDeliveryModal';
import { PickupModal } from './components/PickupModal';
import { ProductionEntryGate } from './components/ProductionEntryGate';
import { StaffLoginCard } from './components/StaffLoginCard';
import { TopAuthBar } from './components/TopAuthBar';
import {
  AppRoleTab, clearAllAuthSessions, CUSTOMER_USER_STORAGE_KEY, isDemoUnlocked,
  resolveActiveIdentity, resolveInitialCustomerSession, shouldOpenStaffLoginInitially,
  shouldRequireEntryGate, unlockDemoMode, UserRole,
} from './domain/session-gate';
import { AdminPage } from './pages/AdminPage';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerTrackPage } from './pages/CustomerTrackPage';
import { RiderJobsPage } from './pages/RiderJobsPage';
import { RiderPodPage } from './pages/RiderPodPage';
import { listOfflineMutations } from './storage/offline-queue';

export const App: React.FC = () => {
  const [custSession, setCustSession] = useState(() => resolveInitialCustomerSession());
  const [demoUnlocked, setDemoUnlocked] = useState<boolean>(() => isDemoUnlocked());
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => loadStaffSession());
  const [detectedLineRole, setDetectedLineRole] = useState<UserRole>('customer');
  const [detectedLineName, setDetectedLineName] = useState<string | null>(null);
  const [showStaffLogin, setShowStaffLogin] = useState<boolean>(() => shouldOpenStaffLoginInitially());
  const [showTraining, setShowTraining] = useState<boolean>(false);
  const [adminViewTab, setAdminViewTab] = useState<AppRoleTab>('admin');
  const [custScreen, setCustScreen] = useState<'shop' | 'track'>('shop');
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [settings, setSettings] = useState<DevAuthSettings>(() => loadDevSettings());
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<OrderDetail | null>(null);
  const [riderScreen, setRiderScreen] = useState<'jobs' | 'pod'>('jobs');
  const [showSettings, setShowSettings] = useState(false);
  const [pickupJob, setPickupJob] = useState<RiderJob | null>(null);
  const [failJob, setFailJob] = useState<RiderJob | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showNotice = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 4000);
  }, []);

  const customerUser = staffSession?.user.role === 'customer' ? staffSession.user.lineUserId : custSession.customerUser;

  useEffect(() => {
    if (staffSession) return;
    customerApi.getMe(custSession.customerUser)
      .then((me) => {
        setDetectedLineName(me.name || null);
        setDetectedLineRole(me.role === 'admin' || me.role === 'warehouse' || me.role === 'rider' ? me.role : 'customer');
      })
      .catch(() => { setDetectedLineName(null); setDetectedLineRole('customer'); });
  }, [custSession.customerUser, staffSession]);

  const identity = resolveActiveIdentity({
    staffUser: staffSession?.user ?? null, customerUser, detectedLineName, detectedLineRole, hasLineToken: custSession.hasLineToken,
  });

  const isStaffManager = identity.role === 'admin' || identity.role === 'warehouse';
  const activeTab: AppRoleTab = isStaffManager ? adminViewTab : identity.appTab;

  const handleLoginSuccess = (s: StaffSession) => {
    saveStaffSession(s); setStaffSession(s); setShowStaffLogin(false); setShowTraining(false);
    if (s.user.role === 'customer') {
      try { localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, s.user.lineUserId); } catch { /* ignore */ }
      setCustSession({ customerUser: s.user.lineUserId, hasLineToken: false }); setCustScreen('shop');
    } else if (s.user.role === 'admin' || s.user.role === 'warehouse') {
      setAdminViewTab('admin');
    } else if (s.user.role === 'rider') {
      setRiderScreen('jobs');
    }
  };

  const handleLogout = () => {
    clearAllAuthSessions(); saveStaffSession(null); setStaffSession(null);
    setCustSession({ customerUser: 'dev-customer', hasLineToken: false });
    setDetectedLineName(null); setDetectedLineRole('customer'); setDemoUnlocked(false);
    setShowTraining(false); setShowStaffLogin(true);
    showNotice('ออกจากระบบแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีที่ต้องการทดสอบ');
  };

  const refreshQueueCount = useCallback(async () => {
    setOfflineCount((await listOfflineMutations()).length);
  }, []);

  const loadJobs = useCallback(async (currentSettings = settings) => {
    setLoading(true);
    const effectiveRiderSettings: DevAuthSettings =
      staffSession?.user.role === 'rider' ? { ...currentSettings, devUser: staffSession.user.lineUserId }
        : detectedLineRole === 'rider' ? { ...currentSettings, devUser: customerUser } : currentSettings;
    try {
      const list = await fetchRiderJobs(effectiveRiderSettings);
      setJobs(list);
      const target = list.find((j) => j.id === selectedJobId) ?? list[0] ?? null;
      setSelectedJobId(target?.id ?? null);
      setSelectedDetail(target ? await fetchOrderDetail(target.id, effectiveRiderSettings).catch(() => null) : null);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'ดึงข้อมูลงานไม่สำเร็จ');
    } finally {
      setLoading(false);
      await refreshQueueCount();
    }
  }, [settings, staffSession, detectedLineRole, customerUser, selectedJobId, refreshQueueCount, showNotice]);

  useEffect(() => {
    if (activeTab === 'rider') void loadJobs(settings);
  }, [activeTab, settings, loadJobs]);

  const activeJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? null;

  const handlePrimaryAction = async (job: RiderJob) => {
    try {
      if (job.status === 'CONFIRMED' && !job.riderId) {
        const res = await riderActions.claim(job.id);
        showNotice(res.queued ? 'บันทึกคิวออฟไลน์แล้ว (รับงาน)' : `🙋‍♂️ รับงาน #${job.code} เรียบร้อย! เดินทางไปกดน้ำที่ตู้ได้เลย`);
        await loadJobs();
      } else if (job.status === 'CONFIRMED') {
        const res = await riderActions.pack(job.id);
        showNotice(res.queued ? 'บันทึกคิวออฟไลน์แล้ว (กดน้ำ)' : `กดน้ำออเดอร์ #${job.code} เรียบร้อย (ขั้นที่ 3 PACKED)`);
        await loadJobs();
      } else if (job.status === 'PACKED') {
        setPickupJob(job);
      } else if (job.status === 'PICKED_UP') {
        const res = await riderActions.start(job.id);
        showNotice(res.queued ? 'บันทึกคิวออฟไลน์แล้ว (เริ่มส่ง)' : `เริ่มวิ่งส่งออเดอร์ #${job.code} (ขั้นที่ 5)`);
        await loadJobs();
      } else if (job.status === 'OUT_FOR_DELIVERY') {
        setSelectedJobId(job.id);
        setRiderScreen('pod');
      }
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ');
    }
  };

  return (
    <div style={{ maxWidth: activeTab === 'admin' || showTraining ? 960 : 460, minHeight: '100vh', margin: '0 auto', background: '#F3F7FA', display: 'flex', flexDirection: 'column', boxShadow: '0 0 24px rgba(15,34,54,0.12)', transition: 'max-width 0.2s ease' }}>
      <TopAuthBar
        identity={identity}
        activeTab={activeTab}
        showTraining={showTraining}
        onSelectTab={(t) => { setShowTraining(false); setShowStaffLogin(false); setAdminViewTab(t); }}
        onToggleTraining={() => setShowTraining((v) => !v)}
        onOpenLogin={() => { setShowTraining(false); setShowStaffLogin(true); }}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {offlineCount > 0 && (
        <div style={{ background: '#FFB3CB', color: '#0F2236', padding: '8px 14px', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📡 รอซิงก์ {offlineCount} รายการ</span>
          <button type="button" onClick={async () => { const { synced, remaining } = await syncOfflineQueue(settings); showNotice(`ซิงก์สำเร็จ ${synced} รายการ (ค้าง ${remaining} รายการ)`); await loadJobs(); }} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#0F2236', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ซิงก์ทันที</button>
        </div>
      )}

      {toast && <div style={{ background: '#17613A', color: '#FFFFFF', padding: '10px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{toast}</div>}

      {showTraining ? (
        <div style={{ padding: 16 }}>
          <AdminTrainingPanel initialRole={activeTab} onClose={() => setShowTraining(false)} />
        </div>
      ) : showStaffLogin ? (
        <StaffLoginCard targetRole="any" onLoginSuccess={handleLoginSuccess} onCancel={() => setShowStaffLogin(false)} onNotify={showNotice} />
      ) : shouldRequireEntryGate({ hostname: window.location.hostname, hasLineToken: custSession.hasLineToken, hasStaffSession: Boolean(staffSession), demoUnlocked }) ? (
        <ProductionEntryGate onOpenStaffLogin={() => setShowStaffLogin(true)} onUnlockDemo={() => { unlockDemoMode(); setDemoUnlocked(true); }} />
      ) : (
        <>
          {activeTab === 'customer' && (custScreen === 'shop' ? (
            <CustomerOrderPage key={customerUser} customerUser={customerUser} onOrderCreated={(id) => { setTrackedOrderId(id); setCustScreen('track'); }} onGoTrack={() => setCustScreen('track')} onNotify={showNotice} />
          ) : (
            <CustomerTrackPage key={customerUser} customerUser={customerUser} initialOrderId={trackedOrderId} onBackToShop={() => setCustScreen('shop')} onNotify={showNotice} />
          ))}
          {activeTab === 'rider' && (riderScreen === 'jobs' || !activeJob ? (
            <RiderJobsPage jobs={jobs} selectedJob={activeJob} selectedDetail={selectedDetail} settings={settings} loading={loading} onSelectJob={(j) => setSelectedJobId(j.id)} onPrimaryAction={handlePrimaryAction} onOpenSettings={() => setShowSettings(true)} onRefresh={() => loadJobs(settings)} />
          ) : (
            <RiderPodPage job={activeJob} detail={selectedDetail} settings={settings} onBack={() => setRiderScreen('jobs')} onDeliver={async (p) => { if (!activeJob) return; const r = await riderActions.deliver(activeJob.id, p); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `ส่งออเดอร์ #${activeJob.code} สำเร็จ!`); setRiderScreen('jobs'); await loadJobs(); }} onOpenFailModal={() => setFailJob(activeJob)} />
          ))}
          {activeTab === 'admin' && (staffSession && (staffSession.user.role === 'admin' || staffSession.user.role === 'warehouse') ? (
            <AdminPage staffSession={staffSession} onLogout={handleLogout} onNotify={showNotice} />
          ) : (
            <StaffLoginCard targetRole="admin" onLoginSuccess={handleLoginSuccess} onCancel={() => setAdminViewTab('customer')} onNotify={showNotice} />
          ))}
        </>
      )}
      {showSettings && <DevSettingsModal settings={settings} onSave={(next) => { saveDevSettings(next); setSettings(next); }} onClose={() => setShowSettings(false)} />}
      {pickupJob && <PickupModal job={pickupJob} settings={settings} onConfirm={async (ev) => { if (!pickupJob) return; const r = await riderActions.pickup(pickupJob.id, ev); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `รับสินค้า #${pickupJob.code} เรียบร้อย`); await loadJobs(); }} onClose={() => setPickupJob(null)} />}
      {failJob && <FailDeliveryModal job={failJob} settings={settings} onSubmitFail={async (p) => { if (!failJob) return; const r = await riderActions.fail(failJob.id, p); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `บันทึกส่งไม่สำเร็จ #${failJob.code} แล้ว`); setRiderScreen('jobs'); await loadJobs(); }} onClose={() => setFailJob(null)} />}
    </div>
  );
};
