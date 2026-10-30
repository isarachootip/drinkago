import React from 'react';
import { ManagedCustomer } from '../api/admin-api';
import { formatBaht } from '../api/schemas';
import { buildCustomerMapsUrl } from '../domain/navigation';
import { IconEdit } from './icons/ActionIcons';
import { IconBag, IconHome, IconNavigation, IconPhone } from './icons/Icons';
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
      <div className="dg-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', color: '#475569', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 12 }}>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ชื่อสมาชิก</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>เบอร์โทร / LINE ID</th>
              <th style={{ padding: '10px 12px', fontWeight: 600 }}>ที่อยู่จัดส่ง &amp; แผนที่</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>วงเงินเครดิต (คงเหลือ)</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>ถุงค้าง</th>
              <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const remainSatang = Math.max(0, c.creditLimitSatang - c.creditUsedSatang);
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', background: editId === c.id ? '#EFF6FF' : '#FFFFFF' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>{c.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div className="dg-num" style={{ color: '#334155', fontWeight: 500 }}>{c.phone || '-'}</div>
                    <div className="dg-num" style={{ fontSize: 11, color: '#64748B' }}>{c.lineUserId}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ color: '#334155' }}><strong>{c.addressLabel}:</strong> {c.addressDetail || '-'}</div>
                    <a
                      href={buildCustomerMapsUrl({ lat: c.lat, lng: c.lng, detail: c.addressDetail, label: c.addressLabel }).url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D4ED8', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                    >
                      <IconNavigation size={11} />
                      <span className="dg-num">Google Maps ({c.lat.toFixed(4)}, {c.lng.toFixed(4)})</span>
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span className="dg-num" style={{ padding: '3px 10px', borderRadius: 8, background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 600 }}>
                      {formatBaht(c.creditLimitSatang)} ({formatBaht(remainSatang)})
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span className="dg-num" style={{ padding: '3px 10px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 600 }}>
                      {c.bagBalance} ใบ
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" onClick={() => onViewBags(c)} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <IconBag size={12} />
                        <span>ประวัติถุง</span>
                      </button>
                      <button type="button" onClick={() => onOpenEdit(c)} className="dg-btn-icon" style={{ minHeight: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #CBD5E1', background: editId === c.id ? '#0F172A' : '#FFFFFF', color: editId === c.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <IconEdit size={12} />
                        <span>แก้ไข</span>
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
          <div key={c.id} className="dg-card" style={{ border: editId === c.id ? '1.5px solid #1D4ED8' : '1px solid #E2E8F0', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, boxSizing: 'border-box' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
              <div className="dg-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B', marginTop: 2 }}>
                <IconPhone size={12} />
                <span>{c.phone || '-'} · LINE: {c.lineUserId}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="dg-num" style={{ padding: '3px 10px', borderRadius: 8, background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 600 }}>
                วงเงิน: {formatBaht(c.creditLimitSatang)} (เหลือ {formatBaht(remainSatang)})
              </span>
              <span className="dg-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 600 }}>
                <IconBag size={12} />
                <span>ถุงค้าง: {c.bagBalance} ใบ</span>
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 10px', borderRadius: 8 }}>
              <IconHome size={12} style={{ marginInlineEnd: 4, color: '#64748B' }} />
              <strong>{c.addressLabel}:</strong> {c.addressDetail || '-'}{' '}
              <a
                href={buildCustomerMapsUrl({ lat: c.lat, lng: c.lng, detail: c.addressDetail, label: c.addressLabel }).url}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#1D4ED8', fontWeight: 600, textDecoration: 'none' }}
              >
                [Google Maps]
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
              <button type="button" onClick={() => onViewBags(c)} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <IconBag size={13} />
                <span>ประวัติถุง</span>
              </button>
              <button type="button" onClick={() => onOpenEdit(c)} className="dg-btn-icon" style={{ minHeight: 34, padding: '0 8px', borderRadius: 8, border: '1px solid #CBD5E1', background: editId === c.id ? '#0F172A' : '#FFFFFF', color: editId === c.id ? '#FFFFFF' : '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <IconEdit size={13} />
                <span>{editId === c.id ? 'ปิดแก้ไข' : 'แก้ไขพิกัด/วงเงิน'}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
