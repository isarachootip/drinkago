import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchOrderDetail,
  fetchRiderJobs,
  loadDevSettings,
  riderActions,
  saveDevSettings,
  syncOfflineQueue,
} from './api/client';
import { DevAuthSettings, EvidenceInput, OrderDetail, RiderJob } from './api/schemas';
import { DevSettingsModal } from './components/DevSettingsModal';
import { FailDeliveryModal } from './components/FailDeliveryModal';
import { PickupModal } from './components/PickupModal';
import { AdminPage } from './pages/AdminPage';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerTrackPage } from './pages/CustomerTrackPage';
import { RiderJobsPage } from './pages/RiderJobsPage';
import { RiderPodPage } from './pages/RiderPodPage';
import { WarehousePage } from './pages/WarehousePage';
import { listOfflineMutations } from './storage/offline-queue';

type AppRoleTab = 'customer' | 'warehouse' | 'rider' | 'admin';

export const App: React.FC = () => {
  const [roleTab, setRoleTab] = useState<AppRoleTab>('customer');
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

  const refreshQueueCount = useCallback(async () => {
    setOfflineCount((await listOfflineMutations()).length);
  }, []);

  const loadJobs = useCallback(
    async (currentSettings = settings) => {
      setLoading(true);
      try {
        const list = await fetchRiderJobs(currentSettings);
        setJobs(list);
        const target = list.find((j) => j.id === selectedJobId) ?? list[0] ?? null;
        setSelectedJobId(target?.id ?? null);
        setSelectedDetail(target ? await fetchOrderDetail(target.id, currentSettings).catch(() => null) : null);
      } catch (e) {
        showNotice(e instanceof Error ? e.message : 'ดึงข้อมูลงานไม่สำเร็จ');
      } finally {
        setLoading(false);
        await refreshQueueCount();
      }
    },
    [settings, selectedJobId, refreshQueueCount, showNotice],
  );

  useEffect(() => {
    if (roleTab === 'rider') void loadJobs(settings);
  }, [roleTab, settings, loadJobs]);

  const activeJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? null;

  const handlePrimaryAction = async (job: RiderJob) => {
    try {
      if (job.status === 'CONFIRMED') {
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

  const handlePickupConfirm = async (evidence: EvidenceInput) => {
    if (!pickupJob) return;
    const res = await riderActions.pickup(pickupJob.id, evidence);
    showNotice(res.queued ? 'บันทึกคิวออฟไลน์แล้ว (รับสินค้า)' : `รับสินค้า #${pickupJob.code} เรียบร้อย (ขั้นที่ 4)`);
    await loadJobs();
  };

  const handleDeliverConfirm = async (payload: { evidence: EvidenceInput; otp?: string; bagsCollected: number; bagPhotoUrl?: string }) => {
    if (!activeJob) return;
    const res = await riderActions.deliver(activeJob.id, payload);
    showNotice(res.queued ? 'บันทึกคิวออฟไลน์แล้ว (ส่งสำเร็จ)' : `ส่งออเดอร์ #${activeJob.code} สำเร็จ!`);
    setRiderScreen('jobs');
    await loadJobs();
  };

  const handleFailConfirm = async (payload: { evidence: EvidenceInput; reason: string }) => {
    if (!failJob) return;
    const res = await riderActions.fail(failJob.id, payload);
    showNotice(res.queued ? 'บันทึกคิวออฟไลน์แล้ว (ส่งไม่สำเร็จ)' : `บันทึกส่งไม่สำเร็จ #${failJob.code} แล้ว`);
    setRiderScreen('jobs');
    await loadJobs();
  };

  const handleSyncOffline = async () => {
    try {
      const { synced, remaining } = await syncOfflineQueue(settings);
      showNotice(`ซิงก์สำเร็จ ${synced} รายการ (ค้าง ${remaining} รายการ)`);
      await loadJobs();
    } catch (e) {
      showNotice(e instanceof Error ? e.message : 'ซิงก์ออฟไลน์ไม่สำเร็จ');
    }
  };

  return (
    <div style={{ maxWidth: 430, minHeight: '100vh', margin: '0 auto', background: '#F3F7FA', display: 'flex', flexDirection: 'column', boxShadow: '0 0 24px rgba(15,34,54,0.12)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 6, background: '#091522' }}>
        {([
          { id: 'customer', label: '1. ลูกค้า' },
          { id: 'warehouse', label: '2/8. คลัง' },
          { id: 'rider', label: '3–7. ไรเดอร์' },
          { id: 'admin', label: 'แอดมิน' },
        ] as const).map((t) => (
          <button key={t.id} type="button" onClick={() => setRoleTab(t.id)} style={{ minHeight: 36, border: 'none', borderRadius: 8, background: roleTab === t.id ? '#1A56B0' : '#1C3550', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {offlineCount > 0 && (
        <div style={{ background: '#FFB3CB', color: '#0F2236', padding: '8px 14px', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📡 รอซิงก์ {offlineCount} รายการ</span>
          <button type="button" onClick={handleSyncOffline} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#0F2236', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ซิงก์ทันที</button>
        </div>
      )}

      {toast && <div style={{ background: '#17613A', color: '#FFFFFF', padding: '10px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{toast}</div>}

      {roleTab === 'customer' &&
        (custScreen === 'shop' ? (
          <CustomerOrderPage customerUser="dev-customer" onOrderCreated={(id) => { setTrackedOrderId(id); setCustScreen('track'); }} onGoTrack={() => setCustScreen('track')} onNotify={showNotice} />
        ) : (
          <CustomerTrackPage customerUser="dev-customer" initialOrderId={trackedOrderId} onBackToShop={() => setCustScreen('shop')} onNotify={showNotice} />
        ))}

      {roleTab === 'warehouse' && <WarehousePage onNotify={showNotice} />}

      {roleTab === 'rider' &&
        (riderScreen === 'jobs' || !activeJob ? (
          <RiderJobsPage jobs={jobs} selectedJob={activeJob} selectedDetail={selectedDetail} settings={settings} loading={loading} onSelectJob={(j) => setSelectedJobId(j.id)} onPrimaryAction={handlePrimaryAction} onOpenSettings={() => setShowSettings(true)} onRefresh={() => loadJobs(settings)} />
        ) : (
          <RiderPodPage job={activeJob} detail={selectedDetail} settings={settings} onBack={() => setRiderScreen('jobs')} onDeliver={handleDeliverConfirm} onOpenFailModal={() => setFailJob(activeJob)} />
        ))}

      {roleTab === 'admin' && <AdminPage onNotify={showNotice} />}
      {showSettings && <DevSettingsModal settings={settings} onSave={(next) => { saveDevSettings(next); setSettings(next); }} onClose={() => setShowSettings(false)} />}
      {pickupJob && <PickupModal job={pickupJob} settings={settings} onConfirm={handlePickupConfirm} onClose={() => setPickupJob(null)} />}
      {failJob && <FailDeliveryModal job={failJob} settings={settings} onSubmitFail={handleFailConfirm} onClose={() => setFailJob(null)} />}
    </div>
  );
};
