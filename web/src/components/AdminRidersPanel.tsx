import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, ManagedRider } from '../api/admin-api';

interface Props {
  onNotify: (msg: string) => void;
}

export const AdminRidersPanel: React.FC<Props> = ({ onNotify }) => {
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
    try {
      setRiders(await adminMgmtApi.listRiders());
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ดึงรายชื่อไรเดอร์ไม่สำเร็จ');
    }
  }, [onNotify]);

  useEffect(() => {
    void loadRiders();
  }, [loadRiders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUserId.trim() || !name.trim()) return onNotify('กรุณากรอก LINE ID และชื่อไรเดอร์');
    setBusy(true);
    try {
      await adminMgmtApi.createRider({
        lineUserId: lineUserId.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        vehicle: vehicle.trim() || undefined,
        zone: zone.trim() || undefined,
      });
      setLineUserId('');
      setName('');
      setPhone('');
      onNotify('เพิ่มไรเดอร์ใหม่เรียบร้อย');
      await loadRiders();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เพิ่มไรเดอร์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (r: ManagedRider) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateRider(r.id, {
        phone: editPhone.trim(),
        vehicle: editVehicle.trim(),
        zone: editZone.trim(),
      });
      setEditingId(null);
      onNotify(`อัปเดตข้อมูลไรเดอร์ ${r.name} แล้ว`);
      await loadRiders();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'อัปเดตไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (r: ManagedRider) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateRider(r.id, { active: !r.active });
      onNotify(`${!r.active ? 'เปิดใช้งาน' : 'ระงับ'}ไรเดอร์ ${r.name} แล้ว`);
      await loadRiders();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form
        onSubmit={handleCreate}
        style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>🛵 เพิ่มไรเดอร์ใหม่</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุลไรเดอร์" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="LINE User ID (เช่น U... หรือ dev-rider-3)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทร (08xxxxxxxx)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="พาหนะ / ทะเบียนรถ" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="โซนวิ่งงาน (เช่น A, B)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <button type="submit" disabled={busy} style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          + บันทึกเพิ่มไรเดอร์
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {riders.map((r) => (
          <div key={r.id} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>{' '}
                <span style={{ fontSize: 12, color: '#4A5B6E' }}>({r.lineUserId})</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(editingId === r.id ? null : r.id);
                    setEditPhone(r.phone ?? '');
                    setEditVehicle(r.vehicle ?? '');
                    setEditZone(r.zone ?? '');
                  }}
                  style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: '#F3F7FA', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✏️ แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(r)}
                  style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: r.active ? '#E7F5EC' : '#FCE8EF', color: r.active ? '#1E7B45' : '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {r.active ? '● พร้อมรับงาน' : '○ ระงับชั่วคราว'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#33475B' }}>
              📞 {r.phone || '-'} · 🛵 พาหนะ: <b>{r.vehicle || '-'}</b> · 📍 โซน: <b>{r.zone || '-'}</b>
            </div>
            {editingId === r.id && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, paddingTop: 6, borderTop: '1px solid #EEF2F6' }}>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <input value={editVehicle} onChange={(e) => setEditVehicle(e.target.value)} placeholder="พาหนะ/ทะเบียน" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <input value={editZone} onChange={(e) => setEditZone(e.target.value)} placeholder="โซน" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
                <button type="button" onClick={() => handleSaveEdit(r)} disabled={busy} style={{ minHeight: 36, borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
                  บันทึก
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
