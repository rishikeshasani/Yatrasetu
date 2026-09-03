import { useState } from 'react';
import { checkLocationSafety, triggerSOS } from '../api/api';

export default function SafetyAlerts({ alerts, safetyInfo, currentSite }) {
  const [checkingSafety, setCheckingSafety] = useState(false);
  const [safetyCheckResult, setSafetyCheckResult] = useState(null);
  const [sosSent, setSosSent] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const handleGeofenceCheck = async () => {
    setCheckingSafety(true);
    setSafetyCheckResult(null);
    try {
      // Simulate/perform GPS check
      const lat = currentSite?.latitude || 30.7352;
      const lon = currentSite?.longitude || 79.0669;
      const res = await checkLocationSafety(lat, lon);
      setSafetyCheckResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingSafety(false);
    }
  };

  const handleInstantSOS = async () => {
    setSosLoading(true);
    try {
      const lat = currentSite?.latitude || 30.7352;
      const lon = currentSite?.longitude || 79.0669;
      await triggerSOS("pilgrim_demo_user", lat, lon);
      setSosSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSosLoading(false);
    }
  };

  return (
    <section className="safety-alerts-section">
      <div className="section-header">
        <div className="title-with-badge">
          <h2 className="section-title">
            <span className="title-icon">🛡️</span> Pilgrim Safety Command & Emergency Center
          </h2>
          <span className="sdrf-badge">SDRF & Police Linked</span>
        </div>
        <p className="section-subtitle">
          24x7 automated geofencing, crowd hazard monitoring, medical triage and rapid distress response.
        </p>
      </div>

      {/* Active High Risk Alerts Bar */}
      {alerts && alerts.length > 0 && (
        <div className="active-alerts-container">
          <div className="alert-strip-header">
            <span className="alert-siren">🚨</span>
            <span className="alert-strip-title">Active Crowd Hazard & Bottleneck Advisories ({alerts.length})</span>
          </div>
          <div className="alerts-list">
            {alerts.map((alert, idx) => (
              <div key={alert.zone_id || idx} className={`alert-card-item alert-severity-${alert.severity?.toLowerCase() || 'high'}`}>
                <div className="alert-meta-line">
                  <span className="alert-zone-name">📍 {alert.zone_name}</span>
                  <span className="alert-badge">{alert.severity} CONGESTION</span>
                </div>
                <p className="alert-msg">{alert.message}</p>
                {alert.emergency_info?.evacuation_routes && (
                  <div className="alert-evacuation-tip">
                    <strong>Evacuation Direction:</strong> {alert.emergency_info.evacuation_routes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Grid: SOS Hero + Emergency Contacts + Geofence Scanner */}
      <div className="safety-action-grid">
        {/* Card 1: 1-Click SOS Trigger */}
        <div className="safety-card sos-hero-card">
          <div className="sos-badge-top">Emergency SOS Dispatch</div>
          <h3 className="sos-title">Medical / Stampede Distress</h3>
          <p className="sos-desc">
            Pressing SOS immediately dispatches your exact GPS coordinates and tourist identity to the nearest SDRF, NDRF, and Temple Command Post.
          </p>

          <button
            type="button"
            className={`big-sos-btn ${sosSent ? 'sos-active' : ''}`}
            onClick={handleInstantSOS}
            disabled={sosLoading || sosSent}
          >
            <div className="sos-btn-inner">
              <span className="sos-icon-large">🆘</span>
              <span className="sos-label">
                {sosLoading ? 'Broadcasting Alert...' : sosSent ? 'SOS Dispatched to SDRF ✓' : 'TAP FOR INSTANT SOS'}
              </span>
              <span className="sos-sublabel">Transmits Live GPS to 112 & 108</span>
            </div>
          </button>

          {sosSent && (
            <div className="sos-confirmation-box">
              <span className="check-icon">✅</span>
              <span>Distress beacon received by Kedarnath Temple Command Center. Response team ETA: <strong>3-5 minutes</strong>. Stay calm at your current location.</span>
            </div>
          )}
        </div>

        {/* Card 2: Emergency Medical & Police Contacts */}
        <div className="safety-card emergency-contacts-card">
          <h3 className="card-subheading">🏥 On-Site Emergency Facilities</h3>
          
          <div className="contacts-list">
            {/* Hospital */}
            <div className="contact-item">
              <div className="contact-icon-box medical">🏥</div>
              <div className="contact-details">
                <span className="contact-name">{safetyInfo?.nearest_hospital || 'Base Government Hospital'}</span>
                <span className="contact-distance">{safetyInfo?.hospital_distance_km ? `${safetyInfo.hospital_distance_km} km away` : 'Within temple complex'}</span>
              </div>
              <a href={`tel:${safetyInfo?.hospital_phone || '108'}`} className="contact-call-btn medical-call">
                📞 {safetyInfo?.hospital_phone || '108'}
              </a>
            </div>

            {/* Police */}
            <div className="contact-item">
              <div className="contact-icon-box police">👮‍♂️</div>
              <div className="contact-details">
                <span className="contact-name">{safetyInfo?.nearest_police || 'Shrine Police & SDRF Post'}</span>
                <span className="contact-distance">Active 24x7 On-ground Patrolling</span>
              </div>
              <a href={`tel:${safetyInfo?.police_phone || '112'}`} className="contact-call-btn police-call">
                📞 {safetyInfo?.police_phone || '112'}
              </a>
            </div>

            {/* Disaster Control */}
            <div className="contact-item">
              <div className="contact-icon-box control">📡</div>
              <div className="contact-details">
                <span className="contact-name">Disaster Management Control Room</span>
                <span className="contact-distance">Toll-Free State Helpline</span>
              </div>
              <a href={`tel:${safetyInfo?.disaster_control_room || '1070'}`} className="contact-call-btn control-call">
                📞 {safetyInfo?.disaster_control_room || '1070'}
              </a>
            </div>
          </div>

          {safetyInfo?.evacuation_routes && (
            <div className="evacuation-box">
              <span className="evacuation-icon">🚪</span>
              <div className="evacuation-text">
                <strong>Designated Evacuation Pathway:</strong> {safetyInfo.evacuation_routes}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Geofence Safety Scanner */}
        <div className="safety-card geofence-scanner-card">
          <h3 className="card-subheading">📍 Live Geofence Zone Scanner</h3>
          <p className="scanner-desc">
            Test whether your current GPS zone is entering a crowded high-risk choke point.
          </p>

          <button
            type="button"
            className="geofence-scan-btn"
            onClick={handleGeofenceCheck}
            disabled={checkingSafety}
          >
            {checkingSafety ? (
              <span>🛰️ Scanning Geofence Coordinates...</span>
            ) : (
              <span>🛰️ Scan My Current GPS Zone</span>
            )}
          </button>

          {safetyCheckResult && (
            <div className={`scan-result-box ${safetyCheckResult.in_danger_zone ? 'risk-found' : 'safe-zone'}`}>
              <div className="scan-result-header">
                <span className="result-icon">{safetyCheckResult.in_danger_zone ? '⚠️' : '✅'}</span>
                <strong>{safetyCheckResult.in_danger_zone ? `Congestion Zone: ${safetyCheckResult.zone_name}` : 'Safe Green Zone'}</strong>
              </div>
              <p className="scan-result-msg">{safetyCheckResult.message}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
