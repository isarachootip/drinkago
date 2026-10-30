import React from 'react';
import {
  HOUR_OPTIONS,
  isoDateToThaiLabel,
  MINUTE_OPTIONS,
  normalizeTimeParts,
  thaiLabelToIsoDate,
} from '../domain/thai-datetime';
import { IconCalendar, IconClock } from './icons/Icons';

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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, background: '#F8FAFC', padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            <IconCalendar size={13} />
            <span>เลือกวันที่จากปฏิทิน</span>
          </label>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 8px', borderRadius: 6 }}>
            {eventDate || isoDateToThaiLabel(isoDate)}
          </span>
        </div>
        <input
          type="date"
          value={isoDate}
          onChange={(e) => handleDateInput(e.target.value)}
          className="dg-num"
          style={{ minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, background: '#F8FAFC', padding: '8px 10px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            <IconClock size={13} />
            <span>เลือกเวลา (ชั่วโมง : นาที)</span>
          </label>
          <span className="dg-num" style={{ fontSize: 11, fontWeight: 600, color: '#0369A1', background: '#F0F9FF', padding: '2px 8px', borderRadius: 6 }}>
            {hour}.{minute} น.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            aria-label="ชั่วโมง"
            value={hour}
            onChange={(e) => onChangeTime(`${e.target.value}.${minute}`)}
            className="dg-num"
            style={{ flex: 1, minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>{h} นาฬิกา</option>
            ))}
          </select>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#64748B' }}>:</span>
          <select
            aria-label="นาที"
            value={minute}
            onChange={(e) => onChangeTime(`${hour}.${e.target.value}`)}
            className="dg-num"
            style={{ flex: 1, minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
          >
            {minuteChoices.map((m) => (
              <option key={m} value={m}>{m} นาที</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
