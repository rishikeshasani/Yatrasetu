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

  // Calculate qualitative crowd level: Low, Medium, High, Very High
  let levelLabel = 'Low';
  let levelColor = '#059669';

  if (occupancy >= 85 || status === 'CRITICAL') {
    levelLabel = 'Very High';
    levelColor = '#DC2626';
  } else if (occupancy >= 70 || status === 'HIGH') {
    levelLabel = 'High';
    levelColor = '#EA580C';
  } else if (occupancy >= 40 || status === 'MODERATE') {
    levelLabel = 'Medium';
    levelColor = '#D97706';
  } else {
    levelLabel = 'Low';
    levelColor = '#059669';
  }

  const statusClass = `status-${status.toLowerCase()}`;
  const waitMins = density?.wait_time_minutes != null ? density.wait_time_minutes : Math.max(15, Math.round((occupancy / 100) * 120));

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
          {levelLabel.toUpperCase()}
        </span>

        {/* Bottom Overlay Info */}
        <div className="card-media-bottom">
          <span className="card-wait-pill">
            ⏱️ ~{waitMins} min
          </span>
          <span className="card-occupancy-pill">
            {levelLabel} Crowd
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
          onClick={(e) => {
            if (onViewDetails) {
              e.stopPropagation();
              onViewDetails(site);
            }
          }}
          title={site.name}
        >
          {site.name}
        </h3>

        {/* Qualitative Crowd Level (No numerical counts/capacity revealed) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.35rem 0 0.25rem', fontSize: '0.82rem' }}>
          <span style={{ color: '#334155', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            👥 Crowd Level:
          </span>
          <span style={{ fontWeight: 800, color: levelColor, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {levelLabel}
          </span>
        </div>

        {/* Progress bar */}
        <div className="card-occupancy-bar-track">
          <div
            className={`card-occupancy-bar-fill fill-${status.toLowerCase()}`}
            style={{ width: `${Math.min(100, occupancy)}%` }}
          ></div>
        </div>

        <div className="card-meta-row" style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="meta-cap">
            ⏱️ Est. Wait: <strong>~{waitMins} min</strong>
          </span>
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
            ⚡ Real-Time
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 600, color: levelColor }}>
            {levelLabel === 'Low' ? '✨ Peaceful' : levelLabel === 'Medium' ? '⚡ Steady Flow' : levelLabel === 'High' ? '⚠️ High Rush' : '🚨 Heavy Congestion'}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
            Live Monitored
          </span>
        </div>
      </div>

      {/* Card Actions - Full-width rectangular Monitor Live button */}
      <div className="card-actions-row">
        <button
          type="button"
          className={`btn-card-monitor ${isSelected ? 'is-active-monitored' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(site.id);
          }}
          title="Set as Active Monitoring Shrine"
        >
          <span style={{ fontSize: '1rem' }}>{isSelected ? '✓' : '⚡'}</span>
          <span>{isSelected ? t('crowdSummary.monitoring', 'Currently Monitoring') : t('grid.monitorLive', 'Monitor Live')}</span>
        </button>
      </div>
    </div>
  );
}
