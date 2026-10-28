import React from 'react';
import { WaterStation } from '../api/admin-api';
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
  onBagAction,
}) => {
  if (viewMode === 'grid') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#0F2236', textAlign: 'left', borderBottom: '1px solid #DCE4EC' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>รหัส</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>ชื่อตู้กดน้ำ / ที่ตั้ง</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>พิกัดนำทาง</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>สต็อกถุง</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>เติมถุง / ปรับยอดสต็อก</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>ประวัติ</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((st) => {
              const isSelected = selectedId === st.id;
              return (
                <tr
                  key={st.id}
                  style={{
                    borderBottom: '1px solid #EEF2F6',
                    background: isSelected ? '#F0F9FF' : '#FFFFFF',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0B6E8A', whiteSpace: 'nowrap' }}>{st.code}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: '#0F2236' }}>{st.name}</div>
                    <div style={{ fontSize: 12, color: '#4A5B6E' }}>📍 {st.addressDetail}</div>
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: '5px 10px', borderRadius: 8, background: '#E8F8EE', color: '#058C3B', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
                    >
                      🗺️ {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ background: '#E6F4F8', color: '#0B6E8A', padding: '4px 10px', borderRadius: 10, fontWeight: 800, fontSize: 14 }}>
                      {st.bagBalance} ใบ
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        value={restockQty[st.id] ?? 10}
                        onChange={(e) => onQtyChange(st.id, Number(e.target.value))}
                        style={{ width: 60, minHeight: 32, padding: '0 6px', borderRadius: 8, border: '1px solid #9AABBD', fontWeight: 700 }}
                      />
                      <input
                        value={restockNote[st.id] ?? ''}
                        onChange={(e) => onNoteChange(st.id, e.target.value)}
                        placeholder="หมายเหตุเติมถุง/ปรับยอด"
                        style={{ width: 150, minHeight: 32, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 12 }}
                      />
                      <button type="button" onClick={() => onBagAction(st.id, 'RESTOCK_IN')} disabled={busy} style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        +รับเข้าตู้
                      </button>
                      <button type="button" onClick={() => onBagAction(st.id, 'ADJUST')} disabled={busy} style={{ minHeight: 32, padding: '0 10px', borderRadius: 8, border: 'none', background: '#4A5B6E', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        ปรับยอด
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => onSelect(st.id)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #0B6E8A', background: isSelected ? '#0B6E8A' : '#FFFFFF', color: isSelected ? '#FFFFFF' : '#0B6E8A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      📋 ประวัติ
                    </button>
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
        <div
          key={st.id}
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: selectedId === st.id ? '2px solid #0B6E8A' : '1px solid #DCE4EC',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 10,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>{st.code} · {st.name}</div>
              <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 2 }}>
                📍 {st.addressDetail} ({st.lat.toFixed(4)}, {st.lng.toFixed(4)})
              </div>
            </div>
            <div style={{ background: '#E6F4F8', color: '#0B6E8A', padding: '6px 10px', borderRadius: 12, textAlign: 'center', flexShrink: 0, minWidth: 68 }}>
              <div style={{ fontSize: 10, fontWeight: 700 }}>สต็อกถุงในตู้</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{st.bagBalance} ใบ</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '5px 10px', borderRadius: 8, background: '#E8F8EE', color: '#058C3B', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
            >
              🗺️ ดูพิกัดนำทาง Google Maps
            </a>
            <button
              type="button"
              onClick={() => onSelect(st.id)}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #0B6E8A', background: selectedId === st.id ? '#0B6E8A' : '#FFFFFF', color: selectedId === st.id ? '#FFFFFF' : '#0B6E8A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              📋 ดูประวัติรับเข้า-จ่ายออกของสมาชิก
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid #EEF2F6' }}>
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <input
                type="number"
                value={restockQty[st.id] ?? 10}
                onChange={(e) => onQtyChange(st.id, Number(e.target.value))}
                style={{ width: 68, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD', fontWeight: 700, boxSizing: 'border-box' }}
              />
              <input
                value={restockNote[st.id] ?? ''}
                onChange={(e) => onNoteChange(st.id, e.target.value)}
                placeholder="หมายเหตุเติมถุง/ปรับยอด"
                style={{ flex: 1, minWidth: 0, minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #9AABBD', fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button type="button" onClick={() => onBagAction(st.id, 'RESTOCK_IN')} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + รับเข้าตู้
              </button>
              <button type="button" onClick={() => onBagAction(st.id, 'ADJUST')} disabled={busy} style={{ minHeight: 34, padding: '0 10px', borderRadius: 8, border: 'none', background: '#4A5B6E', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ⚙️ ปรับยอด
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
