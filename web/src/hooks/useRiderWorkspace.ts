import { useCallback, useEffect, useState } from 'react';
import { fetchOrderDetail, fetchRiderJobs, riderActions } from '../api/client';
import { StaffSession } from '../api/role-api';
import { DevAuthSettings, OrderDetail, RiderJob } from '../api/schemas';
import { AppRoleTab, UserRole } from '../domain/session-gate';
import { listOfflineMutations } from '../storage/offline-queue';

interface UseRiderWorkspaceParams {
  activeTab: AppRoleTab;
  settings: DevAuthSettings;
  staffSession: StaffSession | null;
  detectedLineRole: UserRole;
  customerUser: string;
  showNotice: (msg: string) => void;
}

export function useRiderWorkspace({
  activeTab,
  settings,
  staffSession,
  detectedLineRole,
  customerUser,
  showNotice,
}: UseRiderWorkspaceParams) {
  const [jobs, setJobs] = useState<RiderJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<OrderDetail | null>(null);
  const [riderScreen, setRiderScreen] = useState<'jobs' | 'pod'>('jobs');
  const [pickupJob, setPickupJob] = useState<RiderJob | null>(null);
  const [failJob, setFailJob] = useState<RiderJob | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshQueueCount = useCallback(async () => {
    setOfflineCount((await listOfflineMutations()).length);
  }, []);

  const loadJobs = useCallback(async (currentSettings = settings) => {
    setLoading(true);
    const effectiveRiderSettings: DevAuthSettings =
      staffSession?.user.role === 'rider'
        ? { ...currentSettings, devUser: staffSession.user.lineUserId }
        : detectedLineRole === 'rider'
          ? { ...currentSettings, devUser: customerUser }
          : currentSettings;
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

  return {
    jobs,
    activeJob,
    selectedDetail,
    riderScreen,
    setRiderScreen,
    setSelectedJobId,
    pickupJob,
    setPickupJob,
    failJob,
    setFailJob,
    offlineCount,
    loading,
    loadJobs,
    handlePrimaryAction,
  };
}
