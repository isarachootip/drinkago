import React, { useRef, useState } from 'react';
import { DevAuthSettings, EvidenceInput, RiderJob } from '../api/schemas';
import { getCurrentGps } from '../domain/geo';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';
import { useI18n } from '../i18n/I18nContext';
import { IconAlert, IconCamera, IconCheckCircle } from './icons/ActionIcons';

interface Props {
  job: RiderJob;
  settings: DevAuthSettings;
  onSubmitFail: (payload: { evidence: EvidenceInput; reason: string }) => Promise<void>;
  onClose: () => void;
}

export const FailDeliveryModal: React.FC<Props> = ({ job, settings, onSubmitFail, onClose }) => {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [reason, setReason] = useState('ลูกค้าไม่อยู่ / ติดต่อไม่ได้');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleUpload = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadSelectedOrDemoPhoto(file, `fail-${job.code}.png`);
      setPhotoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!photoUrl) {
      setErr('ต้องแนบรูปถ่ายหน้างานเป็นหลักฐาน');
      return;
    }
    if (!reason.trim()) {
      setErr('กรุณาระบุเหตุผลที่ส่งไม่สำเร็จ');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const gps = await getCurrentGps(settings);
      await onSubmitFail({ evidence: { photoUrl, lat: gps.lat, lng: gps.lng }, reason: reason.trim() });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'แจ้งส่งไม่สำเร็จไม่ผ่าน');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }}>
      <div className="dg-card" style={{ width: '100%', maxWidth: 360, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#991B1B' }}>
          <IconAlert size={18} />
          <span>{t('failModalTitle')}</span>
        </div>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          <span className="dg-num">#{job.code}</span> · {job.customerName}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#334155' }}>
          <span>{t('failReasonLabel')}</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 42, padding: '0 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13 }} />
        </label>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files?.[0])} />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="dg-btn-icon"
          style={{
            minHeight: 72,
            border: photoUrl ? '1px solid #A7F3D0' : '1.5px dashed #CBD5E1',
            borderRadius: 10,
            background: photoUrl ? '#ECFDF5' : '#F8FAFC',
            color: photoUrl ? '#047857' : '#0F172A',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {photoUrl ? <IconCheckCircle size={15} /> : <IconCamera size={15} />}
          <span>{photoUrl ? t('podPhotoAttached') : t('podTakePhotoBtn')}</span>
        </button>

        {!photoUrl && (
          <button type="button" onClick={() => handleUpload(null)} disabled={uploading} style={{ minHeight: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
            {t('podUseDemoPhoto')}
          </button>
        )}

        {err && <div style={{ fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {t('commonBack')}
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting || uploading} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: 'none', background: '#DC2626', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {submitting ? t('podSubmitting') : t('failConfirmBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
