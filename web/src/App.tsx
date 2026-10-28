import React, { useCallback, useEffect, useState } from 'react';
import { fetchOrderDetail, fetchRiderJobs, loadDevSettings, riderActions, saveDevSettings, syncOfflineQueue } from './api/client';
import { DevAuthSettings, OrderDetail, RiderJob } from './api/schemas';
import { customerApi, loadStaffSession, saveStaffSession, StaffSession } from './api/role-api';
import { AdminTrainingPanel } from './components/AdminTrainingPanel';
import { DevSettingsModal } from './components/DevSettingsModal';
import { FailDeliveryModal } from './components/FailDeliveryModal';
import { PickupModal } from './components/PickupModal';
import { StaffLoginCard } from './components/StaffLoginCard';
import { AdminPage } from './pages/AdminPage';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerTrackPage } from './pages/CustomerTrackPage';
import { RiderJobsPage } from './pages/RiderJobsPage';
import { RiderPodPage } from './pages/RiderPodPage';
import { listOfflineMutations } from './storage/offline-queue';

type AppRoleTab = 'customer' | 'rider' | 'admin';

function resolveInitialCustomerUser(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('lineUserId')?.trim();
  if (fromQuery) {
    localStorage.setItem('drinkgo_customer_user_v1', fromQuery);
    return fromQuery;
  }
  return localStorage.getItem('drinkgo_customer_user_v1') || 'dev-customer';
}

function shouldOpenStaffLoginInitially(): boolean {
  const path = window.location.pathname.toLowerCase();
  const mode = new URLSearchParams(window.location.search).get('mode');
  return path.includes('/admin') || path.includes('/login') || mode === 'staff' || window.location.hash === '#admin';
}

