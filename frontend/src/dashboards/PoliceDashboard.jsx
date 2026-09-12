/**
 * DEPRECATED / RETIRED COMPONENT
 * As per unified architecture requirements, there is NO standalone Police Dashboard.
 * Police / Law Enforcement is an operational subrole (`government_subrole: "police_official"`)
 * inside the unified `GovernmentDashboard.jsx`.
 * This file is preserved only for archival/reference purposes and is not routed in App.jsx.
 */
import React, { useState, useEffect } from 'react';
import {
  updateCrowdObservation,
  fetchActiveSOSAlerts,
  activateEmergencyReroute,
  deactivateEmergencyReroute,
  fetchActiveRerouteAlert,
  createCrowdSimulation,
  fetchCrowdSimulations,
  fetchCrowdSimulation,
  deleteCrowdSimulation,
  dispatchPoliceSOSAlert,
  fetchPoliceSOSStatus
} from '../api/api';
import './PoliceDashboard.css';

function getStructuredRecommendations(sim) {
  if (!sim) return { crowdControl: '', safety: '', traffic: '', altRec: '' };
  const recs = sim.recommendations || [];
  let crowdControl = recs.find(r => r.toLowerCase().includes('queue') || r.toLowerCase().includes('barricade') || r.toLowerCase().includes('holding')) ||
    `Establish 3-stage holding pens along ${sim.site_name} approach corridor and enforce one-way entry gates.`;
  let safety = recs.find(r => r.toLowerCase().includes('medical') || r.toLowerCase().includes('sdrf') || r.toLowerCase().includes('evacuation') || r.toLowerCase().includes('oxygen')) ||
    `Pre-position 2 mobile medical ambulances and SDRF quick-response teams at primary assembly exits.`;
  let traffic = recs.find(r => r.toLowerCase().includes('traffic') || r.toLowerCase().includes('bypass') || r.toLowerCase().includes('parking') || r.toLowerCase().includes('fastag')) ||
    `Divert non-priority heavy vehicles to satellite parking 12km outside ${sim.site_name} perimeter.`;
  let altRec = sim.low_density_alternatives && sim.low_density_alternatives.length > 0
    ? `Recommend pilgrims divert to ${sim.low_density_alternatives[0].name} (~${sim.low_density_alternatives[0].distance_km} km, ${sim.low_density_alternatives[0].crowd_savings}).`
    : `Broadcast advisory to stagger incoming pilgrimage groups over a 4-hour window.`;
  return { crowdControl, safety, traffic, altRec };
}

