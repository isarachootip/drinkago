import React from 'react';
import { WaterStation } from '../api/admin-api';
import { getStationRegionMeta, STATION_REGION_META, STATION_REGIONS, StationRegion } from '../domain/station-regions';
import { useI18n } from '../i18n/I18nContext';
import { IconMapPin, IconNavigation } from './icons/Icons';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  stations: WaterStation[];
  viewMode: AdminViewMode;
  selectedId: number | null;
  restockQty: Record<number, number>;
  restockNote: Record<number, string>;
  busy: boolean;
  onSelect: (id: number) => void;
  onQtyChange: (id: number, qty: number) => void;
  onNoteChange: (id: number, note: string) => void;
  onRegionChange?: (id: number, region: StationRegion) => void;
  onBagAction: (id: number, movement: 'RESTOCK_IN' | 'ADJUST') => void;
}

export const AdminStationsView: React.FC<Props> = ({
  stations,
  viewMode,
  selectedId,
  restockQty,
  restockNote,
  busy,
  onSelect,
  onQtyChange,
  onNoteChange,
  onRegionChange,
  onBagAction,
}) => {
  const { t } = useI18n();

  const renderRegionBadgeOrSelect = (st: WaterStation) => {
    const meta = getStationRegionMeta(st.region);
    if (!onRegionChange) {
      return (
        <span style={{ background: meta.bg, color: meta.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
          {t(meta.translationKey)}
        </span>
      );
    }
    return (
      <select
        value={meta.code}
        disabled={busy}
        onChange={(e) => onRegionChange(st.id, e.target.value as StationRegion)}
        style={{ padding: '3px 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#0F172A', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      >
        {STATION_REGIONS.map((c) => (
          <option key={c} value={c}>{t(STATION_REGION_META[c].translationKey)}</option>
        ))}
      </select>
    );
  };

  if (viewMode === 'grid') {
    return (
      <div className="dg-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 880 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>รหัส</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>โซน / ภูมิภาค</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ชื่อตู้กดน้ำ / ที่ตั้ง</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>พิกัดนำทาง</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>สต็อกถุง</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>เติมถุง / ปรับยอดสต็อก</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>ประวัติ</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((st) => {
              const isSelected = selectedId === st.id;
              return (
                <tr key={st.id} style={{ borderBottom: '1px solid #F1F5F9', background: isSelected ? '#EFF6FF' : '#FFFFFF' }}>
                  <td className="dg-num" style={{ padding: '10px 12px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{st.code}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{renderRegionBadgeOrSelect(st)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{st.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{st.addressDetail}</div>
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`} target="_blank" rel="noreferrer" className="dg-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#1D4ED8', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      <IconNavigation size={12} />
                      <span>{st.lat.toFixed(4)}, {st.lng.toFixed(4)}</span>
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span className="dg-num" style={{ background: '#F0F9FF', color: '#0369A1', padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 13 }}>{st.bagBalance} ใบ</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="number" value={restockQty[st.id] ?? 10} onChange={(e) => onQtyChange(st.id, Number(e.target.value))} className="dg-num" style={{ width: 60, minHeight: 30, padding: '0 6px', borderRadius: 7, border: '1px solid #CBD5E1', fontWeight: 600 }} />
                      <input value={restockNote[st.id] ?? ''} onChange={(e) => onNoteChange(st.id, e.target.value)} placeholder="หมายเหตุ" style={{ width: 140, minHeight: 30, padding: '0 8px', borderRadius: 7, border: '1px solid #CBD5E1', fontSize: 12 }} />
                      <button type="button" onClick={() => onBagAction(st.id, 'RESTOCK_IN')} disabled={busy} style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: 'none', background: '#059669', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+รับเข้า</button>
                      <button type="button" onClick={() => onBagAction(st.id, 'ADJUST')} disabled={busy} style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ปรับยอด</button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => onSelect(st.id)} style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: isSelected ? '#0F172A' : '#FFFFFF', color: isSelected ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ประวัติ</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {stations.map((st) => (
        <div key={st.id} className="dg-card" style={{ border: selectedId === st.id ? '1.5px solid #1D4ED8' : '1px solid #E2E8F0', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 4 }}>{renderRegionBadgeOrSelect(st)}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}><span className="dg-num">{st.code}</span> · {st.name}</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 12, color: '#64748B', marginTop: 2 }}>
                <IconMapPin size={12} style={{ marginTop: 2 }} />
                <span>{st.addressDetail}</span>
              </div>
            </div>
            <div style={{ background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', padding: '6px 10px', borderRadius: 10, textAlign: 'center', flexShrink: 0, minWidth: 64 }}>
              <div style={{ fontSize: 10, fontWeight: 600 }}>สต็อกถุง</div>
              <div className="dg-num" style={{ fontSize: 16, fontWeight: 700 }}>{st.bagBalance}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              <IconNavigation size={12} />
              <span>Google Maps</span>
            </a>
            <button type="button" onClick={() => onSelect(st.id)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: selectedId === st.id ? '#0F172A' : '#FFFFFF', color: selectedId === st.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ดูประวัติรับเข้า-จ่ายออก</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <input type="number" value={restockQty[st.id] ?? 10} onChange={(e) => onQtyChange(st.id, Number(e.target.value))} className="dg-num" style={{ width: 64, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', fontWeight: 600, boxSizing: 'border-box' }} />
              <input value={restockNote[st.id] ?? ''} onChange={(e) => onNoteChange(st.id, e.target.value)} placeholder="หมายเหตุเติมถุง/ปรับยอด" style={{ flex: 1, minWidth: 0, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button type="button" onClick={() => onBagAction(st.id, 'RESTOCK_IN')} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ รับเข้าตู้</button>
              <button type="button" onClick={() => onBagAction(st.id, 'ADJUST')} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>ปรับยอด</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
