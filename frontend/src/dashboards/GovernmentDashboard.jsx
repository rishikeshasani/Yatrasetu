import React, { useState, useEffect } from 'react';
import {
  updateCrowdObservation,
  fetchActiveSOSAlerts,
  fetchGovernmentOccupancyReport
} from '../api/api';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');

  // Crowd Update Form State (POST /crowd/update)
  const [updateSiteId, setUpdateSiteId] = useState(selectedSiteId || 'TS001');
  const [updatePeopleCount, setUpdatePeopleCount] = useState(12350);
  const [updateQueueLength, setUpdateQueueLength] = useState(480);
  const [updateWaitTime, setUpdateWaitTime] = useState(540);
  const [isUpdating, setIsUpdating] = useState(false);

  // SOS Distress Alerts Feed
  const [sosAlerts, setSosAlerts] = useState([]);
  const [isLoadingSOS, setIsLoadingSOS] = useState(false);

  // Hospitality Report
  const [hotelReport, setHotelReport] = useState(null);

  // Selected Site Detail Drawer / Modal
  const [inspectSite, setInspectSite] = useState(null);

  // =========================================================================
  // WINNING FEATURE: EMERGENCY REROUTE & DEMO HEATMAP ZONES
  // =========================================================================
  const [isRerouteActive, setIsRerouteActive] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Surge Prediction Alert State
  const [surgeAlertVisible, setSurgeAlertVisible] = useState(true);

  // Multi-Department Tab State ('police' | 'ndrf' | 'transport' | 'tourism')
  const [activeDeptTab, setActiveDeptTab] = useState('police');

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

    // Poll SOS alerts every 5 seconds for live distress beacon updates
    const sosInterval = setInterval(async () => {
      try {
        const freshAlerts = await fetchActiveSOSAlerts();
        if (isMounted && Array.isArray(freshAlerts)) {
          setSosAlerts(freshAlerts);
        }
      } catch (err) {
        // silent fallback
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(sosInterval);
    };
  }, []);

  // Compute Telemetry Aggregates across all 25 sites
  const siteTelemetryList = sites.map((site) => {
    const d = densityMap[site.id] || {
      people_count: Math.round(site.capacity * 0.48),
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

    return {
      ...site,
      people_count: count,
      occupancy_percentage: occ,
      status,
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

  // Handle Form Submission for Crowd Headcount Update (POST /crowd/update)
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
          `🏛️ [Govt Command] Updated ${siteName} to ${Number(updatePeopleCount).toLocaleString()} devotees (${res.data?.occupancy_percentage}% ${res.data?.status}).`
        );
      }

      if (onCrowdUpdated) {
        onCrowdUpdated(updateSiteId, res.data);
      }
    } catch (err) {
      if (showToast) {
        showToast('Error sending crowd telemetry update.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Demo Presets for Hackathon Storytelling
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
      showToast(`🚨 SDRF Unit & Emergency Ambulance 108 dispatched to ${alertId}.`);
    }
  };

  // =========================================================================
  // EMERGENCY REROUTE TRIGGER (WINNING FEATURE)
  // =========================================================================
  const handleActivateEmergencyReroute = () => {
    if (isRerouteActive) {
      // Toggle back to baseline
      setIsRerouteActive(false);
      if (showToast) {
        showToast('↺ Baseline simulation restored. Emergency reroute standby.');
      }
      return;
    }

    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
      setIsRerouteActive(true);
      if (showToast) {
        showToast('🚨 Emergency rerouting activated: 350 tourists diverted to 14 travel buses & 22 partner hotels.');
      }
    }, 1200);
  };

  const handleResetSimulation = () => {
    setIsRerouteActive(false);
    setIsRecalculating(false);
    setSurgeAlertVisible(true);
    if (showToast) {
      showToast('↺ Demonstration zones reset to baseline pre-reroute state.');
    }
  };

  return (
    <div className="gov-command-root">
      {/* 1. SURGE PREDICTION ALERT CARD / BANNER (FEATURE 4) */}
      {surgeAlertVisible && (
        <div className="gov-surge-alert-banner">
          <div className="surge-alert-content">
            <div className="surge-alert-icon">⚠️</div>
            <div>
              <div className="surge-alert-title-row">
                <span className="surge-alert-tag">SURGE PREDICTION</span>
                <span className="surge-alert-headline">
                  2-hour stampede risk detected in Zone A (Haridwar Main).
                </span>
                <span className="alert-dispatch-pill">
                  🚨 Alert Sent: Police HQ &amp; 108 Emergency Dispatch
                </span>
              </div>
              <p className="surge-alert-sub">
                <span>Autonomous AI crowd velocity anomaly triggered early warning.</span>
                <span>• Threshold: &gt;90% capacity within 120 minutes</span>
                <span>• Status: <strong>Automated Multi-Agency Dispatch Triggered</strong></span>
                <span style={{ opacity: 0.8 }}>(Simulation Alert)</span>
              </p>
            </div>
          </div>
          <div className="surge-alert-actions">
            <button
              type="button"
              onClick={() => setSurgeAlertVisible(false)}
              className="surge-dismiss-btn"
              title="Acknowledge Alert"
            >
              ✓ Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* 2. TOP COMMAND BANNER */}
      <div className="gov-command-header">
        <div className="gov-header-title-box">
          <div className="gov-header-logo">🏛️</div>
          <div>
            <div className="gov-header-crumbs">
              <span>MINISTRY OF TOURISM &amp; NATIONAL DISASTER MANAGEMENT AUTHORITY</span>
              <span className="gov-live-secure-pill">
                <span className="gov-live-dot"></span> LIVE SECURE TELEMETRY FEED
              </span>
            </div>
            <h1 className="gov-main-heading">YatraSetu National Pilgrimage Command Center</h1>
            <p className="gov-main-subtext">
              Centralized AI CCTV Vision, Crowd Influx Governance, Queue Corridors &amp; Emergency Response for India's 25 Sacred Shrines (TS001–TS025)
            </p>
          </div>
        </div>

        <div className="gov-officer-pill">
          <span className="gov-officer-shield">🛡️</span>
          <div>
            <div className="gov-officer-name">{currentUser?.full_name || 'DM Rudraprayag / Uttarakhand Command'}</div>
            <div className="gov-officer-role">CHIEF CROWD DISPATCHER • VERIFIED GOVT JWT</div>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE KPI METRIC STRIP */}
      <div className="gov-metrics-strip">
        <div className="gov-metric-box">
          <div className="metric-label-row">
            <span className="metric-lbl">MONITORED SHRINES</span>
            <span>📍</span>
          </div>
          <div className="metric-num">{totalSites}</div>
          <div className="metric-foot">25 Official Sites (TS001–TS025)</div>
        </div>

        <div className="gov-metric-box metric-box-normal">
          <div className="metric-label-row">
            <span className="metric-lbl">NORMAL FLOW</span>
            <span className="kpi-status-dot dot-normal"></span>
          </div>
          <div className="metric-num">{normalCount}</div>
          <div className="metric-foot">&lt; 50% • Smooth Darshan</div>
        </div>

        <div className="gov-metric-box metric-box-moderate">
          <div className="metric-label-row">
            <span className="metric-lbl">MODERATE SURGE</span>
            <span className="kpi-status-dot dot-moderate"></span>
          </div>
          <div className="metric-num">{moderateCount}</div>
          <div className="metric-foot">50% - 74% • Managed Corridors</div>
        </div>

        <div className="gov-metric-box metric-box-high">
          <div className="metric-label-row">
            <span className="metric-lbl">HIGH CONGESTION</span>
            <span className="kpi-status-dot dot-high"></span>
          </div>
          <div className="metric-num">{highCount}</div>
          <div className="metric-foot">75% - 89% • Buffer Holding</div>
        </div>

        <div className="gov-metric-box metric-box-critical">
          <div className="metric-label-row">
            <span className="metric-lbl">CRITICAL DENSITY</span>
            <span className="kpi-status-dot dot-critical"></span>
          </div>
          <div className="metric-num">{criticalCount}</div>
          <div className="metric-foot">&gt;= 90% • Diversion Alert</div>
        </div>

        <div className="gov-metric-box">
          <div className="metric-label-row">
            <span className="metric-lbl">PILGRIMS IN TRANSIT</span>
            <span>👥</span>
          </div>
          <div className="metric-num">{totalDevotees.toLocaleString()}</div>
          <div className="metric-foot">Live Across 25 Shrines</div>
        </div>

        <div className={`gov-metric-box metric-box-sos ${activeSOSCount > 0 ? 'active-pulse' : ''}`}>
          <div className="metric-label-row">
            <span className="metric-lbl">ACTIVE SOS BEACONS</span>
            <span>🚨</span>
          </div>
          <div className="metric-num">{activeSOSCount}</div>
          <div className="metric-foot">112 / SDRF Connected</div>
        </div>
      </div>

      {/* 4. CENTRALIZED CROWD HEATMAP & EMERGENCY REROUTE HUB (FEATURE 1 & 2) */}
      <div className="gov-central-heatmap-hub">
        <div className="hub-top-header">
          <div className="hub-title-group">
            <div className="hub-icon-shield">📡</div>
            <div>
              <h2 className="hub-heading">
                Centralized Crowd Heatmap &amp; Arterial Corridor Telemetry
                <span className="hub-demo-pill">DEMO ZONES / SIMULATION (Char Dham Gateway)</span>
              </h2>
              <p className="hub-subtitle">
                High-density bottleneck tracking across Haridwar, Neelkanth, and Rishikesh arterial pilgrimage corridors with AI drone &amp; CCTV telemetry.
              </p>
            </div>
          </div>

          {/* EMERGENCY REROUTE CONTROLS (WINNING FEATURE) */}
          <div className="emergency-reroute-controls">
            <button
              type="button"
              onClick={handleActivateEmergencyReroute}
              disabled={isRecalculating}
              className={`btn-emergency-reroute ${isRerouteActive ? 'is-active' : ''} ${isRecalculating ? 'is-loading' : ''}`}
            >
              <span className="reroute-siren">{isRerouteActive ? '✅' : '🚨'}</span>
              <span>
                {isRecalculating
                  ? 'Recalculating AI Diversion Corridor...'
                  : isRerouteActive
                  ? 'EMERGENCY REROUTE ACTIVE'
                  : '🚨 ACTIVATE EMERGENCY REROUTE'}
              </span>
            </button>

            {isRerouteActive && (
              <button
                type="button"
                onClick={handleResetSimulation}
                className="btn-reset-simulation"
                title="Reset simulation back to 92% high congestion"
              >
                ↺ Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* Recalculation Loading Animation */}
        {isRecalculating && (
          <div className="reroute-loading-overlay">
            <div className="loading-text-row">
              <span>⚡ AI Algorithmic Recalculation in progress...</span>
              <span>Optimizing corridor bypass via Zone C &amp; 14 partner buses</span>
            </div>
            <div className="loading-bar-track">
              <div className="loading-bar-animated-fill"></div>
            </div>
          </div>
        )}

        {/* Active Reroute State Broadcast Banner */}
        {isRerouteActive && !isRecalculating && (
          <div className="reroute-active-broadcast-banner">
            <div className="broadcast-left">
              <span className="broadcast-icon">🚀</span>
              <div>
                <div className="broadcast-headline">Emergency rerouting activated</div>
                <div className="broadcast-detail">
                  <strong>350 tourists diverted</strong> to <strong>14 travel buses</strong> &amp; <strong>22 partner hotels</strong>.
                  Bypassing Haridwar bottleneck via Rishikesh Bypass Corridor.
                </div>
              </div>
            </div>
            <span className="broadcast-tag-pill">DYNAMIC AI DIVERSION IN EFFECT</span>
          </div>
        )}

        {/* 3 DEMONSTRATION HEATMAP ZONES */}
        <div className="heatmap-zones-grid">
          {/* ZONE A — HARIDWAR MAIN */}
          <div className={`zone-card ${isRerouteActive ? 'zone-controlled' : 'zone-red'}`}>
            <div className="zone-header">
              <div>
                <span className="zone-id-tag">DEMO ZONE A • ARTERIAL GHAT CORRIDOR</span>
                <h3 className="zone-name">Zone A — Haridwar Main</h3>
              </div>
              <span className={`zone-badge ${isRerouteActive ? 'badge-controlled' : 'badge-red'}`}>
                {isRerouteActive ? '58% — CONTROLLED' : '92% — HIGH CONGESTION — RED'}
              </span>
            </div>

            <div className="zone-metric-row">
              <div className={`zone-pct ${isRerouteActive ? 'text-controlled' : 'text-red'}`}>
                {isRerouteActive ? '58%' : '92%'}
              </div>
              <span className="zone-density-status">
                {isRerouteActive ? 'Controlled Density' : 'Critical Bottleneck'}
              </span>
            </div>

            <div className="zone-bar-track">
              <div
                className={`zone-bar-fill ${isRerouteActive ? 'bar-controlled' : 'bar-red'}`}
                style={{ width: `${isRerouteActive ? 58 : 92}%` }}
              ></div>
            </div>

            <div className="zone-meta-grid">
              <div className="meta-item">
                <span className="meta-lbl">Live Pilgrims</span>
                <span className="meta-val">
                  {isRerouteActive ? '8,700 Devotees' : '13,800 Devotees'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Corridor Capacity</span>
                <span className="meta-val">15,000 Safe Limit</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Inflow / Velocity</span>
                <span className="meta-val">{isRerouteActive ? 'Controlled Flow' : '+840/hr (Surge)'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">CCTV Cameras</span>
                <span className="meta-val">12 Active Drones</span>
              </div>
            </div>

            <div className="zone-footer-status">
              <span>{isRerouteActive ? '🟢' : '🔴'}</span>
              <span>
                Status:{' '}
                <strong>
                  {isRerouteActive
                    ? 'Flow stabilized via automated diversion to Zone C'
                    : 'Stampede hazard imminent without immediate diversion'}
                </strong>
              </span>
            </div>
          </div>

          {/* ZONE B — NEELKANTH */}
          <div className="zone-card zone-yellow">
            <div className="zone-header">
              <div>
                <span className="zone-id-tag">DEMO ZONE B • MOUNTAIN PILGRIMAGE PASS</span>
                <h3 className="zone-name">Zone B — Neelkanth</h3>
              </div>
              <span className="zone-badge badge-yellow">
                55% — MODERATE — YELLOW
              </span>
            </div>

            <div className="zone-metric-row">
              <div className="zone-pct text-yellow">55%</div>
              <span className="zone-density-status">Moderate Flow</span>
            </div>

            <div className="zone-bar-track">
              <div className="zone-bar-fill bar-yellow" style={{ width: '55%' }}></div>
            </div>

            <div className="zone-meta-grid">
              <div className="meta-item">
                <span className="meta-lbl">Live Pilgrims</span>
                <span className="meta-val">4,400 Devotees</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Pass Capacity</span>
                <span className="meta-val">8,000 Safe Limit</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Buffer Holding</span>
                <span className="meta-val">Operational</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Avg Wait</span>
                <span className="meta-val">35 Mins</span>
              </div>
            </div>

            <div className="zone-footer-status">
              <span>🟡</span>
              <span>Status: <strong>Steady queue progression. Barricades active.</strong></span>
            </div>
          </div>

          {/* ZONE C — RISHIKESH BYPASS */}
          <div className="zone-card zone-green">
            <div className="zone-header">
              <div>
                <span className="zone-id-tag">DEMO ZONE C • AI TRANSIT ARTERY</span>
                <h3 className="zone-name">Zone C — Rishikesh Bypass</h3>
              </div>
              <span className="zone-badge badge-green">
                {isRerouteActive ? '39% — OPTIMAL FLOW' : '22% — LOW CONGESTION — GREEN'}
              </span>
            </div>

            <div className="zone-metric-row">
              <div className="zone-pct text-green">{isRerouteActive ? '39%' : '22%'}</div>
              <span className="zone-density-status">
                {isRerouteActive ? 'Absorbing Diversion' : 'Low Congestion'}
              </span>
            </div>

            <div className="zone-bar-track">
              <div
                className="zone-bar-fill bar-green"
                style={{ width: `${isRerouteActive ? 39 : 22}%` }}
              ></div>
            </div>

            <div className="zone-meta-grid">
              <div className="meta-item">
                <span className="meta-lbl">Live Pilgrims</span>
                <span className="meta-val">{isRerouteActive ? '4,740 (+350 Diverted)' : '2,640 Devotees'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Bypass Capacity</span>
                <span className="meta-val">12,000 Safe Limit</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Partner Buses</span>
                <span className="meta-val">{isRerouteActive ? '14 En Route' : 'Ready on Standby'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-lbl">Transit Time</span>
                <span className="meta-val">38 Mins (Clear)</span>
              </div>
            </div>

            <div className="zone-footer-status">
              <span>🟢</span>
              <span>
                Status:{' '}
                <strong>
                  {isRerouteActive
                    ? 'Receiving 350 rerouted pilgrims smoothly'
                    : 'Designated green bypass corridor for Haridwar relief'}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BEFORE VS AFTER IMPACT CARD (FEATURE 3 - JUDGE-FACING WINNING DEMO) */}
      {isRerouteActive && (
        <div className="gov-impact-showcase-card">
          <div className="impact-header-strip">
            <div>
              <span className="impact-badge-tag">JUDGE EVALUATION • ALGORITHMIC IMPACT</span>
              <h2 className="impact-title">Dynamic Corridor Rerouting: Before vs. After Assessment</h2>
              <p className="impact-sub">
                Quantified telemetry showcasing crowd load shedding and automated diversion across the Char Dham arterial gateway.
              </p>
            </div>
            <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: '800' }}>
              SIMULATION BENCHMARK
            </span>
          </div>

          <div className="impact-comparison-grid">
            {/* BEFORE */}
            <div className="impact-col col-before">
              <span className="impact-col-lbl">BEFORE INTERVENTION</span>
              <div className="impact-col-metric">92%</div>
              <span className="impact-col-badge badge-risk">HIGH RISK</span>
              <p className="impact-col-desc">
                Severe bottleneck in Zone A (Haridwar Main). Stampede danger with 13,800 pilgrims choked at Brahma Kund corridor.
              </p>
            </div>

            {/* DIVIDER */}
            <div className="impact-divider-arrow">
              <span className="divider-arrow-symbol">➔</span>
              <span className="divider-tag">AI OPTIMIZED</span>
            </div>

            {/* AFTER */}
            <div className="impact-col col-after">
              <span className="impact-col-lbl">AFTER REROUTING</span>
              <div className="impact-col-metric">58%</div>
              <span className="impact-col-badge badge-controlled-opt">CONTROLLED</span>
              <p className="impact-col-desc">
                Flow successfully stabilized. Crowd density brought down to safe operational levels with 0 casualty risk.
              </p>
            </div>
          </div>

          {/* 4 KEY QUANTIFIED REDUCTION METRICS */}
          <div className="impact-stats-quad">
            <div className="quad-stat-card">
              <span className="quad-stat-label">Congestion reduction</span>
              <div className="quad-stat-val highlight-green">34 % pts</div>
              <span className="quad-stat-sub">From 92% to 58% Controlled</span>
            </div>

            <div className="quad-stat-card">
              <span className="quad-stat-label">Tourists diverted</span>
              <div className="quad-stat-val highlight-green">350</div>
              <span className="quad-stat-sub">Pilgrims safely rerouted</span>
            </div>

            <div className="quad-stat-card">
              <span className="quad-stat-label">Partner buses</span>
              <div className="quad-stat-val highlight-green">14</div>
              <span className="quad-stat-sub">Deployed on bypass routes</span>
            </div>

            <div className="quad-stat-card">
              <span className="quad-stat-label">Partner hotels</span>
              <div className="quad-stat-val highlight-green">22</div>
              <span className="quad-stat-sub">Transit shelters allocated</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. MULTI-DEPARTMENT VIEW CONSOLE (FEATURE 5) */}
      <div className="gov-multidept-section">
        <div className="multidept-header-bar">
          <div className="multidept-title-box">
            <h3>Multi-Agency Operational Command</h3>
            <p>Unified cross-departmental dispatch, disaster response, and logistics telemetry.</p>
          </div>

          {/* 4 DEPARTMENT TABS */}
          <div className="dept-tab-bar">
            <button
              type="button"
              onClick={() => setActiveDeptTab('police')}
              className={`dept-tab-btn ${activeDeptTab === 'police' ? 'active' : ''}`}
            >
              👮 Police
            </button>
            <button
              type="button"
              onClick={() => setActiveDeptTab('ndrf')}
              className={`dept-tab-btn ${activeDeptTab === 'ndrf' ? 'active' : ''}`}
            >
              🦺 NDRF View
            </button>
            <button
              type="button"
              onClick={() => setActiveDeptTab('transport')}
              className={`dept-tab-btn ${activeDeptTab === 'transport' ? 'active' : ''}`}
            >
              🚌 Transport Dept
            </button>
            <button
              type="button"
              onClick={() => setActiveDeptTab('tourism')}
              className={`dept-tab-btn ${activeDeptTab === 'tourism' ? 'active' : ''}`}
            >
              🏛️ Tourism Board
            </button>
          </div>
        </div>

        <div className="multidept-body">
          {/* TAB 1: POLICE VIEW */}
          {activeDeptTab === 'police' && (
            <div className="dept-widget-grid">
              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🚨 Active SOS Alerts (Real API Feed)</span>
                  <span className="dept-pill badge-red">{activeSOSCount} Active</span>
                </div>
                <div className="mini-sos-feed">
                  {sosAlerts.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '12px', padding: '10px 0' }}>
                      No active distress beacons. Corridors secure.
                    </div>
                  ) : (
                    sosAlerts.slice(0, 3).map((a) => (
                      <div key={a.id} className="mini-sos-item">
                        <div className="mini-sos-title">
                          <span>{a.emergency_type}</span>
                          <span style={{ fontSize: '10px', color: '#f87171' }}>{a.status}</span>
                        </div>
                        <div className="mini-sos-victim">
                          {a.user_name || a.user_id} • 📍 {a.site_name || 'Sacred Corridor'}
                        </div>
                        {a.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleDispatchRescue(a.id)}
                            className="mini-sos-action-btn"
                          >
                            Dispatch 112 / PCR Van
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <span className="dept-sim-note">Live data polled from GET /sos/active</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🛡️ Police Deployment</span>
                  <span className="dept-pill badge-green">Operational</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">PAC Platoons Deployed</span>
                    <span className="dept-stat-val">4 Platoons (120 Officers)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Traffic Constabulary</span>
                    <span className="dept-stat-val">48 Traffic Personnel</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Aerial Drones In Flight</span>
                    <span className="dept-stat-val">6 AI Drone Units</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Rapid Barricades</span>
                    <span className="dept-stat-val">12 Active Checkpoints</span>
                  </div>
                </div>
                <span className="dept-sim-note">Simulation telemetry for Haridwar-Rudraprayag sector</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">⚡ High-Risk Zones</span>
                  <span className="dept-pill badge-red">Monitored</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Zone A — Haridwar Main</span>
                    <span className="dept-stat-val" style={{ color: isRerouteActive ? '#34d399' : '#f87171' }}>
                      {isRerouteActive ? 'Controlled (58%)' : 'High Risk (92%)'}
                    </span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Kedarnath (TS001) Queue</span>
                    <span className="dept-stat-val" style={{ color: '#fb923c' }}>
                      {densityMap['TS001']?.occupancy_percentage || 48}% Occupancy
                    </span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Avg Response Time</span>
                    <span className="dept-stat-val">4.2 Minutes</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">108 PCR Ambulances</span>
                    <span className="dept-stat-val">8 Standby at Sector 4</span>
                  </div>
                </div>
                <span className="dept-sim-note">Synchronized with State Police Control Room</span>
              </div>
            </div>
          )}

          {/* TAB 2: NDRF VIEW */}
          {activeDeptTab === 'ndrf' && (
            <div className="dept-widget-grid">
              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">⚠️ Disaster-Risk Zones</span>
                  <span className="dept-pill badge-yellow">Monitored</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Landslide Risk: Rudraprayag Route</span>
                    <span className="dept-stat-val" style={{ color: '#fbbf24' }}>Moderate (Sensor Level 2)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Alaknanda Water Flow</span>
                    <span className="dept-stat-val">18,200 cusecs (Safe)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Mandakini Flood Gauges</span>
                    <span className="dept-stat-val" style={{ color: '#34d399' }}>Green Baseline</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Ghat Stampede Risk</span>
                    <span className="dept-stat-val" style={{ color: isRerouteActive ? '#34d399' : '#f87171' }}>
                      {isRerouteActive ? 'Mitigated (Reroute Active)' : 'Elevated (Zone A 92%)'}
                    </span>
                  </div>
                </div>
                <span className="dept-sim-note">Telemetry from Central Water Commission &amp; IMD</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🦺 Rescue Teams</span>
                  <span className="dept-pill badge-green">Deployed</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">NDRF Quick Reaction Teams</span>
                    <span className="dept-stat-val">3 Teams (45 Personnel)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">SDRF River Patrol Boats</span>
                    <span className="dept-stat-val">8 Inflatable Motorboats</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">High-Angle Rope Rescue</span>
                    <span className="dept-stat-val">2 Squads Standby</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Helipad Air Evacuation</span>
                    <span className="dept-stat-val" style={{ color: '#34d399' }}>Operational / Clear</span>
                  </div>
                </div>
                <span className="dept-sim-note">15th Battalion NDRF Command</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🏥 Medical Camps &amp; Evacuation</span>
                  <span className="dept-pill badge-green">100% Ready</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">High-Altitude Medical Relief</span>
                    <span className="dept-stat-val">5 Active Centers</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Available Oxygen Beds</span>
                    <span className="dept-stat-val">120 Beds Ready</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Trauma Stretchers</span>
                    <span className="dept-stat-val">18 Mobile Stretchers</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Green Corridor Link</span>
                    <span className="dept-stat-val">AIIMS Rishikesh (Open)</span>
                  </div>
                </div>
                <span className="dept-sim-note">Uttarakhand Emergency Health Mission</span>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSPORT DEPT VIEW */}
          {activeDeptTab === 'transport' && (
            <div className="dept-widget-grid">
              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🚌 Available Buses</span>
                  <span className="dept-pill badge-green">14 Partner Buses</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Partner Electric/State Buses</span>
                    <span className="dept-stat-val">14 Deployed</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Total Seat Capacity</span>
                    <span className="dept-stat-val">420 Passengers</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Current Passenger Load</span>
                    <span className="dept-stat-val">{isRerouteActive ? '350 Diverted Yatris' : '0 (Standby)'}</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Bus Fleet Status</span>
                    <span className="dept-stat-val" style={{ color: isRerouteActive ? '#34d399' : '#94a3b8' }}>
                      {isRerouteActive ? '14 / 14 En Route' : 'Parked at Rishikesh Hub'}
                    </span>
                  </div>
                </div>
                <span className="dept-sim-note">Coordinated with UTC &amp; Travel Operators</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🛣️ Diversion Routes</span>
                  <span className="dept-pill badge-green">Clear</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Primary Bypass Route</span>
                    <span className="dept-stat-val">Zone C (Rishikesh Corridor)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Bypass Transit Time</span>
                    <span className="dept-stat-val">38 Minutes</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Choked Main Route Time</span>
                    <span className="dept-stat-val" style={{ color: '#f87171' }}>145 Minutes (Congested)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Time Saved Per Yatri</span>
                    <span className="dept-stat-val" style={{ color: '#34d399' }}>107 Minutes</span>
                  </div>
                </div>
                <span className="dept-sim-note">NHAI &amp; Border Roads Organisation</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🔄 Rerouting Status</span>
                  <span className={`dept-pill ${isRerouteActive ? 'badge-controlled' : 'badge-yellow'}`}>
                    {isRerouteActive ? 'ACTIVE' : 'STANDBY'}
                  </span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">AI Routing Engine</span>
                    <span className="dept-stat-val">Active Recalculation</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Tourists Diverted</span>
                    <span className="dept-stat-val" style={{ color: '#34d399' }}>
                      {isRerouteActive ? '350 Devotees' : '0'}
                    </span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Partner Hotels Allocated</span>
                    <span className="dept-stat-val">{isRerouteActive ? '22 Properties' : 'On Standby'}</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Electronic Toll Override</span>
                    <span className="dept-stat-val">FASTag Emergency Pass</span>
                  </div>
                </div>
                <span className="dept-sim-note">Automated trigger via YatraSetu Emergency Protocol</span>
              </div>
            </div>
          )}

          {/* TAB 4: TOURISM BOARD VIEW */}
          {activeDeptTab === 'tourism' && (
            <div className="dept-widget-grid">
              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">👥 Visitor Count &amp; Footfall</span>
                  <span className="dept-pill badge-green">Live Registry</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Today's Total Pilgrims</span>
                    <span className="dept-stat-val">68,400 Devotees</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Char Dham Season Total</span>
                    <span className="dept-stat-val">1.42M Registered</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Digital Yatri Cards Issued</span>
                    <span className="dept-stat-val">54,200 Active QR</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Green Punya Points Awarded</span>
                    <span className="dept-stat-val">184,250 Points</span>
                  </div>
                </div>
                <span className="dept-sim-note">Tourism Department Devotee Registry</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">🏨 Hotel Occupancy (Real API)</span>
                  <span className="dept-pill badge-green">
                    {hotelReport?.overall_occupancy_percentage || 30}% City Occ
                  </span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Verified Shrines Lodges</span>
                    <span className="dept-stat-val">{hotelReport?.total_hotels || 11} Properties</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Total Capacity</span>
                    <span className="dept-stat-val">{hotelReport?.total_capacity_rooms || 73} Rooms</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Available Vacancies</span>
                    <span className="dept-stat-val" style={{ color: '#34d399' }}>
                      {hotelReport?.total_available_rooms || 51} Rooms
                    </span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Partner Shelters (Reroute)</span>
                    <span className="dept-stat-val">22 Verified Partners</span>
                  </div>
                </div>
                <span className="dept-sim-note">Polled from GET /hotels/government/occupancy-report</span>
              </div>

              <div className="dept-card">
                <div className="dept-card-header">
                  <span className="dept-card-title">⛩️ Alternative Destinations</span>
                  <span className="dept-pill badge-green">Load Balanced</span>
                </div>
                <div className="dept-stat-list">
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Tungnath Mahadev</span>
                    <span className="dept-stat-val">20 Min Wait (Smooth)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Omkareshwar Ukhimath</span>
                    <span className="dept-stat-val">15 Min Wait (Optimal)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Triyuginarayan Temple</span>
                    <span className="dept-stat-val">25 Min Wait (Smooth)</span>
                  </div>
                  <div className="dept-stat-row">
                    <span className="dept-stat-lbl">Punya Reward Incentive</span>
                    <span className="dept-stat-val" style={{ color: '#34d399' }}>+25 Points / Yatri</span>
                  </div>
                </div>
                <span className="dept-sim-note">Dynamic gamified crowd deflection system</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7. MAIN 2-COLUMN SECTION: CROWD UPDATE FORM + SOS FEED (PRESERVED) */}
      <div className="gov-two-col-grid">
        {/* Left Column: Live Crowd Headcount Dispatch (POST /crowd/update) */}
        <div className="gov-card-panel crowd-update-panel">
          <div className="panel-header">
            <div className="panel-title-box">
              <span className="panel-icon">📡</span>
              <div>
                <h3 className="panel-title">Official Live Crowd Telemetry Update</h3>
                <p className="panel-desc">
                  Dispatches verified sensor count directly to <code>POST /crowd/update</code> with Government JWT authorization.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCrowdUpdateSubmit} className="gov-update-form">
            <div className="form-group-row">
              <div className="form-group flex-2">
                <label>Select Sacred Shrine / Site *</label>
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
                  className="gov-select"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.id}] {s.name} ({s.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Live Headcount (Devotees) *</label>
                <input
                  type="number"
                  min="0"
                  max="300000"
                  value={updatePeopleCount}
                  onChange={(e) => setUpdatePeopleCount(Number(e.target.value))}
                  required
                  className="gov-input"
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group flex-1">
                <label>Queue Corridor Length (Meters)</label>
                <input
                  type="number"
                  min="0"
                  value={updateQueueLength}
                  onChange={(e) => setUpdateQueueLength(Number(e.target.value))}
                  className="gov-input"
                />
              </div>

              <div className="form-group flex-1">
                <label>Estimated Wait Time (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={updateWaitTime}
                  onChange={(e) => setUpdateWaitTime(Number(e.target.value))}
                  className="gov-input"
                />
              </div>
            </div>

            {/* Quick Demo Buttons for Hackathon Presentation */}
            <div className="demo-preset-box">
              <span className="demo-preset-label">SIH Hackathon 1-Click Simulation Scenarios:</span>
              <div className="demo-preset-buttons">
                <button
                  type="button"
                  onClick={handleApplySurgePreset}
                  className="preset-btn surge"
                  title="Sets Kedarnath (TS001) to 12,350 devotees (95% CRITICAL)"
                >
                  🚨 1. Simulate Kedarnath Peak Surge (12,350 Devotees / 95% CRITICAL)
                </button>
                <button
                  type="button"
                  onClick={handleApplyNormalPreset}
                  className="preset-btn normal"
                  title="Resets Kedarnath (TS001) to 1,200 devotees (48% NORMAL)"
                >
                  ✅ 2. Reset Kedarnath to Normal Flow (1,200 Devotees / 48% NORMAL)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="gov-submit-btn"
            >
              {isUpdating ? 'Broadcasting Telemetry...' : '🚀 Broadcast Official Crowd Update (POST /crowd/update)'}
            </button>
          </form>
        </div>

        {/* Right Column: Real-Time SOS Distress Alerts Feed */}
        <div className="gov-card-panel sos-feed-panel">
          <div className="panel-header">
            <div className="panel-title-box">
              <span className="panel-icon">🚨</span>
              <div>
                <h3 className="panel-title">Real-Time Distress Beacon Feed</h3>
                <p className="panel-desc">
                  Live emergency signals broadcasted via <code>POST /sos</code> and polled from <code>GET /sos/active</code>.
                </p>
              </div>
            </div>
            <div className="active-pill-counter">
              {activeSOSCount} Active
            </div>
          </div>

          <div className="sos-alerts-list">
            {isLoadingSOS && sosAlerts.length === 0 ? (
              <div className="sos-empty-state">Loading emergency beacons...</div>
            ) : sosAlerts.length === 0 ? (
              <div className="sos-empty-state">
                <span className="empty-icon">🛡️</span>
                <p>No active distress beacons. All sacred corridors operating safely.</p>
              </div>
            ) : (
              sosAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`sos-alert-item ${alert.status === 'ACTIVE' ? 'active-distress' : 'dispatched'}`}
                >
                  <div className="sos-item-top">
                    <span className="sos-type-tag">⚠️ {alert.emergency_type}</span>
                    <span className={`sos-status-chip ${alert.status.toLowerCase()}`}>
                      {alert.status}
                    </span>
                  </div>

                  <div className="sos-item-body">
                    <div className="sos-victim-info">
                      <strong>{alert.user_name || alert.user_id}</strong>
                      {alert.phone && <span> • 📞 {alert.phone}</span>}
                    </div>
                    <div className="sos-location-info">
                      <span>📍 {alert.site_name || 'Near Sacred Pilgrimage Sector'}</span>
                      <span className="coords">
                        ({alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)})
                      </span>
                    </div>
                    <div className="sos-time-info">
                      <span>🕒 {alert.timestamp || 'Just now'}</span>
                      <span>Source: {alert.location_source || 'GPS'}</span>
                    </div>
                  </div>

                  {alert.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => handleDispatchRescue(alert.id)}
                      className="sos-dispatch-btn"
                    >
                      🚨 Dispatch Rescue Team (112 / SDRF)
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 8. FULL-WIDTH SECTION: ALL 25 SHIRNES MONITORING TABLE (PRESERVED) */}
      <div className="gov-card-panel monitoring-table-panel">
        <div className="panel-header table-header-flex">
          <div className="panel-title-box">
            <span className="panel-icon">📊</span>
            <div>
              <h3 className="panel-title">National Shrine Density &amp; Queue Corridor Monitoring (25 Sites)</h3>
              <p className="panel-desc">
                Comprehensive multi-shrine surveillance matrix across Uttarakhand, Uttar Pradesh, Jammu &amp; Kashmir, Andhra Pradesh, Gujarat, Odisha, and more.
              </p>
            </div>
          </div>

          <div className="table-controls">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search shrine, city, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="table-search-input"
            />

            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="table-filter-select"
            >
              {uniqueStates.map((st) => (
                <option key={st} value={st}>
                  State: {st}
                </option>
              ))}
            </select>

            {/* Status Filter Buttons */}
            <div className="status-filter-pills">
              {['ALL', 'NORMAL', 'MODERATE', 'HIGH', 'CRITICAL'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`filter-pill ${statusFilter === s ? 'active' : ''} ${s.toLowerCase()}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="gov-telemetry-table">
            <thead>
              <tr>
                <th>Site ID</th>
                <th>Shrine Name</th>
                <th>State / Region</th>
                <th>Live Headcount</th>
                <th>Capacity</th>
                <th>Occupancy %</th>
                <th>Status</th>
                <th>Est. Wait</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((s) => {
                const isSelected = s.id === updateSiteId;
                return (
                  <tr key={s.id} className={isSelected ? 'row-selected' : ''}>
                    <td className="font-mono font-bold">{s.id}</td>
                    <td className="font-semibold text-primary">
                      {s.name}
                      <span className="shrine-city-sub">{s.city}</span>
                    </td>
                    <td>{s.state}</td>
                    <td className="font-mono font-bold text-dark">
                      {s.people_count.toLocaleString()}
                    </td>
                    <td className="font-mono text-muted">{s.capacity?.toLocaleString() || '10,000'}</td>
                    <td>
                      <div className="table-occupancy-bar-wrapper">
                        <div className="table-bar-bg">
                          <div
                            className={`table-bar-fill ${s.status.toLowerCase()}`}
                            style={{ width: `${Math.min(100, s.occupancy_percentage)}%` }}
                          ></div>
                        </div>
                        <span className="table-bar-text">{s.occupancy_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`gov-status-badge ${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="font-bold">
                      ⏱️ {s.estimated_wait_mins} min
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleInspect(s)}
                        className="table-action-btn"
                        title="Load into Telemetry Update form"
                      >
                        Inspect &amp; Update ➔
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. BOTTOM SECTION: PILGRIMAGE HOSPITALITY & HOTEL CAPACITY REPORT (PRESERVED) */}
      {hotelReport && (
        <div className="gov-card-panel hospitality-report-panel">
          <div className="panel-header">
            <div className="panel-title-box">
              <span className="panel-icon">🏨</span>
              <div>
                <h3 className="panel-title">City-Wide Pilgrimage Hospitality &amp; Lodge Capacity Report</h3>
                <p className="panel-desc">
                  Telemetry from registered temple ashrams, guest houses, and hotels (via <code>GET /hotels/government/occupancy-report</code>).
                </p>
              </div>
            </div>
            <div className="hospitality-occupancy-pill">
              Overall Lodging Occupancy: <strong>{hotelReport.overall_occupancy_percentage}%</strong>
            </div>
          </div>

          <div className="hotel-report-stats-grid">
            <div className="report-stat-item">
              <span className="stat-label">Total Verified Lodges</span>
              <span className="stat-num">{hotelReport.total_hotels} Properties</span>
            </div>
            <div className="report-stat-item">
              <span className="stat-label">Total City Room Inventory</span>
              <span className="stat-num">{hotelReport.total_capacity_rooms} Rooms</span>
            </div>
            <div className="report-stat-item">
              <span className="stat-label">Available Vacancies</span>
              <span className="stat-num text-success">{hotelReport.total_available_rooms} Rooms</span>
            </div>
            <div className="report-stat-item">
              <span className="stat-label">Occupied / Booked</span>
              <span className="stat-num text-warning">{hotelReport.total_booked_rooms} Rooms</span>
            </div>
          </div>

          <div className="hotels-mini-grid">
            {hotelReport.hotels?.slice(0, 4).map((h) => {
              const total = h.rooms?.reduce((acc, r) => acc + r.total_rooms, 0) || 0;
              const avail = h.rooms?.reduce((acc, r) => acc + r.available_rooms, 0) || 0;
              const occ = total > 0 ? Math.round(((total - avail) / total) * 100) : 0;
              return (
                <div key={h.id} className="hotel-mini-card">
                  <div className="hotel-mini-title-row">
                    <span className="hotel-name">{h.name}</span>
                    <span className="hotel-verified-tag">✓ VERIFIED</span>
                  </div>
                  <p className="hotel-addr">{h.address}</p>
                  <div className="hotel-stat-row">
                    <span>Rooms: {avail} / {total} Avail</span>
                    <span className={`hotel-occ-tag ${occ > 80 ? 'high' : 'normal'}`}>{occ}% Occ</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. INSPECT SITE MODAL DRAWER (PRESERVED) */}
      {inspectSite && (
        <div className="modal-backdrop" onClick={() => setInspectSite(null)}>
          <div className="modal-content gov-inspect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🏛️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0F172A' }}>
                    {inspectSite.name} Telemetry &amp; Buffer Governance
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                    Site ID: {inspectSite.id} • {inspectSite.city}, {inspectSite.state}
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setInspectSite(null)}>✕</button>
            </div>

            <div className="inspect-body-grid">
              <div className="inspect-stat-box">
                <span className="lbl">Maximum Safe Capacity</span>
                <span className="val">{inspectSite.capacity?.toLocaleString()} devotees</span>
              </div>
              <div className="inspect-stat-box">
                <span className="lbl">Current Headcount</span>
                <span className="val font-mono">{inspectSite.people_count?.toLocaleString()}</span>
              </div>
              <div className="inspect-stat-box">
                <span className="lbl">Occupancy Level</span>
                <span className={`val ${inspectSite.status.toLowerCase()}`}>
                  {inspectSite.occupancy_percentage}% ({inspectSite.status})
                </span>
              </div>
              <div className="inspect-stat-box">
                <span className="lbl">Estimated Queue Time</span>
                <span className="val">⏱️ {inspectSite.estimated_wait_mins} mins</span>
              </div>
            </div>

            <div className="inspect-actions">
              <button
                type="button"
                className="inspect-primary-btn"
                onClick={() => {
                  onSelectSite && onSelectSite(inspectSite.id);
                  setInspectSite(null);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
              >
                Focus in Telemetry Form ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
