import React, { useMemo, useState } from 'react';
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
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #DCE4EC', padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-block', background: '#E6F4EA', color: '#1E7B45', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, marginBottom: 6 }}>
            🎓 Interactive Training Agent & KM
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F2236' }}>
            Knowledge Management (KM) & คู่มือปฏิบัติงานแยกตามบทบาท
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4A5B6E' }}>
            ศูนย์รวมขั้นตอนการใช้งานระบบ Drink&Go Delivery, การแนะนำตู้กดน้ำ 15 สาขา, บัญชีถุงเดินสะพัด และผู้ช่วยตอบคำถามอัตโนมัติ
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #DCE4EC', background: '#F8FAFC', color: '#0F2236', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ✕ ปิดหน้าคู่มือ
          </button>
        )}
      </div>

      {/* 4 Summary Cards (ODM KM Style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {KM_SUMMARY_CARDS.map((card) => (
          <div key={card.title} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', borderTop: `4px solid ${card.accent}`, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: card.accent }}>{card.badge}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2236', marginTop: 4 }}>{card.title}</div>
            <div style={{ fontSize: 12, color: '#4A5B6E', marginTop: 4, lineHeight: 1.45 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Role-Based Step-by-Step Training Guide */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #DCE4EC', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2236' }}>
            1. ลำดับขั้นตอนการทำงานแยกตามบทบาท (Role-Based Workflow)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { id: 'customer', label: '👤 ลูกค้า (Customer)' },
              { id: 'rider', label: '🛵 ไรเดอร์ (Rider)' },
              { id: 'admin', label: '⚙️ แอดมิน (Admin)' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRole(tab.id)}
                style={{
                  minHeight: 36,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: activeRole === tab.id ? 'none' : '1px solid #CBD5E1',
                  background: activeRole === tab.id ? '#1A56B0' : '#F8FAFC',
                  color: activeRole === tab.id ? '#FFFFFF' : '#33475B',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '3px solid #BFD7ED', marginLeft: 12, paddingLeft: 16 }}>
          {steps.map((s) => (
            <div key={s.step} style={{ position: 'relative', background: '#F8FAFC', borderRadius: 12, padding: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0F2236' }}>
                  ขั้นที่ {s.step}: {s.title}
                </span>
                {s.statusBadge && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#E6EEF9', color: '#123F85', padding: '2px 8px', borderRadius: 6 }}>
                    {s.statusBadge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#33475B', marginTop: 6, lineHeight: 1.5 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Training Agent Q&A & Troubleshooting */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #DCE4EC', padding: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2236', marginBottom: 4 }}>
          2. 🤖 ผู้ช่วยฝึกอบรมอัตโนมัติ (Interactive Training Agent Q&A)
        </div>
        <div style={{ fontSize: 12, color: '#4A5B6E', marginBottom: 12 }}>
          พิมพ์ค้นหาคำสำคัญ (เช่น &ldquo;ตู้ใกล้สุด&rdquo;, &ldquo;ถุงคืน&rdquo;, &ldquo;OTP&rdquo;, &ldquo;สลิป&rdquo;) หรือคลิกเลือกคำถามเพื่อให้ Training Agent แนะนำวิธีปฏิบัติทันที
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 พิมพ์คำถามหรือคีย์เวิร์ด เช่น ตู้ใกล้สุด, รับงาน, ถุงคืน, OTP, สลิป..."
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #9AABBD', fontSize: 13, marginBottom: 12 }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {filteredQa.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedQaId(item.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: activeQa.id === item.id ? 'none' : '1px solid #CBD5E1',
                background: activeQa.id === item.id ? '#0B6E8A' : '#F8FAFC',
                color: activeQa.id === item.id ? '#FFFFFF' : '#0F2236',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              💬 {item.question}
            </button>
          ))}
        </div>

        {activeQa && (
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0369A1', marginBottom: 6 }}>
              🤖 คำแนะนำจาก Training Agent: {activeQa.question}
            </div>
            <div style={{ fontSize: 13, color: '#0F2236', lineHeight: 1.55 }}>{activeQa.answer}</div>
          </div>
        )}
      </div>

      {/* Domain & 15 Water Stations Topology */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #DCE4EC', padding: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F2236', marginBottom: 10 }}>
          3. โครงสร้างเซิร์ฟเวอร์ & เครือข่ายตู้กดน้ำ 15 สาขา (System & Station Topology)
        </div>
        <div style={{ fontSize: 12, color: '#33475B', lineHeight: 1.6, background: '#F8FAFC', padding: 12, borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div>• <b>Production URL & Webhook:</b> <code>https://idrink.tamadee.online</code> (Webhook: <code>/line/webhook</code> · LINE OA: <code>@157iywjs</code>)</div>
          <div>• <b>10 สาขากรุงเทพฯ (ST-01 ถึง ST-10):</b> สุขุมวิท 50, อ่อนนุช 17, <b>รามอินทรา 57</b>, <b>พุทธบูชา 34</b>, ลาดพร้าว 71, รัชดา-ห้วยขวาง, พหลโยธิน-จตุจักร, บางแค-เพชรเกษม, พระราม 2-ท่าข้าม, ลาดกระบัง-ร่มเกล้า</div>
          <div>• <b>5 สาขาจังหวัดใหญ่แยกภาค (ST-11 ถึง ST-15):</b> เชียงใหม่ (เหนือ), ขอนแก่น (อีสาน), ชลบุรี-พัทยา (ตะวันออก), สงขลา-หาดใหญ่ (ใต้), พระนครศรีอยุธยา (กลาง)</div>
        </div>
      </div>
    </div>
  );
};
