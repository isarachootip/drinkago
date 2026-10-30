import React, { useState } from 'react';
import { CustomerAddress } from '../api/schemas';
import {
  buildCustomerMapsUrl,
  DEFAULT_FALLBACK_COORDS,
  hasUsableAddressText,
  isFallbackCoordinates,
  validateAddressDraft,
} from '../domain/navigation';
import { useI18n } from '../i18n/I18nContext';
import { IconCheck, IconEdit } from './icons/ActionIcons';
import { IconHome, IconMapPin, IconNavigation } from './icons/Icons';

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
  const { t } = useI18n();
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
        onNotify('ปักหมุดพิกัด GPS ตำแหน่งปัจจุบันเรียบร้อย');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 13, color: '#0F172A', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <IconHome size={15} style={{ marginTop: 2, color: '#64748B' }} />
            <span>
              <strong style={{ fontWeight: 600 }}>{activeAddr?.label ?? t('addrDeliveryLabel')}:</strong> {activeAddr?.detail ?? t('addrUnset')}
              {activeAddr?.note ? ` (${activeAddr.note})` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4, fontSize: 11 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: hasRealGps ? '#047857' : '#B45309', fontWeight: 600 }}>
              <IconMapPin size={12} />
              <span>
                {hasRealGps
                  ? t('addrGpsPinned', { coords: `${activeAddr!.lat.toFixed(4)}, ${activeAddr!.lng.toFixed(4)}` })
                  : t('addrGpsNotPinned')}
              </span>
            </span>
            {mapsInfo && (
              <a href={mapsInfo.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none' }}>
                <IconNavigation size={12} />
                <span>{t('addrViewMap')}</span>
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => (editing ? setEditing(false) : openEditor())}
          className="dg-btn-icon"
          style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: editing ? '#0F172A' : '#FFFFFF', color: editing ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <IconEdit size={13} />
          <span>{editing ? t('commonClose') : t('addrEditBtn')}</span>
        </button>
      </div>

      {!editing && addresses.length > 1 && (
        <select
          value={activeAddr?.id ?? ''}
          onChange={(e) => onSelectAddress(e.target.value)}
          style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, background: '#FFFFFF', color: '#0F172A' }}
        >
          {addresses.map((a, idx) => (
            <option key={a.id ?? idx} value={a.id ?? ''}>
              {a.label}: {a.detail}
            </option>
          ))}
        </select>
      )}

      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid #E2E8F0' }}>
          <button
            type="button"
            onClick={handlePinCurrentGps}
            disabled={locating}
            className="dg-btn-icon"
            style={{ minHeight: 38, borderRadius: 9, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <IconMapPin size={14} style={{ color: '#059669' }} />
            <span>{locating ? t('stationsLocating') : t('addrPinCurrentGps', { coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })}</span>
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 6 }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('addrDeliveryLabel')} style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          </div>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={t('addrUnset')} style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }} />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="dg-btn-icon"
            style={{ minHeight: 40, borderRadius: 9, border: 'none', background: '#0F172A', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <IconCheck size={14} />
            <span>{saving ? t('podSubmitting') : t('addrSaveBtn')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
