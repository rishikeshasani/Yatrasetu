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

  const SOURCE_CONFIG = {
    yolo_video: { label: 'YOLO Video', icon: '📹', badgeClass: 'source-yolo' },
    live_telemetry: { label: 'Live Telemetry', icon: '⚡', badgeClass: 'source-live' },
    demo_simulation: { label: 'Demo Simulation', icon: '📊', badgeClass: 'source-demo' },
    historical_baseline: { label: 'Historical Baseline', icon: '📈', badgeClass: 'source-hist' },
    historical: { label: 'Historical Baseline', icon: '📈', badgeClass: 'source-hist' },
  };

  const rawSource = density?.source || 'demo_simulation';
  const sourceInfo = SOURCE_CONFIG[rawSource] || SOURCE_CONFIG.demo_simulation;

  return (
    <div className={`shrine-grid-card ${isSelected ? 'card-selected' : ''}`}>
      {/* Media Box */}
      <div
        className="card-media-wrap"
        onClick={() => onViewDetails(site)}
        style={{ cursor: 'pointer' }}
        title="Click to view detailed darshan & safety profile"
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
          {status}
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
        <h3
          className="card-shrine-title"
          onClick={() => onViewDetails(site)}
          title={site.name}
        >
          {site.name}
        </h3>

        <p className="card-shrine-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{site.city || site.state || 'India'}</span>
        </p>

        {/* Progress bar */}
        <div className="card-occupancy-bar-track">
          <div
            className={`card-occupancy-bar-fill fill-${status.toLowerCase()}`}
            style={{ width: `${Math.min(100, occupancy)}%` }}
          ></div>
        </div>

        <div className="card-meta-row">
          <span className="meta-cap">
            ⏱️ Wait: <strong>~{waitMins} min</strong>
          </span>
          <span
            className={`source-badge-pill ${sourceInfo.badgeClass}`}
            title={`Authoritative Data Source: ${sourceInfo.label}`}
          >
            {sourceInfo.icon} {sourceInfo.label}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 600, color: status === 'CRITICAL' ? '#DC2626' : status === 'HIGH' ? '#EA580C' : status === 'MODERATE' ? '#D97706' : '#059669' }}>
            {status === 'NORMAL' ? '✨ Peaceful' : status === 'MODERATE' ? '⚡ Steady Flow' : status === 'HIGH' ? '⚠️ High Rush' : '🚨 Heavy Congestion'}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
            Cap: {site.capacity ? site.capacity.toLocaleString() : 'N/A'}
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
          <span>{isSelected ? 'Monitoring' : t('grid.monitorLive')}</span>
        </button>
      </div>
    </div>
  );
}
