import React, { useState, useEffect, useRef } from 'react';

/**
 * Calculates distance in meters between two lat/lon coordinates using the Haversine formula.
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const ARRIVAL_RADIUS_METERS = 200; // 200-meter arrival threshold

/**
 * PilgrimAdvisory Component
 * YatraSetu AI Pilgrim Advisory + Alternative Route Recommendation
 * 
 * Flow:
 * 1. ROUTE SELECTION: Sets active route & +25 Punya Points pending (wallet balance NOT increased).
 * 2. SWITCHING ALTERNATIVES: Cancels previous pending reward, creates fresh +25 pending for new route.
 * 3. ARRIVAL VERIFICATION: Triggers via browser GPS (<=200m) or "Demo: Simulate Arrival".
 *    Only on arrival is POST /wallet/reward called, awarding +25 Punya Points.
 * 4. SWITCH BACK: Before arrival -> cancels pending reward (0 pts); After arrival -> keeps earned points.
 */
export default function PilgrimAdvisory({
  currentSite,
  density,
  forecast,
  prediction,
  alternativesData,
  activeAlternateRoute,
  pendingPunyaReward = 0,
  routeStatus = 'IDLE', // 'IDLE' | 'ACTIVE' | 'ARRIVED'
  completedRouteIds = [],
  onSelectRoute,
  onCompleteArrival,
  onSwitchBack
}) {
  const [selectedAltIndex, setSelectedAltIndex] = useState(0);
  const [userCoords, setUserCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('initializing'); // 'active' | 'denied' | 'unavailable' | 'unsupported'
  const [gpsDistanceMeters, setGpsDistanceMeters] = useState(null);
  const isArrivingRef = useRef(false);

  const siteName = currentSite?.name || 'Main Shrine';

  // Extract recommendations from backend payload
  const recommendations = alternativesData?.recommendations || [];
  const backendStatus = alternativesData?.current_status || density?.status || 'NORMAL';
  const occupancyPct = alternativesData?.current_occupancy_percentage ?? density?.occupancy_percentage ?? 48;
  const isSurgeDetected = Boolean(density?.relative_surge_alert?.surge_detected);
  const redistributionNeeded = alternativesData?.redistribution_needed || isSurgeDetected || backendStatus === 'HIGH' || backendStatus === 'CRITICAL';

  // Real-time GPS location tracking when an alternate route is active
  useEffect(() => {
    if (routeStatus !== 'ACTIVE' || !activeAlternateRoute) {
      setGpsDistanceMeters(null);
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    let watchId = null;

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLon = pos.coords.longitude;
          setUserCoords({ latitude: uLat, longitude: uLon });
          setGpsStatus('active');

          const targetLat = activeAlternateRoute.latitude;
          const targetLon = activeAlternateRoute.longitude;

          if (targetLat != null && targetLon != null) {
            const dist = calculateHaversineDistanceMeters(uLat, uLon, targetLat, targetLon);
            setGpsDistanceMeters(dist);

            // Verified GPS Arrival: within 200m
            if (dist != null && dist <= ARRIVAL_RADIUS_METERS && !isArrivingRef.current) {
              const routeKey = activeAlternateRoute.alternative_id || activeAlternateRoute.name;
              if (!completedRouteIds.includes(routeKey)) {
                isArrivingRef.current = true;
                if (onCompleteArrival) {
                  onCompleteArrival(activeAlternateRoute, 'gps');
                }
              }
            }
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('denied');
          } else {
            setGpsStatus('unavailable');
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 4000 }
      );
    } catch (e) {
      setGpsStatus('unavailable');
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      isArrivingRef.current = false;
    };
  }, [routeStatus, activeAlternateRoute, completedRouteIds, onCompleteArrival]);

  // Handle route selection
  const handleRouteClick = (alt) => {
    isArrivingRef.current = false;
    if (onSelectRoute) {
      onSelectRoute(alt);
    }
  };

  // Handle Demo Arrival Simulation
  const handleSimulateArrival = () => {
    if (!activeAlternateRoute) return;
    const routeKey = activeAlternateRoute.alternative_id || activeAlternateRoute.name;
    if (completedRouteIds.includes(routeKey)) return;

    if (onCompleteArrival) {
      onCompleteArrival(activeAlternateRoute, 'simulation');
    }
  };

  const activeRouteId = activeAlternateRoute ? (activeAlternateRoute.alternative_id || activeAlternateRoute.name) : null;
  const isRouteActive = routeStatus === 'ACTIVE' && activeAlternateRoute;
  const isRouteArrived = routeStatus === 'ARRIVED' && activeAlternateRoute;

  return (
    <section className="pilgrim-advisory-section" id="ai-pilgrim-advisory">
      {/* Section Header */}
      <div className="advisory-header-wrap">
        <div className="advisory-header-left">
          <div className="advisory-pill-row">
            <span className="advisory-badge-pill">
              <span className="sparkle-icon">✨</span> AI Dynamic Advisory
            </span>
            {redistributionNeeded ? (
              <span className="advisory-surge-pill">
                <span className="pulse-warning-dot"></span> Congestion Alert Active
              </span>
            ) : (
              <span className="advisory-optimal-pill">
                <span className="check-dot">✓</span> Crowd Flow Manageable
              </span>
            )}
          </div>
          <h2 className="advisory-title">
            <span className="title-om">🕉️</span> YatraSetu AI Pilgrim Advisory
          </h2>
          <p className="advisory-subtitle">
            Real-time crowd intelligence, darshan queue pacing, and serene alternative route recommendations for {siteName}.
          </p>
        </div>

        {/* Quick occupancy snapshot pill */}
        <div className="advisory-header-right">
          <div className={`advisory-status-meter ${redistributionNeeded ? 'meter-rush' : 'meter-optimal'}`}>
            <span className="meter-label">Sanctum Status</span>
            <span className="meter-val">{backendStatus} ({occupancyPct}%)</span>
          </div>
        </div>
      </div>

      {/* STATE A: ACTIVE ROUTE BANNER (Before Arrival - Pending Reward) */}
      {isRouteActive && (
        <div className="advisory-route-banner banner-active-pending">
          <div className="route-banner-content">
            <div className="route-banner-icon-box box-amber">
              <span className="banner-icon">🧭</span>
            </div>
            <div className="route-banner-text">
              <div className="banner-tag-row">
                <span className="status-chip chip-amber">🟡 Alternate Route Active</span>
                <span className="status-chip chip-pending">🎁 +{pendingPunyaReward} Punya Points pending arrival</span>
              </div>
              <h3 className="banner-heading">📍 Navigate to {activeAlternateRoute.name}</h3>
              <p className="banner-sub">
                Punya Points are awarded upon arrival. Reach the destination within <strong>200m</strong> via GPS navigation or use the demo simulator below.
              </p>

              {/* GPS & Live Distance Telemetry */}
              <div className="gps-telemetry-row">
                <span className="gps-indicator-dot"></span>
                {gpsDistanceMeters != null ? (
                  <span className="gps-text">
                    Live GPS Distance: <strong>{gpsDistanceMeters > 1000 ? `${(gpsDistanceMeters / 1000).toFixed(1)} km` : `${gpsDistanceMeters} m`}</strong> away (Arrival radius: {ARRIVAL_RADIUS_METERS}m)
                  </span>
                ) : (
                  <span className="gps-text">
                    {gpsStatus === 'denied' && '⚠️ GPS Permission Denied • Use Demo Arrival for SIH presentation'}
                    {gpsStatus === 'unavailable' && '📡 Acquiring GPS coordinates...'}
                    {gpsStatus === 'unsupported' && 'ℹ️ Browser Geolocation unavailable'}
                    {gpsStatus === 'initializing' && '📡 Initializing location services...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="route-banner-actions">
            {/* DEMO-ONLY Arrival Control */}
            <button
              type="button"
              className="demo-simulate-arrival-btn"
              onClick={handleSimulateArrival}
              title="Simulates pilgrim arriving within 200m of destination for demo testing"
            >
              <span className="btn-icon">📍</span> Demo: Simulate Arrival
            </button>

            {/* Switch back to original site */}
            <button
              type="button"
              className="switch-back-btn"
              onClick={onSwitchBack}
              title="Cancel alternate route and return to main shrine"
            >
              Switch Back to {siteName}
            </button>
          </div>
        </div>
      )}

      {/* STATE B: ARRIVAL REACHED BANNER (Earned Reward) */}
      {isRouteArrived && (
        <div className="advisory-route-banner banner-arrived-success">
          <div className="route-banner-content">
            <div className="route-banner-icon-box box-green">
              <span className="banner-icon">✓</span>
            </div>
            <div className="route-banner-text">
              <div className="banner-tag-row">
                <span className="status-chip chip-green">🟢 Destination Reached</span>
                <span className="status-chip chip-earned">🎉 +25 Punya Points Earned</span>
              </div>
              <h3 className="banner-heading">Welcome to {activeAlternateRoute.name}</h3>
              <p className="banner-sub">
                Your Green Pilgrim action has been rewarded! +25 Punya Points have been added to your wallet balance for helping balance regional crowd flow.
              </p>
            </div>
          </div>

          <div className="route-banner-actions">
            <button
              type="button"
              className="switch-back-btn"
              onClick={onSwitchBack}
              title="Return view to main shrine (earned points are preserved)"
            >
              Return to {siteName}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Crowd Situation Assessment */}
      <div className={`advisory-condition-box ${redistributionNeeded ? 'box-congestion-warning' : 'box-manageable'}`}>
        <div className="condition-icon-badge">
          {redistributionNeeded ? '⚠️' : '🌿'}
        </div>
        <div className="condition-info">
          {redistributionNeeded ? (
            <>
              <div className="condition-status-label red-tag">
                REROUTING STRONGLY ADVISED
              </div>
              <h3 className="condition-heading">
                High crowd detected. Rerouting to an alternative destination is strongly recommended to avoid delays and queue fatigue.
              </h3>
              <p className="condition-body">
                The sanctum queue at {siteName} is currently operating near peak capacity ({occupancyPct}% occupancy). 
                Diverting to the recommended serene destination below ensures a peaceful, unhurried darshan with significantly reduced queue times.
              </p>
            </>
          ) : (
            <>
              <div className="condition-status-label green-tag">
                CONDITIONS MANAGEABLE • REROUTING OPTIONAL
              </div>
              <h3 className="condition-heading">
                Current conditions are manageable. No rerouting required.
              </h3>
              <p className="condition-body">
                The main temple queue at {siteName} is flowing smoothly with acceptable waiting periods. 
                If you prefer a quieter, off-beat spiritual experience away from the central queue corridors, browse our AI-recommended alternatives below.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Fallback State if No Alternatives Exist */}
      {recommendations.length === 0 ? (
        <div className="pilgrim-advisory-empty-box">
          <div className="empty-icon-circle">ℹ️</div>
          <h4 className="empty-title">No Alternative Recommendations Available</h4>
          <p className="empty-desc">
            No alternative recommendation is currently available for this destination. Please follow standard temple queue protocols at {siteName}.
          </p>
        </div>
      ) : (
        <div className="advisory-recommendations-container">
          {/* Alternative Selector Tabs if multiple alternatives */}
          {recommendations.length > 1 && (
            <div className="alt-selector-tabs">
              <span className="tabs-label">Recommended Routes:</span>
              <div className="tabs-list">
                {recommendations.map((alt, idx) => {
                  const altId = alt.alternative_id || alt.name;
                  const isThisRouteActive = activeRouteId === altId && routeStatus === 'ACTIVE';
                  const isThisRouteArrived = activeRouteId === altId && routeStatus === 'ARRIVED';
                  const isCompleted = completedRouteIds.includes(altId);

                  return (
                    <button
                      key={altId || idx}
                      type="button"
                      className={`alt-tab-btn ${selectedAltIndex === idx ? 'active-tab' : ''} ${isThisRouteActive ? 'tab-route-active' : ''} ${isThisRouteArrived || isCompleted ? 'tab-route-completed' : ''}`}
                      onClick={() => setSelectedAltIndex(idx)}
                    >
                      <span className="tab-number">Option {idx + 1}</span>
                      <span className="tab-title">{alt.name}</span>
                      {isThisRouteActive && <span className="tab-pill-amber">Pending</span>}
                      {(isThisRouteArrived || isCompleted) && <span className="tab-pill-green">✓ Done</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Featured Alternative Card */}
          {(() => {
            const alt = recommendations[selectedAltIndex] || recommendations[0];
            const altId = alt.alternative_id || alt.name;
            const isThisActive = activeRouteId === altId && routeStatus === 'ACTIVE';
            const isThisArrived = activeRouteId === altId && routeStatus === 'ARRIVED';
            const isCompleted = completedRouteIds.includes(altId);

            const relativeCrowd = alt.relative_crowd_percentage ?? 15;
            const crowdSavings = Math.max(0, 100 - relativeCrowd);

            return (
              <div className={`advisory-alt-card ${isThisActive ? 'card-route-active' : ''} ${isThisArrived || isCompleted ? 'card-route-arrived' : ''} ${redistributionNeeded ? 'card-highlighted' : ''}`}>
                {/* Card Top Pill Bar */}
                <div className="alt-card-top-bar">
                  <div className="alt-meta-tags">
                    <span className="alt-type-pill">{alt.type || 'Spiritual Shrine'}</span>
                    {redistributionNeeded && (
                      <span className="alt-recommend-tag">⭐ AI Top Recommendation</span>
                    )}
                    {isThisActive && (
                      <span className="alt-pending-tag">🟡 Route Active (+25 Pts Pending)</span>
                    )}
                    {(isThisArrived || isCompleted) && (
                      <span className="alt-arrived-tag">🟢 Destination Reached (+25 Pts Earned)</span>
                    )}
                  </div>

                  <div className="alt-relative-crowd-meter">
                    <span className="crowd-meter-icon">👥</span>
                    <div className="crowd-meter-text">
                      <span className="crowd-percentage-num">{relativeCrowd}%</span>
                      <span className="crowd-percentage-sub">of {siteName} volume</span>
                    </div>
                  </div>
                </div>

                {/* Destination Title & Primary Stats */}
                <div className="alt-card-main-header">
                  <div>
                    <h3 className="alt-destination-name">{alt.name}</h3>
                    <p className="alt-crowd-savings-note">
                      🌱 <strong>{crowdSavings}% less crowded</strong> than {siteName} sanctum queue
                    </p>
                  </div>
                  
                  <div className="alt-quick-metrics-row">
                    <div className="quick-metric-item">
                      <span className="q-metric-icon">📍</span>
                      <span className="q-metric-val">{alt.distance_km} km</span>
                      <span className="q-metric-lbl">Distance</span>
                    </div>
                    <div className="metric-divider"></div>
                    <div className="quick-metric-item">
                      <span className="q-metric-icon">⏱️</span>
                      <span className="q-metric-val">~{alt.travel_time_mins} min</span>
                      <span className="q-metric-lbl">Travel Time</span>
                    </div>
                  </div>
                </div>

                {/* Reason for Recommendation */}
                <div className="alt-reason-box">
                  <div className="reason-header">
                    <span className="reason-icon">💡</span>
                    <span className="reason-title">Why this alternative is recommended:</span>
                  </div>
                  <p className="reason-text">{alt.why_visit}</p>
                </div>

                {/* Logistics & Practical Info */}
                <div className="alt-logistics-grid">
                  {alt.best_time_to_visit && (
                    <div className="logistics-card">
                      <span className="logistics-icon">🌅</span>
                      <div className="logistics-detail">
                        <span className="logistics-label">Best Time to Visit</span>
                        <span className="logistics-val">{alt.best_time_to_visit}</span>
                      </div>
                    </div>
                  )}

                  {alt.road_connectivity && (
                    <div className="logistics-card">
                      <span className="logistics-icon">🛣️</span>
                      <div className="logistics-detail">
                        <span className="logistics-label">Road & Route Connectivity</span>
                        <span className="logistics-val">{alt.road_connectivity}</span>
                      </div>
                    </div>
                  )}

                  {alt.latitude && alt.longitude && (
                    <div className="logistics-card">
                      <span className="logistics-icon">🌐</span>
                      <div className="logistics-detail">
                        <span className="logistics-label">GPS Geofence</span>
                        <span className="logistics-val">{alt.latitude.toFixed(4)}° N, {alt.longitude.toFixed(4)}° E</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Footer with Switch Button & Reward Policy */}
                <div className="alt-action-card-footer">
                  <div className="reward-policy-pill">
                    <span className="reward-coin">🪙</span>
                    <span className="reward-text">
                      Earn <strong>+25 Punya Points</strong> upon verified arrival at this destination
                    </span>
                  </div>

                  <div className="card-action-buttons-group">
                    {/* If this route is already active, show simulation control right here too */}
                    {isThisActive && (
                      <button
                        type="button"
                        className="card-simulate-btn"
                        onClick={handleSimulateArrival}
                        title="Simulate arrival within 200m"
                      >
                        📍 Demo: Simulate Arrival
                      </button>
                    )}

                    <button
                      type="button"
                      className={`switch-route-cta-btn ${isThisActive ? 'btn-route-active' : ''} ${isThisArrived || isCompleted ? 'btn-route-arrived' : ''}`}
                      onClick={() => handleRouteClick(alt)}
                      disabled={isThisArrived || isCompleted}
                    >
                      {isThisActive ? (
                        <>
                          <span className="cta-icon">🟡</span> Alternate Route Active (+25 Pending)
                        </>
                      ) : isThisArrived || isCompleted ? (
                        <>
                          <span className="cta-icon">✓</span> Route Completed (+25 Pts Earned)
                        </>
                      ) : (
                        <>
                          <span className="cta-icon">🧭</span> Switch to Alternate Route
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* If there are other alternatives, display compact preview list */}
          {recommendations.length > 1 && (
            <div className="other-alternatives-preview">
              <h4 className="other-alt-heading">All Available Alternatives for {siteName}:</h4>
              <div className="other-alt-cards-grid">
                {recommendations.map((alt, idx) => {
                  const altId = alt.alternative_id || alt.name;
                  const isCurActive = activeRouteId === altId && routeStatus === 'ACTIVE';
                  const isCurArrived = activeRouteId === altId && routeStatus === 'ARRIVED';
                  const isCompleted = completedRouteIds.includes(altId);
                  const isSelectedTab = selectedAltIndex === idx;

                  return (
                    <div 
                      key={altId || idx}
                      className={`mini-alt-card ${isSelectedTab ? 'mini-card-focused' : ''} ${isCurActive ? 'mini-card-active-route' : ''} ${isCurArrived || isCompleted ? 'mini-card-completed' : ''}`}
                      onClick={() => setSelectedAltIndex(idx)}
                    >
                      <div className="mini-alt-header">
                        <span className="mini-type-tag">{alt.type || 'Shrine'}</span>
                        <span className="mini-crowd-tag">{alt.relative_crowd_percentage}% crowd</span>
                      </div>
                      <h5 className="mini-alt-title">{alt.name}</h5>
                      <div className="mini-alt-stats">
                        <span>📍 {alt.distance_km} km</span>
                        <span>⏱️ ~{alt.travel_time_mins} min</span>
                      </div>
                      <button
                        type="button"
                        className={`mini-switch-btn ${isCurActive ? 'mini-btn-active' : ''} ${isCurArrived || isCompleted ? 'mini-btn-completed' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isCurArrived && !isCompleted) {
                            handleRouteClick(alt);
                          }
                        }}
                        disabled={isCurArrived || isCompleted}
                      >
                        {isCurActive ? '🟡 Route Active' : isCurArrived || isCompleted ? '✓ Completed' : 'Switch Route (+25 Pending)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
