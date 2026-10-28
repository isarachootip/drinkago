import React, { useCallback, useEffect, useState } from 'react';
import { adminMgmtApi, ManagedCustomer } from '../api/admin-api';
import { BagSummary } from '../api/schemas';
import { AdminCustomersView } from './AdminCustomersView';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminCustomersPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => {
    setLocalMode(m);
    onViewModeChange?.(m);
  };

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
      name: c.name,
      phone: c.phone ?? '',
      addressDetail: c.addressDetail,
      lat: String(c.lat),
      lng: String(c.lng),
      creditBaht: String(Math.round(c.creditLimitSatang / 100)),
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
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'ดึงประวัติถุงไม่สำเร็จ');
    }
  };

  const editingCustomer = customers.find((c) => c.id === editId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form
        onSubmit={handleCreate}
        style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>🏠 เพิ่มสมาชิกใหม่ (ชื่อ-นามสกุล, เบอร์โทร, พิกัดบ้าน Lat/Lng, วงเงินเครดิต)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุลสมาชิก" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์ (08xxxxxxxx)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)} placeholder="LINE ID (เว้นว่างให้ระบบสร้างได้)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={creditBaht} onChange={(e) => setCreditBaht(e.target.value)} type="number" placeholder="วงเงินเครดิต (บาท)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="ที่อยู่บ้านลูกค้า" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude บ้านลูกค้า" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude บ้านลูกค้า" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <button type="submit" disabled={busy} style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          + บันทึกเพิ่มสมาชิก
        </button>
      </form>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="รายชื่อสมาชิกและวงเงินเครดิตทั้งหมด" count={customers.length} />

      {editingCustomer && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '2px solid #0B6E8A', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0B6E8A' }}>✏️ แก้ไขข้อมูลพิกัดและวงเงินสมาชิก: {editingCustomer.name}</span>
            <button type="button" onClick={() => setEditId(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>✕ ปิด</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: 8 }}>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="ชื่อ-นามสกุล" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.creditBaht} type="number" onChange={(e) => setEditForm({ ...editForm, creditBaht: e.target.value })} placeholder="วงเงิน (บาท)" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.addressDetail} onChange={(e) => setEditForm({ ...editForm, addressDetail: e.target.value })} placeholder="ที่อยู่บ้าน" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.lat} onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })} placeholder="Latitude" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.lng} onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })} placeholder="Longitude" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <button type="button" onClick={() => handleSaveEdit(editingCustomer)} disabled={busy} style={{ minHeight: 36, borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
              💾 บันทึก
            </button>
          </div>
        </div>
      )}

      <AdminCustomersView
        customers={customers}
        viewMode={viewMode}
        editId={editId}
        onViewBags={handleViewBags}
        onOpenEdit={handleOpenEdit}
      />

      {selectedBagCust && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '2px solid #C2255C', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              🛍️ ประวัติรับถุงเข้า–คืนถุงออกของสมาชิก: {selectedBagCust.customer.name} (คงค้าง {selectedBagCust.summary.balance} ใบ)
            </span>
            <button type="button" onClick={() => setSelectedBagCust(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 700 }}>✕ ปิด</button>
          </div>
          {selectedBagCust.summary.history.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span>{h.movement} {h.orderCode ? `(#${h.orderCode})` : ''}</span>
              <b style={{ color: h.qty > 0 ? '#C2255C' : '#1E7B45' }}>{h.qty > 0 ? `+${h.qty} (รับถุงไป)` : `${h.qty} (คืนถุง)`}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
