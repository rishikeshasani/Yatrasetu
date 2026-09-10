import { useState } from 'react';
import { checkLocationSafety } from '../api/api';

export default function SafetyAlerts({ alerts, safetyInfo, currentSite, activeSite, onOpenSOS }) {
  const [scanState, setScanState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [scanError, setScanError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const resolvedSite = activeSite || currentSite;

  const handleGeofenceCheck = () => {
    // 1. Pre-flight check: Insecure context
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setScanError({
        title: 'Location access requires HTTPS or localhost',
        message: 'Browser geolocation requires a secure context (HTTPS or localhost). Please open this portal securely to enable device GPS scanning.'
      });
      setScanState('error');
      return;
    }

    // 2. Pre-flight check: Geolocation support
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setScanError({
        title: 'GPS not supported',
        message: 'GPS is not supported by this browser.'
      });
      setScanState('error');
      return;
    }

    setScanState('loading');
    setScanError(null);
    setScanResult(null);

    // 3. Request real browser / device GPS coordinates (one-time scan)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log("GPS acquired:", {
          latitude,
          longitude,
          accuracy: accuracy != null && !isNaN(accuracy) ? `${Math.round(accuracy)} meters` : 'N/A'
        });

        try {
          const res = await checkLocationSafety(latitude, longitude, accuracy);
          setScanResult({
            ...res,
            accuracy: accuracy != null && !isNaN(accuracy) ? Math.round(accuracy) : null,
            scannedAt: 'Just now'
          });
          setScanState('success');
        } catch (apiErr) {
          console.error("[Geofence Evaluation Error]:", apiErr);
          setScanError({
            title: 'Unable to evaluate your current location',
            message: 'Could not reach the safety evaluation service to verify geofence conditions. Please try again.'
          });
          setScanState('error');
        }
      },
      (geoErr) => {
        console.warn("[GPS Error]:", geoErr);
        let title = 'Location Error';
        let message = "We couldn't determine your current GPS position. Please try again.";

        if (geoErr.code === 1 || geoErr.code === geoErr.PERMISSION_DENIED) {
          title = 'Location permission denied';
          message = 'Please allow location access in your browser/device settings and try again.';
        } else if (geoErr.code === 2 || geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          title = 'Location unavailable';
          message = "We couldn't determine your current GPS position. Please try again.";
        } else if (geoErr.code === 3 || geoErr.code === geoErr.TIMEOUT) {
          title = 'Location request timed out';
          message = 'Please make sure location services are enabled and try again.';
        }

        setScanError({ title, message });
        setScanState('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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
            className="big-sos-btn"
            onClick={onOpenSOS}
          >
            <div className="sos-btn-inner">
              <span className="sos-icon-large">🆘</span>
              <span className="sos-label">TAP FOR INSTANT SOS</span>
              <span className="sos-sublabel">Transmits Live GPS to 112 & 108</span>
            </div>
          </button>
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
            className={`geofence-scan-btn ${scanState === 'loading' ? 'is-scanning' : ''}`}
            onClick={handleGeofenceCheck}
            disabled={scanState === 'loading'}
          >
            {scanState === 'loading' ? (
              <span className="scan-btn-content">
                <span className="scan-spinner">⟳</span> Getting your GPS location...
              </span>
            ) : scanState === 'error' ? (
              <span className="scan-btn-content">
                <span>🔄 Try Again</span>
              </span>
            ) : (
              <span className="scan-btn-content">
                <span>🛰️ Scan My Current GPS Zone</span>
              </span>
            )}
          </button>

          {/* State 1: Initial (Location not scanned) */}
          {scanState === 'idle' && (
            <div className="scan-result-box unscanned">
              <div className="scan-result-header">
                <span className="result-icon">📍</span>
                <strong>Location not scanned</strong>
              </div>
              <p className="scan-result-msg">Tap the button above to check your current GPS zone.</p>
            </div>
          )}

          {/* State 2: Error (Permission denied / Unavailable / Timeout / Evaluation failure) */}
          {scanState === 'error' && scanError && (
            <div className="scan-result-box error-zone">
              <div className="scan-result-header">
                <span className="result-icon">📍</span>
                <strong>{scanError.title}</strong>
              </div>
              <p className="scan-result-msg">{scanError.message}</p>
            </div>
          )}

          {/* State 3: Success Result (Safe / Caution / High Risk) */}
          {scanState === 'success' && scanResult && (
            <div className={`scan-result-box ${
              scanResult.status === 'HIGH_RISK' || scanResult.in_danger_zone
                ? 'risk-found'
                : scanResult.status === 'CAUTION'
                ? 'caution-zone'
                : 'safe-zone'
            }`}>
              <div className="scan-result-header">
                <span className="result-icon">
                  {scanResult.status === 'HIGH_RISK' || scanResult.in_danger_zone
                    ? '🔴'
                    : scanResult.status === 'CAUTION'
                    ? '🟡'
                    : '🟢'}
                </span>
                <strong>
                  {scanResult.status === 'HIGH_RISK' || scanResult.in_danger_zone
                    ? (scanResult.zone_name ? `High-Risk Zone: ${scanResult.zone_name}` : 'High-Risk Zone')
                    : scanResult.status === 'CAUTION'
                    ? (scanResult.zone_name ? `Caution Zone: ${scanResult.zone_name}` : 'Caution Zone')
                    : 'Safe Green Zone'}
                </strong>
              </div>
              <p className="scan-result-msg">{scanResult.message}</p>
              <div className="scan-result-footer">
                <span className="scan-timestamp">Last checked: {scanResult.scannedAt || 'Just now'}</span>
                {scanResult.accuracy != null && (
                  <span className="scan-accuracy">Accuracy: ±{scanResult.accuracy} m</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
