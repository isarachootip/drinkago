import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, ManagedRider } from '../api/admin-api';
import { AdminRidersView } from './AdminRidersView';
import { IconCheck, IconEdit, IconPlus } from './icons/ActionIcons';
import { IconTruck } from './icons/Icons';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminRidersPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => { setLocalMode(m); onViewModeChange?.(m); };

  const [riders, setRiders] = useState<ManagedRider[]>([]);
  const [lineUserId, setLineUserId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('มอเตอร์ไซค์');
  const [zone, setZone] = useState('A');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVehicle, setEditVehicle] = useState('');
  const [editZone, setEditZone] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const loadRiders = useCallback(async () => {
    try { setRiders(await adminMgmtApi.listRiders()); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'ดึงรายชื่อไรเดอร์ไม่สำเร็จ'); }
  }, [onNotify]);

  useEffect(() => { void loadRiders(); }, [loadRiders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUserId.trim() || !name.trim()) return onNotify('กรุณากรอก LINE ID และชื่อไรเดอร์');
    setBusy(true);
    try {
      await adminMgmtApi.createRider({
        lineUserId: lineUserId.trim(), name: name.trim(),
        phone: phone.trim() || undefined, vehicle: vehicle.trim() || undefined, zone: zone.trim() || undefined,
      });
      setLineUserId(''); setName(''); setPhone('');
      onNotify('เพิ่มไรเดอร์ใหม่เรียบร้อย');
      await loadRiders();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'เพิ่มไรเดอร์ไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleOpenEdit = (r: ManagedRider) => {
    if (editingId === r.id) return setEditingId(null);
    setEditingId(r.id);
    setEditPhone(r.phone ?? ''); setEditVehicle(r.vehicle ?? ''); setEditZone(r.zone ?? '');
  };

  const handleSaveEdit = async (r: ManagedRider) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateRider(r.id, { phone: editPhone.trim(), vehicle: editVehicle.trim(), zone: editZone.trim() });
      setEditingId(null);
      onNotify(`อัปเดตข้อมูลไรเดอร์ ${r.name} แล้ว`);
      await loadRiders();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'อัปเดตไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleToggleActive = async (r: ManagedRider) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateRider(r.id, { active: !r.active });
      onNotify(`${!r.active ? 'เปิดใช้งาน' : 'ระงับ'}ไรเดอร์ ${r.name} แล้ว`);
      await loadRiders();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const editingRider = riders.find((r) => r.id === editingId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form onSubmit={handleCreate} className="dg-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
          <IconTruck size={15} style={{ color: '#1D4ED8' }} />
          <span>เพิ่มไรเดอร์ใหม่</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุลไรเดอร์" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="LINE User ID" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร (08xxxxxxxx)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="พาหนะ / ทะเบียนรถ" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="โซนวิ่งงาน (เช่น A, B)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
        </div>
        <button type="submit" disabled={busy} className="dg-btn-icon" style={{ minHeight: 40, borderRadius: 9, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <IconPlus size={14} />
          <span>บันทึกเพิ่มไรเดอร์</span>
        </button>
      </form>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายชื่อไรเดอร์ทั้งหมด" count={riders.length} />

      {editingRider && (
        <div className="dg-card" style={{ border: '1.5px solid #1D4ED8', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              <IconEdit size={14} style={{ color: '#1D4ED8' }} />
              <span>แก้ไขข้อมูลไรเดอร์: {editingRider.name}</span>
            </span>
            <button type="button" onClick={() => setEditingId(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>ปิด</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editVehicle} onChange={(e) => setEditVehicle(e.target.value)} placeholder="พาหนะ/ทะเบียน" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editZone} onChange={(e) => setEditZone(e.target.value)} placeholder="โซน" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <button type="button" onClick={() => handleSaveEdit(editingRider)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 36, borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              <IconCheck size={14} />
              <span>บันทึก</span>
            </button>
          </div>
        </div>
      )}

      <AdminRidersView riders={riders} viewMode={viewMode} editingId={editingId} busy={busy} onOpenEdit={handleOpenEdit} onToggleActive={handleToggleActive} />
    </div>
  );
};
