import React, { useState, useEffect } from 'react';
import {
  updateCrowdObservation,
  fetchActiveSOSAlerts,
  fetchGovernmentOccupancyReport
} from '../api/api';
import { supabase } from '../supabaseClient';
import './GovernmentDashboard.css';

export default function GovernmentDashboard({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  onCrowdUpdated,
  currentUser,
  showToast
}) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');

  // Multi-Agency Operations Tab ('police' | 'transport' | 'health' | 'disaster' | 'municipal')
  const [activeAgencyTab, setActiveAgencyTab] = useState('police');

  // Crowd Headcount Update Form (POST /crowd/update)
  const [updateSiteId, setUpdateSiteId] = useState(selectedSiteId || 'TS001');
  const [updatePeopleCount, setUpdatePeopleCount] = useState(12350);
  const [updateQueueLength, setUpdateQueueLength] = useState(480);
  const [updateWaitTime, setUpdateWaitTime] = useState(540);
  const [isUpdating, setIsUpdating] = useState(false);

  // SOS Distress Alerts
  const [sosAlerts, setSosAlerts] = useState([]);
  const [isLoadingSOS, setIsLoadingSOS] = useState(false);
  const [viewingAlert, setViewingAlert] = useState(null);

  // Hospitality Report
  const [hotelReport, setHotelReport] = useState(null);

  // Inspect Modal
  const [inspectSite, setInspectSite] = useState(null);

  // Surge Warning Banner
  const [surgeAlertVisible, setSurgeAlertVisible] = useState(true);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // =========================================================================
  // EMERGENCY REROUTE — SUPABASE REALTIME & PERSISTENCE
  // =========================================================================
  const [isRerouteActive, setIsRerouteActive] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [emergencyTimestamp, setEmergencyTimestamp] = useState(null);

  // Check for existing active emergency on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const { data } = await supabase
          .from('platform_events')
          .select('*')
          .in('event_type', ['emergency', 'emergency_lifted'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data.length > 0 && data[0].event_type === 'emergency') {
          setIsRerouteActive(true);
          setEmergencyTimestamp(
            new Date(data[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          );
        }
      } catch (err) {
        console.warn('[Gov] Failed to check existing emergency:', err);
      }
    };
    checkExisting();
  }, []);

  // Activate emergency reroute
  const handleActivateEmergency = async () => {
    setIsRecalculating(true);
    try {
      await supabase.from('platform_events').insert({
        event_type: 'emergency',
        payload: {
          corridor: 'haridwar',
          message: 'EMERGENCY: Haridwar corridor reroute enforced by District Administration. Inbound vehicles diverted to BHEL Satellite Hub.',
          zones_affected: ['Har Ki Pauri', 'Haridwar City Center', 'Zone A'],
          satellite_destination: 'BHEL Ground / Rishikesh Bypass',
        },
        created_by: currentUser?.name || 'District Magistrate',
      });
      setIsRerouteActive(true);
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setEmergencyTimestamp(timeStr);
      if (showToast) showToast('🚨 Emergency reroute ACTIVATED — all agency dashboards notified in real-time.');
    } catch (err) {
      console.error('[Gov] Failed to activate emergency:', err);
      if (showToast) showToast('⚠️ Failed to activate emergency reroute.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Deactivate / lift emergency reroute
  const handleLiftEmergency = async () => {
    setIsRecalculating(true);
    try {
      await supabase.from('platform_events').insert({
        event_type: 'emergency_lifted',
        payload: {
          corridor: 'haridwar',
          message: 'Emergency reroute lifted. Normal corridor transit resumed on Haridwar arterial routes.',
        },
        created_by: currentUser?.name || 'District Magistrate',
      });
      setIsRerouteActive(false);
      setEmergencyTimestamp(null);
      if (showToast) showToast('✅ Emergency reroute DEACTIVATED — normal operations restored.');
    } catch (err) {
      console.error('[Gov] Failed to lift emergency:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetSimulation = () => {
    setIsRerouteActive(false);
    setIsRecalculating(false);
    setSurgeAlertVisible(true);
    if (showToast) {
      showToast('↺ Baseline simulation restored. All demonstration zones reset.');
    }
  };

  // Sync update form if selectedSiteId changes externally
  useEffect(() => {
    if (selectedSiteId) {
      setUpdateSiteId(selectedSiteId);
    }
  }, [selectedSiteId]);

  // Load SOS alerts and Hotel Occupancy report on mount
  useEffect(() => {
    let isMounted = true;

    async function loadGovtData() {
      setIsLoadingSOS(true);
      try {
        const [alerts, report] = await Promise.all([
          fetchActiveSOSAlerts(),
          fetchGovernmentOccupancyReport()
        ]);
        if (!isMounted) return;
        setSosAlerts(alerts || []);
        setHotelReport(report);
      } catch (err) {
        console.error('Error loading government dashboard data:', err);
      } finally {
        if (isMounted) setIsLoadingSOS(false);
      }
    }

    loadGovtData();

    // Live sync listeners across dashboards
    const handleSOS = async () => {
      try {
        const freshAlerts = await fetchActiveSOSAlerts();
        if (isMounted && Array.isArray(freshAlerts)) {
          setSosAlerts(freshAlerts);
        }
      } catch (err) {}
    };

    const handleHotelBooking = async () => {
      try {
        const report = await fetchGovernmentOccupancyReport();
        if (isMounted && report) {
          setHotelReport(report);
        }
      } catch (err) {}
    };

    window.addEventListener('yatrasetu:sos_triggered', handleSOS);
    window.addEventListener('yatrasetu:hotel_booked', handleHotelBooking);

    // Poll SOS alerts every 5 seconds for live distress beacon updates
    const sosInterval = setInterval(handleSOS, 5000);

    return () => {
      isMounted = false;
      clearInterval(sosInterval);
      window.removeEventListener('yatrasetu:sos_triggered', handleSOS);
      window.removeEventListener('yatrasetu:hotel_booked', handleHotelBooking);
    };
  }, []);

  // Compute Telemetry Aggregates across all 25 sites
  const siteTelemetryList = sites.map((site) => {
    const d = densityMap[site.id] || {
      people_count: Math.round((site.capacity || 10000) * 0.48),
      occupancy_percentage: 48,
      status: 'NORMAL'
    };
    const cap = site.capacity || 10000;
    const count = d.people_count != null ? d.people_count : Math.round(cap * 0.48);
    const occ = d.occupancy_percentage != null ? d.occupancy_percentage : Math.round((count / cap) * 100);
    const status = d.status || (occ >= 90 ? 'CRITICAL' : occ >= 75 ? 'HIGH' : occ >= 50 ? 'MODERATE' : 'NORMAL');

    let estWait = 25;
    if (occ >= 90) estWait = 540;
    else if (occ >= 75) estWait = 360;
    else if (occ >= 50) estWait = 120;

    let trend = '→';
    if (status === 'CRITICAL' || status === 'HIGH') trend = '↑';
    else if (status === 'NORMAL') trend = '↓';

    return {
      ...site,
      people_count: count,
      occupancy_percentage: occ,
      status,
      trend,
      estimated_wait_mins: estWait
    };
  });

  // KPI Calculations
  const totalSites = siteTelemetryList.length;
  const normalCount = siteTelemetryList.filter((s) => s.status === 'NORMAL').length;
  const moderateCount = siteTelemetryList.filter((s) => s.status === 'MODERATE').length;
  const highCount = siteTelemetryList.filter((s) => s.status === 'HIGH').length;
  const criticalCount = siteTelemetryList.filter((s) => s.status === 'CRITICAL').length;
  const totalDevotees = siteTelemetryList.reduce((acc, s) => acc + (s.people_count || 0), 0);
  const activeSOSCount = sosAlerts.filter((a) => a.status === 'ACTIVE').length;

  // Filtered list for 25-site table
  const filteredSites = siteTelemetryList.filter((site) => {
    const matchSearch =
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.city && site.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (site.state && site.state.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || site.status === statusFilter;
    const matchState = stateFilter === 'ALL' || site.state === stateFilter;
    return matchSearch && matchStatus && matchState;
  });

  const uniqueStates = ['ALL', ...new Set(sites.map((s) => s.state).filter(Boolean))];

  // Handle Crowd Update Form Submission (POST /crowd/update)
  const handleCrowdUpdateSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsUpdating(true);

    try {
      const res = await updateCrowdObservation(
        updateSiteId,
        updatePeopleCount,
        updateQueueLength,
        updateWaitTime
      );

      const updatedSite = sites.find((s) => s.id === updateSiteId);
      const siteName = updatedSite?.name || updateSiteId;

      if (showToast) {
        showToast(
          `🏛️ [Gov Command] ${siteName} updated: ${Number(updatePeopleCount).toLocaleString()} pilgrims (${res.data?.occupancy_percentage}% ${res.data?.status}).`
        );
      }

      if (onCrowdUpdated) {
        onCrowdUpdated(updateSiteId, res.data);
      }
    } catch (err) {
      if (showToast) {
        showToast('Error broadcasting crowd observation update.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Demo Presets
  const handleApplySurgePreset = () => {
    setUpdateSiteId('TS001'); // Kedarnath
    setUpdatePeopleCount(12350);
    setUpdateQueueLength(480);
    setUpdateWaitTime(540);
  };

  const handleApplyNormalPreset = () => {
    setUpdateSiteId('TS001'); // Kedarnath
    setUpdatePeopleCount(1200);
    setUpdateQueueLength(45);
    setUpdateWaitTime(25);
  };

  const handleInspect = (site) => {
    setInspectSite(site);
    setUpdateSiteId(site.id);
    setUpdatePeopleCount(site.people_count);
    setUpdateQueueLength(Math.round(site.people_count * 0.05));
    setUpdateWaitTime(site.estimated_wait_mins);
  };

  const handleDispatchRescue = (alertId) => {
    setSosAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'DISPATCHED' } : a))
    );
    if (showToast) {
      showToast(`🚨 Police Patrol & SDRF Rescue dispatched to Beacon ${alertId}.`);
    }
  };

  const handleViewAlert = (alert) => {
    setViewingAlert(alert);
  };

  return (
    <div className="gov-command-root" id="gov-dashboard">

      {/* ===================================================================== */}
      {/* 1. COMPACT GOVERNMENT COMMAND HEADER                                  */}
      {/* ===================================================================== */}
      <header className="gov-command-header">
        <div className="gov-header-left">
          <div className="gov-header-emblem">🏛️</div>
          <div className="gov-header-titles">
            <div className="gov-brand-row">
              <span className="gov-brand-name">YATRASETU</span>
              <span className="gov-brand-divider">|</span>
              <span className="gov-brand-dept">Government Operations Center</span>
            </div>
            <div className="gov-header-sub">
              LIVE PILGRIMAGE MONITORING • ADMINISTRATIVE CONTROL
            </div>
          </div>
        </div>

        <div className="gov-header-right">
          <div className="gov-live-indicator">
            <span className="gov-live-dot"></span>
            <span className="gov-live-label">LIVE</span>
          </div>
          <div className="gov-header-meta">
            <div className="gov-meta-time">Last updated: <strong>{currentTime}</strong></div>
            <div className="gov-meta-admin">
              {currentUser?.name || currentUser?.full_name || 'District Administration (Command)'}
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. EMERGENCY ALERT BAR (Immediately Below Header)                    */}
      {/* ===================================================================== */}
      <div className={`gov-emergency-strip ${isRerouteActive ? 'is-emergency-active' : 'is-emergency-normal'}`}>
        {isRerouteActive ? (
          <div className="emergency-strip-content">
            <div className="emergency-strip-left">
              <span className="emergency-strip-siren">⚠</span>
              <div>
                <div className="emergency-strip-title">ACTIVE EMERGENCY REROUTE</div>
                <div className="emergency-strip-details">
                  <strong>Haridwar / Kashi Vishwanath Corridor</strong> • Crowd level: <span className="text-danger font-bold">CRITICAL</span> • Route diversion active • 14 buses redirected • 350 tourists diverted
                </div>
              </div>
            </div>
            <div className="emergency-strip-actions">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('gov-reroute-control');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-strip-action view"
              >
                VIEW RESPONSE
              </button>
              <button
                type="button"
                onClick={handleLiftEmergency}
                disabled={isRecalculating}
                className="btn-strip-action lift"
              >
                {isRecalculating ? 'PROCESSING...' : 'LIFT EMERGENCY'}
              </button>
            </div>
          </div>
        ) : (
          <div className="emergency-strip-content">
            <div className="emergency-strip-left">
              <span className="normal-strip-icon">✓</span>
              <div>
                <div className="normal-strip-title">NO ACTIVE EMERGENCY</div>
                <div className="normal-strip-details">
                  All 25 sacred pilgrimage corridors operating within safe nominal capacities. Sensor networks nominal.
                </div>
              </div>
            </div>
            <div className="emergency-strip-actions">
              <button
                type="button"
                onClick={handleActivateEmergency}
                disabled={isRecalculating}
                className="btn-strip-action activate"
              >
                {isRecalculating ? 'ACTIVATING...' : 'TRIGGER CORRIDOR REROUTE'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Surge Early Warning Banner */}
      {surgeAlertVisible && !isRerouteActive && (
        <div className="gov-surge-warning-banner">
          <div className="surge-warning-content">
            <span className="surge-warning-icon">⚠️</span>
            <div className="surge-warning-text">
              <strong>SURGE PREDICTION:</strong> Anomaly detection indicates high congestion risk (&gt;90% threshold) in Zone A (Haridwar Main) within 120 minutes. Multi-agency alert dispatched.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSurgeAlertVisible(false)}
            className="surge-warning-dismiss"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. TOP KPI ROW                                                        */}
      {/* ===================================================================== */}
      <section className="gov-kpi-grid">
        {/* KPI 1: TOTAL PILGRIMS */}
        <div className="gov-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">TOTAL PILGRIMS</span>
            <span className="kpi-icon">👥</span>
          </div>
          <div className="kpi-number">{totalDevotees.toLocaleString()}</div>
          <div className="kpi-context">
            <span className="kpi-tag-sub">Across 25 monitored shrines</span>
          </div>
        </div>

        {/* KPI 2: CURRENT CROWD */}
        <div className="gov-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">CURRENT CROWD</span>
            <span className="kpi-trend-up">↑ 8.4%</span>
          </div>
          <div className="kpi-number">
            {(isRerouteActive ? 11240 : 18420).toLocaleString()}
          </div>
          <div className="kpi-context">
            <span className="kpi-context-text">Peak sector (Haridwar / Kashi)</span>
          </div>
        </div>

        {/* KPI 3: ACTIVE SOS */}
        <div className={`gov-kpi-card ${activeSOSCount > 0 ? 'kpi-card-danger' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">ACTIVE SOS</span>
            <span className={`kpi-indicator-dot ${activeSOSCount > 0 ? 'dot-red' : 'dot-green'}`}></span>
          </div>
          <div className="kpi-number">
            {String(activeSOSCount).padStart(2, '0')}
          </div>
          <div className="kpi-context">
            <span className="kpi-context-text">
              {sosAlerts.filter((a) => a.status === 'ACTIVE').length} awaiting dispatch
            </span>
          </div>
        </div>

        {/* KPI 4: HIGH-RISK ZONES */}
        <div className="gov-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">HIGH-RISK ZONES</span>
            <span className="kpi-indicator-dot dot-amber"></span>
          </div>
          <div className="kpi-number">
            {String(isRerouteActive ? 0 : Math.max(1, criticalCount + highCount)).padStart(2, '0')}
          </div>
          <div className="kpi-context">
            <span className="kpi-context-text">
              {isRerouteActive ? 'All corridors stabilized' : 'Zone A & Kedarnath queue'}
            </span>
          </div>
        </div>

        {/* KPI 5: BUSES ACTIVE */}
        <div className="gov-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">BUSES ACTIVE</span>
            <span className="kpi-indicator-dot dot-green"></span>
          </div>
          <div className="kpi-number">14</div>
          <div className="kpi-context">
            <span className="kpi-context-text">
              {isRerouteActive ? '14 deployed on bypass routes' : 'Ready at satellite parking'}
            </span>
          </div>
        </div>

        {/* KPI 6: HOTEL OCCUPANCY */}
        <div className="gov-kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">HOTEL OCCUPANCY</span>
            <span className="kpi-icon">🏨</span>
          </div>
          <div className="kpi-number">
            {hotelReport?.overall_occupancy_percentage || 30}%
          </div>
          <div className="kpi-context">
            <span className="kpi-context-text">
              {hotelReport?.total_available_rooms || 51} rooms available
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. MAIN COMMAND CENTER (2-COLUMN OPERATIONAL LAYOUT)                   */}
      {/* ===================================================================== */}
      <div className="gov-two-col-command">
        {/* LEFT COLUMN: LIVE CROWD MONITORING */}
        <div className="gov-col-left">
          <div className="gov-panel">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>LIVE CROWD MONITORING</span>
                <span className="gov-panel-badge">Priority Corridors</span>
              </div>
              <span className="gov-panel-sub">Real-time CCTV &amp; RFID gate sensor telemetry</span>
            </div>

            <div className="gov-table-container">
              <table className="gov-compact-table">
                <thead>
                  <tr>
                    <th>LOCATION</th>
                    <th>CURRENT CROWD</th>
                    <th>CAPACITY</th>
                    <th>OCCUPANCY</th>
                    <th>STATUS</th>
                    <th>TREND</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Priority High-Volume Shrines */}
                  {[
                    {
                      id: 'HAR-01',
                      name: 'Haridwar Corridor (Zone A)',
                      crowd: isRerouteActive ? 8700 : 13800,
                      capacity: 15000,
                      occ: isRerouteActive ? 58 : 92,
                      status: isRerouteActive ? 'MODERATE' : 'CRITICAL',
                      trend: isRerouteActive ? '↓' : '↑'
                    },
                    ...siteTelemetryList.slice(0, 5).map((s) => ({
                      id: s.id,
                      name: s.name,
                      crowd: s.people_count,
                      capacity: s.capacity || 10000,
                      occ: s.occupancy_percentage,
                      status: s.status,
                      trend: s.trend,
                      rawSite: s
                    }))
                  ].map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="font-semibold text-navy">{item.name}</td>
                      <td className="font-mono">{item.crowd.toLocaleString()}</td>
                      <td className="font-mono text-muted">{item.capacity.toLocaleString()}</td>
                      <td>
                        <div className="gov-cell-progress">
                          <div className="gov-cell-progress-bar">
                            <div
                              className={`gov-cell-progress-fill status-${item.status.toLowerCase()}`}
                              style={{ width: `${Math.min(100, item.occ)}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-xs">{item.occ}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`gov-status-badge status-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="font-bold text-center">
                        <span className={`trend-symbol ${item.trend === '↑' ? 'trend-up' : item.trend === '↓' ? 'trend-down' : 'trend-steady'}`}>
                          {item.trend}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleInspect(item.rawSite || sites.find((s) => s.id === updateSiteId) || sites[0])}
                          className="btn-compact-inspect"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Headcount Broadcast Form inside Panel */}
            <div className="gov-telemetry-form-strip">
              <div className="telemetry-strip-header">
                <span className="font-bold text-xs uppercase tracking-wider text-navy">
                  Broadcast Verified Crowd Update (POST /crowd/update)
                </span>
                <div className="demo-preset-links">
                  <button
                    type="button"
                    onClick={handleApplySurgePreset}
                    className="link-btn text-danger"
                  >
                    Simulate Surge (Kedarnath)
                  </button>
                  <span className="text-muted">|</span>
                  <button
                    type="button"
                    onClick={handleApplyNormalPreset}
                    className="link-btn text-success"
                  >
                    Reset Normal
                  </button>
                </div>
              </div>

              <form onSubmit={handleCrowdUpdateSubmit} className="telemetry-inputs-row">
                <select
                  value={updateSiteId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setUpdateSiteId(sid);
                    const found = sites.find((s) => s.id === sid);
                    if (found) {
                      const d = densityMap[sid] || { people_count: Math.round(found.capacity * 0.48) };
                      setUpdatePeopleCount(d.people_count);
                    }
                  }}
                  className="gov-select compact"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.id}] {s.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  max="300000"
                  value={updatePeopleCount}
                  onChange={(e) => setUpdatePeopleCount(Number(e.target.value))}
                  placeholder="Headcount"
                  className="gov-input compact"
                  title="Devotee Headcount"
                />

                <input
                  type="number"
                  min="0"
                  value={updateQueueLength}
                  onChange={(e) => setUpdateQueueLength(Number(e.target.value))}
                  placeholder="Queue (m)"
                  className="gov-input compact"
                  title="Queue Length (Meters)"
                />

                <input
                  type="number"
                  min="0"
                  value={updateWaitTime}
                  onChange={(e) => setUpdateWaitTime(Number(e.target.value))}
                  placeholder="Wait (min)"
                  className="gov-input compact"
                  title="Estimated Wait (Minutes)"
                />

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-telemetry-submit"
                >
                  {isUpdating ? 'BROADCASTING...' : 'BROADCAST'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: EMERGENCY OPERATIONS */}
        <div className="gov-col-right">
          <div className="gov-panel">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>EMERGENCY OPERATIONS</span>
                <span className={`gov-panel-badge ${activeSOSCount > 0 ? 'badge-danger' : 'badge-normal'}`}>
                  {activeSOSCount} Active Beacon{activeSOSCount === 1 ? '' : 's'}
                </span>
              </div>
              <span className="gov-panel-sub">Disaster Management &amp; Police Dispatch Desk</span>
            </div>

            <div className="gov-sos-feed">
              {isLoadingSOS && sosAlerts.length === 0 ? (
                <div className="gov-empty-feed">Loading emergency distress beacons...</div>
              ) : sosAlerts.length === 0 ? (
                <div className="gov-empty-feed">
                  <span className="empty-shield">🛡️</span>
                  <span>No active SOS distress calls. All sacred corridors secure.</span>
                </div>
              ) : (
                <div className="gov-sos-list">
                  {sosAlerts.map((alert) => {
                    const isDispatched = alert.status === 'DISPATCHED';
                    const severity = alert.severity || (alert.status === 'ACTIVE' ? 'CRITICAL' : 'MODERATE');
                    const responseUnit = alert.response_unit || (isDispatched ? 'Police Unit P-12 / SDRF 4' : 'Awaiting Assignment');

                    return (
                      <div key={alert.id} className={`gov-sos-card ${isDispatched ? 'is-dispatched' : 'is-active'}`}>
                        <div className="sos-card-top">
                          <div className="sos-card-id-row">
                            <span className="sos-id font-mono font-bold">{alert.id}</span>
                            <span className={`gov-status-badge status-${severity.toLowerCase()}`}>
                              {severity}
                            </span>
                          </div>
                          <span className={`sos-state-pill ${isDispatched ? 'dispatched' : 'active'}`}>
                            {alert.status}
                          </span>
                        </div>

                        <div className="sos-card-body">
                          <div className="sos-detail-row">
                            <span className="sos-lbl">Location:</span>
                            <span className="sos-val">
                              {alert.site_name || 'Sacred Pilgrimage Sector'}
                              {alert.latitude && (
                                <span className="sos-coords">
                                  ({alert.latitude.toFixed(3)}, {alert.longitude.toFixed(3)})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="sos-detail-row">
                            <span className="sos-lbl">Time:</span>
                            <span className="sos-val font-mono">{alert.timestamp || '12:42 PM'}</span>
                          </div>
                          <div className="sos-detail-row">
                            <span className="sos-lbl">Pilgrim:</span>
                            <span className="sos-val">{alert.user_name || alert.user_id || 'Devotee'} {alert.phone && `(${alert.phone})`}</span>
                          </div>
                          <div className="sos-detail-row">
                            <span className="sos-lbl">Unit:</span>
                            <span className="sos-val font-semibold">{responseUnit}</span>
                          </div>
                        </div>

                        <div className="sos-card-actions">
                          {alert.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleDispatchRescue(alert.id)}
                              className="btn-sos-dispatch"
                            >
                              DISPATCH
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleViewAlert(alert)}
                            className="btn-sos-view"
                          >
                            VIEW
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. ZONE MONITORING: ZONE RISK MONITORING                               */}
      {/* ===================================================================== */}
      <section className="gov-panel" id="gov-zone-monitoring">
        <div className="gov-panel-header">
          <div className="gov-panel-title">
            <span>ZONE RISK MONITORING</span>
            <span className="gov-panel-badge">Arterial Chokepoints</span>
          </div>
          <span className="gov-panel-sub">Haridwar Gateway Corridor AI Capacity &amp; Stampede Risk Matrix</span>
        </div>

        <div className="gov-zones-grid">
          {/* ZONE A */}
          <div className={`gov-zone-box ${isRerouteActive ? 'zone-safe' : 'zone-critical'}`}>
            <div className="zone-box-header">
              <div>
                <div className="zone-code">ZONE A</div>
                <div className="zone-title">Haridwar Main Sanctum Corridor</div>
              </div>
              <span className={`gov-status-badge ${isRerouteActive ? 'status-moderate' : 'status-critical'}`}>
                {isRerouteActive ? 'MODERATE (58%)' : 'CRITICAL (92%)'}
              </span>
            </div>
            <div className="zone-metrics-row">
              <div className="zone-metric">
                <span className="zm-lbl">Crowd</span>
                <span className="zm-val font-mono">{isRerouteActive ? '8,700' : '13,800'}</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Capacity</span>
                <span className="zm-val font-mono">15,000</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Risk Level</span>
                <span className={`zm-val font-bold ${isRerouteActive ? 'text-amber' : 'text-danger'}`}>
                  {isRerouteActive ? 'CONTROLLED' : 'STAMPEDE HAZARD'}
                </span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Trend</span>
                <span className="zm-val font-bold">{isRerouteActive ? '↓ Decreasing' : '↑ Surging (+840/hr)'}</span>
              </div>
            </div>
            <div className="zone-action-box">
              <span className="za-lbl">Recommended action:</span>
              <span className="za-text">
                {isRerouteActive
                  ? 'Traffic successfully deflected via Zone C bypass artery'
                  : 'Immediate emergency corridor rerouting required to avert surge bottleneck'}
              </span>
            </div>
          </div>

          {/* ZONE B */}
          <div className="gov-zone-box zone-moderate">
            <div className="zone-box-header">
              <div>
                <div className="zone-code">ZONE B</div>
                <div className="zone-title">Neelkanth Mountain Pass</div>
              </div>
              <span className="gov-status-badge status-moderate">
                HIGH (55%)
              </span>
            </div>
            <div className="zone-metrics-row">
              <div className="zone-metric">
                <span className="zm-lbl">Crowd</span>
                <span className="zm-val font-mono">4,400</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Capacity</span>
                <span className="zm-val font-mono">8,000</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Risk Level</span>
                <span className="zm-val font-bold text-amber">MODERATE FLOW</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Trend</span>
                <span className="zm-val font-bold">→ Steady</span>
              </div>
            </div>
            <div className="zone-action-box">
              <span className="za-lbl">Recommended action:</span>
              <span className="za-text">Maintain rapid barricades; staggered holding gates active at transit checkpoint 2</span>
            </div>
          </div>

          {/* ZONE C */}
          <div className="gov-zone-box zone-normal">
            <div className="zone-box-header">
              <div>
                <div className="zone-code">ZONE C</div>
                <div className="zone-title">Rishikesh Bypass Corridor</div>
              </div>
              <span className="gov-status-badge status-normal">
                {isRerouteActive ? 'NORMAL (39%)' : 'NORMAL (22%)'}
              </span>
            </div>
            <div className="zone-metrics-row">
              <div className="zone-metric">
                <span className="zm-lbl">Crowd</span>
                <span className="zm-val font-mono">{isRerouteActive ? '4,740' : '2,640'}</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Capacity</span>
                <span className="zm-val font-mono">12,000</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Risk Level</span>
                <span className="zm-val font-bold text-success">OPTIMAL FLOW</span>
              </div>
              <div className="zone-metric">
                <span className="zm-lbl">Trend</span>
                <span className="zm-val font-bold">{isRerouteActive ? '↑ Absorbing load' : '→ Clear flow'}</span>
              </div>
            </div>
            <div className="zone-action-box">
              <span className="za-lbl">Recommended action:</span>
              <span className="za-text">Designated relief artery receiving diverted traffic from Haridwar Highway</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. EMERGENCY REROUTE CONTROL                                          */}
      {/* ===================================================================== */}
      <section className={`gov-panel ${isRerouteActive ? 'panel-emergency-active' : ''}`} id="gov-reroute-control">
        <div className="gov-panel-header">
          <div className="gov-panel-title">
            <span>EMERGENCY REROUTE CONTROL</span>
            <span className={`gov-panel-badge ${isRerouteActive ? 'badge-danger' : 'badge-normal'}`}>
              Status: {isRerouteActive ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
          <span className="gov-panel-sub">District Administration Corridor Override Protocol</span>
        </div>

        <div className="gov-reroute-details-grid">
          <div className="reroute-detail-card">
            <span className="rd-lbl">Current Status</span>
            <span className={`rd-val font-bold ${isRerouteActive ? 'text-danger' : 'text-muted'}`}>
              {isRerouteActive ? '🚨 CORRIDOR OVERRIDE ENFORCED' : '✓ STANDBY (NOMINAL)'}
            </span>
          </div>

          <div className="reroute-detail-card">
            <span className="rd-lbl">Affected Locations</span>
            <span className="rd-val">Har Ki Pauri, Haridwar City Center, Zone A</span>
          </div>

          <div className="reroute-detail-card">
            <span className="rd-lbl">Routes Affected</span>
            <span className="rd-val">NH-334 Arterial Highway &amp; Ganga Canal Approach</span>
          </div>

          <div className="reroute-detail-card">
            <span className="rd-lbl">Buses Redirected</span>
            <span className="rd-val font-bold text-navy">14 Partner Buses (420 Seats)</span>
          </div>

          <div className="reroute-detail-card">
            <span className="rd-lbl">Activation Time</span>
            <span className="rd-val font-mono">{emergencyTimestamp || 'Not Active'}</span>
          </div>
        </div>

        <div className="gov-reroute-actions-bar">
          <div className="reroute-explanation">
            {isRerouteActive ? (
              <span className="text-danger font-semibold">
                ⚠ All connected tourist, travel operator, and hotel dashboards are currently receiving real-time emergency diversion instructions via Supabase Realtime.
              </span>
            ) : (
              <span className="text-slate font-normal">
                Triggering emergency corridor diversion re-routes all incoming highway traffic from Haridwar City Center to peripheral satellite parking (BHEL Ground / Rishikesh Bypass).
              </span>
            )}
          </div>

          <div className="reroute-buttons-group">
            {isRerouteActive ? (
              <>
                <button
                  type="button"
                  onClick={handleLiftEmergency}
                  disabled={isRecalculating}
                  className="btn-gov-primary de-escalate"
                >
                  {isRecalculating ? 'PROCESSING...' : 'DEACTIVATE REROUTE'}
                </button>
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="btn-gov-secondary"
                >
                  ↺ Reset Simulation
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleActivateEmergency}
                disabled={isRecalculating}
                className="btn-gov-primary activate"
              >
                {isRecalculating ? 'ACTIVATING...' : 'ACTIVATE REROUTE'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. BEFORE / AFTER IMPACT (Analytical Assessment)                      */}
      {/* ===================================================================== */}
      <section className="gov-panel" id="gov-impact-analysis">
        <div className="gov-panel-header">
          <div className="gov-panel-title">
            <span>BEFORE / AFTER IMPACT</span>
            <span className="gov-panel-badge">Corridor Telemetry Assessment</span>
          </div>
          <span className="gov-panel-sub">Comparative metrics of algorithmic crowd deflection and load shedding</span>
        </div>

        <div className="gov-impact-matrix">
          <table className="gov-impact-table">
            <thead>
              <tr>
                <th>METRIC</th>
                <th>BEFORE REROUTE</th>
                <th>AFTER REROUTE</th>
                <th>NET REDUCTION</th>
                <th>EVALUATION</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold text-navy">Crowd Headcount (Zone A)</td>
                <td className="font-mono text-danger font-bold">18,420</td>
                <td className="font-mono text-success font-bold">11,240</td>
                <td className="font-mono font-bold">-7,180 Pilgrims</td>
                <td><span className="gov-status-badge status-normal">Stabilized</span></td>
              </tr>
              <tr>
                <td className="font-semibold text-navy">Corridor Occupancy</td>
                <td className="font-mono text-danger font-bold">91%</td>
                <td className="font-mono text-success font-bold">62%</td>
                <td className="font-mono font-bold">-29% Points</td>
                <td><span className="gov-status-badge status-normal">Safe Margin</span></td>
              </tr>
              <tr>
                <td className="font-semibold text-navy">Estimated Wait Time</td>
                <td className="font-mono text-danger font-bold">48 min</td>
                <td className="font-mono text-success font-bold">21 min</td>
                <td className="font-mono font-bold">-27 min (-56%)</td>
                <td><span className="gov-status-badge status-normal">Optimal Flow</span></td>
              </tr>
              <tr>
                <td className="font-semibold text-navy">Stampede Risk Profile</td>
                <td className="font-bold text-danger">CRITICAL</td>
                <td className="font-bold text-amber">MODERATE</td>
                <td className="font-bold text-success">Hazard Averted</td>
                <td><span className="gov-status-badge status-normal">0 Incident Risk</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="gov-impact-kpis">
          <div className="impact-kpi-item">
            <span className="ik-lbl">Congestion Reduction</span>
            <span className="ik-num text-success">-29% to -34%</span>
            <span className="ik-sub">Peak corridor relief</span>
          </div>
          <div className="impact-kpi-item">
            <span className="ik-lbl">Tourists Diverted</span>
            <span className="ik-num text-navy">350</span>
            <span className="ik-sub">Pilgrims safely rerouted</span>
          </div>
          <div className="impact-kpi-item">
            <span className="ik-lbl">Partner Buses Deployed</span>
            <span className="ik-num text-navy">14</span>
            <span className="ik-sub">Active transit shuttles</span>
          </div>
          <div className="impact-kpi-item">
            <span className="ik-lbl">Shelter Properties</span>
            <span className="ik-num text-navy">22</span>
            <span className="ik-sub">Partner hotels allocated</span>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. PILGRIMAGE SITE MONITORING (ALL 25 SITES)                          */}
      {/* ===================================================================== */}
      <section className="gov-panel" id="gov-shrine-table">
        <div className="gov-panel-header">
          <div className="gov-panel-title">
            <span>PILGRIMAGE SITE MONITORING</span>
            <span className="gov-panel-badge">25 Sacred Sites (TS001–TS025)</span>
          </div>
          <span className="gov-panel-sub">National multi-state pilgrimage corridor surveillance matrix</span>
        </div>

        {/* Filter Controls Bar */}
        <div className="gov-filter-bar">
          <div className="filter-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by site ID, shrine name, district, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="gov-search-input"
            />
          </div>

          <div className="filter-dropdown-group">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="gov-filter-select"
            >
              {uniqueStates.map((st) => (
                <option key={st} value={st}>
                  State: {st}
                </option>
              ))}
            </select>

            <div className="filter-status-pills">
              {['ALL', 'NORMAL', 'MODERATE', 'HIGH', 'CRITICAL'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`btn-filter-pill ${statusFilter === s ? 'active' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dense Shrine Table */}
        <div className="gov-table-container">
          <table className="gov-shrine-dense-table">
            <thead>
              <tr>
                <th>SITE</th>
                <th>DISTRICT</th>
                <th>CURRENT CROWD</th>
                <th>CAPACITY</th>
                <th>OCCUPANCY</th>
                <th>STATUS</th>
                <th>LAST UPDATE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((s) => {
                const isSelected = s.id === updateSiteId;
                return (
                  <tr key={s.id} className={isSelected ? 'is-selected-row' : ''}>
                    <td>
                      <div className="site-identity">
                        <span className="site-id-badge font-mono">{s.id}</span>
                        <span className="site-name-text">{s.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="district-text">{s.city || s.state}</span>
                      <span className="state-sub">({s.state})</span>
                    </td>
                    <td className="font-mono font-bold text-navy">
                      {s.people_count.toLocaleString()}
                    </td>
                    <td className="font-mono text-muted">
                      {(s.capacity || 10000).toLocaleString()}
                    </td>
                    <td>
                      <div className="shrine-occ-cell">
                        <div className="shrine-occ-bar-track">
                          <div
                            className={`shrine-occ-bar-fill status-${s.status.toLowerCase()}`}
                            style={{ width: `${Math.min(100, s.occupancy_percentage)}%` }}
                          ></div>
                        </div>
                        <span className="shrine-occ-pct font-mono">{s.occupancy_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`gov-status-badge status-${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-muted font-mono text-xs">
                      Live (2s ago)
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleInspect(s)}
                        className="btn-shrine-inspect"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 9. MULTI-AGENCY OPERATIONS                                            */}
      {/* ===================================================================== */}
      <section className="gov-panel" id="gov-multi-agency">
        <div className="gov-panel-header">
          <div className="gov-panel-title">
            <span>MULTI-AGENCY OPERATIONS</span>
            <span className="gov-panel-badge">Inter-Departmental Command</span>
          </div>
          <span className="gov-panel-sub">Integrated dispatch and logistics telemetry for unified administration</span>
        </div>

        {/* Agency Navigation Tabs */}
        <div className="agency-tabs-nav">
          <button
            type="button"
            onClick={() => setActiveAgencyTab('police')}
            className={`agency-tab-btn ${activeAgencyTab === 'police' ? 'active' : ''}`}
          >
            POLICE
          </button>
          <button
            type="button"
            onClick={() => setActiveAgencyTab('transport')}
            className={`agency-tab-btn ${activeAgencyTab === 'transport' ? 'active' : ''}`}
          >
            TRANSPORT
          </button>
          <button
            type="button"
            onClick={() => setActiveAgencyTab('health')}
            className={`agency-tab-btn ${activeAgencyTab === 'health' ? 'active' : ''}`}
          >
            HEALTH
          </button>
          <button
            type="button"
            onClick={() => setActiveAgencyTab('disaster')}
            className={`agency-tab-btn ${activeAgencyTab === 'disaster' ? 'active' : ''}`}
          >
            DISASTER MANAGEMENT
          </button>
          <button
            type="button"
            onClick={() => setActiveAgencyTab('municipal')}
            className={`agency-tab-btn ${activeAgencyTab === 'municipal' ? 'active' : ''}`}
          >
            MUNICIPAL
          </button>
        </div>

        <div className="agency-tab-content">
          {/* 1. POLICE TAB */}
          {activeAgencyTab === 'police' && (
            <div className="agency-cards-grid">
              <div className="agency-card">
                <div className="agency-card-title">Police Deployment &amp; Platoons</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">PAC Platoons Stationed</span>
                    <span className="ak-val font-semibold">4 Platoons (120 Officers)</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Traffic Constabulary</span>
                    <span className="ak-val font-semibold">48 Traffic Personnel</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">AI Drone Surveillance</span>
                    <span className="ak-val font-semibold">6 Aerial Drones Active</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Rapid Barricades</span>
                    <span className="ak-val font-semibold">12 Active Checkpoints</span>
                  </div>
                </div>
              </div>

              <div className="agency-card">
                <div className="agency-card-title">Chokepoint Security Telemetry</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Zone A Influx Rate</span>
                    <span className="ak-val font-bold text-danger">{isRerouteActive ? 'Controlled' : '+840 Yatris/hr'}</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Average PCR Response Time</span>
                    <span className="ak-val font-semibold font-mono">4.2 Minutes</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Active 112 Mobile Patrols</span>
                    <span className="ak-val font-semibold">8 PCR Vans on Route</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">CCTV Face Recognition</span>
                    <span className="ak-val font-semibold text-success">Online &amp; Logging</span>
                  </div>
                </div>
              </div>

              <div className="agency-card">
                <div className="agency-card-title">Active Distress Signals</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Total Logged Beacons</span>
                    <span className="ak-val font-bold">{sosAlerts.length}</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Pending Rescue Dispatch</span>
                    <span className="ak-val font-bold text-danger">{activeSOSCount}</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Emergency Band Link</span>
                    <span className="ak-val font-semibold text-success">112 Dispatch Interlinked</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TRANSPORT TAB */}
          {activeAgencyTab === 'transport' && (
            <div className="agency-cards-grid">
              <div className="agency-card">
                <div className="agency-card-title">Fleet Allocation (Buses)</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Partner Fleet Total</span>
                    <span className="ak-val font-bold font-mono">14 Partner Buses</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Total Seat Capacity</span>
                    <span className="ak-val font-mono">420 Passengers</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Current Passenger Load</span>
                    <span className="ak-val font-bold text-navy">{isRerouteActive ? '350 Diverted Yatris' : '0 (Standby)'}</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Deployment State</span>
                    <span className={`ak-val font-semibold ${isRerouteActive ? 'text-success' : 'text-muted'}`}>
                      {isRerouteActive ? '14 / 14 En Route to BHEL Hub' : 'Standby at Rishikesh Depots'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="agency-card">
                <div className="agency-card-title">Corridor Transit Efficiency</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Bypass Artery Transit Time</span>
                    <span className="ak-val font-mono">38 Minutes (Zone C)</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Choked Main Highway Time</span>
                    <span className="ak-val font-mono text-danger">145 Minutes (Congested)</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Net Travel Time Saved</span>
                    <span className="ak-val font-bold text-success font-mono">107 Minutes / Yatri</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">FASTag Emergency Override</span>
                    <span className="ak-val font-semibold text-success">Active at 4 Toll Plazas</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. HEALTH TAB */}
          {activeAgencyTab === 'health' && (
            <div className="agency-cards-grid">
              <div className="agency-card">
                <div className="agency-card-title">Medical Relief Camps &amp; Oxygen Posts</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">High-Altitude Triage Posts</span>
                    <span className="ak-val font-bold">5 Active Centers</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Available Oxygen Cylinders</span>
                    <span className="ak-val font-bold font-mono">120 Beds Ready</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Mobile Trauma Stretchers</span>
                    <span className="ak-val font-mono">18 Units Deployed</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">First Aid Health Marshals</span>
                    <span className="ak-val font-semibold">32 Registered Personnel</span>
                  </div>
                </div>
              </div>

              <div className="agency-card">
                <div className="agency-card-title">Emergency Ambulances &amp; Hospital Link</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">108 Ambulances on Standby</span>
                    <span className="ak-val font-bold">8 Ambulances (Sector 4)</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">AIIMS Rishikesh Green Corridor</span>
                    <span className="ak-val font-semibold text-success">Operational &amp; Clear</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Helipad Evacuation Readiness</span>
                    <span className="ak-val font-semibold text-success">100% Ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. DISASTER MANAGEMENT TAB */}
          {activeAgencyTab === 'disaster' && (
            <div className="agency-cards-grid">
              <div className="agency-card">
                <div className="agency-card-title">NDRF / SDRF Rapid Units</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">NDRF Quick Reaction Teams</span>
                    <span className="ak-val font-bold">3 Teams (45 Personnel)</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">SDRF River Patrol Motorboats</span>
                    <span className="ak-val font-bold">8 Inflatable Boats</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">High-Angle Rope Rescue</span>
                    <span className="ak-val font-semibold">2 Squads on Standby</span>
                  </div>
                </div>
              </div>

              <div className="agency-card">
                <div className="agency-card-title">Hydrological &amp; Weather Sensors</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Alaknanda Water Flow</span>
                    <span className="ak-val font-mono">18,200 cusecs (Safe)</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Mandakini Flood Gauges</span>
                    <span className="ak-val font-semibold text-success">Green Baseline Level</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Landslide Risk (Rudraprayag)</span>
                    <span className="ak-val font-semibold text-amber">Sensor Level 2 (Moderate)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. MUNICIPAL TAB */}
          {activeAgencyTab === 'municipal' && (
            <div className="agency-cards-grid">
              <div className="agency-card">
                <div className="agency-card-title">Pilgrimage Lodging &amp; Hospitality (Real API)</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Total Registered Lodges</span>
                    <span className="ak-val font-bold">{hotelReport?.total_hotels || 11} Properties</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Total City Room Inventory</span>
                    <span className="ak-val font-mono">{hotelReport?.total_capacity_rooms || 73} Rooms</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Available Room Vacancies</span>
                    <span className="ak-val font-bold text-success font-mono">
                      {hotelReport?.total_available_rooms || 51} Rooms
                    </span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Overall Lodging Occupancy</span>
                    <span className="ak-val font-bold font-mono">
                      {hotelReport?.overall_occupancy_percentage || 30}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="agency-card">
                <div className="agency-card-title">Water, Food &amp; Sanitation Infrastructure</div>
                <div className="agency-key-vals">
                  <div className="ak-row">
                    <span className="ak-lbl">Free Temple Water ATMs</span>
                    <span className="ak-val font-semibold font-mono">48 Units Operating</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Subsidized Bhojanalayas</span>
                    <span className="ak-val font-semibold font-mono">16 Feeding Centers</span>
                  </div>
                  <div className="ak-row">
                    <span className="ak-lbl">Waste Management Teams</span>
                    <span className="ak-val font-semibold">24/7 Sweep Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 10. INSPECTION MODAL DOSSIER                                          */}
      {/* ===================================================================== */}
      {inspectSite && (
        <div className="gov-modal-backdrop" onClick={() => setInspectSite(null)}>
          <div className="gov-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="gov-modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">🏛️</span>
                <div>
                  <h3 className="modal-heading">
                    {inspectSite.name}
                  </h3>
                  <div className="modal-sub">
                    Site ID: {inspectSite.id} • {inspectSite.city}, {inspectSite.state}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="gov-modal-close"
                onClick={() => setInspectSite(null)}
              >
                ✕
              </button>
            </div>

            <div className="gov-modal-body">
              <div className="modal-stats-grid">
                <div className="m-stat-box">
                  <span className="ms-lbl">Safe Holding Capacity</span>
                  <span className="ms-val font-mono">{(inspectSite.capacity || 10000).toLocaleString()} devotees</span>
                </div>
                <div className="m-stat-box">
                  <span className="ms-lbl">Live Devotee Headcount</span>
                  <span className="ms-val font-mono font-bold text-navy">{inspectSite.people_count?.toLocaleString()}</span>
                </div>
                <div className="m-stat-box">
                  <span className="ms-lbl">Current Occupancy</span>
                  <span className={`ms-val font-bold status-${inspectSite.status.toLowerCase()}`}>
                    {inspectSite.occupancy_percentage}% ({inspectSite.status})
                  </span>
                </div>
                <div className="m-stat-box">
                  <span className="ms-lbl">Estimated Queue Time</span>
                  <span className="ms-val font-mono">⏱️ {inspectSite.estimated_wait_mins} mins</span>
                </div>
              </div>
            </div>

            <div className="gov-modal-footer">
              <button
                type="button"
                className="btn-modal-action"
                onClick={() => {
                  onSelectSite && onSelectSite(inspectSite.id);
                  setInspectSite(null);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
              >
                Load into Telemetry Broadcast Form ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 11. SOS BEACON VIEW MODAL                                             */}
      {/* ===================================================================== */}
      {viewingAlert && (
        <div className="gov-modal-backdrop" onClick={() => setViewingAlert(null)}>
          <div className="gov-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="gov-modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon text-danger">🚨</span>
                <div>
                  <h3 className="modal-heading">Distress Beacon {viewingAlert.id}</h3>
                  <div className="modal-sub">
                    Emergency Signal • {viewingAlert.emergency_type}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="gov-modal-close"
                onClick={() => setViewingAlert(null)}
              >
                ✕
              </button>
            </div>

            <div className="gov-modal-body">
              <div className="modal-stats-grid">
                <div className="m-stat-box">
                  <span className="ms-lbl">Pilgrim Name / ID</span>
                  <span className="ms-val font-semibold">{viewingAlert.user_name || viewingAlert.user_id}</span>
                </div>
                <div className="m-stat-box">
                  <span className="ms-lbl">Phone Contact</span>
                  <span className="ms-val font-mono">{viewingAlert.phone || 'Emergency Band'}</span>
                </div>
                <div className="m-stat-box">
                  <span className="ms-lbl">Location Coordinates</span>
                  <span className="ms-val font-mono">
                    {viewingAlert.latitude?.toFixed(4)}, {viewingAlert.longitude?.toFixed(4)}
                  </span>
                </div>
                <div className="m-stat-box">
                  <span className="ms-lbl">Current Status</span>
                  <span className={`ms-val font-bold ${viewingAlert.status === 'ACTIVE' ? 'text-danger' : 'text-success'}`}>
                    {viewingAlert.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="gov-modal-footer">
              {viewingAlert.status === 'ACTIVE' && (
                <button
                  type="button"
                  className="btn-modal-action dispatch"
                  onClick={() => {
                    handleDispatchRescue(viewingAlert.id);
                    setViewingAlert(null);
                  }}
                >
                  Dispatch Rescue Team (112 / SDRF)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
