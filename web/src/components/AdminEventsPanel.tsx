import React, { useCallback, useEffect, useState } from 'react';
import { eventsApi, MeetupEvent } from '../api/events-api';
import { getBangkokTodayIso, isoDateToThaiLabel } from '../domain/thai-datetime';
import { AdminEventsView } from './AdminEventsView';
import { DateTimeSchedulePicker } from './DateTimeSchedulePicker';
import { IconCheck, IconEdit, IconPlus } from './icons/ActionIcons';
import { IconCalendar } from './icons/Icons';
import { AdminViewMode, getSavedViewMode, ViewModeToggle } from './ViewModeToggle';

interface Props {
  onNotify: (msg: string) => void;
  viewMode?: AdminViewMode;
  onViewModeChange?: (mode: AdminViewMode) => void;
}

export const AdminEventsPanel: React.FC<Props> = ({ onNotify, viewMode: propMode, onViewModeChange }) => {
  const [localMode, setLocalMode] = useState<AdminViewMode>(() => getSavedViewMode());
  const viewMode = propMode ?? localMode;
  const handleModeChange = (m: AdminViewMode) => { setLocalMode(m); onViewModeChange?.(m); };

  const [events, setEvents] = useState<MeetupEvent[]>([]);
  const [title, setTitle] = useState('กิจกรรมพบปะทีม ilife');
  const [eventDate, setEventDate] = useState(() => isoDateToThaiLabel(getBangkokTodayIso()));
  const [eventTime, setEventTime] = useState('10.00');
  const [locationName, setLocationName] = useState('โรงแรมอุทัยรัตน อ เมือง อุทัยธานี');
  const [contactPhone, setContactPhone] = useState('0634455');
  const [mapUrl, setMapUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', eventDate: '', eventTime: '', locationName: '', contactPhone: '', mapUrl: '' });
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(async () => {
    try { setEvents(await eventsApi.listAdminEvents()); }
    catch (e) { onNotify(e instanceof Error ? e.message : 'โหลดตารางกิจกรรมไม่สำเร็จ'); }
  }, [onNotify]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate.trim() || !eventTime.trim() || !locationName.trim() || !contactPhone.trim()) {
      return onNotify('กรุณากรอก วันเวลา สถานที่ และเบอร์โทร ให้ครบถ้วน');
    }
    setBusy(true);
    try {
      await eventsApi.createEvent({
        title: title.trim() || undefined,
        eventDate: eventDate.trim(),
        eventTime: eventTime.trim(),
        locationName: locationName.trim(),
        contactPhone: contactPhone.trim(),
        mapUrl: mapUrl.trim() || null,
      });
      setLocationName(''); setMapUrl('');
      onNotify('เพิ่มตารางกิจกรรมพบปะใหม่เรียบร้อย');
      await loadEvents();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'เพิ่มกิจกรรมไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const openEdit = (ev: MeetupEvent) => {
    if (editingId === ev.id) return setEditingId(null);
    setEditingId(ev.id);
    setEditForm({ title: ev.title, eventDate: ev.eventDate, eventTime: ev.eventTime, locationName: ev.locationName, contactPhone: ev.contactPhone, mapUrl: ev.mapUrl });
  };

  const handleSaveEdit = async (id: number) => {
    setBusy(true);
    try {
      await eventsApi.updateEvent(id, editForm);
      setEditingId(null);
      onNotify('บันทึกการแก้ไขตารางกิจกรรมเรียบร้อย');
      await loadEvents();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'แก้ไขกิจกรรมไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  const handleToggleActive = async (ev: MeetupEvent) => {
    try {
      await eventsApi.updateEvent(ev.id, { active: !ev.active });
      onNotify(`เปลี่ยนสถานะกิจกรรม "${ev.locationName}" เรียบร้อย`);
      await loadEvents();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ'); }
  };

  const handleDelete = async (ev: MeetupEvent) => {
    if (!window.confirm(`ยืนยันการลบกิจกรรมวันที่ ${ev.eventDate} (${ev.locationName})?`)) return;
    try {
      await eventsApi.deleteEvent(ev.id);
      onNotify('ลบรายการกิจกรรมเรียบร้อย');
      await loadEvents();
    } catch (err) { onNotify(err instanceof Error ? err.message : 'ลบกิจกรรมไม่สำเร็จ'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="dg-card" style={{ padding: 14 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
          <IconCalendar size={16} style={{ color: '#1D4ED8' }} />
          <span>จัดการตารางกิจกรรมพบปะทีม ilife (เชื่อมปุ่มที่ 1 บน LINE Rich Menu)</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
          ระบบบน LINE จะดึงเฉพาะกิจกรรมที่เปิดแสดงผลและมีวันจัดงานในช่วง <strong>1 เดือนข้างหน้า (วันนี้ ถึง +30 วัน)</strong> เรียงงานใกล้สุดขึ้นก่อนโดยอัตโนมัติ
        </div>
      </div>

      <form onSubmit={handleCreate} className="dg-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
          <IconPlus size={15} style={{ color: '#1D4ED8' }} />
          <span>เพิ่มกำหนดการกิจกรรมพบปะใหม่</span>
        </div>
        <DateTimeSchedulePicker eventDate={eventDate} eventTime={eventTime} onChangeDate={setEventDate} onChangeTime={setEventTime} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
          <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="สถานที่" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="เบอร์โทร" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวข้อกิจกรรม" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
        </div>
        <input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="ลิงก์ Google Maps (เว้นว่างให้ระบบสร้างจากชื่อสถานที่อัตโนมัติ)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
        <button type="submit" disabled={busy} className="dg-btn-icon" style={{ minHeight: 40, borderRadius: 9, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <IconCheck size={14} />
          <span>บันทึกตารางกิจกรรมพบปะ</span>
        </button>
      </form>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="ตารางกิจกรรมพบปะทั้งหมด" count={events.length} />

      {editingId !== null && (
        <div className="dg-card" style={{ border: '1.5px solid #1D4ED8', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
            <IconEdit size={14} style={{ color: '#1D4ED8' }} />
            <span>แก้ไขกำหนดการกิจกรรม #{editingId}</span>
          </div>
          <DateTimeSchedulePicker eventDate={editForm.eventDate} eventTime={editForm.eventTime} onChangeDate={(d) => setEditForm({ ...editForm, eventDate: d })} onChangeTime={(tm) => setEditForm({ ...editForm, eventTime: tm })} compact />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
            <input value={editForm.locationName} onChange={(e) => setEditForm({ ...editForm, locationName: e.target.value })} placeholder="สถานที่" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
            <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="หัวข้อกิจกรรม" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
          </div>
          <input value={editForm.mapUrl} onChange={(e) => setEditForm({ ...editForm, mapUrl: e.target.value })} placeholder="ลิงก์ Google Maps" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
            <button type="button" onClick={() => handleSaveEdit(editingId)} disabled={busy} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}>บันทึกการแก้ไข</button>
          </div>
        </div>
      )}

      <AdminEventsView events={events} viewMode={viewMode} onOpenEdit={openEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} />
    </div>
  );
};
