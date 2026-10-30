import React, { useRef, useState } from 'react';
import { DevAuthSettings, EvidenceInput, RiderJob } from '../api/schemas';
import { getCurrentGps } from '../domain/geo';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';
import { useI18n } from '../i18n/I18nContext';
import { IconCamera, IconCheckCircle } from './icons/ActionIcons';

interface Props {
  job: RiderJob;
  settings: DevAuthSettings;
  onConfirm: (evidence: EvidenceInput) => Promise<void>;
  onClose: () => void;
}

export const PickupModal: React.FC<Props> = ({ job, settings, onConfirm, onClose }) => {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleUpload = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadSelectedOrDemoPhoto(file, `pickup-${job.code}.png`);
      setPhotoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!photoUrl) {
      setErr('กรุณาถ่ายหรือแนบรูปสินค้าก่อนยืนยันการรับสินค้า');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const gps = await getCurrentGps(settings);
      await onConfirm({ photoUrl, lat: gps.lat, lng: gps.lng });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ยืนยันการรับสินค้าไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
      <div className="dg-card" style={{ width: '100%', maxWidth: 360, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{t('pickupModalTitle')}</div>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          <span className="dg-num">#{job.code}</span> · {job.customerName}
        </div>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files?.[0])} />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="dg-btn-icon"
          style={{
            minHeight: 88,
            border: photoUrl ? '1px solid #A7F3D0' : '1.5px dashed #CBD5E1',
            borderRadius: 10,
            background: photoUrl ? '#ECFDF5' : '#F8FAFC',
            color: photoUrl ? '#047857' : '#0F172A',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {photoUrl ? <IconCheckCircle size={16} /> : <IconCamera size={16} />}
          <span>{photoUrl ? t('podPhotoAttached') : t('rStep3Btn')}</span>
        </button>

        {!photoUrl && (
          <button
            type="button"
            onClick={() => handleUpload(null)}
            disabled={uploading}
            style={{ minHeight: 36, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: 12, cursor: 'pointer' }}
          >
            {t('podUseDemoPhoto')}
          </button>
        )}

        {err && <div style={{ fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            {t('commonCancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploading}
            style={{ flex: 1, minHeight: 44, borderRadius: 10, border: 'none', background: '#0F172A', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            {submitting ? t('podSubmitting') : t('pickupConfirmBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
