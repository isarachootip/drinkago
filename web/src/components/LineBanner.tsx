import React, { useEffect, useState } from 'react';
import { eventsApi, MeetupEvent } from '../api/events-api';
import { resolveInitialQueryTab } from '../domain/session-gate';

export const LINE_OA_BASIC_ID = '@157iywjs';
export const LINE_OA_NAME = 'llife';
export const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OA_BASIC_ID}`;
export const LINE_RECOMMEND_OA_URL = `https://line.me/R/nv/recommendOA/${LINE_OA_BASIC_ID}`;

interface Props {
  customerUser: string;
}

export const LineBanner: React.FC<Props> = ({ customerUser }) => {
  const isLinkedRealLine = customerUser.startsWith('U') && customerUser.length > 20;
  const [events, setEvents] = useState<MeetupEvent[]>([]);
  const [showEvents, setShowEvents] = useState<boolean>(() => resolveInitialQueryTab() === 'events');

  useEffect(() => {
    eventsApi.listPublicEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          padding: '10px 14px',
          background: '#E8F8EE',
          border: '1px solid #06C755',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#058C3B' }}>
            💬 LINE OA: {LINE_OA_NAME} ({LINE_OA_BASIC_ID})
          </span>
          <span style={{ fontSize: 11, color: '#2F4358' }}>
            {isLinkedRealLine
              ? `✅ เชื่อมบัญชี LINE แล้ว (${customerUser.slice(0, 8)}...)`
              : 'แอดเพื่อนและทักแชทเพื่อรับรหัส OTP 4 หลักและลิงก์ผูกบัญชีใน LINE'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowEvents((v) => !v)}
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: '1px solid #7C3AED',
              background: showEvents ? '#7C3AED' : '#F3E8FF',
              color: showEvents ? '#FFFFFF' : '#6B21A8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            📅 กิจกรรมพบปะ ({events.length})
          </button>
          <a
            href={LINE_RECOMMEND_OA_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              background: '#FFFFFF',
              border: '1px solid #06C755',
              color: '#058C3B',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            🤝 แชร์ให้เพื่อน
          </a>
          <a
            href={LINE_ADD_FRIEND_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              background: '#06C755',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            เปิดแชท LINE
          </a>
        </div>
      </div>

      {showEvents && (
        <div style={{ background: '#FAF5FF', border: '1px solid #C084FC', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6B21A8' }}>📅 ตารางกิจกรรมพบปะทีม ilife</div>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: '#64748B' }}>ยังไม่มีกำหนดการกิจกรรมพบปะในขณะนี้</div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: 10, border: '1px solid #E9D5FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2236' }}>🗓️ {ev.eventDate} เวลา {ev.eventTime} น.</div>
                  <div style={{ fontSize: 12, color: '#33475B' }}>📍 สถานที่: <b>{ev.locationName}</b></div>
                  <div style={{ fontSize: 12, color: '#0B6E8A', fontWeight: 600 }}>📞 โทร: <a href={`tel:${ev.contactPhone}`} style={{ color: '#0B6E8A' }}>{ev.contactPhone}</a></div>
                </div>
                <a
                  href={ev.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '6px 12px', borderRadius: 8, background: '#7C3AED', color: '#FFFFFF', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  🗺️ แผนที่ Google Maps
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
