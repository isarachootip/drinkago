import React from 'react';
import { ManagedCustomer } from '../api/admin-api';
import { formatBaht } from '../api/schemas';
import { buildCustomerMapsUrl } from '../domain/navigation';
import { AdminViewMode } from './ViewModeToggle';

interface Props {
  customers: ManagedCustomer[];
  viewMode: AdminViewMode;
  editId: string | null;
  onViewBags: (c: ManagedCustomer) => void;
  onOpenEdit: (c: ManagedCustomer) => void;
}

export const AdminCustomersView: React.FC<Props> = ({
  customers,
  viewMode,
  editId,
  onViewBags,
  onOpenEdit,
}) => {
  if (viewMode === 'grid') {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
          <thead>
            <tr style={{ background: '#F1F5F9', color: '#0F2236', textAlign: 'left', borderBottom: '1px solid #DCE4EC' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>ชื่อสมาชิก</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>เบอร์โทร / LINE ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>ที่อยู่จัดส่ง &amp; แผนที่</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>วงเงินเครดิต (คงเหลือ)</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>ถุงค้าง</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const remainSatang = Math.max(0, c.creditLimitSatang - c.creditUsedSatang);
              return (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #EEF2F6',
                    background: editId === c.id ? '#F0F9FF' : '#FFFFFF',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0F2236', whiteSpace: 'nowrap' }}>{c.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ color: '#33475B', fontWeight: 600 }}>📞 {c.phone || '-'}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{c.lineUserId}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ color: '#33475B' }}>🏠 <b>{c.addressLabel}:</b> {c.addressDetail || '-'}</div>
                    <a
                      href={buildCustomerMapsUrl({ lat: c.lat, lng: c.lng, detail: c.addressDetail, label: c.addressLabel }).url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#058C3B', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                    >
                      🗺️ Google Maps ({c.lat.toFixed(4)}, {c.lng.toFixed(4)})
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 8, background: '#E6EEF9', color: '#1A56B0', fontSize: 12, fontWeight: 700 }}>
                      {formatBaht(c.creditLimitSatang)} ({formatBaht(remainSatang)})
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 8, background: '#FCE8EF', color: '#C2255C', fontSize: 12, fontWeight: 700 }}>
                      {c.bagBalance} ใบ
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => onViewBags(c)}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #C2255C', background: '#FFFFFF', color: '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        📜 ประวัติถุง
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEdit(c)}
                        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #DCE4EC', background: editId === c.id ? '#0B6E8A' : '#F3F7FA', color: editId === c.id ? '#FFFFFF' : '#0F2236', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ✏️ แก้ไข
                      </button>
                    </div>
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
      {customers.map((c) => {
        const remainSatang = Math.max(0, c.creditLimitSatang - c.creditUsedSatang);
        return (
          <div
            key={c.id}
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: editId === c.id ? '2px solid #0B6E8A' : '1px solid #DCE4EC',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10,
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 2 }}>
                📞 {c.phone || '-'} · LINE: {c.lineUserId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: '#E6EEF9', color: '#1A56B0', fontSize: 12, fontWeight: 700 }}>
                💳 วงเงิน: {formatBaht(c.creditLimitSatang)} (เหลือ {formatBaht(remainSatang)})
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 8, background: '#FCE8EF', color: '#C2255C', fontSize: 12, fontWeight: 700 }}>
                🛍️ ถุงค้าง: {c.bagBalance} ใบ
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#33475B', background: '#F8FAFC', padding: '6px 10px', borderRadius: 8 }}>
              🏠 <b>{c.addressLabel}:</b> {c.addressDetail || '-'} ({c.lat.toFixed(4)}, {c.lng.toFixed(4)}){' '}
              <a
                href={buildCustomerMapsUrl({ lat: c.lat, lng: c.lng, detail: c.addressDetail, label: c.addressLabel }).url}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#058C3B', fontWeight: 700, textDecoration: 'none' }}
              >
                [Google Maps บ้าน]
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 6, borderTop: '1px solid #EEF2F6' }}>
              <button
                type="button"
                onClick={() => onViewBags(c)}
                style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #C2255C', background: '#FFFFFF', color: '#C2255C', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                📜 ประวัติถุง
              </button>
              <button
                type="button"
                onClick={() => onOpenEdit(c)}
                style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #DCE4EC', background: editId === c.id ? '#0B6E8A' : '#F3F7FA', color: editId === c.id ? '#FFFFFF' : '#0F2236', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                ✏️ {editId === c.id ? 'ปิดแก้ไข' : 'แก้ไขพิกัด/วงเงิน'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
