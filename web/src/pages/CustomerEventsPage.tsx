import React, { useCallback, useEffect, useState } from 'react';
import { eventsApi, MeetupEvent } from '../api/events-api';
import { IconCalendar, IconClock, IconMapPin, IconNavigation, IconPhone } from '../components/icons/Icons';
import {
  classifyEventWindow,
  EventWindowCategory,
  filterAndSortEvents,
  getBangkokTodayIso,
} from '../domain/thai-datetime';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  initialViewMode?: '30d' | 'all';
  onNotify: (msg: string) => void;
}

export const CustomerEventsPage: React.FC<Props> = ({ initialViewMode = '30d', onNotify }) => {
  const { t } = useI18n();
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

  const badgeStyle: Record<EventWindowCategory, { text: string; bg: string; color: string; border: string }> = {
    within_30d: { text: t('eventsBadge30d'), bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
    future_beyond_30d: { text: t('eventsBadgeFuture'), bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    past: { text: t('eventsBadgePast'), bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ background: '#FFFFFF', padding: '16px 16px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
            <IconCalendar size={18} style={{ color: '#1D4ED8' }} />
            <span>{t('eventsTitle')}</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{t('eventsSubtitle')}</div>
        </div>

        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 4 }}>
          <button
            type="button"
            onClick={() => setViewMode('30d')}
            style={{
              flex: 1,
              minHeight: 36,
              border: 'none',
              borderRadius: 8,
              background: viewMode === '30d' ? '#FFFFFF' : 'transparent',
              color: viewMode === '30d' ? '#0F172A' : '#64748B',
              boxShadow: viewMode === '30d' ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('eventsTab30d', { count: win30Events.length })}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            style={{
              flex: 1,
              minHeight: 36,
              border: 'none',
              borderRadius: 8,
              background: viewMode === 'all' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'all' ? '#0F172A' : '#64748B',
              boxShadow: viewMode === 'all' ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('eventsTabAll', { count: sortedAll.length })}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 28, color: '#64748B', fontSize: 13, fontWeight: 500 }}>
            {t('riderLoadingJobs')}
          </div>
        ) : visible.length === 0 ? (
          <div className="dg-card" style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
              {viewMode === '30d' ? t('eventsEmpty30d') : t('eventsEmptyAll')}
            </div>
            {viewMode === '30d' && sortedAll.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('all')}
                style={{ minHeight: 38, borderRadius: 9, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('eventsTabAll', { count: sortedAll.length })}
              </button>
            )}
          </div>
        ) : (
          visible.map((ev) => {
            const cat = classifyEventWindow(ev.eventDate, todayIso);
            const badge = badgeStyle[cat];
            return (
              <div
                key={ev.id}
                className="dg-card"
                style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: cat === 'past' ? 0.76 : 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{ev.title}</div>
                  <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {badge.text}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, fontWeight: 500, color: '#334155' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <IconCalendar size={14} style={{ color: '#64748B' }} />
                    <span>{t('eventsDateLabel')}: {ev.eventDate}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <IconClock size={14} style={{ color: '#64748B' }} />
                    <span className="dg-num">{t('eventsTimeLabel')}: {ev.eventTime}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: '#334155' }}>
                  <IconMapPin size={14} style={{ marginTop: 2, color: '#64748B' }} />
                  <span>{t('eventsLocationLabel')}: <strong style={{ color: '#0F172A' }}>{ev.locationName}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
                  <a href={`tel:${ev.contactPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#0F172A', textDecoration: 'none' }}>
                    <IconPhone size={14} style={{ color: '#64748B' }} />
                    <span className="dg-num">{t('eventsCallPrefix')} {ev.contactPhone}</span>
                  </a>
                  <a href={ev.mapUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: '#0F172A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    <IconNavigation size={13} />
                    <span>{t('eventsMapBtn')}</span>
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
