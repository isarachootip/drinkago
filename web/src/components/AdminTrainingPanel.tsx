import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { IconSearch, IconShield } from './icons/ActionIcons';
import { IconBook, IconTruck, IconUser } from './icons/Icons';
import {
  KM_SUMMARY_CARDS,
  ROLE_TRAINING_STEPS,
  TRAINING_QA_LIST,
  TrainingRole,
} from './training-data';

interface Props {
  initialRole?: TrainingRole;
  onClose?: () => void;
}

export const AdminTrainingPanel: React.FC<Props> = ({ initialRole = 'admin', onClose }) => {
  const { t } = useI18n();
  const [activeRole, setActiveRole] = useState<TrainingRole>(initialRole);
  const [query, setQuery] = useState('');
  const [selectedQaId, setSelectedQaId] = useState<string>(TRAINING_QA_LIST[0].id);

  const filteredQa = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TRAINING_QA_LIST;
    return TRAINING_QA_LIST.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [query]);

  const activeQa = filteredQa.find((item) => item.id === selectedQaId) ?? filteredQa[0] ?? TRAINING_QA_LIST[0];
  const steps = ROLE_TRAINING_STEPS[activeRole];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="dg-card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, marginBottom: 8 }}>
            <IconBook size={13} />
            <span>Interactive Training Agent &amp; KM</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Knowledge Management (KM) &amp; คู่มือปฏิบัติงานแยกตามบทบาท
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            ศูนย์รวมขั้นตอนการใช้งานระบบ ilife · Drink&amp;Go Delivery, เครือข่ายตู้กดน้ำ 15 สาขา, บัญชีถุงเดินสะพัด และผู้ช่วยตอบคำถามอัตโนมัติ
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('commonClose')}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {KM_SUMMARY_CARDS.map((card) => (
          <div key={card.title} className="dg-card" style={{ borderTop: `3px solid ${card.accent}`, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: card.accent, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{card.badge}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>{card.title}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 1.5 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      <div className="dg-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            1. ลำดับขั้นตอนการทำงานแยกตามบทบาท (Role-Based Workflow)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { id: 'customer', label: t('tabCustomerView'), icon: <IconUser size={13} /> },
              { id: 'rider', label: t('tabRiderView'), icon: <IconTruck size={13} /> },
              { id: 'admin', label: t('tabAdminView'), icon: <IconShield size={13} /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRole(tab.id)}
                className="dg-btn-icon"
                style={{
                  minHeight: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: activeRole === tab.id ? '1px solid #0F172A' : '1px solid #CBD5E1',
                  background: activeRole === tab.id ? '#0F172A' : '#FFFFFF',
                  color: activeRole === tab.id ? '#FFFFFF' : '#334155',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderInlineStart: '2px solid #E2E8F0', marginInlineStart: 8, paddingInlineStart: 14 }}>
          {steps.map((s) => (
            <div key={s.step} style={{ background: '#F8FAFC', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                  ขั้นที่ {s.step}: {s.title}
                </span>
                {s.statusBadge && (
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 6 }}>
                    {s.statusBadge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 1.55 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="dg-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
          2. ผู้ช่วยฝึกอบรมอัตโนมัติ (Interactive Training Agent Q&amp;A)
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
          พิมพ์ค้นหาคำสำคัญ (เช่น &ldquo;ตู้ใกล้สุด&rdquo;, &ldquo;ถุงคืน&rdquo;, &ldquo;OTP&rdquo;, &ldquo;สลิป&rdquo;) หรือคลิกเลือกคำถามด้านล่าง
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <IconSearch size={15} style={{ position: 'absolute', insetInlineStart: 12, color: '#94A3B8', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="พิมพ์คำถามหรือคีย์เวิร์ด เช่น ตู้ใกล้สุด, รับงาน, ถุงคืน, OTP, สลิป..."
            style={{ width: '100%', boxSizing: 'border-box', minHeight: 38, paddingInlineStart: 34, paddingInlineEnd: 12, borderRadius: 9, border: '1px solid #CBD5E1', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {filteredQa.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedQaId(item.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                border: activeQa.id === item.id ? '1px solid #0F172A' : '1px solid #E2E8F0',
                background: activeQa.id === item.id ? '#0F172A' : '#F8FAFC',
                color: activeQa.id === item.id ? '#FFFFFF' : '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {item.question}
            </button>
          ))}
        </div>

        {activeQa && (
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>
              คำแนะนำ: {activeQa.question}
            </div>
            <div style={{ fontSize: 13, color: '#0F172A', lineHeight: 1.6 }}>{activeQa.answer}</div>
          </div>
        )}
      </div>

      <div className="dg-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
          3. โครงสร้างเซิร์ฟเวอร์ &amp; เครือข่ายตู้กดน้ำ 15 สาขา (System &amp; Station Topology)
        </div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.65, background: '#F8FAFC', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}>
          <div>• <strong>Production URL &amp; Webhook:</strong> <code>https://idrink.tamadee.online</code> (Webhook: <code>/line/webhook</code> · LINE OA: <code>@157iywjs</code>)</div>
          <div>• <strong>10 สาขากรุงเทพฯ (ST-01 ถึง ST-10):</strong> สุขุมวิท 50, อ่อนนุช 17, รามอินทรา 57, พุทธบูชา 34, ลาดพร้าว 71, รัชดา-ห้วยขวาง, พหลโยธิน-จตุจักร, บางแค-เพชรเกษม, พระราม 2-ท่าข้าม, ลาดกระบัง-ร่มเกล้า</div>
          <div>• <strong>5 สาขาจังหวัดใหญ่แยกภาค (ST-11 ถึง ST-15):</strong> เชียงใหม่ (เหนือ), ขอนแก่น (อีสาน), ชลบุรี-พัทยา (ตะวันออก), สงขลา-หาดใหญ่ (ใต้), พระนครศรีอยุธยา (กลาง)</div>
        </div>
      </div>
    </div>
  );
};
