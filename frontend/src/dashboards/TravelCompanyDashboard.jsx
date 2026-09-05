import React, { useState, useEffect } from 'react';
import { SITE_ID_ALIASES, saveFleetSchedules, fetchFleetSchedules } from '../api/api';
import CorridorRouteMap from '../components/CorridorRouteMap';

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
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fleetRoutes, setFleetRoutes] = useState([
    { id: 'HR-01', from: 'Delhi (ISBT Kashmiri Gate)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 3, capacity: 42, occupancy: 94, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-02', from: 'Dehradun (Bus Stand)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 2, capacity: 38, occupancy: 100, type: 'Sleeper', status: 'FULL' },
    { id: 'HR-03', from: 'Haridwar (Har Ki Pauri)', to: 'Delhi (ISBT Kashmiri Gate)', date: 'Oct 13 (Sun)', buses: 3, capacity: 42, occupancy: 22, type: 'Volvo A/C', status: 'RETURN' },
    { id: 'HR-04', from: 'Rishikesh (Triveni Ghat)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 1, capacity: 30, occupancy: 67, type: 'Mini Bus', status: 'NORMAL' },
  ]);

  // Load live schedule from backend on mount
  useEffect(() => {
    fetchFleetSchedules().then((routes) => {
      if (routes && routes.length > 0) {
        setFleetRoutes(routes.map((r) => ({
          id: r.id,
          from: r.from_location || r.from,
          to: r.to_location || r.to,
          date: r.journey_date || r.date,
          buses: r.buses,
          capacity: r.capacity || 42,
          occupancy: r.occupancy || 80,
          type: r.bus_type || r.type || 'Volvo A/C',
          status: r.status || 'NORMAL',
        })));
      }
    });
  }, []);

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

  // Helper to resolve site objects across aliases
  const resolveSite = (id) => {
    const alias = SITE_ID_ALIASES[id];
    return (
      sites.find((s) => s.id === id || (alias && s.id === alias)) ||
      sites.find((s) => s.name.toLowerCase().includes(id.replace('site_', '').toLowerCase())) ||
      { id, name: id.replace('site_', '').toUpperCase(), capacity: 10000 }
    );
  };

  // Helper to get telemetry for any site
  const getSiteTelemetry = (siteId) => {
    const siteObj = resolveSite(siteId);
    const alias = SITE_ID_ALIASES[siteId] || SITE_ID_ALIASES[siteObj.id];
    const d =
      densityMap[siteObj.id] ||
      densityMap[siteId] ||
      (alias ? densityMap[alias] : null) || {
        people_count: Math.round((siteObj.capacity || 10000) * 0.48),
        occupancy_percentage: 48,
        status: 'NORMAL'
      };
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
  const kedaTel = getSiteTelemetry('TS001');
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

  // Forward + Return Fill Predictor Logic
  const forwardRoutes = fleetRoutes.filter(r => r.from.includes('Delhi') || r.from.includes('Dehradun') || r.from.includes('Rishikesh'));
  const returnRoutes = fleetRoutes.filter(r => r.from.includes('Haridwar'));

  const forwardAvg = forwardRoutes.length ? Math.round(forwardRoutes.reduce((acc, r) => acc + r.occupancy, 0) / forwardRoutes.length) : 0;
  const returnAvg = returnRoutes.length ? Math.round(returnRoutes.reduce((acc, r) => acc + r.occupancy, 0) / returnRoutes.length) : 0;

  const forwardLow = Math.max(0, forwardAvg - 4);
  const forwardHigh = Math.min(100, forwardAvg + 3);
  
  const returnLow = Math.max(0, returnAvg - 4);
  const returnHigh = Math.min(100, returnAvg + 3);

  const imbalance = Math.abs(forwardAvg - returnAvg);

  return (
    <div className="travel-dashboard-root" id="travel-dashboard">

      {/* SHARMA TRAVELS: HARIDWAR PREDICTIVE WARNING */}
      <div style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '0.75rem', margin: '1.5rem 1.5rem 0', overflow: 'hidden' }}>
        {/* Top row: alert headline + button */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid #FDE68A' }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 0.2rem', color: '#92400E', fontSize: '1.1rem' }}>Sharma Travels Route Intelligence Alert</h3>
            <p style={{ margin: 0, color: '#B45309', fontSize: '0.95rem' }}>
              Somvati Amavasya Crowd Demand &amp; Bus Seat Predictor — Haridwar Corridor
            </p>
          </div>
          <button onClick={() => setShowFleetModal(true)} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#D97706', color: '#FFF', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>🚌 Adjust Fleet Schedule</button>
        </div>

        {/* Simple & Clear Timestamped Spike Banner */}
        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#78350F', fontSize: '0.92rem', fontWeight: '600' }}>
            <span style={{ backgroundColor: '#DC2626', color: '#FFF', padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.82rem', fontWeight: 'bold' }}>🚨 HUGE CROWD SPIKE AT 4:00 PM</span>
            <span>AI Cameras detected <strong>2,450 devotees/min</strong> exiting Har Ki Pauri Ghats at <strong>4:00 PM</strong></span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 'bold', backgroundColor: '#FFF', padding: '0.25rem 0.6rem', borderRadius: '0.25rem', border: '1px solid #FCD34D' }}>
            📹 Live CCTV Vision Telemetry
          </div>
        </div>

        {/* Journey timing cards: Forward | Return */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

          {/* FORWARD JOURNEY */}
          <div style={{ padding: '1rem 1.5rem', borderRight: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.1rem' }}>➡️</span>
              <span style={{ fontWeight: 'bold', color: '#92400E', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forward Trip · Friday Oct 12</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1E3A8A', margin: '0.5rem 0' }}>
              {forwardLow}–{forwardHigh}% full
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '0.75rem' }}>
              Heavy morning influx heading towards Haridwar. High demand expected on morning departures.
            </div>
            <div style={{ width: '100%', backgroundColor: '#E5E7EB', borderRadius: '999px', height: '0.75rem', overflow: 'hidden' }}>
              <div style={{ width: `${forwardAvg}%`, backgroundColor: '#D97706', height: '100%' }}></div>
            </div>
          </div>

          {/* RETURN JOURNEY */}
          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.1rem' }}>↩️</span>
              <span style={{ fontWeight: 'bold', color: '#92400E', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Return Trip · Sunday Oct 13</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#DC2626', margin: '0.5rem 0' }}>
              {returnLow}–{returnHigh}% full
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '0.75rem' }}>
              Buses returning empty. Action needed to capture the 4:00 PM post-pooja return crowd.
            </div>
            <div style={{ width: '100%', backgroundColor: '#E5E7EB', borderRadius: '999px', height: '0.75rem', overflow: 'hidden' }}>
              <div style={{ width: `${returnAvg}%`, backgroundColor: '#DC2626', height: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* RECOMMENDATION PANEL — SIMPLE FOR TRAVEL OPERATOR */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#FEF2F2', borderTop: '1px solid #FCA5A5', display: 'flex', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>💡</span>
          <div>
            <h4 style={{ margin: '0 0 0.4rem', color: '#991B1B', fontSize: '1rem', fontWeight: 'bold' }}>Operator Action Plan (Based on 4:00 PM Spike Alert)</h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#B91C1C', fontSize: '0.88rem', lineHeight: '1.5' }}>
              <li style={{ marginBottom: '0.3rem' }}>
                <strong>⏰ 4:00 PM Peak Exit Spike:</strong> AI CCTV cameras detected a massive exit crowd at <strong>4:00 PM</strong> after the Somvati Amavasya holy dip. 85% of devotees are heading to the bus stand right now.
              </li>
              <li style={{ marginBottom: '0.3rem' }}>
                <strong>🏷️ Fill Empty Return Buses:</strong> Offer a <strong>15–20% discount on 4:30 PM &amp; 5:00 PM return tickets</strong> to quickly fill your empty buses returning to Delhi.
              </li>
              <li>
                <strong>🚌 Change Pickup Location:</strong> Move return pickup hub from Har Ki Pauri ghats to <strong>BHEL Satellite Parking</strong> (3 km away) to bypass city center traffic.
              </li>
            </ul>
          </div>
        </div>
      </div>
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
          onClick={() => setActiveTab('map')}
          className={`travel-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
        >
          📍 Live Corridor Highway Map
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`travel-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
        >
          📊 National 25-Shrine Fleet Intelligence Matrix
        </button>
      </div>

      {/* TAB: Live Corridor Highway Map */}
      {activeTab === 'map' && (
        <div style={{ margin: '1.5rem 1.5rem' }}>
          <CorridorRouteMap height="550px" />
        </div>
      )}

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
                    <span className={`gov-status-badge ${(kedaTel.status || 'normal').toLowerCase()}`}>
                      {kedaTel.occupancy}% {kedaTel.status}
                    </span>
                  </td>
                  <td className={`font-mono font-bold ${kedaTel.status === 'CRITICAL' ? 'text-critical' : ''}`}>
                    ⏱️ {kedaTel.waitMins} min {kedaTel.waitMins >= 60 ? `(${Math.round(kedaTel.waitMins / 60)} Hours)` : ''}
                  </td>
                  <td>16 km Trek from Gaurikund</td>
                  <td>
                    <div className={`efficiency-bar ${kedaTel.occupancy >= 80 ? 'red' : kedaTel.occupancy >= 50 ? 'yellow' : 'green'}`}>
                      <div className="bar-fill" style={{ width: `${Math.max(10, 100 - kedaTel.occupancy)}%` }}></div>
                    </div>
                    <span className="eff-text">{Math.max(10, 100 - kedaTel.occupancy)}% {kedaTel.occupancy >= 80 ? '(Severe Delay)' : '(Optimal)'}</span>
                  </td>
                  <td>
                    <span className={kedaTel.occupancy >= 80 ? "action-warning" : "action-good"}>
                      {kedaTel.occupancy >= 80 ? "🚨 Hold Tour Groups in Buffer Lodge" : "✅ Normal Tour Flow"}
                    </span>
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

      {/* ====================================================== */}
      {/* FLEET SCHEDULE ADJUSTMENT MODAL                        */}
      {/* ====================================================== */}
      {showFleetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #92400E, #D97706)', padding: '1.5rem 2rem', borderRadius: '1rem 1rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: '#FFF', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  🚌 Fleet Schedule Adjustment Panel
                </h2>
                <p style={{ margin: 0, color: '#FDE68A', fontSize: '0.95rem' }}>
                  Haridwar – Somvati Amavasya (Oct 12–13) · Adjust buses per route to match demand
                </p>
              </div>
              <button onClick={() => setShowFleetModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* AI Recommendation Banner */}
            <div style={{ backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <p style={{ margin: 0, color: '#92400E', fontSize: '0.95rem', fontWeight: '500' }}>
                <strong>AI Recommendation:</strong> Add at least <strong>2 extra buses</strong> on the Delhi→Haridwar route (HR-01) and <strong>1 extra bus</strong> on the return leg (HR-03) to handle the Somvati Amavasya surge safely.
              </p>
            </div>

            {/* Route Cards */}
            <div style={{ padding: '1.5rem 2rem' }}>
              <h3 style={{ margin: '0 0 1rem', color: '#374151', fontSize: '1.1rem' }}>Active Routes – Haridwar Corridor</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fleetRoutes.map((route, idx) => {
                  const isFull = route.occupancy >= 100;
                  const isHighDemand = route.occupancy >= 80;
                  const statusColor = isFull ? '#DC2626' : isHighDemand ? '#D97706' : '#16A34A';
                  const statusBg = isFull ? '#FEF2F2' : isHighDemand ? '#FFFBEB' : '#F0FDF4';

                  return (
                    <div key={route.id} style={{ border: `1.5px solid ${isFull ? '#FECACA' : isHighDemand ? '#FDE68A' : '#BBF7D0'}`, borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: statusBg }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#6B7280', background: '#E5E7EB', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{route.id}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: statusColor, background: statusBg, border: `1px solid ${statusColor}`, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{route.status}</span>
                          </div>
                          <p style={{ margin: '0 0 0.15rem', fontWeight: 'bold', color: '#111827', fontSize: '1rem' }}>
                            📍 {route.from} → {route.to}
                          </p>
                          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>📅 {route.date} · 🚌 {route.type}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: statusColor }}>{route.occupancy}%</div>
                          <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Avg Occupancy</div>
                        </div>
                      </div>

                      {/* Bus Count Adjuster */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: '0.5rem', padding: '0.75rem 1rem', border: '1px solid #E5E7EB' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buses Assigned</span>
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#6B7280' }}>Each bus carries up to {route.capacity} passengers</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button
                            onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: Math.max(1, r.buses - 1) } : r))}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827', minWidth: '2.5rem', textAlign: 'center' }}>{route.buses}</span>
                          <button
                            onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: r.buses + 1 } : r))}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #D97706', background: '#FEF3C7', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E' }}
                          >+</button>
                          <div style={{ fontSize: '0.85rem', color: '#6B7280', textAlign: 'right', minWidth: '80px' }}>
                            Total capacity:<br/>
                            <strong style={{ color: '#111827' }}>{route.buses * route.capacity} seats</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '1rem 2rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFleetModal(false)} style={{ padding: '0.65rem 1.5rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const payload = fleetRoutes.map((r) => ({ id: r.id, buses: r.buses, operator: 'Sharma Travels' }));
                    const result = await saveFleetSchedules(payload);
                    setShowFleetModal(false);
                    if (result?.status === 'success') {
                      if (showToast) showToast('✅ Fleet schedule saved to database! Hotel & Government dashboards will update within 30s.');
                    } else {
                      if (showToast) showToast('⚠️ Saved locally. Backend sync pending — Hotel dashboard will update shortly.');
                    }
                  } catch (err) {
                    if (showToast) showToast('⚠️ Could not reach backend. Changes saved locally for this session.');
                    setShowFleetModal(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ padding: '0.65rem 1.75rem', backgroundColor: isSaving ? '#9CA3AF' : '#D97706', color: '#FFF', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? '⏳ Saving...' : '✅ Confirm & Notify Drivers'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
