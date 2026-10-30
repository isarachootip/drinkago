import React from 'react';
import { RiderJob } from '../api/schemas';
import { buildCustomerMapsUrl, buildStationMapsUrl } from '../domain/navigation';
import { RiderTargetLocation } from '../domain/rider-steps';
import { useI18n } from '../i18n/I18nContext';
import { IconCheck } from './icons/ActionIcons';
import { IconDroplet, IconHome, IconMapPin, IconNavigation, IconPhone } from './icons/Icons';

interface Props {
  job: RiderJob;
  targetLocation: RiderTargetLocation;
}

export const RiderMapNavBox: React.FC<Props> = ({ job, targetLocation }) => {
  const { t } = useI18n();
  const stationHighlight = targetLocation === 'station';
  const customerHighlight = targetLocation === 'customer';
  const stationMapsUrl = buildStationMapsUrl(job.station);
  const customerMaps = buildCustomerMapsUrl(job.address);

  return (
    <div
      style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: '#0F172A',
          }}
        >
          <IconNavigation size={14} style={{ color: stationHighlight ? '#1D4ED8' : '#059669' }} />
          <span>{stationHighlight ? t('navHeaderToStation') : t('navHeaderToCustomer')}</span>
        </span>
        {job.customerPhone && (
          <a
            href={`tel:${job.customerPhone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#0F172A',
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              padding: '5px 10px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            <IconPhone size={13} />
            <span>{t('navCallCustomer')}</span>
          </a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stationMapsUrl && (
          <a
            href={stationMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: '1 1 140px',
              minHeight: 42,
              borderRadius: 10,
              background: stationHighlight ? '#0F172A' : '#FFFFFF',
              color: stationHighlight ? '#FFFFFF' : '#64748B',
              border: stationHighlight ? '1px solid #0F172A' : '1px solid #E2E8F0',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              textAlign: 'center',
              padding: '6px 10px',
            }}
          >
            {stationHighlight ? <IconDroplet size={14} /> : <IconCheck size={14} />}
            <span>{stationHighlight ? t('navBtnToStationActive') : t('navBtnStationDone')}</span>
          </a>
        )}

        <a
          href={customerMaps.url}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: '1 1 140px',
            minHeight: 42,
            borderRadius: 10,
            background: customerHighlight ? '#1D4ED8' : '#FFFFFF',
            color: customerHighlight ? '#FFFFFF' : '#64748B',
            border: customerHighlight ? '1px solid #1D4ED8' : '1px solid #E2E8F0',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            textAlign: 'center',
            padding: '6px 10px',
          }}
        >
          <IconHome size={14} />
          <span>{customerHighlight ? t('navBtnToCustomerActive') : t('navBtnCustomerWait')}</span>
        </a>
      </div>

      {customerMaps.mode === 'address_query' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: '#92400E',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <IconMapPin size={13} />
          <span>{t('navNoGpsFallbackNote')}</span>
        </div>
      )}
    </div>
  );
};
