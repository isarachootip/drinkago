import React from 'react';
import {
  HOUR_OPTIONS,
  isoDateToThaiLabel,
  MINUTE_OPTIONS,
  normalizeTimeParts,
  thaiLabelToIsoDate,
} from '../domain/thai-datetime';

interface Props {
  eventDate: string;
  eventTime: string;
  onChangeDate: (nextThaiDate: string) => void;
  onChangeTime: (nextTime: string) => void;
  compact?: boolean;
}

export const DateTimeSchedulePicker: React.FC<Props> = ({
  eventDate,
  eventTime,
  onChangeDate,
  onChangeTime,
  compact = false,
}) => {
  const isoDate = thaiLabelToIsoDate(eventDate);
  const { hour, minute } = normalizeTimeParts(eventTime);
  const minuteChoices = MINUTE_OPTIONS.includes(minute) ? MINUTE_OPTIONS : [...MINUTE_OPTIONS, minute].sort();

  const handleDateInput = (nextIso: string) => {
    if (!nextIso) return;
    onChangeDate(isoDateToThaiLabel(nextIso));
  };

  const handleHourChange = (nextHour: string) => {
    onChangeTime(`${nextHour}.${minute}`);
  };

  const handleMinuteChange = (nextMinute: string) => {
    onChangeTime(`${hour}.${nextMinute}`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#F8FAFC', padding: '8px 10px', borderRadius: 10, border: '1px solid #CBD5E1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>📅 เลือกวันที่จากปฏิทิน</label>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6B21A8', background: '#F3E8FF', padding: '2px 8px', borderRadius: 6 }}>
            {eventDate || isoDateToThaiLabel(isoDate)}
          </span>
        </div>
        <input
          type="date"
          value={isoDate}
          onChange={(e) => handleDateInput(e.target.value)}
          style={{
            minHeight: 38,
            padding: '0 10px',
            borderRadius: 8,
            border: '1px solid #9AABBD',
            background: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            color: '#0F2236',
            cursor: 'pointer',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#F8FAFC', padding: '8px 10px', borderRadius: 10, border: '1px solid #CBD5E1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>⏰ เลือกเวลา (ตารางหมุนวน ชั่วโมง : นาที)</label>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0B6E8A', background: '#E0F2FE', padding: '2px 8px', borderRadius: 6 }}>
            {hour}.{minute} น.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            aria-label="ชั่วโมง"
            value={hour}
            onChange={(e) => handleHourChange(e.target.value)}
            style={{
              flex: 1,
              minHeight: 38,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid #9AABBD',
              background: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              color: '#0F2236',
              cursor: 'pointer',
            }}
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h} นาฬิกา
              </option>
            ))}
          </select>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>:</span>
          <select
            aria-label="นาที"
            value={minute}
            onChange={(e) => handleMinuteChange(e.target.value)}
            style={{
              flex: 1,
              minHeight: 38,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid #9AABBD',
              background: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              color: '#0F2236',
              cursor: 'pointer',
            }}
          >
            {minuteChoices.map((m) => (
              <option key={m} value={m}>
                {m} นาที
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