export default function PoliceDashboard({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  onCrowdUpdated,
  currentUser,
  showToast,
  activeTab: propActiveTab,
  onTabChange,
  activeRerouteAlert: propRerouteAlert
}) {
  // Navigation Tabs (9 Tabs):
  // 'overview' | 'live-crowd' | 'surge-alerts' | 'emergency-response' |
  // 'police-simulation' | 'traffic-control' | 'sos-response' | 'safety-zones' | 'reports-analytics'
  const [activeTab, setActiveTab] = useState(() => propActiveTab || 'overview');

  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  const handleSwitchTab = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --------------------------------------------------------------------------
  // REROUTE & EMERGENCY STATE
  // --------------------------------------------------------------------------
  const [isRerouteActive, setIsRerouteActive] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [emergencyTimestamp, setEmergencyTimestamp] = useState(null);

  useEffect(() => {
    if (propRerouteAlert) {
      setIsRerouteActive(propRerouteAlert.is_active === true);
      setEmergencyTimestamp(propRerouteAlert.activated_at || null);
    }
  }, [propRerouteAlert]);

  useEffect(() => {
    async function checkRerouteState() {
      try {
        const activeAlert = await fetchActiveRerouteAlert();
        if (activeAlert && activeAlert.is_active) {
          setIsRerouteActive(true);
          setEmergencyTimestamp(activeAlert.activated_at);
        } else {
          setIsRerouteActive(false);
        }
      } catch (err) {
        console.error('Failed to query active emergency reroutes:', err);
      }
    }
    checkRerouteState();
    const interval = setInterval(checkRerouteState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleActivateEmergency = async () => {
    setIsRecalculating(true);
    try {
      const targetSiteId = selectedSiteId || 'TS015';
      await activateEmergencyReroute(targetSiteId, {
        site_name: 'Haridwar City Center Corridor',
        bottleneck_zone: 'Zone A - Har Ki Pauri / Upper Road',
        diverted_tourists: 350,
        partner_buses: 14,
        partner_hotels: 22,
        reroute_route: 'Rishikesh Satellite Bypass & BHEL Parking Hub'
      });
      setIsRerouteActive(true);
      setEmergencyTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (showToast) {
        showToast('🚨 POLICE OVERRIDE ENFORCED: Highway traffic diverted to satellite parking.');
      }
    } catch (err) {
      console.error('Failed to activate emergency reroute:', err);
      if (showToast) {
        showToast(`⚠️ Emergency override failed: ${err.message || err}`);
      }
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleLiftEmergency = async () => {
    setIsRecalculating(true);
    try {
      const targetSiteId = selectedSiteId || 'TS015';
      await deactivateEmergencyReroute(targetSiteId, 'Normal corridor transit resumed by Police HQ.');
      setIsRerouteActive(false);
      setEmergencyTimestamp(null);
      if (showToast) {
        showToast('✅ POLICE DIRECTIVE: Emergency reroute lifted. Normal traffic resumed.');
      }
    } catch (err) {
      console.error('Failed to deactivate emergency reroute:', err);
      if (showToast) {
        showToast(`⚠️ Failed to lift reroute: ${err.message || err}`);
      }
    } finally {
      setIsRecalculating(false);
    }
  };

  // --------------------------------------------------------------------------
  // CROWD TELEMETRY & OBSERVATION UPDATE (Authorized for Police)
  // --------------------------------------------------------------------------
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [isUpdatingCrowd, setIsUpdatingCrowd] = useState(false);
  const [manualCountInput, setManualCountInput] = useState('');

  const siteTelemetryList = sites.map((s) => {
    const liveData = densityMap[s.id] || {};
    const peopleCount = liveData.people_count ?? 2500;
    const capacity = s.capacity || liveData.capacity || 10000;
    const occ = Math.min(100, Math.round((peopleCount / capacity) * 100));
    let status = 'NORMAL';
    if (occ >= 90) status = 'CRITICAL';
    else if (occ >= 75) status = 'HIGH';
    else if (occ >= 50) status = 'MODERATE';

    return {
      id: s.id,
      name: s.name,
      city: s.city,
      state: s.state,
      people_count: peopleCount,
      capacity: capacity,
      occupancy_percentage: occ,
      status: status,
      wait_time_minutes: liveData.wait_time_minutes || Math.round((occ / 100) * 120),
      trend: occ > 75 ? '↑' : occ < 40 ? '↓' : '→'
    };
  });

  const criticalCount = siteTelemetryList.filter(s => s.status === 'CRITICAL').length;
  const highCount = siteTelemetryList.filter(s => s.status === 'HIGH').length;
  const totalDevotees = siteTelemetryList.reduce((acc, s) => acc + s.people_count, 0);

  const filteredSites = siteTelemetryList.filter((s) => {
    if (filterLevel === 'CRITICAL') return s.status === 'CRITICAL';
    if (filterLevel === 'HIGH') return s.status === 'HIGH' || s.status === 'CRITICAL';
    if (filterLevel === 'MODERATE') return s.status === 'MODERATE';
    return true;
  });

  const activeSite = siteTelemetryList.find(s => s.id === selectedSiteId) || siteTelemetryList[0] || {
    id: 'TS015', name: 'Har Ki Pauri', people_count: 14200, capacity: 15000, occupancy_percentage: 95, status: 'CRITICAL', wait_time_minutes: 110
  };

  const handleReportFieldHeadcount = async (e) => {
    e.preventDefault();
    if (!manualCountInput || isNaN(Number(manualCountInput))) return;
    setIsUpdatingCrowd(true);
    try {
      const count = Number(manualCountInput);
      const cap = activeSite.capacity || 10000;
      const occ = Math.min(100, Math.round((count / cap) * 100));
      let stat = 'NORMAL';
      if (occ >= 90) stat = 'CRITICAL';
      else if (occ >= 75) stat = 'HIGH';
      else if (occ >= 50) stat = 'MODERATE';

      const payload = {
        people_count: count,
        capacity: cap,
        occupancy_percentage: occ,
        status: stat,
        wait_time_minutes: Math.round((occ / 100) * 120)
      };

      const res = await updateCrowdObservation(activeSite.id, payload);
      if (onCrowdUpdated) {
        onCrowdUpdated(activeSite.id, res || payload);
      }
      setManualCountInput('');
      if (showToast) {
        showToast(`📡 Telemetry updated by Police Field Command for ${activeSite.name}: ${count.toLocaleString()} Devotees (${occ}%).`);
      }
    } catch (err) {
      console.error('Failed to update crowd telemetry:', err);
      if (showToast) showToast(`⚠️ Telemetry update failed: ${err.message || err}`);
    } finally {
      setIsUpdatingCrowd(false);
    }
  };

  // --------------------------------------------------------------------------
  // CROWD SURGE SIMULATION STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [simSiteId, setSimSiteId] = useState(selectedSiteId || 'TS001');
  const [simEventName, setSimEventName] = useState('Kedarnath Peak Pilgrim Rally');
  const [simEventDate, setSimEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [simEventTime, setSimEventTime] = useState('06:00');
  const [simExpectedCrowd, setSimExpectedCrowd] = useState(8000);
  const [simEventDuration, setSimEventDuration] = useState(4);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState('');
  const [activeSimulationResult, setActiveSimulationResult] = useState(null);
  const [simulationsHistory, setSimulationsHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadSimulationsHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchCrowdSimulations();
      if (Array.isArray(data)) {
        setSimulationsHistory(data);
      }
    } catch (err) {
      console.error('Failed to load simulations history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'police-simulation' || activeTab === 'overview') {
      loadSimulationsHistory();
    }
  }, [activeTab]);

  const handleRunSimulation = async (e) => {
    if (e) e.preventDefault();
    setIsSimulating(true);
    setSimError('');

    try {
      const payload = {
        site_id: simSiteId,
        event_name: simEventName || 'Planned Surge Scenario',
        event_date: simEventDate,
        event_time: simEventTime,
        expected_crowd_increase: Number(simExpectedCrowd),
        event_duration_hours: Number(simEventDuration)
      };

      const result = await createCrowdSimulation(payload);
      setActiveSimulationResult(result);
      if (showToast) {
        showToast(`✓ Simulation calculated: ${result.site_name} +${result.expected_crowd_increase.toLocaleString()} (${result.simulated_crowd_status})`);
      }
      loadSimulationsHistory();
    } catch (err) {
      console.error('Failed to run simulation:', err);
      const errMsg = err.message || err.detail || 'Simulation execution failed. Please verify inputs.';
      setSimError(errMsg);
      if (showToast) showToast(`⚠️ Simulation Error: ${errMsg}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDeleteSimulation = async (simId) => {
    if (!window.confirm('Delete this simulation scenario log?')) return;
    try {
      await deleteCrowdSimulation(simId);
      setSimulationsHistory(prev => prev.filter(s => s.id !== simId));
      if (activeSimulationResult?.id === simId) {
        setActiveSimulationResult(null);
      }
      if (showToast) showToast('Simulation scenario record deleted.');
    } catch (err) {
      console.error('Failed to delete simulation:', err);
      if (showToast) showToast(`⚠️ Delete failed: ${err.message || err}`);
    }
  };

  // --------------------------------------------------------------------------
  // SOS DISTRESS SIGNALS & POLICE TACTICAL DISPATCH
  // --------------------------------------------------------------------------
  const [sosAlerts, setSosAlerts] = useState([]);
  const [dispatchModalAlert, setDispatchModalAlert] = useState(null);
  const [dispatchUnit, setDispatchUnit] = useState('PCR-07 Har Ki Pauri Quick Response Team');
  const [dispatchNotes, setDispatchNotes] = useState('SDRF medical triage unit mobilized with oxygen kits.');
  const [isDispatching, setIsDispatching] = useState(false);

  const loadSosAlerts = async () => {
    try {
      const data = await fetchActiveSOSAlerts();
      if (Array.isArray(data) && data.length > 0) {
        setSosAlerts(data);
      } else {
        // Authoritative baseline active distress beacons for field simulation
        setSosAlerts([
          {
            id: 'SOS-HAR-201',
            user_name: 'Ananya Deshmukh',
            phone: '+91-98201-44510',
            emergency_type: 'Severe Crowd Crush / Medical Distress',
            site_id: 'TS015',
            site_name: 'Har Ki Pauri Ghat (Zone A Stairs)',
            latitude: 29.9568,
            longitude: 78.1707,
            status: 'ACTIVE',
            timestamp: '4 mins ago'
          },
          {
            id: 'SOS-KED-104',
            user_name: 'Raghunath Iyer',
            phone: '+91-94432-88190',
            emergency_type: 'High-Altitude Breathlessness / Oxygen Needed',
            site_id: 'TS001',
            site_name: 'Kedarnath Base Path (Near Lincholi)',
            latitude: 30.7346,
            longitude: 79.0669,
            status: 'ACTIVE',
            timestamp: '11 mins ago'
          },
          {
            id: 'SOS-RSH-302',
            user_name: 'Pooja Verma',
            phone: '+91-97110-33201',
            emergency_type: 'Separated Elderly Pilgrim / Assistance Required',
            site_id: 'TS017',
            site_name: 'Ram Jhula Suspension Bridge Corridor',
            latitude: 30.1235,
            longitude: 78.3182,
            status: 'ACKNOWLEDGED',
            timestamp: '19 mins ago'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to load SOS alerts:', err);
    }
  };

  useEffect(() => {
    loadSosAlerts();
    const interval = setInterval(loadSosAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExecuteDispatch = async () => {
    if (!dispatchModalAlert) return;
    setIsDispatching(true);
    try {
      await dispatchPoliceSOSAlert(dispatchModalAlert.id, {
        status: 'ACKNOWLEDGED',
        notes: `${dispatchUnit}: ${dispatchNotes}`
      });

      setSosAlerts(prev => prev.map(a => {
        if (a.id === dispatchModalAlert.id) {
          return { ...a, status: 'ACKNOWLEDGED', dispatched_unit: dispatchUnit };
        }
        return a;
      }));

      if (showToast) {
        showToast(`🚨 DISPATCH CONFIRMED: ${dispatchUnit} dispatched to ${dispatchModalAlert.site_name}.`);
      }
      setDispatchModalAlert(null);
    } catch (err) {
      console.error('SOS dispatch error:', err);
      if (showToast) showToast(`⚠️ Dispatch error: ${err.message || err}`);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="police-command-root" id="police-command-center">

      {/* ===================================================================== */}
      {/* 1. POLICE COMMAND HEADER                                              */}
      {/* ===================================================================== */}
      <header className="police-header">
        <div className="police-header-inner">
          <div className="police-title-group">
            <div className="police-emblem">🛡️</div>
            <div>
              <h1 className="police-main-title">
                POLICE COMMAND <span className="police-badge-gold">LAW ENFORCEMENT &amp; FIELD HQ</span>
              </h1>
              <p className="police-subtitle">
                Uttarakhand State Police • Inter-Agency Rapid Response &amp; Crowd Surge Defense
              </p>
            </div>
          </div>

          <div className="police-status-indicator">
            <div className="police-live-badge">
              <div className="police-pulse-dot"></div>
              <span>COMMAND SYSTEM ONLINE</span>
            </div>
            <div className="text-muted text-xs font-mono">
              Sector: {currentUser?.full_name || 'State Special Operations Command'}
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. NAVIGATION BAR (9 TABS)                                            */}
      {/* ===================================================================== */}
      <nav className="police-nav-bar" aria-label="Police Command Navigation">
        <div className="police-nav-container">
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('overview')}
          >
            <span>📊 Overview</span>
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'live-crowd' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('live-crowd')}
          >
            <span>👁️ Live Crowd Monitoring</span>
            {criticalCount > 0 && <span className="police-tab-badge">{criticalCount}</span>}
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'surge-alerts' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('surge-alerts')}
          >
            <span>🚨 Crowd Surge Alerts</span>
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'emergency-response' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('emergency-response')}
          >
            <span>⚡ Emergency Response</span>
            {isRerouteActive && <span className="police-tab-badge">ACTIVE</span>}
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'police-simulation' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('police-simulation')}
          >
            <span>👮 Police &amp; Crowd Simulation</span>
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'traffic-control' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('traffic-control')}
          >
            <span>🚦 Traffic &amp; Route Control</span>
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'sos-response' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('sos-response')}
          >
            <span>🆘 SOS / Distress Response</span>
            {sosAlerts.filter(a => a.status === 'ACTIVE').length > 0 && (
              <span className="police-tab-badge">{sosAlerts.filter(a => a.status === 'ACTIVE').length}</span>
            )}
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'safety-zones' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('safety-zones')}
          >
            <span>🛡️ Safety Zones</span>
          </button>
          <button
            type="button"
            className={`police-nav-tab ${activeTab === 'reports-analytics' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('reports-analytics')}
          >
            <span>📈 Reports / Analytics</span>
          </button>
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* 3. MAIN DASHBOARD PANELS                                              */}
      {/* ===================================================================== */}
      <main className="police-content-wrap">

        {/* Tactical Emergency Override Strip */}
        <div className={`police-emergency-strip ${isRerouteActive ? 'active' : 'standby'}`}>
          <div>
            <div className="pes-headline">
              <span>{isRerouteActive ? '🚨 CORRIDOR OVERRIDE ACTIVE' : '✓ CORRIDOR STATUS: STANDBY'}</span>
              <span className="police-badge-gold">
                {isRerouteActive ? 'HIGHWAY TRAFFIC DIVERTED' : 'NORMAL CIRCULATION'}
              </span>
            </div>
            <p className="pes-sub">
              {isRerouteActive
                ? `Emergency Reroute activated at ${emergencyTimestamp || 'recently'}. BHEL Satellite Hub & Rishikesh Bypass active.`
                : 'Haridwar & Char Dham approach routes flowing under normal perimeter controls.'}
            </p>
          </div>
          <div>
            {isRerouteActive ? (
              <button
                type="button"
                className="pes-btn-lift"
                onClick={handleLiftEmergency}
                disabled={isRecalculating}
              >
                {isRecalculating ? 'PROCESSING...' : '✅ LIFT REROUTE DIRECTIVE'}
              </button>
            ) : (
              <button
                type="button"
                className="pes-btn-active"
                onClick={handleActivateEmergency}
                disabled={isRecalculating}
              >
                {isRecalculating ? 'ACTIVATING...' : '🚨 ACTIVATE HIGHWAY DIVERSION'}
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW                                                     */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div>
            {/* Tactical KPI Cards */}
            <div className="police-kpi-grid">
              <div className="police-kpi-card kpi-danger">
                <span className="pkc-label">Critical Density Venues</span>
                <span className="pkc-val text-danger">{criticalCount}</span>
                <span className="pkc-sub">&gt;90% Capacity threshold</span>
              </div>
              <div className="police-kpi-card kpi-amber">
                <span className="pkc-label">High Congestion Shrines</span>
                <span className="pkc-val text-amber">{highCount}</span>
                <span className="pkc-sub">75% - 89% Capacity range</span>
              </div>
              <div className="police-kpi-card">
                <span className="pkc-label">Active Devotees Monitored</span>
                <span className="pkc-val text-navy">{totalDevotees.toLocaleString()}</span>
                <span className="pkc-sub">Across 25 canonical shrines</span>
              </div>
              <div className="police-kpi-card kpi-success">
                <span className="pkc-label">Police Patrol Readiness</span>
                <span className="pkc-val text-success">100%</span>
                <span className="pkc-sub">32 Sectors manned &amp; ready</span>
              </div>
            </div>

            {/* Quick Actions & Recent Incidents Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Tactical Quick-Launch Panel */}
              <div className="police-panel">
                <div className="police-panel-header">
                  <div className="police-panel-title">
                    <span>⚡ TACTICAL QUICK ACTIONS</span>
                  </div>
                  <span className="police-panel-badge">FIELD PROTOCOLS</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <button
                    type="button"
                    className="police-run-sim-btn"
                    style={{ width: '100%', textAlign: 'center' }}
                    onClick={() => handleSwitchTab('police-simulation')}
                  >
                    👮 Launch AI Crowd Surge Simulation ➔
                  </button>
                  <button
                    type="button"
                    className="police-preset-btn"
                    style={{ padding: '0.75rem', textAlign: 'center' }}
                    onClick={() => handleSwitchTab('sos-response')}
                  >
                    🆘 Inspect Active Distress Beacons ({sosAlerts.filter(a => a.status === 'ACTIVE').length} Active) ➔
                  </button>
                  <button
                    type="button"
                    className="police-preset-btn"
                    style={{ padding: '0.75rem', textAlign: 'center' }}
                    onClick={() => handleSwitchTab('traffic-control')}
                  >
                    🚦 Manage Satellite Holding Corridors &amp; Toll Bypasses ➔
                  </button>
                </div>
              </div>

              {/* Active Distress Signals Glance */}
              <div className="police-panel">
                <div className="police-panel-header">
                  <div className="police-panel-title">
                    <span>🚨 ACTIVE DISTRESS BEACONS</span>
                  </div>
                  <button
                    type="button"
                    className="police-preset-btn"
                    onClick={() => handleSwitchTab('sos-response')}
                  >
                    View All Beacons ➔
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sosAlerts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      style={{
                        background: '#080E1A',
                        border: a.status === 'ACTIVE' ? '1px solid #DC2626' : '1px solid #1E293B',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.88rem' }}>
                          {a.user_name} • <span style={{ color: '#94A3B8' }}>{a.emergency_type}</span>
                        </div>
                        <div style={{ color: '#64748B', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          📍 {a.site_name} • {a.timestamp}
                        </div>
                      </div>
                      <div>
                        {a.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="police-sos-btn"
                            onClick={() => {
                              setDispatchModalAlert(a);
                            }}
                          >
                            Dispatch Unit
                          </button>
                        ) : (
                          <span className="police-badge-status status-moderate">DISPATCHED</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Critical Sites Table */}
            <div className="police-panel">
              <div className="police-panel-header">
                <div className="police-panel-title">
                  <span>🔴 CRITICAL &amp; HIGH DENSITY VENUES WATCHLIST</span>
                </div>
                <button
                  type="button"
                  className="police-preset-btn"
                  onClick={() => handleSwitchTab('live-crowd')}
                >
                  Full 25 Shrines Telemetry ➔
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="police-table">
                  <thead>
                    <tr>
                      <th>SHRINE / VENUE</th>
                      <th>CROWD HEADCOUNT</th>
                      <th>CAPACITY</th>
                      <th>OCCUPANCY</th>
                      <th>EST. QUEUE WAIT</th>
                      <th>TACTICAL STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteTelemetryList.slice(0, 6).map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, color: '#F8FAFC' }}>
                          [{s.id}] {s.name} ({s.city || s.state})
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {s.people_count.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#94A3B8' }}>
                          {s.capacity.toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {s.occupancy_percentage}%
                        </td>
                        <td style={{ fontFamily: 'monospace', color: s.wait_time_minutes > 60 ? '#F87171' : '#60A5FA' }}>
                          ~{s.wait_time_minutes} mins
                        </td>
                        <td>
                          <span className={`police-badge-status status-${s.status.toLowerCase()}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: LIVE CROWD MONITORING                                        */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'live-crowd' && (
          <div className="police-panel">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>👁️ REAL-TIME CROWD TELEMETRY • 25 SACRED SHRINES</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['ALL', 'CRITICAL', 'HIGH', 'MODERATE'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`police-preset-btn ${filterLevel === lvl ? 'active' : ''}`}
                    onClick={() => setFilterLevel(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Officer Telemetry Update Tool */}
            <form onSubmit={handleReportFieldHeadcount} style={{ background: '#080E1A', padding: '1rem 1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.88rem' }}>
                📡 Field Officer Telemetry Report:
              </span>
              <select
                value={selectedSiteId || activeSite.id}
                onChange={(e) => onSelectSite && onSelectSite(e.target.value)}
                className="police-select"
                style={{ flex: 1, minWidth: '220px' }}
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>[{s.id}] {s.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Verified Headcount"
                value={manualCountInput}
                onChange={(e) => setManualCountInput(e.target.value)}
                className="police-input"
                style={{ width: '180px' }}
                required
              />
              <button
                type="submit"
                disabled={isUpdatingCrowd}
                className="police-run-sim-btn"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
              >
                {isUpdatingCrowd ? 'UPDATING...' : 'UPDATE TELEMETRY'}
              </button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="police-table">
                <thead>
                  <tr>
                    <th>DESTINATION</th>
                    <th>HEADCOUNT</th>
                    <th>SAFE CAPACITY</th>
                    <th>OCCUPANCY</th>
                    <th>WAIT TIME</th>
                    <th>FLOW TREND</th>
                    <th>ENFORCEMENT STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: '#F8FAFC' }}>
                        [{s.id}] {s.name}
                        <div style={{ color: '#64748B', fontSize: '0.75rem' }}>{s.city || s.state}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {s.people_count.toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#94A3B8' }}>
                        {s.capacity.toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {s.occupancy_percentage}%
                      </td>
                      <td style={{ fontFamily: 'monospace', color: s.wait_time_minutes > 60 ? '#F87171' : '#60A5FA' }}>
                        ~{s.wait_time_minutes} mins
                      </td>
                      <td style={{ fontWeight: 700, textAlign: 'center' }}>
                        {s.trend}
                      </td>
                      <td>
                        <span className={`police-badge-status status-${s.status.toLowerCase()}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: CROWD SURGE ALERTS                                           */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'surge-alerts' && (
          <div className="police-panel">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>🚨 CROWD SURGE ALERTS &amp; THRESHOLD BREACHES</span>
              </div>
              <span className="police-panel-badge">&gt;75% CAPACITY TRIGGER</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {siteTelemetryList.filter(s => s.occupancy_percentage >= 75).map(s => (
                <div
                  key={s.id}
                  style={{
                    background: '#080E1A',
                    border: s.occupancy_percentage >= 90 ? '1px solid #DC2626' : '1px solid #F59E0B',
                    borderRadius: '0.65rem',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{s.occupancy_percentage >= 90 ? '🔴' : '🟡'}</span>
                      <h4 style={{ margin: 0, color: '#F8FAFC', fontSize: '1.05rem' }}>
                        [{s.id}] {s.name} • {s.occupancy_percentage}% Capacity ({s.people_count.toLocaleString()} / {s.capacity.toLocaleString()})
                      </h4>
                    </div>
                    <p style={{ margin: '0.4rem 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                      Queue wait time estimated at ~{s.wait_time_minutes} minutes. Approaching critical threshold. Deploy holding pens and prepare diversion protocols.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="police-preset-btn"
                      onClick={() => {
                        setSimSiteId(s.id);
                        setSimExpectedCrowd(5000);
                        handleSwitchTab('police-simulation');
                      }}
                    >
                      Simulate Surge Scenario
                    </button>
                    <button
                      type="button"
                      className="pes-btn-active"
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                      onClick={handleActivateEmergency}
                    >
                      Enforce Reroute
                    </button>
                  </div>
                </div>
              ))}

              {siteTelemetryList.filter(s => s.occupancy_percentage >= 75).length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                  ✓ No shrines currently exceeding the 75% surge warning threshold. All 25 sites nominal.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: EMERGENCY RESPONSE                                           */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'emergency-response' && (
          <div className="police-panel">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>⚡ EMERGENCY CORRIDOR OVERRIDE &amp; REROUTING DISPATCH</span>
              </div>
              <span className="police-panel-badge">FIELD COMMAND AUTHORITY</span>
            </div>

            <div style={{ background: '#080E1A', padding: '1.5rem', borderRadius: '0.65rem', border: '1px solid #1E293B', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#60A5FA' }}>
                National &amp; State Pilgrimage Reroute Protocol
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                When activated by Police HQ, all connected tourist navigation views, hotel logistics portals, and travel operator fleet consoles receive real-time notifications to bypass congested sanctum bottlenecks via designated sister shrine bypass routes and peripheral satellite parking.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>DIVERSION STATUS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isRerouteActive ? '#4ADE80' : '#94A3B8', marginTop: '0.25rem' }}>
                    {isRerouteActive ? 'ACTIVE' : 'STANDBY'}
                  </div>
                </div>
                <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PARTNER FLEET BUSES</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.25rem' }}>
                    14 Buses (420 Seats)
                  </div>
                </div>
                <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>SATELLITE CAPACITY</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', marginTop: '0.25rem' }}>
                    BHEL Hub (800 Vehicles)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: POLICE & CROWD SIMULATION (AI SURGE SCENARIO BUILDER)        */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'police-simulation' && (
          <section className="police-sim-page" id="police-crowd-simulation">
            {/* Simulation Header */}
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>👮 POLICE &amp; CROWD SURGE SIMULATION</span>
                <span className="police-badge-gold">AI-ASSISTED SCENARIO ENGINE</span>
              </div>
              <span className="police-panel-badge">FIELD CONTINGENCY MODEL</span>
            </div>

            {/* Isolation Banner */}
            <div className="police-sim-banner">
              <div className="psb-left">
                <span className="psb-icon">⚠️</span>
                <div>
                  <h4 className="psb-title">SIMULATION MODE — STRICT DATA ISOLATION</h4>
                  <p className="psb-sub">
                    Calculations run against authoritative site baselines and static capacity models. Does <strong>NOT</strong> modify real sensor streams or trigger live emergency alerts.
                  </p>
                </div>
              </div>
              <span className="police-badge-status status-critical">ISOLATED MODE</span>
            </div>

            {/* Scenario Configuration Form */}
            <form onSubmit={handleRunSimulation} className="police-sim-form">
              <div className="police-form-grid">
                <div className="police-field-group">
                  <label className="police-field-label">
                    <span>📍 Destination Shrine</span>
                    <span className="police-field-hint">TS001–TS025</span>
                  </label>
                  <select
                    value={simSiteId}
                    onChange={(e) => setSimSiteId(e.target.value)}
                    className="police-select"
                    required
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.id}] {s.name} ({s.city || s.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="police-field-group">
                  <label className="police-field-label">
                    <span>🏷️ Scenario / Rally Name</span>
                    <span className="police-field-hint">Description</span>
                  </label>
                  <input
                    type="text"
                    value={simEventName}
                    onChange={(e) => setSimEventName(e.target.value)}
                    placeholder="e.g. Major Festival / Planned Yatra Surge"
                    className="police-input"
                    required
                  />
                </div>

                <div className="police-field-group">
                  <label className="police-field-label">
                    <span>📅 Event Date</span>
                    <span className="police-field-hint">Scheduled</span>
                  </label>
                  <input
                    type="date"
                    value={simEventDate}
                    onChange={(e) => setSimEventDate(e.target.value)}
                    className="police-input"
                    required
                  />
                </div>

                <div className="police-field-group">
                  <label className="police-field-label">
                    <span>⏰ Expected Influx Start</span>
                    <span className="police-field-hint">24h format</span>
                  </label>
                  <input
                    type="time"
                    value={simEventTime}
                    onChange={(e) => setSimEventTime(e.target.value)}
                    className="police-input"
                    required
                  />
                </div>

                <div className="police-field-group">
                  <label className="police-field-label">
                    <span>👥 Expected Crowd Surge</span>
                    <span className="police-field-hint">Devotees (&gt; 0)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    value={simExpectedCrowd}
                    onChange={(e) => setSimExpectedCrowd(Number(e.target.value))}
                    className="police-input font-bold font-mono"
                    required
                  />
                </div>

                <div className="police-field-group">
                  <label className="police-field-label">
                    <span>⏱️ Congestion Window</span>
                    <span className="police-field-hint">Hours (1-24)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={simEventDuration}
                    onChange={(e) => setSimEventDuration(Number(e.target.value))}
                    className="police-input font-mono"
                    required
                  />
                </div>
              </div>

              <div className="police-sim-actions">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="police-preset-btn"
                    onClick={() => {
                      setSimSiteId('TS001');
                      setSimEventName('Kedarnath Peak Pilgrim Rally');
                      setSimExpectedCrowd(8000);
                      setSimEventDuration(4);
                    }}
                  >
                    Sample: +8,000 Kedarnath
                  </button>
                  <button
                    type="button"
                    className="police-preset-btn"
                    onClick={() => {
                      setSimSiteId('TS015');
                      setSimEventName('Somvati Amavasya Peak Snan Surge');
                      setSimExpectedCrowd(15000);
                      setSimEventDuration(6);
                    }}
                  >
                    Sample: +15,000 Har Ki Pauri
                  </button>
                  <button
                    type="button"
                    className="police-preset-btn"
                    onClick={() => {
                      setSimSiteId('TS002');
                      setSimEventName('Badrinath Evening Aarti Congestion');
                      setSimExpectedCrowd(6000);
                      setSimEventDuration(3);
                    }}
                  >
                    Sample: +6,000 Badrinath
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating}
                  className="police-run-sim-btn"
                >
                  {isSimulating ? 'CALCULATING SURGE SCENARIO...' : '⚡ RUN SCENARIO SIMULATION'}
                </button>
              </div>
            </form>

            {simError && (
              <div style={{ background: '#450A0A', border: '1px solid #DC2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#FCA5A5' }}>
                <strong>Simulation Execution Error:</strong> {simError}
              </div>
            )}

            {/* Simulation Results Dossier */}
            {activeSimulationResult && (
              <div className="police-dossier-wrap">
                <div className="pdw-header">
                  <div>
                    <h3 className="pdw-title">
                      📍 {activeSimulationResult.site_name} ({activeSimulationResult.site_id})
                    </h3>
                    <div className="pdw-meta">
                      <span><strong>Scenario:</strong> {activeSimulationResult.event_name}</span>
                      <span>•</span>
                      <span><strong>Date &amp; Time:</strong> {activeSimulationResult.event_date} at {activeSimulationResult.event_time}</span>
                      <span>•</span>
                      <span><strong>Duration:</strong> {activeSimulationResult.event_duration_hours}h</span>
                    </div>
                  </div>
                  <div>
                    <span className={`police-badge-status status-${activeSimulationResult.simulated_crowd_status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                      {activeSimulationResult.simulated_crowd_status}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="police-sim-metrics">
                  <div className="psm-card">
                    <span className="psm-lbl">BASELINE CROWD</span>
                    <span className="psm-val">{activeSimulationResult.baseline_people_count.toLocaleString()}</span>
                    <span className="psm-sub">Live site baseline</span>
                  </div>
                  <div className="psm-card">
                    <span className="psm-lbl">PROJECTED SURGE</span>
                    <span className="psm-val text-danger">+{activeSimulationResult.expected_crowd_increase.toLocaleString()}</span>
                    <span className="psm-sub">Virtual planned surge</span>
                  </div>
                  <div className="psm-card">
                    <span className="psm-lbl">SIMULATED HEADCOUNT</span>
                    <span className="psm-val" style={{ color: '#60A5FA' }}>{activeSimulationResult.simulated_people_count.toLocaleString()}</span>
                    <span className="psm-sub">Total simulated volume</span>
                  </div>
                  <div className="psm-card">
                    <span className="psm-lbl">VENUE CAPACITY</span>
                    <span className="psm-val" style={{ color: '#94A3B8' }}>{(activeSimulationResult.site_capacity || 10000).toLocaleString()}</span>
                    <span className="psm-sub">Official safe limit</span>
                  </div>
                  <div className="psm-card">
                    <span className="psm-lbl">OCCUPANCY %</span>
                    <span className="psm-val" style={{ color: activeSimulationResult.simulated_occupancy_percentage >= 90 ? '#F87171' : '#FBBF24' }}>
                      {activeSimulationResult.simulated_occupancy_percentage}%
                    </span>
                    <span className="psm-sub">Capacity utilization</span>
                  </div>
                  <div className="psm-card">
                    <span className="psm-lbl">TRAFFIC IMPACT</span>
                    <span className="psm-val" style={{ color: activeSimulationResult.traffic_impact === 'SEVERE' ? '#F87171' : '#FBBF24' }}>
                      {activeSimulationResult.traffic_impact}
                    </span>
                    <span className="psm-sub">Highway flow grade</span>
                  </div>
                  <div className="psm-card">
                    <span className="psm-lbl">ESTIMATED DELAY</span>
                    <span className="psm-val text-danger">{activeSimulationResult.delay_display}</span>
                    <span className="psm-sub">Bottleneck latency</span>
                  </div>
                </div>

                {/* Risk Explanation Note */}
                <div style={{ background: '#0F172A', borderLeft: '4px solid #F59E0B', padding: '1rem', borderRadius: '0.4rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#FCD34D', marginBottom: '0.25rem' }}>
                    AI Predictive Congestion &amp; Bottleneck Assessment:
                  </div>
                  <div style={{ color: '#E2E8F0', fontSize: '0.88rem', lineHeight: '1.5' }}>
                    {activeSimulationResult.risk_explanation}
                  </div>
                </div>

                {/* Tactical Interventions Grid */}
                {(() => {
                  const struct = getStructuredRecommendations(activeSimulationResult);
                  return (
                    <div className="police-directives-grid">
                      <div className="police-directive-card">
                        <div className="pdc-header">
                          <span>🛡️ Crowd-Control Directive</span>
                        </div>
                        <p className="pdc-body">{struct.crowdControl}</p>
                      </div>
                      <div className="police-directive-card">
                        <div className="pdc-header">
                          <span>🚨 Tactical Safety Directive</span>
                        </div>
                        <p className="pdc-body">{struct.safety}</p>
                      </div>
                      <div className="police-directive-card">
                        <div className="pdc-header">
                          <span>🚦 Route &amp; Traffic Directive</span>
                        </div>
                        <p className="pdc-body">{struct.traffic}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* High-Risk Zones Feed */}
                {activeSimulationResult.high_risk_zones && activeSimulationResult.high_risk_zones.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                      🔴 High-Risk Chokepoints &amp; Mitigation Plans ({activeSimulationResult.high_risk_zones.length})
                    </div>
                    <div className="police-zones-feed">
                      {activeSimulationResult.high_risk_zones.map((zone, idx) => (
                        <div key={idx} className="police-zone-item">
                          <div className="pzi-top">
                            <span className="pzi-name">{zone.zone_name}</span>
                            <span className={`police-badge-status status-${zone.risk_level?.toLowerCase() || 'high'}`}>
                              {zone.risk_level}
                            </span>
                          </div>
                          <div className="pzi-reason">{zone.reason}</div>
                          {zone.mitigation && (
                            <div className="pzi-mitigation">
                              <strong>Police Action:</strong> {zone.mitigation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low-Density Alternatives Feed */}
                {activeSimulationResult.low_density_alternatives && activeSimulationResult.low_density_alternatives.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                      🧭 Surrounding Low-Density Relief Shrines
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      {activeSimulationResult.low_density_alternatives.slice(0, 4).map((alt, idx) => (
                        <div key={idx} style={{ background: '#0F172A', border: '1px solid #1E293B', padding: '0.85rem', borderRadius: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem' }}>{alt.name}</span>
                            <span style={{ color: '#4ADE80', fontWeight: 700, fontSize: '0.8rem' }}>{alt.crowd_savings}</span>
                          </div>
                          <div style={{ color: '#94A3B8', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                            📍 {alt.distance_km} km • ⏱️ ~{alt.travel_time_mins} mins
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Simulation History Table */}
            <div className="police-panel" style={{ marginTop: '2rem' }}>
              <div className="police-panel-header">
                <div className="police-panel-title">
                  <span>📜 PREVIOUS SIMULATION LOGS</span>
                </div>
                <button
                  type="button"
                  className="police-preset-btn"
                  onClick={loadSimulationsHistory}
                >
                  🔄 Refresh History
                </button>
              </div>

              {isLoadingHistory && simulationsHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                  Loading simulation logs from database...
                </div>
              ) : simulationsHistory.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                  No previous simulation logs found. Configure a scenario above and click "Run Scenario Simulation".
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="police-table">
                    <thead>
                      <tr>
                        <th>SCENARIO &amp; DESTINATION</th>
                        <th>SCHEDULED DATE</th>
                        <th>PROJECTED SURGE</th>
                        <th>OCCUPANCY</th>
                        <th>RISK LEVEL</th>
                        <th>LOGGED AT</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationsHistory.map((h) => (
                        <tr key={h.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{h.event_name || 'Planned Event'}</div>
                            <div style={{ color: '#64748B', fontSize: '0.75rem', fontFamily: 'monospace' }}>[{h.site_id}] {h.site_name}</div>
                          </td>
                          <td style={{ fontFamily: 'monospace', color: '#94A3B8' }}>
                            {h.event_date} {h.event_time}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F87171' }}>
                            +{Number(h.expected_crowd_increase).toLocaleString()}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {h.simulated_occupancy_percentage}% ({h.simulated_crowd_status})
                          </td>
                          <td>
                            <span className={`police-badge-status status-${h.risk_level?.toLowerCase() || 'moderate'}`}>
                              {h.risk_level}
                            </span>
                          </td>
                          <td style={{ color: '#64748B', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="police-preset-btn"
                                style={{ padding: '0.25rem 0.65rem' }}
                                onClick={() => {
                                  setActiveSimulationResult(h);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                              >
                                Inspect
                              </button>
                              <button
                                type="button"
                                className="police-preset-btn"
                                style={{ padding: '0.25rem 0.65rem', borderColor: '#DC2626', color: '#FCA5A5' }}
                                onClick={() => handleDeleteSimulation(h.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 6: TRAFFIC & ROUTE CONTROL                                      */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'traffic-control' && (
          <div>
            <div className="police-panel">
              <div className="police-panel-header">
                <div className="police-panel-title">
                  <span>🚦 ARTERIAL CHOKEPOINTS &amp; HIGHWAY BYPASS CORRIDORS</span>
                </div>
                <span className="police-panel-badge">TRAFFIC DIVISION HQ</span>
              </div>

              <div className="police-chokepoints-grid">
                <div className="police-chokepoint-card">
                  <div className="pcc-header">
                    <span className="pcc-name">NH-334 Haridwar Highway</span>
                    <span className={`police-badge-status ${isRerouteActive ? 'status-normal' : 'status-critical'}`}>
                      {isRerouteActive ? 'DIVERTED' : 'HEAVY INFLUX'}
                    </span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Current Speed Grade</span>
                    <span className="pcc-metric-val">{isRerouteActive ? '45 km/h (Smooth)' : '12 km/h (Choked)'}</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Holding Staging Hub</span>
                    <span className="pcc-metric-val">Raiwala Staging Area</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Emergency Priority</span>
                    <span className="pcc-metric-val" style={{ color: '#4ADE80' }}>FASTag Lane 1 Active</span>
                  </div>
                </div>

                <div className="police-chokepoint-card">
                  <div className="pcc-header">
                    <span className="pcc-name">Rishikesh Bypass Corridor</span>
                    <span className="police-badge-status status-moderate">OPTIMAL</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Current Transit Time</span>
                    <span className="pcc-metric-val">38 Minutes (Zone C)</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Buses En Route</span>
                    <span className="pcc-metric-val">14 Partner Shuttles</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Time Saved / Yatri</span>
                    <span className="pcc-metric-val" style={{ color: '#4ADE80' }}>107 Minutes</span>
                  </div>
                </div>

                <div className="police-chokepoint-card">
                  <div className="pcc-header">
                    <span className="pcc-name">BHEL Satellite Transit Hub</span>
                    <span className="police-badge-status status-normal">OPERATIONAL</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Parking Lot Capacity</span>
                    <span className="pcc-metric-val">800 Vehicles / 450 Buses</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Occupancy Margin</span>
                    <span className="pcc-metric-val">42% (Ample Buffer)</span>
                  </div>
                  <div className="pcc-metric-row">
                    <span>Feeder Shuttles</span>
                    <span className="pcc-metric-val">Every 10 Minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 7: SOS / DISTRESS RESPONSE                                      */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'sos-response' && (
          <div className="police-panel">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>🆘 TACTICAL SOS DISTRESS BEACONS &amp; RAPID DISPATCH</span>
              </div>
              <button
                type="button"
                className="police-preset-btn"
                onClick={loadSosAlerts}
              >
                🔄 Refresh Beacons
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="police-table">
                <thead>
                  <tr>
                    <th>DEVOTEE YATRI</th>
                    <th>EMERGENCY TYPE</th>
                    <th>LOCATION / SHRINE</th>
                    <th>COORDINATES</th>
                    <th>TIME LOGGED</th>
                    <th>STATUS</th>
                    <th>DISPATCH ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {sosAlerts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{a.user_name}</div>
                        <div style={{ color: '#94A3B8', fontSize: '0.78rem' }}>{a.phone}</div>
                      </td>
                      <td style={{ color: '#FCA5A5', fontWeight: 600 }}>
                        {a.emergency_type}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{a.site_name}</div>
                        <div style={{ color: '#64748B', fontSize: '0.75rem', fontFamily: 'monospace' }}>[{a.site_id || 'GPS'}]</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#94A3B8', fontSize: '0.78rem' }}>
                        {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                      </td>
                      <td style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                        {a.timestamp}
                      </td>
                      <td>
                        <span className={`police-badge-status ${a.status === 'ACTIVE' ? 'status-critical' : 'status-normal'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {a.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="police-sos-btn"
                            onClick={() => {
                              setDispatchModalAlert(a);
                            }}
                          >
                            Dispatch Police Unit
                          </button>
                        ) : (
                          <div style={{ color: '#4ADE80', fontSize: '0.8rem', fontWeight: 600 }}>
                            ✓ Unit En Route
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 8: SAFETY ZONES                                                 */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'safety-zones' && (
          <div className="police-panel">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>🛡️ HIGH-RISK CONGESTION ZONES &amp; MEDICAL POSTS</span>
              </div>
              <span className="police-panel-badge">FIELD ASSETS</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#080E1A', border: '1px solid #1E293B', padding: '1.25rem', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#F87171' }}>🔴 Har Ki Pauri Sanctum (Zone A)</h4>
                <div style={{ color: '#CBD5E1', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Narrow river bank stairs and bridge approach. Barricaded holding pens at Upper Road to prevent surge crush.
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#60A5FA' }}>
                  <strong>Police Post:</strong> Ghat Kotwali Sector 1 • 14 Officers on Duty
                </div>
              </div>

              <div style={{ background: '#080E1A', border: '1px solid #1E293B', padding: '1.25rem', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#FBBF24' }}>🟡 Ram Jhula Suspension Bridge (Zone B)</h4>
                <div style={{ color: '#CBD5E1', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Suspension bridge pedestrian bottleneck. Alternating one-way crossing enforcement active during peak evening aarti.
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#60A5FA' }}>
                  <strong>Police Post:</strong> Muni Ki Reti Outpost • 8 Marshals Deployed
                </div>
              </div>

              <div style={{ background: '#080E1A', border: '1px solid #1E293B', padding: '1.25rem', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', color: '#4ADE80' }}>🟢 BHEL Transit Evacuation Corridor (Zone C)</h4>
                <div style={{ color: '#CBD5E1', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Primary high-capacity relief staging ground with 5 active oxygen medical tents and 18 mobile stretchers.
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#60A5FA' }}>
                  <strong>Police Post:</strong> SDRF Camp Commander • 22 Tactical Personnel
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 9: REPORTS / ANALYTICS                                          */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'reports-analytics' && (
          <div className="police-panel">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>📈 POLICE LOGISTICS &amp; TACTICAL INCIDENT LOGS</span>
              </div>
              <span className="police-panel-badge">AUDIT READY</span>
            </div>

            <div className="police-kpi-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="police-kpi-card">
                <span className="pkc-label">Average Response Time</span>
                <span className="pkc-val text-navy">4.2 min</span>
                <span className="pkc-sub">From distress to dispatch</span>
              </div>
              <div className="police-kpi-card">
                <span className="pkc-label">Total Field Shuttles</span>
                <span className="pkc-val text-navy">14</span>
                <span className="pkc-sub">Dedicated transit shuttles</span>
              </div>
              <div className="police-kpi-card">
                <span className="pkc-label">Simulations Conducted</span>
                <span className="pkc-val text-navy">{simulationsHistory.length}</span>
                <span className="pkc-sub">Surge scenarios tested</span>
              </div>
              <div className="police-kpi-card">
                <span className="pkc-label">Safety Compliance</span>
                <span className="pkc-val text-success">99.4%</span>
                <span className="pkc-sub">0 major stampede events</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ===================================================================== */}
      {/* 4. TACTICAL DISPATCH MODAL                                            */}
      {/* ===================================================================== */}
      {dispatchModalAlert && (
        <div className="police-modal-backdrop" onClick={() => setDispatchModalAlert(null)}>
          <div className="police-modal" onClick={(e) => e.stopPropagation()}>
            <div className="police-modal-header">
              <h3 className="police-modal-title">🚨 TACTICAL POLICE UNIT DISPATCH</h3>
              <button
                type="button"
                className="police-preset-btn"
                style={{ padding: '0.2rem 0.5rem' }}
                onClick={() => setDispatchModalAlert(null)}
              >
                ✕
              </button>
            </div>

            <div className="police-modal-body">
              <div style={{ background: '#080E1A', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ color: '#94A3B8', fontSize: '0.8rem' }}>INCIDENT DETAILS</div>
                <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1rem', marginTop: '0.25rem' }}>
                  {dispatchModalAlert.user_name} • <span style={{ color: '#FCA5A5' }}>{dispatchModalAlert.emergency_type}</span>
                </div>
                <div style={{ color: '#CBD5E1', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  📍 {dispatchModalAlert.site_name}
                </div>
              </div>

              <div className="police-field-group" style={{ marginBottom: '1rem' }}>
                <label className="police-field-label">Assigned Tactical Unit</label>
                <input
                  type="text"
                  value={dispatchUnit}
                  onChange={(e) => setDispatchUnit(e.target.value)}
                  className="police-input"
                  required
                />
              </div>

              <div className="police-field-group">
                <label className="police-field-label">Field Instructions / Equipment Notes</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="police-input"
                  rows="3"
                />
              </div>
            </div>

            <div className="police-modal-footer">
              <button
                type="button"
                className="police-preset-btn"
                onClick={() => setDispatchModalAlert(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDispatching}
                className="pes-btn-active"
                onClick={handleExecuteDispatch}
              >
                {isDispatching ? 'DISPATCHING...' : 'CONFIRM POLICE DISPATCH ➔'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
