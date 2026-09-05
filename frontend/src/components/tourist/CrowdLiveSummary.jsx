import React from 'react';
import { useTranslation } from 'react-i18next';
import { getShrineImage } from '../../utils/shrineImages';

export default function CrowdLiveSummary({ site, density, onJumpToDetails, onBrowseShrines }) {
  const { t } = useTranslation();
  if (!site) return null;

  const occupancy = density?.occupancy_percentage ?? 0;
  let status = density?.status || 'NORMAL';
  if (occupancy >= 90) status = 'CRITICAL';
  else if (occupancy >= 75) status = 'HIGH';
  else if (occupancy >= 50) status = 'MODERATE';
  else status = 'NORMAL';

  const statusClass = `status-${status.toLowerCase()}`;
  const shrineImg = getShrineImage(site.id);
  const peopleCount = density?.people_count ?? 0;
  const capacity = site.capacity || density?.capacity || 10000;
  const waitMins = density?.wait_time_minutes || Math.max(15, Math.round((occupancy / 100) * 120));

  return (
    <div className="crowd-live-summary-card">
      <div className="summary-card-inner">
        {/* Left Thumbnail with Live Dot */}
        <div className="summary-thumb-wrap">
          <img
            src={shrineImg}
            alt={site.name}
            className="summary-thumb-img"
            loading="lazy"
          />
          <span className="summary-live-badge">
            <span className="live-radar-dot"></span> LIVE
          </span>
        </div>

        {/* Center Details */}
        <div className="summary-info-wrap">
          <div className="summary-label-row">
            <span className="summary-monitoring-tag">{t('crowdSummary.monitoring')}</span>
            <span className={`status-badge-chip ${statusClass}`}>
              <span className="badge-bullet"></span>
              {status}
            </span>
          </div>

          <h2 className="summary-shrine-name">{site.name}</h2>
          <p className="summary-shrine-loc">
            📍 {site.city || site.state || 'Sacred Pilgrimage Destination'}
          </p>

          <div className="summary-metrics-row">
            <div className="metric-pill">
              <span className="metric-label">{t('crowdSummary.occupancy')}</span>
              <strong className="metric-value">{occupancy}% {t('crowdSummary.full')}</strong>
            </div>

            <div className="metric-pill">
              <span className="metric-label">{t('crowdSummary.liveCount')}</span>
              <strong className="metric-value">{peopleCount.toLocaleString()}</strong>
            </div>

            <div className="metric-pill">
              <span className="metric-label">{t('crowdSummary.safeCap')}</span>
              <strong className="metric-value">{capacity.toLocaleString()}</strong>
            </div>

            <div className="metric-pill">
              <span className="metric-label">{t('crowdSummary.estWait')}</span>
              <strong className="metric-value">⏱️ ~{waitMins} min</strong>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="summary-actions-wrap">
          <button
            type="button"
            className="btn-summary-jump"
            onClick={onJumpToDetails}
          >
            <span>📊</span>
            <span>{t('crowdSummary.jumpToDetails')}</span>
          </button>
          <button
            type="button"
            className="btn-summary-browse"
            onClick={onBrowseShrines}
          >
            <span>🏛️</span>
            <span>{t('grid.all')} (25)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
