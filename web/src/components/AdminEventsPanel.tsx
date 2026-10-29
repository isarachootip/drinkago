import React, { useCallback, useEffect, useState } from 'react';
import { eventsApi, MeetupEvent } from '../api/events-api';
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
  const [eventDate, setEventDate] = useState('17 มีนา 2569');
  const [eventTime, setEventTime] = useState('10.00');
  const [locationName, setLocationName] = useState('โรงแรมอุทัยรัตน อ เมือง อุทัยธานี');
  const [contactPhone, setContactPhone] = useState('0634455');
  const [mapUrl, setMapUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', eventDate: '', eventTime: '', locationName: '', contactPhone: '', mapUrl: '' });
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await eventsApi.listAdminEvents());
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'โหลดตารางกิจกรรมไม่สำเร็จ');
    }
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
      onNotify('เพิ่มตารางกิจกรรมพบปะใหม่เรียบร้อย (แสดงผลบน LINE Rich Menu ทันที)');
      await loadEvents();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เพิ่มกิจกรรมไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
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
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'แก้ไขกิจกรรมไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (ev: MeetupEvent) => {
    try {
      await eventsApi.updateEvent(ev.id, { active: !ev.active });
      onNotify(`เปลี่ยนสถานะกิจกรรม "${ev.locationName}" เรียบร้อย`);
      await loadEvents();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const handleDelete = async (ev: MeetupEvent) => {
    if (!window.confirm(`ยืนยันการลบกิจกรรมวันที่ ${ev.eventDate} (${ev.locationName})?`)) return;
    try {
      await eventsApi.deleteEvent(ev.id);
      onNotify('ลบรายการกิจกรรมเรียบร้อย');
      await loadEvents();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'ลบกิจกรรมไม่สำเร็จ');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#F3E8FF', borderRadius: 14, padding: 14, border: '1px solid #C084FC' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#6B21A8' }}>📅 จัดการตารางกิจกรรมพบปะทีม ilife (เชื่อมปุ่มที่ 1 บน LINE Rich Menu)</div>
        <div style={{ fontSize: 12, color: '#4C1D95' }}>กำหนดวัน เวลา สถานที่ เบอร์โทร และพิกัดแผนที่ เพื่อให้ลูกค้ากดดูจากปุ่ม "กิจกรรมพบปะ" ใน LINE ได้ทันที</div>
      </div>

      <form onSubmit={handleCreate} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>➕ เพิ่มกำหนดการกิจกรรมพบปะใหม่</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <input value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="วันที่ (เช่น 17 มีนา 2569)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="เวลา (เช่น 10.00)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="เบอร์โทร (เช่น 0634455)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="สถานที่ (เช่น โรงแรมอุทัยรัตน อ เมือง อุทัยธานี)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวข้อกิจกรรม (เช่น กิจกรรมพบปะทีม ilife)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        </div>
        <input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="ลิงก์ Google Maps (เว้นว่างไว้ ระบบจะสร้างลิงก์ค้นหาจากชื่อสถานที่ให้อัตโนมัติ)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD' }} />
        <button type="submit" disabled={busy} style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#7C3AED', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>
          💾 บันทึกตารางกิจกรรมพบปะ
        </button>
      </form>

      <ViewModeToggle mode={viewMode} onChange={handleModeChange} title="ตารางกิจกรรมพบปะทั้งหมด" count={events.length} />

      {editingId !== null && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '2px solid #7C3AED', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7C3AED' }}>✏️ แก้ไขกำหนดการกิจกรรม #{editingId}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input value={editForm.eventDate} onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })} placeholder="วันที่" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.eventTime} onChange={(e) => setEditForm({ ...editForm, eventTime: e.target.value })} placeholder="เวลา" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
            <input value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} placeholder="เบอร์โทร" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          </div>
          <input value={editForm.locationName} onChange={(e) => setEditForm({ ...editForm, locationName: e.target.value })} placeholder="สถานที่" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <input value={editForm.mapUrl} onChange={(e) => setEditForm({ ...editForm, mapUrl: e.target.value })} placeholder="ลิงก์ Google Maps" style={{ minHeight: 36, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditingId(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}>ยกเลิก</button>
            <button type="button" onClick={() => handleSaveEdit(editingId)} disabled={busy} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#7C3AED', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>บันทึกการแก้ไข</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((ev) => (
          <div key={ev.id} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #DCE4EC', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, opacity: ev.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F2236' }}>📅 {ev.eventDate} เวลา {ev.eventTime} น. — {ev.title}</div>
              <div style={{ fontSize: 13, color: '#33475B' }}>📍 สถานที่: <b>{ev.locationName}</b> · 📞 โทร: <b>{ev.contactPhone}</b></div>
              <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1A56B0', fontWeight: 600 }}>🗺️ เปิดแผนที่ Google Maps</a>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => openEdit(ev)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #7C3AED', background: '#F3E8FF', color: '#6B21A8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ แก้ไข</button>
              <button type="button" onClick={() => handleToggleActive(ev)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: ev.active ? '#1E7B45' : '#64748B', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{ev.active ? '✅ แสดงผล' : '⏸️ ซ่อน'}</button>
              <button type="button" onClick={() => handleDelete(ev)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑️ ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