export const App: React.FC = () => {
  const [customerUser] = useState<string>(() => resolveInitialCustomerUser());
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => loadStaffSession());
  const [detectedLineRole, setDetectedLineRole] = useState<AppRoleTab>('customer');
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

  useEffect(() => {
    customerApi.getMe(customerUser)
      .then((me) => setDetectedLineRole(me.role === 'admin' || me.role === 'rider' ? me.role : 'customer'))
      .catch(() => setDetectedLineRole('customer'));
  }, [customerUser]);

  const effectiveRole: AppRoleTab =
    staffSession?.user.role === 'admin' || detectedLineRole === 'admin' ? 'admin'
      : staffSession?.user.role === 'rider' || detectedLineRole === 'rider' ? 'rider' : 'customer';

  const activeTab: AppRoleTab = effectiveRole === 'admin' ? adminViewTab : effectiveRole;

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
      {effectiveRole === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto auto', gap: 4, padding: 6, background: '#091522' }}>
          {([{ id: 'customer', label: '1. มุมมองลูกค้า' }, { id: 'rider', label: '2. มุมมองไรเดอร์' }, { id: 'admin', label: '⚙️ หลังบ้าน (Admin)' }] as const).map((t) => (
            <button key={t.id} type="button" onClick={() => { setShowTraining(false); setAdminViewTab(t.id); }} style={{ minHeight: 36, border: 'none', borderRadius: 8, background: activeTab === t.id && !showTraining ? '#1A56B0' : '#1C3550', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t.label}</button>
          ))}
          <button type="button" onClick={() => setShowTraining((v) => !v)} style={{ minHeight: 36, padding: '0 10px', border: 'none', borderRadius: 8, background: showTraining ? '#1E7B45' : '#1C3550', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🎓 คู่มือ</button>
          <button type="button" onClick={() => setShowSettings(true)} aria-label="ตั้งค่า" style={{ minHeight: 36, padding: '0 10px', border: 'none', borderRadius: 8, background: '#1C3550', color: '#FFFFFF', fontSize: 13, cursor: 'pointer' }}>⚙️</button>
        </div>
      )}

      {effectiveRole === 'rider' && (
        <div style={{ background: '#091522', color: '#FFFFFF', padding: '6px 14px', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span>🛵 โหมดไรเดอร์: <b>{staffSession?.user.name || customerUser}</b></span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setShowTraining((v) => !v)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🎓 คู่มือไรเดอร์</button>
            {staffSession && (
              <button type="button" onClick={() => { saveStaffSession(null); setStaffSession(null); showNotice('ออกจากระบบไรเดอร์แล้ว'); }} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#C2255C', color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>ออกจากระบบ</button>
            )}
          </div>
        </div>
      )}

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
      ) : showStaffLogin && !staffSession ? (
        <StaffLoginCard targetRole="staff" onLoginSuccess={(s) => { saveStaffSession(s); setStaffSession(s); setShowStaffLogin(false); if (s.user.role === 'admin') setAdminViewTab('admin'); }} onCancel={() => setShowStaffLogin(false)} onNotify={showNotice} />
      ) : (
        <>
          {activeTab === 'customer' && (
            <>
              {custScreen === 'shop' ? (
                <CustomerOrderPage customerUser={customerUser} onOrderCreated={(id) => { setTrackedOrderId(id); setCustScreen('track'); }} onGoTrack={() => setCustScreen('track')} onNotify={showNotice} />
              ) : (
                <CustomerTrackPage customerUser={customerUser} initialOrderId={trackedOrderId} onBackToShop={() => setCustScreen('shop')} onNotify={showNotice} />
              )}
              {effectiveRole === 'customer' && (
                <div style={{ padding: '8px 16px 14px', textAlign: 'center', background: '#F3F7FA', display: 'flex', justifyContent: 'center', gap: 14 }}>
                  <button type="button" onClick={() => setShowTraining(true)} style={{ border: 'none', background: 'transparent', color: '#0B6E8A', fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>🎓 คู่มือการสั่งน้ำดื่ม (Training Agent)</button>
                  <button type="button" onClick={() => setShowStaffLogin(true)} style={{ border: 'none', background: 'transparent', color: '#64748B', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>🔐 สำหรับไรเดอร์ / ผู้ดูแลระบบ (Staff Login)</button>
                </div>
              )}
            </>
          )}
          {activeTab === 'rider' && (riderScreen === 'jobs' || !activeJob ? (
            <RiderJobsPage jobs={jobs} selectedJob={activeJob} selectedDetail={selectedDetail} settings={settings} loading={loading} onSelectJob={(j) => setSelectedJobId(j.id)} onPrimaryAction={handlePrimaryAction} onOpenSettings={() => setShowSettings(true)} onRefresh={() => loadJobs(settings)} />
          ) : (
            <RiderPodPage job={activeJob} detail={selectedDetail} settings={settings} onBack={() => setRiderScreen('jobs')} onDeliver={async (p) => { if (!activeJob) return; const r = await riderActions.deliver(activeJob.id, p); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `ส่งออเดอร์ #${activeJob.code} สำเร็จ!`); setRiderScreen('jobs'); await loadJobs(); }} onOpenFailModal={() => setFailJob(activeJob)} />
          ))}
          {activeTab === 'admin' && (staffSession ? (
            <AdminPage staffSession={staffSession} onLogout={() => { saveStaffSession(null); setStaffSession(null); showNotice('ออกจากระบบหลังบ้านแล้ว'); }} onNotify={showNotice} />
          ) : (
            <StaffLoginCard targetRole="admin" onLoginSuccess={(s) => { saveStaffSession(s); setStaffSession(s); }} onNotify={showNotice} />
          ))}
        </>
      )}
      {showSettings && <DevSettingsModal settings={settings} onSave={(next) => { saveDevSettings(next); setSettings(next); }} onClose={() => setShowSettings(false)} />}
      {pickupJob && <PickupModal job={pickupJob} settings={settings} onConfirm={async (ev) => { if (!pickupJob) return; const r = await riderActions.pickup(pickupJob.id, ev); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `รับสินค้า #${pickupJob.code} เรียบร้อย`); await loadJobs(); }} onClose={() => setPickupJob(null)} />}
      {failJob && <FailDeliveryModal job={failJob} settings={settings} onSubmitFail={async (p) => { if (!failJob) return; const r = await riderActions.fail(failJob.id, p); showNotice(r.queued ? 'บันทึกคิวออฟไลน์แล้ว' : `บันทึกส่งไม่สำเร็จ #${failJob.code} แล้ว`); setRiderScreen('jobs'); await loadJobs(); }} onClose={() => setFailJob(null)} />}
    </div>
  );
};
