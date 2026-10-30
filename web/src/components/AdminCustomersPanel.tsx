import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, ManagedCustomer } from '../api/admin-api';
import { BagSummary } from '../api/schemas';
import { AdminCustomersView } from './AdminCustomersView';
import { IconCheck, IconEdit, IconPlus } from './icons/ActionIcons';
import { IconBag, IconHome } from './icons/Icons';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminCustomersPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => { setLocalMode(m); onViewModeChange?.(m); };

  const [customers, setCustomers] = useState<ManagedCustomer[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [lat, setLat] = useState('13.7563');
  const [lng, setLng] = useState('100.5018');
  const [creditBaht, setCreditBaht] = useState('1000');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', addressDetail: '', lat: '13.7563', lng: '100.5018', creditBaht: '1000' });
  const [selectedBagCust, setSelectedBagCust] = useState<{ customer: ManagedCustomer; summary: BagSummary } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCustomers = useCallback(async () => {
    try { setCustomers(await adminMgmtApi.listCustomers()); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'ดึงรายชื่อสมาชิกไม่สำเร็จ'); }
  }, [onNotify]);

  useEffect(() => { void loadCustomers(); }, [loadCustomers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !addressDetail.trim()) return onNotify('กรุณากรอกชื่อ เบอร์โทร และที่อยู่จัดส่ง');
    setBusy(true);
    try {
      await adminMgmtApi.createCustomer({
        lineUserId: lineUserId.trim() || `U_cust_${Date.now()}`, name: name.trim(), phone: phone.trim(),
        creditLimitSatang: Math.round(Number(creditBaht) * 100), addressDetail: addressDetail.trim(), lat: Number(lat), lng: Number(lng),
      });
      setName(''); setPhone(''); setLineUserId(''); setAddressDetail('');
      onNotify('เพิ่มสมาชิกใหม่พร้อมตั้งวงเงินและพิกัดบ้านเรียบร้อย');
      await loadCustomers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'เพิ่มสมาชิกไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleOpenEdit = (c: ManagedCustomer) => {
    if (editId === c.id) return setEditId(null);
    setEditId(c.id);
    setEditForm({
      name: c.name, phone: c.phone ?? '', addressDetail: c.addressDetail,
      lat: String(c.lat), lng: String(c.lng), creditBaht: String(Math.round(c.creditLimitSatang / 100)),
    });
  };

  const handleSaveEdit = async (c: ManagedCustomer) => {
    setBusy(true);
    try {
      await adminMgmtApi.updateCustomer(c.id, {
        name: editForm.name.trim(), phone: editForm.phone.trim(), creditLimitSatang: Math.round(Number(editForm.creditBaht) * 100),
        addressDetail: editForm.addressDetail.trim(), lat: Number(editForm.lat), lng: Number(editForm.lng),
      });
      setEditId(null);
      onNotify(`อัปเดตข้อมูลและวงเงินของคุณ ${editForm.name} เรียบร้อย`);
      await loadCustomers();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleViewBags = async (c: ManagedCustomer) => {
    try {
      const summary = await adminMgmtApi.getCustomerBags(c.id);
      setSelectedBagCust({ customer: c, summary });
    } catch (err) { onNotify(err instanceof Error ? err.message : 'ดึงประวัติถุงไม่สำเร็จ'); }
  };

  const editingCustomer = customers.find((c) => c.id === editId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form onSubmit={handleCreate} className="dg-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
          <IconHome size={15} style={{ color: '#1D4ED8' }} />
          <span>เพิ่มสมาชิกใหม่ (ชื่อ-นามสกุล, เบอร์โทร, พิกัดบ้าน Lat/Lng, วงเงินเครดิต)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุลสมาชิก" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="LINE ID (เว้นว่างได้)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={creditBaht} onChange={(e) => setCreditBaht(e.target.value)} type="number" placeholder="วงเงินเครดิต (บาท)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="ที่อยู่บ้านลูกค้า" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
        </div>
        <button type="submit" disabled={busy} className="dg-btn-icon" style={{ minHeight: 40, borderRadius: 9, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <IconPlus size={14} />
          <span>บันทึกเพิ่มสมาชิก</span>
        </button>
      </form>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายชื่อสมาชิกและวงเงินเครดิตทั้งหมด" count={customers.length} />

      {editingCustomer && (
        <div className="dg-card" style={{ border: '1.5px solid #1D4ED8', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              <IconEdit size={14} style={{ color: '#1D4ED8' }} />
              <span>แก้ไขข้อมูลพิกัดและวงเงินสมาชิก: {editingCustomer.name}</span>
            </span>
            <button type="button" onClick={() => setEditId(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>ปิด</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8 }}>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="ชื่อ-นามสกุล" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.creditBaht} type="number" onChange={(e) => setEditForm({ ...editForm, creditBaht: e.target.value })} placeholder="วงเงิน (บาท)" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.addressDetail} onChange={(e) => setEditForm({ ...editForm, addressDetail: e.target.value })} placeholder="ที่อยู่บ้าน" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.lat} onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })} placeholder="Latitude" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.lng} onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })} placeholder="Longitude" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <button type="button" onClick={() => handleSaveEdit(editingCustomer)} disabled={busy} className="dg-btn-icon" style={{ minHeight: 36, borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              <IconCheck size={14} />
              <span>บันทึก</span>
            </button>
          </div>
        </div>
      )}

      <AdminCustomersView customers={customers} viewMode={viewMode} editId={editId} onViewBags={handleViewBags} onOpenEdit={handleOpenEdit} />

      {selectedBagCust && (
        <div className="dg-card" style={{ border: '1.5px solid #0F172A', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              <IconBag size={15} />
              <span>ประวัติถุงของสมาชิก: {selectedBagCust.customer.name} (คงค้าง {selectedBagCust.summary.balance} ใบ)</span>
            </span>
            <button type="button" onClick={() => setSelectedBagCust(null)} style={{ border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}>ปิด</button>
          </div>
          {selectedBagCust.summary.history.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #F1F5F9', color: '#334155' }}>
              <span>{h.movement} {h.orderCode ? `(#${h.orderCode})` : ''}</span>
              <strong className="dg-num" style={{ color: h.qty > 0 ? '#B45309' : '#047857' }}>{h.qty > 0 ? `+${h.qty} (รับถุงไป)` : `${h.qty} (คืนถุง)`}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
