import React, { useState } from 'react';

export default function TravelCompanyDashboard({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  showToast,
  externalTab
}) {
  const [selectedCircuit, setSelectedCircuit] = useState('chardham');
  const [customSelectedSites, setCustomSelectedSites] = useState(['site_kedarnath', 'site_badrinath']);
  const [activeTab, setActiveTab] = useState('circuits'); // 'circuits' | 'optimizer' | 'matrix'

  React.useEffect(() => {
    if (externalTab && ['circuits', 'optimizer', 'matrix'].includes(externalTab)) {
      setActiveTab(externalTab);
    }
  }, [externalTab]);

  // Pre-configured Sacred Circuits
  const PRESET_CIRCUITS = [
    {
      id: 'chardham',
      name: 'Char Dham Himalayan Sacred Circuit',
      region: 'Garhwal Himalayas, Uttarakhand',
      description: 'The holiest four-abode pilgrimage high in the Garhwal Himalayas.',
      duration: '9 Days / 8 Nights',
      recommendedGroupSize: '15 - 35 Devotees',
      siteIds: ['site_kedarnath', 'site_badrinath', 'site_ts015'],
      sisterAlternatives: [
        { name: 'Tungnath Temple (Chopta)', wait: '20 mins', dist: '18 km from Guptkashi' },
        { name: 'Ukhimath Omkareshwar Mandir', wait: '15 mins', dist: 'Winter Seat of Kedarnath' },
        { name: 'Kalpeshwar Jyotirlinga', wait: '15 mins', dist: 'Year-round open shrine' }
      ]
    },
    {
      id: 'spiritual_triangle',
      name: 'Holy Ganges & Awadh Spiritual Triangle',
      region: 'Uttar Pradesh & Bihar Corridor',
      description: 'Kashi Vishwanath Corridor, Ram Janmabhoomi, and sacred Triveni Sangam.',
      duration: '5 Days / 4 Nights',
      recommendedGroupSize: '20 - 45 Devotees',
      siteIds: ['site_kashi', 'site_ayodhya', 'site_ts016'],
      sisterAlternatives: [
        { name: 'Sarnath Buddhist Shrines', wait: '15 mins', dist: '10 km from Varanasi' },
        { name: 'Kanak Bhawan (Ayodhya)', wait: '20 mins', dist: 'Walking distance from Ram Mandir' }
      ]
    },
    {
      id: 'south_gopurams',
      name: 'Great Dravidian Temple Trail',
      region: 'Andhra Pradesh & Tamil Nadu',
      description: 'Tirumala Balaji, Madurai Meenakshi, and the coastal Jyotirlinga at Rameswaram.',
      duration: '7 Days / 6 Nights',
      recommendedGroupSize: '12 - 30 Devotees',
      siteIds: ['site_tirupati', 'site_meenakshi', 'site_ts011'],
      sisterAlternatives: [
        { name: 'Sri Kalahasteeswara Temple', wait: '25 mins', dist: '36 km from Tirupati (Vayu Lingam)' },
        { name: 'Thiruparankundram Murugan Temple', wait: '20 mins', dist: '8 km from Madurai' }
      ]
    }
  ];

  const activeCircuitData = PRESET_CIRCUITS.find((c) => c.id === selectedCircuit) || PRESET_CIRCUITS[0];

  // Helper to get telemetry for any site
  const getSiteTelemetry = (siteId) => {
    const siteObj = sites.find((s) => s.id === siteId) || { id: siteId, name: 'Sacred Shrine', capacity: 10000 };
    const d = densityMap[siteId] || { people_count: Math.round((siteObj.capacity || 10000) * 0.48), occupancy_percentage: 48, status: 'NORMAL' };
    const occ = d.occupancy_percentage != null ? d.occupancy_percentage : 48;
    const status = d.status || (occ >= 90 ? 'CRITICAL' : occ >= 75 ? 'HIGH' : occ >= 50 ? 'MODERATE' : 'NORMAL');
    
    let waitMins = 25;
    if (occ >= 90) waitMins = 540;
    else if (occ >= 75) waitMins = 360;
    else if (occ >= 50) waitMins = 120;

    return {
      site: siteObj,
      density: d,
      occupancy: occ,
      status,
      waitMins
    };
  };

  // Calculate Total Circuit Wait Time
  const circuitTelemetries = activeCircuitData.siteIds.map((sid) => getSiteTelemetry(sid));
  const totalCircuitWait = circuitTelemetries.reduce((acc, t) => acc + t.waitMins, 0);

  // Alternative package saved queue time
  const optimizedWaitTime = Math.round(totalCircuitWait * 0.35);
  const savedMinutes = totalCircuitWait - optimizedWaitTime;

  const handleExportPackage = () => {
    if (showToast) {
      showToast(`📄 Exported AI Crowd-Balanced Itinerary for "${activeCircuitData.name}"! Saves ~${Math.round(savedMinutes / 60)} hours.`);
    }
  };

  const handleToggleCustomSite = (siteId) => {
    setCustomSelectedSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  return (
    <div className="travel-dashboard-root" id="travel-dashboard">
      {/* Top Banner */}
      <div className="travel-header-banner">
        <div className="travel-header-title-row">
          <div className="travel-badge-icon">🚌</div>
          <div>
            <div className="travel-top-tag">
              <span>PILGRIMAGE TOUR OPERATORS &amp; FLEET LOGISTICS</span>
              <span className="travel-partner-tag">✓ VERIFIED YATRA PARTNER</span>
            </div>
            <h1 className="travel-header-title">
              Garhwal Divine Pilgrimage Expeditions &amp; Fleet Logistics
            </h1>
            <p className="travel-header-subtitle">
              AI Dynamic Route Redistribution • Queue vs Distance Optimization • Multi-Destination Crowd-Balanced Pilgrimage Packages
            </p>
          </div>
        </div>

        <div className="travel-fleet-pill">
          <span className="travel-pill-icon">🧭</span>
          <div>
            <div className="travel-pill-name">FLEET COMMAND CENTER</div>
            <div className="travel-pill-role">24 LUXURY VOLVO BUSES • 40 CERTIFIED YATRA GUIDES</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="travel-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab('circuits')}
          className={`travel-tab-btn ${activeTab === 'circuits' ? 'active' : ''}`}
        >
          🗺️ Smart Pilgrimage Circuits &amp; Itineraries
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('optimizer')}
          className={`travel-tab-btn ${activeTab === 'optimizer' ? 'active' : ''}`}
        >
          ⚡ Queue vs Distance Optimization Engine
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`travel-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
        >
          📊 National 25-Shrine Fleet Intelligence Matrix
        </button>
      </div>

      {/* TAB 1: Smart Pilgrimage Circuits & Itinerary Planner */}
      {activeTab === 'circuits' && (
        <div className="circuits-section" id="travel-trips">
          <div id="travel-groups" style={{ display: 'none' }} />
          {/* Circuit Selectors Grid */}
          <div className="circuit-selector-grid">
            {PRESET_CIRCUITS.map((c) => {
              const isSelected = c.id === selectedCircuit;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCircuit(c.id)}
                  className={`circuit-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="circuit-card-header">
                    <span className="circuit-duration">{c.duration}</span>
                    <span className="circuit-region-tag">{c.region}</span>
                  </div>
                  <h3 className="circuit-name">{c.name}</h3>
                  <p className="circuit-desc">{c.description}</p>
                  <div className="circuit-card-footer">
                    <span>{c.siteIds.length} Major Shrines</span>
                    <span className="circuit-select-action">{isSelected ? '✓ ACTIVE CIRCUIT' : 'Select Circuit ➔'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Circuit Deep-Dive */}
          <div className="active-circuit-detail-panel">
            <div className="panel-header detail-header-flex">
              <div>
                <h3 className="panel-title">{activeCircuitData.name}</h3>
                <p className="panel-desc">
                  Live Queue Telemetry &amp; Dynamic Slot Allocation for Tour Groups
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPackage}
                className="export-package-btn"
              >
                📄 Export AI Pilgrimage Package (PDF / Sheet)
              </button>
            </div>

            {/* Circuit Telemetry Summary Bar */}
            <div className="circuit-metrics-banner">
              <div className="metric-box">
                <span className="m-label">STANDARD DARSHAN WAIT TIME</span>
                <span className="m-val text-warning">
                  ⏱️ {Math.floor(totalCircuitWait / 60)}h {totalCircuitWait % 60}m
                </span>
                <span className="m-sub">Without AI Crowd Flow Balancing</span>
              </div>

              <div className="metric-box highlighted">
                <span className="m-label">AI OPTIMIZED YATRA WAIT TIME</span>
                <span className="m-val text-success">
                  ⚡ {Math.floor(optimizedWaitTime / 60)}h {optimizedWaitTime % 60}m
                </span>
                <span className="m-sub">Early-Morning Darshan + Sister Shrines</span>
              </div>

              <div className="metric-box">
                <span className="m-label">ESTIMATED TIME SAVED PER PILGRIM</span>
                <span className="m-val text-highlight">
                  🎉 ~{Math.floor(savedMinutes / 60)} Hours Saved
                </span>
                <span className="m-sub">+25 Green Punya Points per traveler</span>
              </div>
            </div>

            {/* Shrines in Circuit */}
            <h4 className="section-subtitle">Shrines in this Circuit &amp; Live Congestion Level:</h4>
            <div className="circuit-sites-grid">
              {circuitTelemetries.map((t) => (
                <div key={t.site.id} className={`circuit-site-card ${t.status.toLowerCase()}`}>
                  <div className="site-card-top">
                    <span className="site-name">{t.site.name}</span>
                    <span className={`status-pill ${t.status.toLowerCase()}`}>{t.status}</span>
                  </div>
                  <div className="site-meta">
                    <span>📍 {t.site.city}</span>
                    <span>Cap: {t.site.capacity?.toLocaleString()}</span>
                  </div>
                  <div className="site-wait-box">
                    <span className="w-lbl">Est. Current Queue:</span>
                    <span className="w-val">⏱️ {t.waitMins} mins</span>
                  </div>
                  <div className="recommended-slot">
                    <span>Optimal Arrival: <strong>05:30 AM (Morning Aarti)</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommended Sister Shrines for Congestion Relief */}
            <div className="sister-shrines-box">
              <div className="sister-header">
                <span className="sister-icon">💡</span>
                <div>
                  <h4 style={{ margin: 0, color: '#0F172A' }}>
                    AI Recommended Sister Shrine Diversions (Redistribution Layer)
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                    Redirect tourist groups to nearby holy sites when primary shrines experience &gt;= 75% congestion:
                  </p>
                </div>
              </div>

              <div className="sister-cards-row">
                {activeCircuitData.sisterAlternatives.map((alt, idx) => (
                  <div key={idx} className="sister-card">
                    <div className="sister-title">🛕 {alt.name}</div>
                    <div className="sister-stats">
                      <span className="sister-wait">⏱️ Wait: <strong>{alt.wait}</strong></span>
                      <span className="sister-dist">📍 {alt.dist}</span>
                    </div>
                    <div className="sister-advantage">
                      ✓ Zero Queue Bottleneck • Earns +25 Punya Points
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Queue vs Distance Optimizer */}
      {activeTab === 'optimizer' && (
        <div className="optimizer-section" id="travel-crowd-alerts">
          <div className="optimizer-intro-card">
            <span className="intro-icon">⚡</span>
            <div>
              <h3 style={{ margin: '0 0 0.35rem', color: '#0F172A' }}>
                Kedarnath Himalayan Choke Point vs Sister Shrines Optimizer
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                When Kedarnath Temple reaches <strong>95% CRITICAL density (540 min wait)</strong>, smart tour operators balance group travel by redirecting morning groups to sacred Panch Kedar sister shrines.
              </p>
            </div>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Destination Shrine</th>
                  <th>Current Crowd Level</th>
                  <th>Estimated Queue Wait</th>
                  <th>Travel Distance from Guptkashi</th>
                  <th>Queue-to-Distance Efficiency</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="primary-congested-row">
                  <td className="font-bold">
                    🛕 Kedarnath Temple (TS001)
                    <span className="badge-primary">PRIMARY SHRINE</span>
                  </td>
                  <td>
                    <span className="gov-status-badge critical">95% CRITICAL</span>
                  </td>
                  <td className="font-mono font-bold text-critical">⏱️ 540 min (9 Hours)</td>
                  <td>16 km Trek from Gaurikund</td>
                  <td>
                    <div className="efficiency-bar red">
                      <div className="bar-fill" style={{ width: '20%' }}></div>
                    </div>
                    <span className="eff-text">20% (Severe Delay)</span>
                  </td>
                  <td>
                    <span className="action-warning">🚨 Hold Tour Groups in Buffer Lodge</span>
                  </td>
                </tr>

                <tr className="recommended-alt-row">
                  <td className="font-bold">
                    🛕 Tungnath Temple (Chopta)
                    <span className="badge-sister">HIGHEST SHIVA SHRINE</span>
                  </td>
                  <td>
                    <span className="gov-status-badge normal">22% NORMAL</span>
                  </td>
                  <td className="font-mono font-bold text-success">⏱️ 20 min</td>
                  <td>18 km by Bus + 3.5 km Trek</td>
                  <td>
                    <div className="efficiency-bar green">
                      <div className="bar-fill" style={{ width: '95%' }}></div>
                    </div>
                    <span className="eff-text">95% (Highly Efficient)</span>
                  </td>
                  <td>
                    <span className="action-good">✅ Recommended Morning Diversion</span>
                  </td>
                </tr>

                <tr className="recommended-alt-row">
                  <td className="font-bold">
                    🛕 Omkareshwar Temple (Ukhimath)
                    <span className="badge-sister">WINTER SEAT OF KEDARNATH</span>
                  </td>
                  <td>
                    <span className="gov-status-badge normal">18% NORMAL</span>
                  </td>
                  <td className="font-mono font-bold text-success">⏱️ 15 min</td>
                  <td>12 km Paved Road (Zero Trek)</td>
                  <td>
                    <div className="efficiency-bar green">
                      <div className="bar-fill" style={{ width: '98%' }}></div>
                    </div>
                    <span className="eff-text">98% (Ideal for Senior Devotees)</span>
                  </td>
                  <td>
                    <span className="action-good">✅ Direct Bus Access &amp; Fast Darshan</span>
                  </td>
                </tr>

                <tr className="recommended-alt-row">
                  <td className="font-bold">
                    🛕 Triyuginarayan Mandir
                    <span className="badge-sister">SACRED AKHAND DHUNI</span>
                  </td>
                  <td>
                    <span className="gov-status-badge normal">28% NORMAL</span>
                  </td>
                  <td className="font-mono font-bold text-success">⏱️ 25 min</td>
                  <td>14 km from Sonprayag</td>
                  <td>
                    <div className="efficiency-bar green">
                      <div className="bar-fill" style={{ width: '88%' }}></div>
                    </div>
                    <span className="eff-text">88% (Smooth Spiritual Experience)</span>
                  </td>
                  <td>
                    <span className="action-good">✅ Evening Aarti Package</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: National 25-Shrine Fleet Intelligence Matrix */}
      {activeTab === 'matrix' && (
        <div className="matrix-section" id="travel-routes">
          <div className="matrix-grid">
            {sites.map((site) => {
              const tel = getSiteTelemetry(site.id);
              return (
                <div key={site.id} className="fleet-matrix-card">
                  <div className="matrix-card-top">
                    <div>
                      <span className="matrix-id">{site.id}</span>
                      <h4 className="matrix-name">{site.name}</h4>
                      <span className="matrix-loc">{site.city}</span>
                    </div>
                    <span className={`gov-status-badge ${tel.status.toLowerCase()}`}>
                      {tel.status}
                    </span>
                  </div>

                  <div className="matrix-stats-row">
                    <div className="stat">
                      <span className="s-lbl">Live Count</span>
                      <span className="s-val">{tel.density.people_count?.toLocaleString() || '1,200'}</span>
                    </div>
                    <div className="stat">
                      <span className="s-lbl">Est. Queue</span>
                      <span className="s-val">⏱️ {tel.waitMins} min</span>
                    </div>
                    <div className="stat">
                      <span className="s-lbl">Capacity</span>
                      <span className="s-val">{site.capacity?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="matrix-action-row">
                    <span className="road-cond">🛣️ Paved Highway / Pass</span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSite && onSelectSite(site.id);
                        if (showToast) showToast(`Selected ${site.name} for fleet itinerary.`);
                      }}
                      className="matrix-select-btn"
                    >
                      Inspect Route ➔
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
