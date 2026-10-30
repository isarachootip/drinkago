import React, { useState } from 'react';
import { CustomerAddress } from '../api/schemas';
import {
  buildCustomerMapsUrl,
  DEFAULT_FALLBACK_COORDS,
  hasUsableAddressText,
  isFallbackCoordinates,
  validateAddressDraft,
} from '../domain/navigation';

interface Props {
  addresses: CustomerAddress[];
  activeAddr: CustomerAddress | undefined;
  onSelectAddress: (addressId: string) => void;
  onSaveNewAddress: (input: { label: string; detail: string; lat: number; lng: number; note?: string }) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const CustomerAddressCard: React.FC<Props> = ({
  addresses,
  activeAddr,
  onSelectAddress,
  onSaveNewAddress,
  onNotify,
}) => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('บ้าน');
  const [detail, setDetail] = useState('');
  const [note, setNote] = useState('');
  const [lat, setLat] = useState<number>(DEFAULT_FALLBACK_COORDS.lat);
  const [lng, setLng] = useState<number>(DEFAULT_FALLBACK_COORDS.lng);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setLabel(activeAddr?.label || 'บ้าน');
    setDetail(hasUsableAddressText(activeAddr?.detail) ? (activeAddr?.detail ?? '') : '');
    setNote(activeAddr?.note ?? '');
    setLat(activeAddr?.lat ?? DEFAULT_FALLBACK_COORDS.lat);
    setLng(activeAddr?.lng ?? DEFAULT_FALLBACK_COORDS.lng);
    setEditing(true);
  };

  const handlePinCurrentGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      onNotify('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
        onNotify('📍 ปักหมุดพิกัด GPS ตำแหน่งปัจจุบันเรียบร้อย');
      },
      () => {
        setLocating(false);
        onNotify('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งของเบราว์เซอร์');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
    );
  };

  const handleSave = async () => {
    const checked = validateAddressDraft({ label, detail, lat, lng, note });
    if (!checked.ok) {
      onNotify(checked.error);
      return;
    }
    setSaving(true);
    try {
      await onSaveNewAddress(checked.value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const mapsInfo = activeAddr ? buildCustomerMapsUrl(activeAddr) : null;
  const hasRealGps = activeAddr ? !isFallbackCoordinates(activeAddr.lat, activeAddr.lng) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', border: '1px solid #DCE4EC', borderRadius: 12, background: '#F8FAFC' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, fontSize: 13, color: '#0F2236', lineHeight: 1.45 }}>
          <div>
            🏠 <b>{activeAddr?.label ?? 'ที่อยู่จัดส่ง'}:</b> {activeAddr?.detail ?? 'ยังไม่ได้ระบุที่อยู่'}
            {activeAddr?.note ? ` (${activeAddr.note})` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3, fontSize: 11 }}>
            <span style={{ color: hasRealGps ? '#15803D' : '#B45309', fontWeight: 700 }}>
              {hasRealGps ? `📍 ปักหมุด GPS แล้ว (${activeAddr!.lat.toFixed(4)}, ${activeAddr!.lng.toFixed(4)})` : '⚠️ ยังไม่ได้ปักหมุด GPS หน้าบ้าน'}
            </span>
            {mapsInfo && (
              <a href={mapsInfo.url} target="_blank" rel="noreferrer" style={{ color: '#058C3B', fontWeight: 700, textDecoration: 'none' }}>
                🗺️ ดูแผนที่ Google Maps
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => (editing ? setEditing(false) : openEditor())}
          style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #1A56B0', background: editing ? '#1A56B0' : '#FFFFFF', color: editing ? '#FFFFFF' : '#1A56B0', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {editing ? '✕ ปิด' : '✏️ แก้ที่อยู่ / GPS'}
        </button>
      </div>

      {!editing && addresses.length > 1 && (
        <select
          value={activeAddr?.id ?? ''}
          onChange={(e) => onSelectAddress(e.target.value)}
          style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFFFFF' }}
        >
          {addresses.map((a, idx) => (
            <option key={a.id ?? idx} value={a.id ?? ''}>
              🏠 {a.label}: {a.detail}
            </option>
          ))}
        </select>
      )}

      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
          <button
            type="button"
            onClick={handlePinCurrentGps}
            disabled={locating}
            style={{ minHeight: 40, borderRadius: 10, border: '1.5px solid #058C3B', background: '#E8F8EE', color: '#058C3B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {locating ? 'กำลังดึงพิกัด GPS...' : `📍 ปักหมุด GPS ตำแหน่งปัจจุบัน (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 6 }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="เช่น บ้าน" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 13 }} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="จุดสังเกตให้ไรเดอร์ (ถ้ามี)" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 13 }} />
          </div>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ" style={{ minHeight: 40, padding: '0 10px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 13 }} />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ minHeight: 42, borderRadius: 10, border: 'none', background: '#1A56B0', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {saving ? 'กำลังบันทึก...' : '💾 บันทึกที่อยู่จัดส่งและหมุดนำทาง'}
          </button>
        </div>
      )}
    </div>
  );
};
