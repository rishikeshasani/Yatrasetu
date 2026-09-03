import { useState, useRef } from 'react';

export default function AlternativeSpots({ alternativesData, currentSiteName, onClaimReward }) {
  const [claimedMap, setClaimedMap] = useState({});
  const [activeGuideAlt, setActiveGuideAlt] = useState(null);
  const [activeGuideTab, setActiveGuideTab] = useState('restaurants');
  const guideRef = useRef(null);

  if (!alternativesData || !alternativesData.recommendations || alternativesData.recommendations.length === 0) {
    return (
      <section className="alternatives-section">
        <div className="section-header">
          <div className="title-with-badge">
            <h2 className="section-title">
              <span className="title-icon">🧭</span> Smart Alternate Destinations & Off-Peak Routing
            </h2>
            <span className="green-safe-badge">Current Flow Optimal</span>
          </div>
          <p className="section-subtitle">
            Current crowd density at {currentSiteName} is within safe thresholds. No urgent diversion required!
          </p>
        </div>
      </section>
    );
  }

  const { recommendations, redistribution_needed } = alternativesData;

  const handleClaim = (alt) => {
    setClaimedMap((prev) => ({ ...prev, [alt.alternative_id || alt.name]: true }));
    setActiveGuideAlt(alt);
    if (onClaimReward) {
      onClaimReward(alt.reward_points || 50, `Chose less crowded alternative: ${alt.name}`);
    }
    // Smoothly scroll down to guide
    setTimeout(() => {
      if (guideRef.current) {
        guideRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleToggleGuide = (alt) => {
    if (activeGuideAlt?.alternative_id === alt.alternative_id) {
      setActiveGuideAlt(null);
    } else {
      setActiveGuideAlt(alt);
      setTimeout(() => {
        if (guideRef.current) {
          guideRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  };

  const guide = activeGuideAlt?.guide;

  return (
    <section className="alternatives-section">
      <div className="section-header-banner">
        <div className="banner-left">
          <div className="ai-badge-row">
            <span className="ai-sparkle-pill">✨ AI Dynamic Crowd Balancing</span>
            {redistribution_needed && (
              <span className="redistribution-warning-pill">
                High Rush at Main Sanctum • Alternative Recommended
              </span>
            )}
          </div>
          <h2 className="section-title">
            <span className="title-icon">🌿</span> Peaceful Spiritual Alternatives & Hidden Gems
          </h2>
          <p className="section-subtitle">
            Avoid long queue bottlenecks at {currentSiteName}. Experience divine serenity with <strong>up to 75% less wait time</strong>, earn Green Pilgrim rewards, and explore curated local food, stays, and vistas with live crowd telemetry.
          </p>
        </div>
      </div>

      {/* Alternative Spot Cards */}
      <div className="alternatives-grid">
        {recommendations.map((alt, index) => {
          const isClaimed = claimedMap[alt.alternative_id || alt.name];
          const isGuideOpen = activeGuideAlt?.alternative_id === alt.alternative_id;
          const crowdPct = alt.relative_crowd_percentage || 25;

          return (
            <div 
              key={alt.alternative_id || index} 
              className={`alt-spot-card ${isGuideOpen ? 'active-guide-card' : ''}`}
            >
              {/* Top Banner */}
              <div className="alt-card-header">
                <div className="alt-type-badge">{alt.type || 'Sacred Shrine'}</div>
                <div className="alt-crowd-meter">
                  <span className="crowd-dot"></span>
                  <span className="crowd-stat">{crowdPct}% Relative Crowd</span>
                </div>
              </div>

              {/* Title & Logistics */}
              <h3 className="alt-spot-name">{alt.name}</h3>

              <div className="alt-logistics-bar">
                <div className="logistics-item">
                  <span className="log-icon">🚗</span>
                  <span className="log-text"><strong>{alt.distance_km} km</strong> away</span>
                </div>
                <div className="logistics-divider">•</div>
                <div className="logistics-item">
                  <span className="log-icon">⏱️</span>
                  <span className="log-text"><strong>~{alt.travel_time_mins} mins</strong> drive</span>
                </div>
              </div>

              {/* Why Visit Description */}
              <div className="alt-why-visit">
                <span className="why-label">Spiritual Significance:</span>
                <p className="why-text">{alt.why_visit}</p>
              </div>

              {/* Practical Guidance */}
              <div className="alt-practical-info">
                {alt.best_time_to_visit && (
                  <div className="info-row">
                    <span className="info-icon">🌅</span>
                    <span className="info-content"><strong>Best Time:</strong> {alt.best_time_to_visit}</span>
                  </div>
                )}
                {alt.road_connectivity && (
                  <div className="info-row">
                    <span className="info-icon">🛣️</span>
                    <span className="info-content"><strong>Road:</strong> {alt.road_connectivity}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="alt-action-footer">
                <button
                  type="button"
                  className={`claim-reward-btn ${isClaimed ? 'claimed' : ''}`}
                  onClick={() => handleClaim(alt)}
                >
                  {isClaimed ? (
                    <>
                      <span className="btn-icon">✓</span> Route Chosen (+{alt.reward_points || 50} Pts Credited)
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🪙</span> Divert Route & Earn +{alt.reward_points || 50} Pts
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={`view-guide-btn ${isGuideOpen ? 'guide-open' : ''}`}
                  onClick={() => handleToggleGuide(alt)}
                >
                  {isGuideOpen ? '▲ Hide Route Guide' : '🧭 View Food, Stays & Crowd Guide ▼'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==========================================================================
          INTERACTIVE REROUTE DESTINATION & HOSPITALITY GUIDE (WITH CROWD TELEMETRY)
          ========================================================================== */}
      {activeGuideAlt && guide && (
        <div ref={guideRef} className="reroute-guide-panel">
          {/* Guide Header */}
          <div className="guide-header-bar">
            <div className="guide-title-block">
              <div className="guide-tagline">
                <span className="live-pulse-dot"></span> LIVE REROUTE HOSPITALITY TELEMETRY
              </div>
              <h3 className="guide-main-heading">
                Guide to {activeGuideAlt.name}
              </h3>
              <p className="guide-sub-heading">
                Crowd-audited sattvic dining, panoramic viewpoints, verified stays & parking along this detour.
              </p>
            </div>

            <div className="guide-header-right">
              <div className="guide-overall-crowd-chip">
                <span className="chip-bullet"></span>
                <span>Area Rush: <strong>{activeGuideAlt.relative_crowd_percentage}% (Low)</strong></span>
              </div>
              <button 
                type="button" 
                className="guide-close-btn"
                onClick={() => setActiveGuideAlt(null)}
                title="Close Guide"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Guide Navigation Tabs */}
          <div className="guide-tabs-row">
            <button
              type="button"
              className={`guide-tab-btn ${activeGuideTab === 'restaurants' ? 'active' : ''}`}
              onClick={() => setActiveGuideTab('restaurants')}
            >
              🍲 Restaurants & Bhojanalayas ({guide.restaurants?.length || 0})
            </button>
            <button
              type="button"
              className={`guide-tab-btn ${activeGuideTab === 'viewpoints' ? 'active' : ''}`}
              onClick={() => setActiveGuideTab('viewpoints')}
            >
              🌄 Scenic Views & Sights ({guide.viewpoints?.length || 0})
            </button>
            <button
              type="button"
              className={`guide-tab-btn ${activeGuideTab === 'hotels' ? 'active' : ''}`}
              onClick={() => setActiveGuideTab('hotels')}
            >
              🏨 Hotels & Dharamshalas ({guide.hotels?.length || 0})
            </button>
            <button
              type="button"
              className={`guide-tab-btn ${activeGuideTab === 'amenities' ? 'active' : ''}`}
              onClick={() => setActiveGuideTab('amenities')}
            >
              🚗 Parking & Route Transit
            </button>
          </div>

          {/* Guide Tab Content */}
          <div className="guide-content-box">
            {/* TAB 1: RESTAURANTS */}
            {activeGuideTab === 'restaurants' && (
              <div className="guide-items-grid">
                {guide.restaurants && guide.restaurants.length > 0 ? (
                  guide.restaurants.map((rest) => (
                    <div key={rest.id} className="guide-item-card">
                      <div className="item-card-top">
                        <div className="item-title-box">
                          <h4 className="item-name">{rest.name}</h4>
                          <span className="item-cuisine">{rest.cuisine}</span>
                        </div>
                        {/* Real-time Crowd Telemetry Badge */}
                        <div className={`item-crowd-badge ${rest.crowd_level === 'LOW' ? 'crowd-low' : 'crowd-mod'}`}>
                          <span className="crowd-status-indicator"></span>
                          <span className="crowd-txt">
                            {rest.crowd_level === 'LOW' ? '🟢 Low Rush' : '🟡 Moderate Rush'} ({rest.occupancy_pct}% Full)
                          </span>
                        </div>
                      </div>

                      <div className="item-wait-line">
                        <span className="wait-pill">⏱️ Wait Time: <strong>~{rest.wait_time_mins} mins</strong></span>
                        <span className="distance-pill">📍 {rest.distance}</span>
                        <span className="price-pill">💰 {rest.price_range}</span>
                      </div>

                      <div className="item-specialty-box">
                        <span className="spec-label">Specialty:</span>
                        <span className="spec-txt">{rest.specialty}</span>
                      </div>

                      <div className="item-footer">
                        <span className="rating-badge">★ {rest.rating} Pure Veg Certified</span>
                        <span className="table-status">
                          {rest.wait_time_mins === 0 ? '✓ Immediate Seating Available' : '✓ Rapid Table Turnover'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-items-msg">Local food stalls and pilgrim langar counters available near shrine.</p>
                )}
              </div>
            )}

            {/* TAB 2: SCENIC VIEWPOINTS */}
            {activeGuideTab === 'viewpoints' && (
              <div className="guide-items-grid">
                {guide.viewpoints && guide.viewpoints.length > 0 ? (
                  guide.viewpoints.map((view) => (
                    <div key={view.id} className="guide-item-card viewpoint-card">
                      <div className="item-card-top">
                        <div className="item-title-box">
                          <h4 className="item-name">{view.name}</h4>
                          <span className="viewpoint-rating">{view.scenic_rating} Panoramic View</span>
                        </div>
                        {/* Live Crowd Badge */}
                        <div className="item-crowd-badge crowd-low">
                          <span className="crowd-status-indicator"></span>
                          <span className="crowd-txt">
                            🟢 Peaceful Flow ({view.occupancy_pct}% Density)
                          </span>
                        </div>
                      </div>

                      <p className="view-highlight-txt">{view.highlight}</p>

                      <div className="item-footer">
                        <span className="best-time-tag">🌅 <strong>Best Viewing Hours:</strong> {view.best_time}</span>
                        <span className="peace-tag">✨ Uncrowded & Quiet</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-items-msg">Scenic mountain landscapes line the entire approach path.</p>
                )}
              </div>
            )}

            {/* TAB 3: HOTELS & STAYS */}
            {activeGuideTab === 'hotels' && (
              <div className="guide-items-grid">
                {guide.hotels && guide.hotels.length > 0 ? (
                  guide.hotels.map((hotel) => (
                    <div key={hotel.id} className="guide-item-card hotel-card">
                      <div className="item-card-top">
                        <div className="item-title-box">
                          <h4 className="item-name">{hotel.name}</h4>
                          <span className="stay-type-tag">{hotel.type}</span>
                        </div>
                        {/* Occupancy Badge */}
                        <div className={`item-crowd-badge ${hotel.crowd_level === 'LOW' ? 'crowd-low' : 'crowd-mod'}`}>
                          <span className="crowd-status-indicator"></span>
                          <span className="crowd-txt">
                            {hotel.occupancy_pct}% Occupancy ({hotel.rooms_available})
                          </span>
                        </div>
                      </div>

                      <div className="item-wait-line">
                        <span className="price-pill">💵 {hotel.price_range}</span>
                        <span className="distance-pill">📍 {hotel.distance}</span>
                      </div>

                      <div className="item-specialty-box">
                        <span className="spec-label">Amenities:</span>
                        <span className="spec-txt">{hotel.amenities}</span>
                      </div>

                      <div className="item-footer">
                        <span className="booking-status-tag">✓ Walk-in & Temple Booking Available</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-items-msg">Trust dharamshalas and rest halls open near the temple reception.</p>
                )}
              </div>
            )}

            {/* TAB 4: PARKING & TRANSIT ESSENTIALS */}
            {activeGuideTab === 'amenities' && guide.amenities && (
              <div className="amenities-summary-grid">
                {/* Parking Card */}
                {guide.amenities.parking && (
                  <div className="amenity-info-card parking-card">
                    <div className="amenity-card-header">
                      <span className="amenity-icon">🚗</span>
                      <div>
                        <h4 className="amenity-title">Dedicated Pilgrim Parking</h4>
                        <span className="amenity-subtitle">{guide.amenities.parking.name}</span>
                      </div>
                    </div>

                    <div className="parking-telemetry-box">
                      <div className="parking-stat-row">
                        <span>Lot Occupancy:</span>
                        <strong>{guide.amenities.parking.occupancy_pct}% Full</strong>
                      </div>
                      <div className="parking-bar">
                        <div 
                          className="parking-bar-fill" 
                          style={{ width: `${guide.amenities.parking.occupancy_pct}%` }}
                        ></div>
                      </div>
                      <div className="parking-stat-row availability">
                        <span>Free Space:</span>
                        <strong className="available-slots">{guide.amenities.parking.slots_available}</strong>
                      </div>
                    </div>

                    <div className="amenity-footer-status">
                      ✓ {guide.amenities.parking.status}
                    </div>
                  </div>
                )}

                {/* Drinking Water Card */}
                <div className="amenity-info-card">
                  <div className="amenity-card-header">
                    <span className="amenity-icon">💧</span>
                    <div>
                      <h4 className="amenity-title">Purified Drinking Water</h4>
                      <span className="amenity-subtitle">Sanctioned Holy Spring Dispensary</span>
                    </div>
                  </div>
                  <p className="amenity-desc">{guide.amenities.water_atm}</p>
                  <div className="amenity-footer-status">
                    ✓ Clean & Temperature Controlled
                  </div>
                </div>

                {/* Medical Aid Card */}
                <div className="amenity-info-card">
                  <div className="amenity-card-header">
                    <span className="amenity-icon">🩺</span>
                    <div>
                      <h4 className="amenity-title">First Aid & Triage Post</h4>
                      <span className="amenity-subtitle">Emergency Health Booth</span>
                    </div>
                  </div>
                  <p className="amenity-desc">{guide.amenities.medical}</p>
                  <div className="amenity-footer-status">
                    ✓ Oxygen Support & Paramedic On Duty
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
