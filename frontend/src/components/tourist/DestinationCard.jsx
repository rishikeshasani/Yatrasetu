import React from 'react';
import { useTranslation } from 'react-i18next';
import { getShrineImage, getShrineCategory } from '../../utils/shrineImages';

export default function DestinationCard({
  site,
  density,
  isSelected,
  onSelect,
  onViewDetails
}) {
  const { t } = useTranslation();
  const shrineImg = getShrineImage(site.id);
  const category = getShrineCategory(site.id, site.name);

  const occupancy = density?.occupancy_percentage ?? 0;
  let status = density?.status;
  if (!status) {
    if (occupancy >= 90) status = 'CRITICAL';
    else if (occupancy >= 75) status = 'HIGH';
    else if (occupancy >= 50) status = 'MODERATE';
    else status = 'NORMAL';
  }

  const statusClass = `status-${status.toLowerCase()}`;
  const waitMins = density?.wait_time_minutes != null ? density.wait_time_minutes : Math.max(15, Math.round((occupancy / 100) * 120));
  const capacity = site.capacity || density?.capacity || 10000;
  const peopleCount = density?.people_count != null ? density.people_count : Math.round(capacity * (occupancy / 100));

  const SOURCE_CONFIG = {
    fused_yolo_gps: { label: 'Multi-Source Fusion — YOLO + GPS', icon: '⚡', badgeClass: 'source-fused' },
    yolo_video: { label: 'YOLO Video Headcount', icon: '📹', badgeClass: 'source-yolo' },
    gps_crowd: { label: 'Mobile GPS Crowd Signal', icon: '📡', badgeClass: 'source-gps' },
    gps_crowd_demo: { label: 'Mobile GPS Crowd Signal (Demo)', icon: '📡', badgeClass: 'source-demo' },
    live_telemetry: { label: 'Live Telemetry', icon: '⚡', badgeClass: 'source-live' },
    demo_simulation: { label: 'Demo Simulation — no live source currently available', icon: '📊', badgeClass: 'source-demo' },
    historical_baseline: { label: 'Historical Baseline', icon: '📈', badgeClass: 'source-hist' },
    historical: { label: 'Historical Baseline', icon: '📈', badgeClass: 'source-hist' },
  };

  const rawSource = density?.source || 'demo_simulation';
  const sourceInfo = SOURCE_CONFIG[rawSource] || SOURCE_CONFIG.demo_simulation;

  return (
    <div
      className={`shrine-grid-card ${isSelected ? 'card-selected' : ''}`}
      onClick={() => onSelect(site.id)}
      style={{ cursor: 'pointer' }}
    >
      {/* Media Box */}
      <div
        className="card-media-wrap"
        onClick={() => onSelect(site.id)}
        style={{ cursor: 'pointer' }}
        title="Click to select and monitor live shrine"
      >
        <img
          src={shrineImg}
          alt={site.name}
          className="card-shrine-img"
          loading="lazy"
        />
        <div className="card-media-gradient"></div>

        {/* Top Floating Badges */}
        <span className="card-category-badge">{category}</span>
        <span className={`card-status-badge ${statusClass}`}>
          <span className="badge-bullet"></span>
          {t(`crowdSummary.${status.toLowerCase()}`, status)}
        </span>

        {/* Bottom Overlay Info */}
        <div className="card-media-bottom">
          <span className="card-wait-pill">
            ⏱️ ~{waitMins} min
          </span>
          <span className="card-occupancy-pill">
            {occupancy}% {t('grid.full')}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#D97706', letterSpacing: '0.05em' }}>
            [{site.id}]
          </span>
          <p className="card-shrine-location" style={{ margin: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{site.city || site.state || 'India'}</span>
          </p>
        </div>

        <h3
          className="card-shrine-title"
          onClick={() => onViewDetails(site)}
          title={site.name}
        >
          {site.name}
        </h3>

        {/* Headcount & Capacity / Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.35rem 0 0.25rem', fontSize: '0.8rem' }}>
          <span style={{ color: '#334155', fontWeight: 700 }}>
            👥 {peopleCount.toLocaleString()} / {capacity.toLocaleString()} people
          </span>
          <span style={{ fontWeight: 800, color: status === 'CRITICAL' ? '#DC2626' : status === 'HIGH' ? '#EA580C' : status === 'MODERATE' ? '#D97706' : '#059669' }}>
            {occupancy}% {status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="card-occupancy-bar-track">
          <div
            className={`card-occupancy-bar-fill fill-${status.toLowerCase()}`}
            style={{ width: `${Math.min(100, occupancy)}%` }}
          ></div>
        </div>

        <div className="card-meta-row" style={{ marginTop: '0.35rem' }}>
          <span className="meta-cap">
            ⏱️ Wait: <strong>~{waitMins} min</strong>
          </span>
          <span
            className={`source-badge-pill ${sourceInfo.badgeClass}`}
            title={`Authoritative Data Source: ${sourceInfo.label}`}
            style={{ maxWidth: '175px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}
          >
            {sourceInfo.icon} {sourceInfo.label}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 600, color: status === 'CRITICAL' ? '#DC2626' : status === 'HIGH' ? '#EA580C' : status === 'MODERATE' ? '#D97706' : '#059669' }}>
            {status === 'NORMAL' ? '✨ Peaceful' : status === 'MODERATE' ? '⚡ Steady Flow' : status === 'HIGH' ? '⚠️ High Rush' : '🚨 Heavy Congestion'}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Cap: {capacity.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="card-actions-row">
        <button
          type="button"
          className="btn-card-details"
          onClick={() => onViewDetails(site)}
          title="View Telemetry & Safety Profile"
        >
          <span>🔍</span>
          <span>{t('grid.viewDetails')}</span>
        </button>

        <button
          type="button"
          className={`btn-card-monitor ${isSelected ? 'is-active-monitored' : ''}`}
          onClick={() => onSelect(site.id)}
          title="Set as Active Monitoring Shrine"
        >
          <span>{isSelected ? '✓' : '⚡'}</span>
          <span>{isSelected ? t('crowdSummary.monitoring', 'Monitoring') : t('grid.monitorLive', 'Monitor Live')}</span>
        </button>
      </div>
    </div>
  );
}
