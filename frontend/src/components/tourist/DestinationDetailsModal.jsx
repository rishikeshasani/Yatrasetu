import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getShrineImage, getShrineCategory } from '../../utils/shrineImages';
import { fetchSafetyInfo } from '../../api/api';

export default function DestinationDetailsModal({
  site,
  density,
  isOpen,
  onClose,
  onSelectForMonitoring
}) {
  const { t } = useTranslation();
  const [safety, setSafety] = useState(null);

  useEffect(() => {
    if (!site?.id || !isOpen) return;
    let isMounted = true;
    fetchSafetyInfo(site.id).then((info) => {
      if (isMounted) setSafety(info);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [site?.id, isOpen]);

  if (!isOpen || !site) return null;

  const shrineImg = getShrineImage(site.id);
  const category = getShrineCategory(site.id, site.name);

  const occupancy = density?.occupancy_percentage ?? 0;
  let status = density?.status || 'NORMAL';
  if (occupancy >= 90) status = 'CRITICAL';
  else if (occupancy >= 75) status = 'HIGH';
  else if (occupancy >= 50) status = 'MODERATE';
  else status = 'NORMAL';

  const statusClass = `status-${status.toLowerCase()}`;
  const waitMins = density?.wait_time_minutes || Math.max(15, Math.round((occupancy / 100) * 120));
  const peopleCount = density?.people_count ?? 0;
  const capacity = site.capacity || density?.capacity || 10000;

  return (
    <div className="destination-modal-backdrop" onClick={onClose}>
      <div
        className="destination-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-shrine-title"
      >
        {/* Header Hero Banner */}
        <div className="modal-hero-banner" style={{ backgroundImage: `url(${shrineImg})` }}>
          <div className="modal-hero-gradient"></div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('details.close')}
          >
            ✕
          </button>

          <div className="modal-hero-header-content">
            <div className="modal-badge-row">
              <span className="modal-category-pill">{category}</span>
              <span className={`status-badge-chip ${statusClass}`}>
                <span className="badge-bullet"></span>
                {status}
              </span>
              <span className="modal-occupancy-pill">{occupancy}% Full</span>
            </div>
            <h2 id="modal-shrine-title" className="modal-title">{site.name}</h2>
            <p className="modal-location-subtitle">
              📍 {site.city || site.state || 'Sacred Destination'}
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body-scroll">
          {/* Key Metrics Grid */}
          <div className="modal-section">
            <h4 className="modal-section-heading">🧭 Darshan &amp; Queue Guidance</h4>
            <div className="modal-telemetry-grid">
              <div className="modal-metric-card">
                <span className="metric-icon">👥</span>
                <div className="metric-info">
                  <span className="m-label">Crowd Condition</span>
                  <strong className="m-val">{status === 'NORMAL' ? 'Peaceful Flow' : status === 'MODERATE' ? 'Moderate Flow' : status === 'HIGH' ? 'Heavy Rush' : 'Peak Congestion'}</strong>
                </div>
              </div>

              <div className="modal-metric-card">
                <span className="metric-icon">🏛️</span>
                <div className="metric-info">
                  <span className="m-label">Queue Flow</span>
                  <strong className="m-val">{status === 'NORMAL' ? 'Smooth Movement' : status === 'MODERATE' ? 'Steady Token System' : 'Priority Counters Active'}</strong>
                </div>
              </div>

              <div className="modal-metric-card">
                <span className="metric-icon">⏱️</span>
                <div className="metric-info">
                  <span className="m-label">{t('details.currentWait')}</span>
                  <strong className="m-val">~{waitMins} mins wait</strong>
                </div>
              </div>

              <div className="modal-metric-card">
                <span className="metric-icon">🌅</span>
                <div className="metric-info">
                  <span className="m-label">{t('details.darshanTimings')}</span>
                  <strong className="m-val">{site.darshan_timings || '05:00 AM - 09:30 PM'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Darshan & Crowd Status Context */}
          <div className="modal-section">
            <h4 className="modal-section-heading">✨ Recommended Darshan Window</h4>
            <div className={`modal-status-callout ${statusClass}`}>
              <div className="callout-header">
                <strong>Current Condition: {status === 'NORMAL' ? 'Low Crowd • Ideal Time' : status === 'MODERATE' ? 'Moderate Flow' : status === 'HIGH' ? 'Heavy Rush' : 'Peak Congestion'}</strong>
              </div>
              <p className="callout-text">
                {status === 'CRITICAL' && '⚠️ Extreme congestion alert. Queue wait exceeds peak limits. AI recommends taking the alternate route below.'}
                {status === 'HIGH' && '⚠️ High rush active. Darshan lines extend into approach sectors. Consider visiting in off-peak afternoon hours.'}
                {status === 'MODERATE' && '✨ Moderate steady footfall. Moving queue token system active. Darshan is comfortable.'}
                {status === 'NORMAL' && '✨ Peaceful sanctum conditions. Low queue wait. Ideal window for senior citizens and families.'}
              </p>
            </div>
          </div>

          {/* Safety and Emergency Section */}
          <div className="modal-section">
            <h4 className="modal-section-heading">🛡️ {t('details.safetyHeader')}</h4>
            <div className="modal-safety-grid">
              <div className="safety-item-box">
                <span className="s-icon">🏥</span>
                <div>
                  <strong>{t('details.nearestHospital')}</strong>
                  <p>{safety?.nearest_hospital || 'District Pilgrimage Base Hospital'}</p>
                  <small>Distance: {safety?.hospital_distance_km || 1.8} km • Helpline: {safety?.hospital_phone || '108'}</small>
                </div>
              </div>

              <div className="safety-item-box">
                <span className="s-icon">👮</span>
                <div>
                  <strong>{t('details.policeStation')}</strong>
                  <p>{safety?.nearest_police || 'Pilgrim Security Control Station'}</p>
                  <small>Disaster Control: {safety?.disaster_control_room || '1070'} • Police: {safety?.police_phone || '112'}</small>
                </div>
              </div>

              <div className="safety-item-box">
                <span className="s-icon">ℹ️</span>
                <div>
                  <strong>Pilgrim Help Desk &amp; Assembly</strong>
                  <p>{safety?.evacuation_routes ? 'Designated pilgrim assistance center near Main Entrance Gate.' : 'Pilgrimage Assistance Booth Gate 1'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn-modal-monitor"
            onClick={() => {
              onSelectForMonitoring(site.id);
              onClose();
            }}
          >
            <span>⚡</span>
            <span>{t('details.setAsActive')}</span>
          </button>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
          >
            {t('details.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
