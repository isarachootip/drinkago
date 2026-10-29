import React, { useCallback, useEffect, useState } from 'react';
import { eventsApi, MeetupEvent } from '../api/events-api';
import {
  classifyEventWindow,
  EventWindowCategory,
  filterAndSortEvents,
  getBangkokTodayIso,
} from '../domain/thai-datetime';

interface Props {
  initialViewMode?: '30d' | 'all';
  onBackToShop: () => void;
  onNotify: (msg: string) => void;
}

const BADGE_STYLE: Record<EventWindowCategory, { text: string; bg: string; color: string }> = {
  within_30d: { text: '🟢 ในช่วง 1 เดือนนี้', bg: '#DCFCE7', color: '#15803D' },
  future_beyond_30d: { text: '🔵 กำหนดการล่วงหน้า', bg: '#DBEAFE', color: '#1D4ED8' },
  past: { text: '⚪ จัดผ่านไปแล้ว', bg: '#F1F5F9', color: '#64748B' },
};

export const CustomerEventsPage: React.FC<Props> = ({ initialViewMode = '30d', onBackToShop, onNotify }) => {
  const [allEvents, setAllEvents] = useState<MeetupEvent[]>([]);
  const [viewMode, setViewMode] = useState<'30d' | 'all'>(initialViewMode);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      setAllEvents(await eventsApi.listPublicEvents('all'));
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'ดึงข้อมูลตารางกิจกรรมไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const todayIso = getBangkokTodayIso();
  const win30Events = filterAndSortEvents(allEvents, '30d', todayIso);
  const sortedAll = filterAndSortEvents(allEvents, 'all', todayIso);
  const visible = viewMode === '30d' ? win30Events : sortedAll;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '16px 16px 12px', borderBottom: '1px solid #DCE4EC', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#7C3AED' }}>📅 กิจกรรมพบปะทีม ilife</div>
            <div style={{ fontSize: 12, color: '#4A5B6E' }}>ตารางนัดพบปะสมาชิก วัน เวลา สถานที่ และแผนที่นำทาง</div>
          </div>
          <button type="button" onClick={onBackToShop} style={{ padding: '7px 12px', borderRadius: 12, border: '1px solid #1A56B0', background: '#E6EEF9', color: '#1A56B0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            💧 สั่งน้ำดื่ม
          </button>
        </div>

        <div style={{ display: 'flex', background: '#F3F7FA', borderRadius: 12, padding: 3, gap: 4 }}>
          <button
            type="button"
            onClick={() => setViewMode('30d')}
            style={{
              flex: 1, minHeight: 38, border: 'none', borderRadius: 10,
              background: viewMode === '30d' ? '#7C3AED' : 'transparent',
              color: viewMode === '30d' ? '#FFFFFF' : '#4A5B6E',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            📅 ใน 1 เดือนนี้ ({win30Events.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            style={{
              flex: 1, minHeight: 38, border: 'none', borderRadius: 10,
              background: viewMode === 'all' ? '#0F2236' : 'transparent',
              color: viewMode === 'all' ? '#FFFFFF' : '#4A5B6E',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            📋 ตารางทั้งหมด ({sortedAll.length})
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#64748B', fontWeight: 600 }}>กำลังโหลดตารางกิจกรรมพบปะ...</div>
        ) : visible.length === 0 ? (
          <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #DCE4EC', padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>
              {viewMode === '30d' ? 'ขณะนี้ยังไม่มีกำหนดการกิจกรรมพบปะในช่วง 1 เดือนข้างหน้า' : 'ยังไม่มีรายการตารางกิจกรรมพบปะ'}
            </div>
            {viewMode === '30d' && sortedAll.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('all')}
                style={{ minHeight: 40, borderRadius: 10, border: 'none', background: '#7C3AED', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                📋 ดูตารางกิจกรรมทั้งหมด ({sortedAll.length} รายการ)
              </button>
            )}
          </div>
        ) : (
          visible.map((ev) => {
            const cat = classifyEventWindow(ev.eventDate, todayIso);
            const badge = BADGE_STYLE[cat];
            return (
              <div key={ev.id} style={{ background: '#FFFFFF', borderRadius: 14, border: cat === 'within_30d' ? '2px solid #C084FC' : '1px solid #DCE4EC', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, opacity: cat === 'past' ? 0.78 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F2236' }}>{ev.title}</div>
                  <span style={{ background: badge.bg, color: badge.color, padding: '3px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {badge.text}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: '#0F2236' }}>🗓️ วันที่: {ev.eventDate}</span>
                  <span style={{ color: '#7C3AED' }}>⏰ เวลา: {ev.eventTime} น.</span>
                </div>
                <div style={{ fontSize: 13, color: '#33475B' }}>📍 สถานที่: <b>{ev.locationName}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
                  <a href={`tel:${ev.contactPhone}`} style={{ fontSize: 13, fontWeight: 700, color: '#0B6E8A', textDecoration: 'none' }}>
                    📞 โทร {ev.contactPhone}
                  </a>
                  <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 10, background: '#7C3AED', color: '#FFFFFF', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    🗺️ แผนที่สถานที่จัดงาน
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
