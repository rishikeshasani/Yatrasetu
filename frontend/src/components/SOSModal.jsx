import { useState, useEffect } from 'react';
import { triggerSOS } from '../api/api';

const EMERGENCY_TYPES = [
  {
    id: 'medical',
    icon: '🩺',
    label: 'Medical Emergency',
    sublabel: 'Medical help required',
    color: '#DC2626'
  },
  {
    id: 'stampede',
    icon: '🚨',
    label: 'Crowd / Stampede',
    sublabel: 'Dangerous crowd situation',
    color: '#EA580C'
  },
  {
    id: 'hazard',
    icon: '⛰️',
    label: 'Landslide / Weather',
    sublabel: 'Natural hazard or severe weather',
    color: '#D97706'
  },
  {
    id: 'lost_person',
    icon: '🆘',
    label: 'Lost Person',
    sublabel: 'Lost child or separated person',
    color: '#E11D48'
  }
];

export default function SOSModal({
  isOpen,
  onClose,
  currentUser,
  currentSite,
  safetyInfo,
  onSOSBroadcasted
}) {
  const [step, setStep] = useState('select'); // 'select' | 'loading' | 'success' | 'error'
  const [selectedType, setSelectedType] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [dispatchedData, setDispatchedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedType(null);
      setLoadingPhase('');
      setDispatchedData(null);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Attempt real browser GPS with timeout fallback
  const getCoordinates = async () => {
    const fallbackLat = currentSite?.latitude || 30.7352;
    const fallbackLon = currentSite?.longitude || 79.0669;
    const fallbackSource = `${currentSite?.name || 'Selected Shrine'} (GPS unavailable)`;

    if (!('geolocation' in navigator)) {
      return { lat: fallbackLat, lon: fallbackLon, source: fallbackSource };
    }

    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ lat: fallbackLat, lon: fallbackLon, source: fallbackSource });
        }
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              lat: Number(position.coords.latitude.toFixed(5)),
              lon: Number(position.coords.longitude.toFixed(5)),
              source: 'Live GPS Coordinates'
            });
          }
        },
        () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({ lat: fallbackLat, lon: fallbackLon, source: fallbackSource });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 3000,
          maximumAge: 10000
        }
      );
    });
  };

  const handleSelectEmergencyType = async (typeObj) => {
    setSelectedType(typeObj);
    setStep('loading');
    setLoadingPhase('Acquiring your location...');

    try {
      // 1. Obtain GPS or fallback
      const { lat, lon, source } = await getCoordinates();

      // 2. Dispatch to backend
      setLoadingPhase('Transmitting distress beacon to emergency network...');
      const userId = currentUser?.user_id || 'pilgrim_demo_user';

      const res = await triggerSOS(userId, lat, lon, typeObj.label, {
        site_id: currentSite?.id,
        site_name: currentSite?.name,
        location_source: source
      });

      setDispatchedData({
        alertId: res.alert_id || `SOS-${Math.floor(1000 + Math.random() * 9000)}`,
        emergencyType: typeObj,
        latitude: lat,
        longitude: lon,
        locationSource: source,
        userId: userId,
        timestamp: res.recorded_at ? new Date(res.recorded_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
        message: res.message || 'Distress alert received by YatraSetu emergency network.'
      });

      setStep('success');

      if (onSOSBroadcasted) {
        onSOSBroadcasted({
          type: typeObj.label,
          location: source,
          lat,
          lon
        });
      }
    } catch (err) {
      console.error('Error in SOS dispatch:', err);
      setErrorMessage('Network timeout connecting to emergency servers. Please dial emergency helplines directly.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    if (selectedType) {
      handleSelectEmergencyType(selectedType);
    } else {
      setStep('select');
    }
  };

  return (
    <div className="sos-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sos-modal-title">
      <div className="sos-modal-card">
        {/* Header */}
        <div className="sos-modal-header">
          <div className="sos-modal-title-group">
            <span className="sos-modal-badge">EMERGENCY DISTRESS</span>
            <h2 id="sos-modal-title" className="sos-modal-title">
              {step === 'select' && 'Select Emergency Type'}
              {step === 'loading' && 'Dispatching SOS Beacon'}
              {step === 'success' && '🚨 SOS Beacon Dispatched'}
              {step === 'error' && '⚠️ Dispatch Alert'}
            </h2>
          </div>
          <button
            type="button"
            className="sos-modal-close"
            onClick={onClose}
            aria-label="Close emergency dialog"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Emergency Type Selection (Immediate, no confirmation screen) */}
        {step === 'select' && (
          <div className="sos-modal-body">
            <p className="sos-instruction">
              Tap the category that best describes your situation. Coordinates and identity will be dispatched immediately.
            </p>

            <div className="sos-type-grid">
              {EMERGENCY_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className="sos-type-btn"
                  style={{ borderColor: type.color }}
                  onClick={() => handleSelectEmergencyType(type)}
                >
                  <span className="sos-type-icon">{type.icon}</span>
                  <div className="sos-type-content">
                    <span className="sos-type-label" style={{ color: type.color }}>
                      {type.label}
                    </span>
                    <span className="sos-type-sublabel">{type.sublabel}</span>
                  </div>
                  <span className="sos-type-arrow">➔</span>
                </button>
              ))}
            </div>

            <div className="sos-quick-dial-strip">
              <span className="strip-label">Direct Helplines:</span>
              <a href="tel:112" className="strip-call-pill police">
                👮 Police: 112
              </a>
              <a href="tel:108" className="strip-call-pill ambulance">
                🚑 Ambulance: 108
              </a>
              <a href="tel:1070" className="strip-call-pill disaster">
                📡 Disaster: 1070
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Loading State */}
        {step === 'loading' && (
          <div className="sos-modal-body sos-loading-body">
            <div className="sos-radar-spinner">
              <div className="radar-circle circle-1"></div>
              <div className="radar-circle circle-2"></div>
              <div className="radar-circle circle-3"></div>
              <span className="radar-icon">🚨</span>
            </div>

            <h3 className="sos-loading-title">{selectedType?.label}</h3>
            <p className="sos-loading-status">{loadingPhase}</p>
            <p className="sos-loading-note">Please do not close this window while the distress beacon is transmitting.</p>
          </div>
        )}

        {/* Step 3: Success State */}
        {step === 'success' && dispatchedData && (
          <div className="sos-modal-body sos-success-body">
            <div className="sos-success-banner">
              <span className="banner-icon">📡</span>
              <div>
                <strong>BEACON TRANSMITTED & ACTIVE</strong>
                <p>Distress beacon registered with YatraSetu Emergency Monitoring.</p>
              </div>
            </div>

            <div className="sos-dispatch-summary">
              <div className="summary-row">
                <span className="summary-label">Emergency Type:</span>
                <span className="summary-val emergency-tag">
                  {dispatchedData.emergencyType.icon} {dispatchedData.emergencyType.label}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Beacon ID:</span>
                <span className="summary-val code-val">{dispatchedData.alertId}</span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Dispatched Location:</span>
                <span className="summary-val">
                  <strong>{dispatchedData.locationSource}</strong>
                  <span className="coord-subtext">
                    ({dispatchedData.latitude}, {dispatchedData.longitude})
                  </span>
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Pilgrim Identity:</span>
                <span className="summary-val">
                  {currentUser?.full_name ? (
                    <>
                      <span>{currentUser.full_name}</span>
                      {currentUser.is_aadhaar_verified && (
                        <span className="verified-chip">
                          🛡️ Aadhaar Verified ({currentUser.aadhaar_masked})
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Verified Yatri (ID: {dispatchedData.userId})</span>
                  )}
                </span>
              </div>

              <div className="summary-row">
                <span className="summary-label">Time Logged:</span>
                <span className="summary-val">{dispatchedData.timestamp}</span>
              </div>
            </div>

            {/* Direct Calling Actions */}
            <div className="sos-actions-container">
              <h4 className="sos-actions-heading">Immediate Emergency Contact Lines:</h4>
              <div className="sos-call-actions-grid">
                <a
                  href={`tel:${safetyInfo?.hospital_phone || '108'}`}
                  className="sos-action-btn ambulance-btn"
                >
                  <span className="action-icon">🚑</span>
                  <div className="action-text">
                    <strong>Call Ambulance (108)</strong>
                    <span>{safetyInfo?.nearest_hospital || 'Nearest Base Hospital'}</span>
                  </div>
                </a>

                <a
                  href={`tel:${safetyInfo?.police_phone || '112'}`}
                  className="sos-action-btn police-btn"
                >
                  <span className="action-icon">👮‍♂️</span>
                  <div className="action-text">
                    <strong>Call Police / SDRF (112)</strong>
                    <span>{safetyInfo?.nearest_police || 'Shrine Police Post'}</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="sos-modal-footer">
              <button type="button" className="sos-close-btn" onClick={onClose}>
                Return to Pilgrimage Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Error State */}
        {step === 'error' && (
          <div className="sos-modal-body sos-error-body">
            <div className="sos-error-box">
              <span className="error-icon">⚠️</span>
              <h4>Distress Signal Warning</h4>
              <p>{errorMessage}</p>
            </div>

            <div className="sos-call-actions-grid">
              <a href="tel:112" className="sos-action-btn police-btn">
                <span className="action-icon">📞</span>
                <div className="action-text">
                  <strong>Call 112 (National Emergency)</strong>
                  <span>Direct phone line</span>
                </div>
              </a>
              <a href="tel:108" className="sos-action-btn ambulance-btn">
                <span className="action-icon">📞</span>
                <div className="action-text">
                  <strong>Call 108 (Ambulance)</strong>
                  <span>Medical emergency line</span>
                </div>
              </a>
            </div>

            <div className="sos-error-actions">
              <button type="button" className="sos-retry-btn" onClick={handleRetry}>
                🔄 Retry Distress Dispatch
              </button>
              <button type="button" className="sos-close-secondary-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
