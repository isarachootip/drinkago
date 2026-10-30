import React, { useRef, useState } from 'react';
import { DevAuthSettings, EvidenceInput, OrderDetail, RiderJob } from '../api/schemas';
import { IconArrowLeft, IconCamera, IconCheckCircle } from '../components/icons/ActionIcons';
import { IconHome, IconNavigation, IconPhone } from '../components/icons/Icons';
import { OtpBagSection } from '../components/OtpBagSection';
import { getCurrentGps } from '../domain/geo';
import { buildCustomerMapsUrl, formatJobDistanceLabel } from '../domain/navigation';
import { uploadSelectedOrDemoPhoto } from '../domain/photo-picker';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  job: RiderJob;
  detail: OrderDetail | null;
  settings: DevAuthSettings;
  onBack: () => void;
  onDeliver: (payload: { evidence: EvidenceInput; otp?: string; bagsCollected: number; bagPhotoUrl?: string }) => Promise<void>;
  onOpenFailModal: () => void;
}

export const RiderPodPage: React.FC<Props> = ({ job, detail, settings, onBack, onDeliver, onOpenFailModal }) => {
  const { t } = useI18n();
  const podFileRef = useRef<HTMLInputElement | null>(null);
  const [digits, setDigits] = useState<[string, string, string, string]>(['', '', '', '']);
  const [bagsCollected, setBagsCollected] = useState<number>(job.expectBagReturn);
  const [podPhotoUrl, setPodPhotoUrl] = useState<string>('');
  const [bagPhotoUrl, setBagPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const distLabel = formatJobDistanceLabel(settings.mockLat, settings.mockLng, job.address);
  const customerMaps = buildCustomerMapsUrl(job.address);
  const itemsText = detail?.items.map((i) => `${i.name} × ${i.qty}`).join(', ') ?? '';

  const handleDigitChange = (idx: number, val: string) => {
    const next = [...digits] as [string, string, string, string];
    next[idx] = val;
    setDigits(next);
  };

  const handleUploadPod = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      setPodPhotoUrl(await uploadSelectedOrDemoPhoto(file, `pod-${job.code}.png`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปส่งสินค้าไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadBag = async (file?: File | null) => {
    setUploading(true);
    setErr(null);
    try {
      setBagPhotoUrl(await uploadSelectedOrDemoPhoto(file, `bags-${job.code}.png`));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'อัปโหลดรูปถุงคืนไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!podPhotoUrl) {
      setErr('กรุณาถ่ายรูปหลักฐานการส่งสินค้า (ข้อ 1)');
      return;
    }
    const otp = digits.join('');
    if (otp.length !== 4) {
      setErr('กรุณากรอกรหัสยืนยัน 4 หลักจากลูกค้าให้ครบ (ข้อ 2)');
      return;
    }
    if (bagsCollected > 0 && !bagPhotoUrl) {
      setErr('มีการรับถุงคืน กรุณาถ่ายรูปถุงที่รับคืนเป็นหลักฐาน (ข้อ 3)');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const gps = await getCurrentGps(settings);
      await onDeliver({
        evidence: { photoUrl: podPhotoUrl, lat: gps.lat, lng: gps.lng },
        otp,
        bagsCollected,
        ...(bagsCollected > 0 ? { bagPhotoUrl } : {}),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ยืนยันการจัดส่งไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #E2E8F0' }}>
        <button type="button" onClick={onBack} aria-label={t('commonBack')} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <IconArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{t('podHeaderTitle')}</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            <span className="dg-num">#{job.code}</span> · {job.customerName} {itemsText ? `· ${itemsText}` : ''}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="dg-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#334155' }}>
            <IconHome size={15} style={{ marginTop: 2, color: '#64748B' }} />
            <span>
              <strong style={{ fontWeight: 600 }}>{job.address.label}:</strong> {job.address.detail}
              {job.address.note ? ` · ${job.address.note}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={customerMaps.url} target="_blank" rel="noreferrer" style={{ flex: 1, minHeight: 38, borderRadius: 9, background: '#0F172A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 10px' }}>
              <IconNavigation size={14} />
              <span>{t('podOpenCustomerMap')}</span>
            </a>
            {job.customerPhone && (
              <a href={`tel:${job.customerPhone}`} style={{ minHeight: 38, borderRadius: 9, background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px' }}>
                <IconPhone size={13} />
                <span>{t('navCallCustomer')}</span>
              </a>
            )}
          </div>
        </div>

        <div className="dg-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{t('podPhotoSectionTitle')}</span>
            <span style={{ fontSize: 11, color: '#B91C1C', background: '#FEF2F2', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>{t('podRequiredBadge')}</span>
          </div>
          <input ref={podFileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style={{ display: 'none' }} onChange={(e) => handleUploadPod(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => podFileRef.current?.click()}
            disabled={uploading}
            className="dg-btn-icon"
            style={{ height: 96, border: podPhotoUrl ? '1px solid #A7F3D0' : '1.5px dashed #CBD5E1', borderRadius: 10, background: podPhotoUrl ? '#ECFDF5' : '#F8FAFC', color: podPhotoUrl ? '#047857' : '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {podPhotoUrl ? <IconCheckCircle size={16} /> : <IconCamera size={16} />}
            <span>{podPhotoUrl ? t('podPhotoAttached') : t('podTakePhotoBtn')}</span>
          </button>
          {!podPhotoUrl && (
            <button type="button" onClick={() => handleUploadPod(null)} disabled={uploading} style={{ minHeight: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', fontSize: 12, cursor: 'pointer' }}>
              {t('podUseDemoPhoto')}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 10px', borderRadius: 8 }}>
            <IconCheckCircle size={14} />
            <span style={{ flex: 1 }}>
              {customerMaps.mode === 'address_query' ? t('podGpsReadyFallback') : t('podGpsReadyDist', { dist: distLabel })}
            </span>
          </div>
        </div>

        <OtpBagSection
          digits={digits}
          onDigitChange={handleDigitChange}
          expectedBags={job.expectBagReturn}
          bagsCollected={bagsCollected}
          onChangeBags={setBagsCollected}
          bagPhotoUrl={bagPhotoUrl}
          uploading={uploading}
          onUploadBag={handleUploadBag}
        />

        {err && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{err}</div>}
      </div>

      <div style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0', padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={handleSubmit} disabled={submitting || uploading} style={{ width: '100%', minHeight: 48, border: 'none', borderRadius: 10, background: '#059669', color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {submitting ? t('podSubmitting') : bagsCollected > 0 ? t('podSubmitWithBags', { count: bagsCollected }) : t('podSubmitNoBags')}
        </button>
        <button type="button" onClick={onOpenFailModal} style={{ width: '100%', minHeight: 40, border: 'none', background: 'transparent', color: '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          {t('podFailLink')}
        </button>
      </div>
    </div>
  );
};
