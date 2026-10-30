import React, { useEffect, useState } from 'react';
import { eventsApi, MeetupEvent } from '../api/events-api';
import { resolveInitialQueryTab } from '../domain/session-gate';
import { useI18n } from '../i18n/I18nContext';
import { IconCalendar, IconLineChat, IconMapPin, IconNavigation, IconPhone } from './icons/Icons';

export const LINE_OA_BASIC_ID = '@157iywjs';
export const LINE_OA_NAME = 'ilife';
export const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OA_BASIC_ID}`;
export const LINE_RECOMMEND_OA_URL = `https://line.me/R/nv/recommendOA/${LINE_OA_BASIC_ID}`;

interface Props {
  customerUser: string;
}

export const LineBanner: React.FC<Props> = ({ customerUser }) => {
  const { t } = useI18n();
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
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
            <IconLineChat size={15} style={{ color: '#06C755' }} />
            <span>LINE OA: {LINE_OA_NAME} ({LINE_OA_BASIC_ID})</span>
          </span>
          <span style={{ fontSize: 11, color: '#64748B' }}>
            {isLinkedRealLine
              ? t('lineOaLinked', { id: `${customerUser.slice(0, 8)}...` })
              : t('lineOaAddHint')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowEvents((v) => !v)}
            className="dg-btn-icon"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              background: showEvents ? '#0F172A' : '#FFFFFF',
              color: showEvents ? '#FFFFFF' : '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <IconCalendar size={13} />
            <span>{t('lineOaEventsBtn', { count: events.length })}</span>
          </button>
          <a
            href={LINE_RECOMMEND_OA_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {t('lineOaShareBtn')}
          </a>
          <a
            href={LINE_ADD_FRIEND_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 8,
              background: '#06C755',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <IconLineChat size={13} />
            <span>{t('lineOaOpenChat')}</span>
          </a>
        </div>
      </div>

      {showEvents && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            <IconCalendar size={14} />
            <span>{t('eventsTitle')}</span>
          </div>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: '#64748B' }}>{t('eventsEmpty30d')}</div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} style={{ background: '#FFFFFF', borderRadius: 10, padding: 10, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{ev.eventDate} · {ev.eventTime}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                    <IconMapPin size={12} />
                    <span>{ev.locationName}</span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>
                    <IconPhone size={12} />
                    <a href={`tel:${ev.contactPhone}`} style={{ color: '#1D4ED8', textDecoration: 'none' }}>{ev.contactPhone}</a>
                  </div>
                </div>
                <a
                  href={ev.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#0F172A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                >
                  <IconNavigation size={12} />
                  <span>{t('eventsMapBtn')}</span>
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
