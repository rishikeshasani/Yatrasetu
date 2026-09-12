import React, { useState, useEffect } from 'react';
import {
  updateCrowdObservation,
  fetchActiveSOSAlerts,
  fetchGovernmentOccupancyReport,
  activateEmergencyReroute,
  deactivateEmergencyReroute,
  fetchActiveRerouteAlert,
  createCrowdSimulation,
  fetchCrowdSimulations,
  deleteCrowdSimulation,
  dispatchPoliceSOSAlert,
  fetchPoliceSOSStatus,
  getAuthToken
} from '../api/api';
import { supabase } from '../supabaseClient';
import './GovernmentDashboard.css';
import './PoliceDashboard.css';
import { StatusBadge, StatCard, InfoCard, MetricRow, SectionHeader, EmptyState } from '../components/common';

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

export default function GovernmentDashboard({
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
  // Classification Resolution
  const subrole = currentUser?.government_subrole || (currentUser?.role === 'police' ? 'police_official' : 'government_official');
  const isPoliceOfficial = subrole === 'police_official';
  const isCivilOfficial = !isPoliceOfficial;

  // Navigation Tabs:
  // Police Official: 'overview' | 'live-crowd' | 'surge-alerts' | 'police-simulation' | 'emergency-response' | 'traffic-control' | 'sos-response' | 'safety-zones' | 'reports-analytics'
  // Civil Official: 'overview' | 'live-crowd' | 'alerts-safety' | 'emergency-rerouting' | 'reports-analytics'
  const [activeGovTab, setActiveGovTab] = useState(() => {
    if (propActiveTab) return propActiveTab;
    return 'overview';
  });

  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeGovTab) {
      setActiveGovTab(propActiveTab);
    }
  }, [propActiveTab]);

  const handleSwitchGovTab = (tabKey) => {
    setActiveGovTab(tabKey);
    if (onTabChange) {
      onTabChange(tabKey);
    }
  };

  // Guard activeGovTab: redirect non-police from police-only tabs
  useEffect(() => {
    if (!isPoliceOfficial) {
      const civilTabs = ['overview', 'live-crowd', 'alerts-safety', 'emergency-rerouting', 'reports-analytics'];
      if (!civilTabs.includes(activeGovTab)) {
        setActiveGovTab('overview');
      }
    }
  }, [isPoliceOfficial, activeGovTab]);

  // Sync activeRerouteAlert from App.jsx prop
  useEffect(() => {
    if (propRerouteAlert) {
      setIsRerouteActive(propRerouteAlert.is_active === true);
      const t = propRerouteAlert.activated_at || propRerouteAlert.timestamp;
      if (t) {
        setEmergencyTimestamp(new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    }
  }, [propRerouteAlert]);

  // -------------------------------------------------------------------------
  // POLICE CROWD SURGE SIMULATION (AI-ASSISTED SCENARIO BUILDER)
  // -------------------------------------------------------------------------
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
    if (isPoliceOfficial && (activeGovTab === 'police-simulation' || activeGovTab === 'overview')) {
      loadSimulationsHistory();
    }
  }, [activeGovTab, isPoliceOfficial]);

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

  // -------------------------------------------------------------------------
  // TACTICAL POLICE SOS DISPATCH MODAL STATE
  // -------------------------------------------------------------------------
  const [dispatchModalAlert, setDispatchModalAlert] = useState(null);
  const [dispatchUnit, setDispatchUnit] = useState('PCR-07 Har Ki Pauri Quick Response Team');
  const [dispatchNotes, setDispatchNotes] = useState('SDRF medical triage unit mobilized with oxygen kits.');
  const [isDispatching, setIsDispatching] = useState(false);

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
        showToast(`🚨 DISPATCH CONFIRMED: ${dispatchUnit} dispatched to ${dispatchModalAlert.site_name || dispatchModalAlert.id}.`);
      }
      setDispatchModalAlert(null);
    } catch (err) {
      console.error('SOS dispatch error:', err);
      if (showToast) showToast(`⚠️ Dispatch error: ${err.message || err}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');

  // Multi-Agency Operations Tab ('administration' | 'transport' | 'health' | 'disaster' | 'municipal')
  const [activeAgencyTab, setActiveAgencyTab] = useState('administration');

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

  // Horizontal tab scroll navigation
  const tabsNavRef = React.useRef(null);
  const scrollTabs = (direction) => {
    if (tabsNavRef.current) {
      tabsNavRef.current.scrollBy({ left: direction * 220, behavior: 'smooth' });
    }
  };

  // =========================================================================
  // EMERGENCY REROUTE — SUPABASE REALTIME & PERSISTENCE
  // =========================================================================
  const [isRerouteActive, setIsRerouteActive] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [emergencyTimestamp, setEmergencyTimestamp] = useState(null);

  // Check for existing active emergency on mount from authoritative backend
  useEffect(() => {
    let isMounted = true;
    const checkExisting = async () => {
      try {
        const targetSiteId = selectedSiteId || updateSiteId || 'TS001';
        const res = await fetchActiveRerouteAlert(targetSiteId);
        if (!isMounted) return;
        if (res && res.is_active && res.alert) {
          setIsRerouteActive(true);
          const t = res.alert.activated_at || res.alert.timestamp;
          setEmergencyTimestamp(
            t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          );
        } else {
          setIsRerouteActive(false);
          setEmergencyTimestamp(null);
        }
      } catch (err) {
        console.warn('[Gov] Failed to check existing emergency:', err);
      }
    };
    checkExisting();
    return () => {
      isMounted = false;
    };
  }, [selectedSiteId]);

  // Activate emergency reroute with backend persistence
  const handleActivateEmergency = async () => {
    setIsRecalculating(true);
    try {
      const targetSiteId = selectedSiteId || updateSiteId || 'TS001';
      const res = await activateEmergencyReroute(targetSiteId, {
        diverted_tourists: 350,
        partner_buses: 14,
        partner_hotels: 22,
        notes: `EMERGENCY: Haridwar corridor reroute enforced by ${currentUser?.full_name || 'District Administration'}. Inbound vehicles diverted to BHEL Satellite Hub.`
      });
      if (res && (res.is_active || res.status === 'success')) {
        setIsRerouteActive(true);
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setEmergencyTimestamp(timeStr);
        if (showToast) showToast('🚨 Emergency reroute ACTIVATED — all agency dashboards notified in real-time.');
      } else {
        throw new Error(res?.detail || 'Activation failed');
      }
    } catch (err) {
      console.error('[Gov] Failed to activate emergency:', err);
      if (showToast) showToast('⚠️ Failed to activate emergency reroute.');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Deactivate / lift emergency reroute with backend persistence
  const handleLiftEmergency = async () => {
    setIsRecalculating(true);
    try {
      const targetSiteId = selectedSiteId || updateSiteId || 'TS001';
      await deactivateEmergencyReroute(targetSiteId, 'Emergency reroute lifted. Normal corridor transit resumed on Haridwar arterial routes.');
      setIsRerouteActive(false);
      setEmergencyTimestamp(null);
      if (showToast) showToast('✅ Emergency reroute DEACTIVATED — normal operations restored.');
    } catch (err) {
      console.error('[Gov] Failed to lift emergency:', err);
      if (showToast) showToast('⚠️ Failed to deactivate emergency reroute.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetSimulation = async () => {
    setIsRecalculating(false);
    setSurgeAlertVisible(true);
    try {
      const targetSiteId = selectedSiteId || updateSiteId || 'TS001';
      await deactivateEmergencyReroute(targetSiteId, 'Reset simulation');
    } catch {}
    setIsRerouteActive(false);
    setEmergencyTimestamp(null);
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
      if (!getAuthToken()) return;
      setIsLoadingSOS(true);
      try {
        const [alerts, report] = await Promise.all([
          fetchActiveSOSAlerts(),
          fetchGovernmentOccupancyReport()
        ]);
        if (!isMounted || !getAuthToken()) return;
        setSosAlerts(alerts || []);
        setHotelReport(report);
      } catch (err) {
        if (getAuthToken() && isMounted) {
          console.error('Error loading government dashboard data:', err);
        }
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

    let estWait = d.wait_time_minutes != null ? d.wait_time_minutes : 25;
    if (d.wait_time_minutes == null) {
      if (occ >= 90) estWait = 540;
      else if (occ >= 75) estWait = 360;
      else if (occ >= 50) estWait = 120;
    }

    let trend = '→';
    if (status === 'CRITICAL' || status === 'HIGH') trend = '↑';
    else if (status === 'NORMAL') trend = '↓';

    return {
      ...site,
      people_count: count,
      occupancy_percentage: occ,
      status,
      trend,
      estimated_wait_mins: estWait,
      source: d.source || 'demo_simulation'
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
    <div className={`gov-command-root ${isPoliceOfficial ? 'gov-police-mode' : ''}`} id="gov-dashboard">

      {/* ===================================================================== */}
      {/* 1. COMPACT GOVERNMENT COMMAND HEADER                                  */}
      {/* ===================================================================== */}
      <header className="gov-command-header">
        <div className="gov-header-left">
          <div className="gov-header-emblem">{isPoliceOfficial ? '🛡️' : '🏛️'}</div>
          <div className="gov-header-titles">
            <div className="gov-brand-row">
              <span className="gov-brand-name">YATRASETU</span>
              <span className="gov-brand-divider">|</span>
              <span className="gov-brand-dept">
                {isPoliceOfficial
                  ? 'Police & Law Enforcement Operations Center'
                  : 'Government Operations Center'}
              </span>
            </div>
            <div className="gov-header-sub">
              {isPoliceOfficial
                ? 'POLICE FIELD COMMAND • CROWD SURGE DEFENSE • TACTICAL RESPONSE'
                : 'LIVE PILGRIMAGE MONITORING • ADMINISTRATIVE CONTROL'}
            </div>
          </div>
        </div>

        <div className="gov-header-right">
          <div className="gov-classification-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isPoliceOfficial && (
              <span className="police-badge-gold" style={{ border: '1px solid #F59E0B', background: 'rgba(245,158,11,0.15)', color: '#FBBF24', padding: '0.35rem 0.75rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                🛡️ POLICE &amp; LAW ENFORCEMENT HQ
              </span>
            )}
            {isCivilOfficial && (
              <span style={{ border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.15)', color: '#60A5FA', padding: '0.35rem 0.75rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                🏛️ CIVIL ADMINISTRATION
              </span>
            )}
          </div>
          <div className="gov-live-indicator">
            <span className="gov-live-dot"></span>
            <span className="gov-live-label">LIVE</span>
          </div>
          <div className="gov-header-meta">
            <div className="gov-meta-time">Last updated: <strong>{currentTime}</strong></div>
            <div className="gov-meta-admin">
              {currentUser?.name || currentUser?.full_name || (isPoliceOfficial ? 'State Special Operations Command' : 'District Administration (Command)')}
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. PERSISTENT COMMAND OPERATIONAL STATUS STRIP                         */}
      {/* Unified 4-pillar command strip: Emergency, Crowd, Surge, Diversion    */}
      {/* ===================================================================== */}
      <div className={`gov-persistent-command-strip ${isRerouteActive ? 'is-emergency-active' : 'is-emergency-normal'}`}>
        <div className="gov-strip-pillars-row">
          {/* Pillar 1: Emergency Protocol */}
          <div className="gov-strip-pillar">
            <span className="gov-strip-pillar-label">Emergency Protocol:</span>
            <div className="gov-strip-pillar-body">
              <StatusBadge
                status={isRerouteActive ? 'CRITICAL' : 'NORMAL'}
                theme={isPoliceOfficial ? 'dark' : 'light'}
                size="sm"
                pulse={isRerouteActive}
                label={isRerouteActive ? 'Emergency Reroute Active' : 'No Active Emergency'}
              />
              <button
                type="button"
                onClick={isRerouteActive ? handleLiftEmergency : handleActivateEmergency}
                disabled={isRecalculating}
                className={`btn-strip-action ${isRerouteActive ? 'lift' : 'activate'}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px' }}
              >
                {isRecalculating ? 'Processing...' : isRerouteActive ? 'Lift Emergency' : 'Trigger Corridor Reroute'}
              </button>
            </div>
          </div>

          <div className="gov-strip-pillar-divider" />

          {/* Pillar 2: Live Crowd Telemetry */}
          <div className="gov-strip-pillar">
            <span className="gov-strip-pillar-label">Crowd Status:</span>
            <div className="gov-strip-pillar-body">
              <StatusBadge
                status={criticalCount > 0 ? 'CRITICAL' : highCount > 0 ? 'HIGH' : moderateCount > 0 ? 'MODERATE' : 'NORMAL'}
                theme={isPoliceOfficial ? 'dark' : 'light'}
                size="sm"
                label={criticalCount > 0 ? `${criticalCount} Critical Sites` : 'Nominal (25 Sites)'}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>
                {totalDevotees.toLocaleString()} pilgrims
              </span>
            </div>
          </div>

          <div className="gov-strip-pillar-divider" />

          {/* Pillar 3: Surge Prediction Sensor */}
          <div className="gov-strip-pillar">
            <span className="gov-strip-pillar-label">Surge Prediction:</span>
            <div className="gov-strip-pillar-body">
              <StatusBadge
                status={isRerouteActive ? 'HIGH' : 'NORMAL'}
                theme={isPoliceOfficial ? 'dark' : 'light'}
                size="sm"
                label={isRerouteActive ? 'High Risk Zone A (+120m)' : 'Sensor Network Nominal'}
              />
            </div>
          </div>

          <div className="gov-strip-pillar-divider" />

          {/* Pillar 4: Route Diversion Status */}
          <div className="gov-strip-pillar">
            <span className="gov-strip-pillar-label">Corridor Reroute:</span>
            <div className="gov-strip-pillar-body">
              <StatusBadge
                status={isRerouteActive ? 'CONFIRMED' : 'NORMAL'}
                theme={isPoliceOfficial ? 'dark' : 'light'}
                size="sm"
                label={isRerouteActive ? '14 Buses Diverted' : 'Standard Traffic Flow'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. GOVERNMENT COMMAND NAVIGATION TABS STRIP                            */}
      {/* ===================================================================== */}
      <div className="gov-tabs-navigation-wrapper">
        {/* Mobile Viewport Dropdown Navigation */}
        <div className="gov-mobile-tabs-dropdown">
          <label htmlFor="gov-mobile-tab-select" className="gov-mobile-tab-label">Command Desk:</label>
          <select
            id="gov-mobile-tab-select"
            value={activeGovTab}
            onChange={(e) => handleSwitchGovTab(e.target.value)}
            className="gov-mobile-tab-select"
          >
            {isPoliceOfficial ? (
              <>
                <option value="overview">📊 Overview</option>
                <option value="live-crowd">👁️ Live Crowd Monitoring ({criticalCount})</option>
                <option value="surge-alerts">🚨 Crowd Surge Alerts</option>
                <option value="police-simulation">👮 Police &amp; Crowd Simulation</option>
                <option value="emergency-response">⚡ Emergency Response</option>
                <option value="traffic-control">🚦 Traffic &amp; Route Control</option>
                <option value="sos-response">🆘 SOS / Distress Response ({activeSOSCount})</option>
                <option value="safety-zones">🛡️ Safety Zones</option>
                <option value="reports-analytics">📈 Reports / Analytics</option>
              </>
            ) : (
              <>
                <option value="overview">📊 Overview</option>
                <option value="live-crowd">👁️ Live Crowd Monitoring</option>
                <option value="alerts-safety">🚨 Alerts &amp; Safety</option>
                <option value="emergency-rerouting">⚡ Emergency Rerouting</option>
                <option value="reports-analytics">📈 Reports / Analytics</option>
              </>
            )}
          </select>
        </div>

        {/* Desktop Left Scroll Control */}
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          className="gov-tabs-scroll-btn left desktop-only"
          aria-label="Scroll tabs left"
          title="Scroll navigation left"
        >
          ‹
        </button>

        <nav className="gov-command-tabs-nav" ref={tabsNavRef} aria-label="Government Command Navigation">
        {isPoliceOfficial ? (
          <>
            <button
              type="button"
              id="gov-tab-btn-overview"
              className={`gov-nav-tab-btn ${activeGovTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('overview')}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-text">Overview</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-live-crowd"
              className={`gov-nav-tab-btn ${activeGovTab === 'live-crowd' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('live-crowd')}
            >
              <span className="tab-icon">👁️</span>
              <span className="tab-text">Live Crowd Monitoring</span>
              {criticalCount > 0 && <span className="tab-badge-count">{criticalCount}</span>}
            </button>

            <button
              type="button"
              id="gov-tab-btn-surge-alerts"
              className={`gov-nav-tab-btn ${activeGovTab === 'surge-alerts' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('surge-alerts')}
            >
              <span className="tab-icon">🚨</span>
              <span className="tab-text">Crowd Surge Alerts</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-police-simulation"
              className={`gov-nav-tab-btn ${activeGovTab === 'police-simulation' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('police-simulation')}
            >
              <span className="tab-icon">👮</span>
              <span className="tab-text">Police &amp; Crowd Simulation</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-emergency-response"
              className={`gov-nav-tab-btn ${activeGovTab === 'emergency-response' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('emergency-response')}
            >
              <span className="tab-icon">⚡</span>
              <span className="tab-text">Emergency Response</span>
              {isRerouteActive && <span className="tab-badge-active">ACTIVE</span>}
            </button>

            <button
              type="button"
              id="gov-tab-btn-traffic-control"
              className={`gov-nav-tab-btn ${activeGovTab === 'traffic-control' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('traffic-control')}
            >
              <span className="tab-icon">🚦</span>
              <span className="tab-text">Traffic &amp; Route Control</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-sos-response"
              className={`gov-nav-tab-btn ${activeGovTab === 'sos-response' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('sos-response')}
            >
              <span className="tab-icon">🆘</span>
              <span className="tab-text">SOS / Distress Response</span>
              {activeSOSCount > 0 && <span className="tab-badge-count">{activeSOSCount}</span>}
            </button>

            <button
              type="button"
              id="gov-tab-btn-safety-zones"
              className={`gov-nav-tab-btn ${activeGovTab === 'safety-zones' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('safety-zones')}
            >
              <span className="tab-icon">🛡️</span>
              <span className="tab-text">Safety Zones</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-reports-analytics"
              className={`gov-nav-tab-btn ${activeGovTab === 'reports-analytics' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('reports-analytics')}
            >
              <span className="tab-icon">📈</span>
              <span className="tab-text">Reports / Analytics</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              id="gov-tab-btn-overview"
              className={`gov-nav-tab-btn ${activeGovTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('overview')}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-text">Overview</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-live-crowd"
              className={`gov-nav-tab-btn ${activeGovTab === 'live-crowd' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('live-crowd')}
            >
              <span className="tab-icon">👥</span>
              <span className="tab-text">Live Crowd Monitoring</span>
            </button>

            <button
              type="button"
              id="gov-tab-btn-alerts-safety"
              className={`gov-nav-tab-btn ${activeGovTab === 'alerts-safety' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('alerts-safety')}
            >
              <span className="tab-icon">🚨</span>
              <span className="tab-text">Alerts &amp; Safety</span>
              {activeSOSCount > 0 && <span className="tab-badge-count">{activeSOSCount}</span>}
            </button>

            <button
              type="button"
              id="gov-tab-btn-emergency-reroute"
              className={`gov-nav-tab-btn ${activeGovTab === 'emergency-rerouting' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('emergency-rerouting')}
            >
              <span className="tab-icon">🔄</span>
              <span className="tab-text">Emergency Rerouting</span>
              {isRerouteActive && <span className="tab-badge-active">ACTIVE</span>}
            </button>

            <button
              type="button"
              id="gov-tab-btn-reports-analytics"
              className={`gov-nav-tab-btn ${activeGovTab === 'reports-analytics' ? 'active' : ''}`}
              onClick={() => handleSwitchGovTab('reports-analytics')}
            >
              <span className="tab-icon">📈</span>
              <span className="tab-text">Reports / Analytics</span>
            </button>
          </>
        )}
      </nav>

        {/* Desktop Right Scroll Control */}
        <button
          type="button"
          onClick={() => scrollTabs(1)}
          className="gov-tabs-scroll-btn right desktop-only"
          aria-label="Scroll tabs right"
          title="Scroll navigation right"
        >
          ›
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW                                                       */}
      {/* ===================================================================== */}
      {activeGovTab === 'overview' && (
        isPoliceOfficial ? (
          <div id="gov-overview-police" className="police-content-wrap">
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
                    onClick={() => handleSwitchGovTab('police-simulation')}
                  >
                    👮 Launch AI Crowd Surge Simulation ➔
                  </button>
                  <button
                    type="button"
                    className="police-preset-btn"
                    style={{ padding: '0.75rem', textAlign: 'center' }}
                    onClick={() => handleSwitchGovTab('sos-response')}
                  >
                    🆘 Inspect Active Distress Beacons ({activeSOSCount} Active) ➔
                  </button>
                  <button
                    type="button"
                    className="police-preset-btn"
                    style={{ padding: '0.75rem', textAlign: 'center' }}
                    onClick={() => handleSwitchGovTab('traffic-control')}
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
                    onClick={() => handleSwitchGovTab('sos-response')}
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
                          {a.user_name || a.user_id} • <span style={{ color: '#94A3B8' }}>{a.emergency_type}</span>
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
                  {sosAlerts.length === 0 && (
                    <div style={{ color: '#64748B', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
                      No active distress beacons.
                    </div>
                  )}
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
                  onClick={() => handleSwitchGovTab('live-crowd')}
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
                          {(s.capacity || 10000).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {s.occupancy_percentage}%
                        </td>
                        <td style={{ fontFamily: 'monospace', color: s.estimated_wait_mins > 60 ? '#F87171' : '#60A5FA' }}>
                          ~{s.estimated_wait_mins} mins
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
        ) : (
          <div id="gov-overview" className="gov-tab-pane">
            {/* Top KPI Row */}
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

          {/* Overview 2-Column Command Layout */}
          <div className="gov-two-col-command">
            {/* Left: Priority Corridors Live Summary */}
            <div className="gov-col-left">
              <div className="gov-panel">
                <div className="gov-panel-header">
                  <div className="gov-panel-title">
                    <span>LIVE CROWD MONITORING SNAPSHOT</span>
                    <span className="gov-panel-badge">Priority Corridors</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchGovTab('live-crowd')}
                    className="btn-compact-inspect"
                  >
                    View All 25 Destinations ➔
                  </button>
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
                      </tr>
                    </thead>
                    <tbody>
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
                        ...siteTelemetryList.slice(0, 4).map((s) => ({
                          id: s.id,
                          name: s.name,
                          crowd: s.people_count,
                          capacity: s.capacity || 10000,
                          occ: s.occupancy_percentage,
                          status: s.status,
                          trend: s.trend
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: District Administration & Municipal Logistics Card */}
            <div className="gov-col-right">
              <div className="gov-panel gov-overview-sim-card">
                <div className="gov-panel-header">
                  <div className="gov-panel-title">
                    <span>🏛️ DISTRICT EMERGENCY OPERATIONS CENTER (DEOC)</span>
                    <span className="gov-panel-badge">ADMINISTRATION</span>
                  </div>
                  <span className="gov-panel-sub">Inter-agency civil administration &amp; public welfare coordination</span>
                </div>
                <div className="gov-overview-sim-content">
                  <p className="sim-overview-desc">
                    Centralized civil administration console coordinating revenue, sanitation, drinking water corridors, and state disaster management protocols.
                  </p>
                  <div className="sim-overview-features">
                    <div className="sim-of-item">✓ Multi-Agency District Magistrate Emergency Override</div>
                    <div className="sim-of-item">✓ Real-time Corridor Density &amp; Satellite Parking Buffers</div>
                    <div className="sim-of-item">✓ Sanitation, Medical Triage &amp; Clean Water Supply Monitoring</div>
                    <div className="sim-of-item">✓ State Hospitality Capacity &amp; Ashram Occupancy Tracking</div>
                    <div className="sim-of-item">🔒 Law Enforcement &amp; Field Tactical Command isolated to Police HQ</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchGovTab('emergency-rerouting')}
                    className="btn-gov-primary sim-overview-launch-btn"
                  >
                    View Emergency Rerouting Protocol ➔
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Zone Risk Glance */}
          <section className="gov-panel" id="gov-zone-monitoring-glance">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>ZONE RISK OVERVIEW</span>
                <span className="gov-panel-badge">Arterial Chokepoints</span>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchGovTab('alerts-safety')}
                className="btn-compact-inspect"
              >
                Full Safety &amp; Multi-Agency Console ➔
              </button>
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
                </div>
              </div>

              {/* ZONE B */}
              <div className="gov-zone-box zone-moderate">
                <div className="zone-box-header">
                  <div>
                    <div className="zone-code">ZONE B</div>
                    <div className="zone-title">Neelkanth Mountain Pass</div>
                  </div>
                  <span className="gov-status-badge status-moderate">HIGH (55%)</span>
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
                </div>
              </div>
            </div>
          </section>
        </div>
        )
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LIVE CROWD MONITORING                                          */}
      {/* ===================================================================== */}
      {activeGovTab === 'live-crowd' && (
        isPoliceOfficial ? (
          <div className="police-panel" id="gov-live-crowd-police">
            <div className="police-panel-header">
              <div className="police-panel-title">
                <span>👁️ REAL-TIME CROWD TELEMETRY • 25 SACRED SHRINES</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['ALL', 'CRITICAL', 'HIGH', 'MODERATE'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={`police-preset-btn ${statusFilter === lvl ? 'active' : ''}`}
                    onClick={() => setStatusFilter(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Field Officer Telemetry Update Tool */}
            <form onSubmit={handleCrowdUpdateSubmit} style={{ background: '#080E1A', padding: '1rem 1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.88rem' }}>
                📡 Field Officer Telemetry Report:
              </span>
              <select
                value={updateSiteId}
                onChange={(e) => {
                  const sid = e.target.value;
                  setUpdateSiteId(sid);
                  const found = sites.find((s) => s.id === sid);
                  if (found) {
                    const d = densityMap[sid] || { people_count: Math.round((found.capacity || 10000) * 0.48) };
                    setUpdatePeopleCount(d.people_count);
                  }
                }}
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
                value={updatePeopleCount}
                onChange={(e) => setUpdatePeopleCount(Number(e.target.value))}
                className="police-input"
                style={{ width: '180px' }}
                required
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="police-run-sim-btn"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
              >
                {isUpdating ? 'UPDATING...' : 'UPDATE TELEMETRY'}
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
                        {(s.capacity || 10000).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {s.occupancy_percentage}%
                      </td>
                      <td style={{ fontFamily: 'monospace', color: s.estimated_wait_mins > 60 ? '#F87171' : '#60A5FA' }}>
                        ~{s.estimated_wait_mins} mins
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
        ) : (
          <div id="gov-live-crowd" className="gov-tab-pane">
          {/* Live Monitoring Distinct Banner */}
          <div className="gov-live-monitoring-header-strip">
            <div className="live-strip-left">
              <span className="live-pulse-indicator"></span>
              <span className="live-strip-title">LIVE CROWD MONITORING • AUTHORITATIVE SENSOR &amp; CCTV TELEMETRY</span>
            </div>
            <span className="live-strip-badge">REAL-TIME DATA ONLY</span>
          </div>

          <div className="gov-two-col-command">
            {/* Priority Corridors Table */}
            <div className="gov-col-left">
              <div className="gov-panel">
                <div className="gov-panel-header">
                  <div className="gov-panel-title">
                    <span>PRIORITY CORRIDORS LIVE MONITORING</span>
                    <span className="gov-panel-badge">Live Sensor Telemetry</span>
                  </div>
                  <span className="gov-panel-sub">Continuous CCTV vision density &amp; RFID gate counts</span>
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

                {/* Quick Headcount Broadcast Form */}
                <div className="gov-telemetry-form-strip">
                  <div className="telemetry-strip-header">
                    <span className="font-bold text-xs uppercase tracking-wider text-navy">
                      Broadcast Verified Crowd Update (POST /crowd/update)
                    </span>
                    <div className="demo-preset-links">
                      <button
                        type="button"
                        onClick={() => handleSwitchGovTab('police-simulation')}
                        className="link-btn text-navy"
                      >
                        👮 Go to Simulation Tab ➔
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

            {/* Right: Live Sensor & Capacity Telemetry */}
            <div className="gov-col-right">
              <div className="gov-panel">
                <div className="gov-panel-header">
                  <div className="gov-panel-title">
                    <span>LIVE SENSOR TELEMETRY DESK</span>
                    <span className="gov-panel-badge">Telemetry Status</span>
                  </div>
                  <span className="gov-panel-sub">Verified real-world sensor streams</span>
                </div>
                <div className="gov-live-summary-box">
                  <div className="ls-item">
                    <span className="ls-dot dot-green"></span>
                    <div className="ls-info">
                      <strong>AI CCTV Vision Grid:</strong> 25 shrine cameras streaming inference
                    </div>
                  </div>
                  <div className="ls-item">
                    <span className="ls-dot dot-green"></span>
                    <div className="ls-info">
                      <strong>RFID Turnstile Gates:</strong> Ingress/egress throughput calibrated
                    </div>
                  </div>
                  <div className="ls-item">
                    <span className="ls-dot dot-amber"></span>
                    <div className="ls-info">
                      <strong>Haridwar Main Corridor:</strong> Heavy queue detected in Zone A approach
                    </div>
                  </div>
                  <div className="ls-item">
                    <span className="ls-dot dot-green"></span>
                    <div className="ls-info">
                      <strong>Kedarnath Pathway:</strong> Nominal pedestrian throughput
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* All 25 Canonical Destinations Table */}
          <section className="gov-panel" id="gov-shrine-table">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>PILGRIMAGE SITE MONITORING</span>
                <span className="gov-panel-badge">25 Canonical Destinations (TS001–TS025)</span>
              </div>
              <span className="gov-panel-sub">Authoritative multi-state pilgrimage corridor surveillance matrix</span>
            </div>

            {/* Filter Controls Bar */}
            <div className="gov-filter-bar">
              <div className="filter-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by destination ID, name, district, state..."
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
                    <th>DESTINATION</th>
                    <th>DISTRICT &amp; STATE</th>
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
                          <span className={`source-badge source-${(s.source || 'demo_simulation').toLowerCase()}`}>
                            {s.source === 'yolo_video'
                              ? '🎥 YOLO Detection'
                              : s.source === 'live_telemetry'
                              ? '📡 Live Telemetry'
                              : s.source === 'historical_baseline'
                              ? '📊 Historical'
                              : '⚙️ Demo Simulation'}
                          </span>
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
        </div>
        )
      )}

      {/* ===================================================================== */}
      {/* POLICE TAB: CROWD SURGE ALERTS                                        */}
      {/* ===================================================================== */}
      {activeGovTab === 'surge-alerts' && isPoliceOfficial && (
        <div className="police-panel" id="gov-surge-alerts">
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
                      [{s.id}] {s.name} • {s.occupancy_percentage}% Capacity ({s.people_count.toLocaleString()} / {(s.capacity || 10000).toLocaleString()})
                    </h4>
                  </div>
                  <p style={{ margin: '0.4rem 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                    Queue wait time estimated at ~{s.estimated_wait_mins} minutes. Approaching critical threshold. Deploy holding pens and prepare diversion protocols.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="police-preset-btn"
                    onClick={() => {
                      setSimSiteId(s.id);
                      setSimExpectedCrowd(5000);
                      handleSwitchGovTab('police-simulation');
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

      {/* ===================================================================== */}
      {/* POLICE TAB: POLICE & CROWD SIMULATION (SCENARIO BUILDER)              */}
      {/* ===================================================================== */}
      {activeGovTab === 'police-simulation' && isPoliceOfficial && (
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
                  <span className="psm-val">{(activeSimulationResult.baseline_people_count || 0).toLocaleString()}</span>
                  <span className="psm-sub">Live site baseline</span>
                </div>
                <div className="psm-card">
                  <span className="psm-lbl">PROJECTED SURGE</span>
                  <span className="psm-val text-danger">+{(activeSimulationResult.expected_crowd_increase || 0).toLocaleString()}</span>
                  <span className="psm-sub">Virtual planned surge</span>
                </div>
                <div className="psm-card">
                  <span className="psm-lbl">SIMULATED HEADCOUNT</span>
                  <span className="psm-val" style={{ color: '#60A5FA' }}>{(activeSimulationResult.simulated_people_count || 0).toLocaleString()}</span>
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

      {/* ===================================================================== */}
      {/* POLICE TAB: EMERGENCY RESPONSE OVERRIDE & FLEET DIVERSION             */}
      {/* ===================================================================== */}
      {activeGovTab === 'emergency-response' && isPoliceOfficial && (
        <div className="police-panel" id="gov-emergency-response">
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

      {/* ===================================================================== */}
      {/* POLICE TAB: TRAFFIC & ROUTE CONTROL                                   */}
      {/* ===================================================================== */}
      {activeGovTab === 'traffic-control' && isPoliceOfficial && (
        <div className="police-panel" id="gov-traffic-control">
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
      )}

      {/* ===================================================================== */}
      {/* POLICE TAB: SOS / DISTRESS RESPONSE                                   */}
      {/* ===================================================================== */}
      {activeGovTab === 'sos-response' && isPoliceOfficial && (
        <div className="police-panel" id="gov-sos-response">
          <div className="police-panel-header">
            <div className="police-panel-title">
              <span>🆘 TACTICAL SOS DISTRESS BEACONS &amp; RAPID DISPATCH</span>
            </div>
            <button
              type="button"
              className="police-preset-btn"
              onClick={async () => {
                const alerts = await fetchActiveSOSAlerts();
                if (alerts) setSosAlerts(alerts);
              }}
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
                      <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{a.user_name || a.user_id}</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.78rem' }}>{a.phone || 'N/A'}</div>
                    </td>
                    <td style={{ color: '#FCA5A5', fontWeight: 600 }}>
                      {a.emergency_type}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{a.site_name || 'Sacred Sector'}</div>
                      <div style={{ color: '#64748B', fontSize: '0.75rem', fontFamily: 'monospace' }}>[{a.site_id || 'GPS'}]</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#94A3B8', fontSize: '0.78rem' }}>
                      {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                    </td>
                    <td style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
                      {a.timestamp || 'Just now'}
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

      {/* ===================================================================== */}
      {/* POLICE TAB: SAFETY ZONES                                              */}
      {/* ===================================================================== */}
      {activeGovTab === 'safety-zones' && isPoliceOfficial && (
        <div className="police-panel" id="gov-safety-zones">
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

      {/* ===================================================================== */}
      {/* TAB 3: ALERTS & SAFETY (CIVIL ADMINISTRATION)                         */}
      {/* ===================================================================== */}
      {activeGovTab === 'alerts-safety' && !isPoliceOfficial && (
        <div id="gov-alerts-safety" className="gov-tab-page">
          {/* Section Header */}
          <div className="gov-live-monitoring-header-strip strip-safety">
            <div className="live-strip-left">
              <span className="tab-icon">🚨</span>
              <span className="live-strip-title">ALERTS &amp; SAFETY COMMAND CENTER • MULTI-AGENCY INCIDENT RESPONSE</span>
            </div>
            <span className={`live-strip-badge ${activeSOSCount > 0 ? 'badge-danger' : 'badge-normal'}`}>
              {activeSOSCount} Active SOS Beacon{activeSOSCount === 1 ? '' : 's'}
            </span>
          </div>

          {/* Emergency Operations SOS Desk */}
          <div className="gov-panel" id="gov-sos">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>EMERGENCY SOS OPERATIONS DESK</span>
                <span className={`gov-panel-badge ${activeSOSCount > 0 ? 'badge-danger' : 'badge-normal'}`}>
                  {activeSOSCount} Active Beacon{activeSOSCount === 1 ? '' : 's'}
                </span>
              </div>
              <span className="gov-panel-sub">Direct pilgrim distress signals from 112 &amp; mobile beacons</span>
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

          {/* Zone Risk Monitoring */}
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
                  <span className="gov-status-badge status-moderate">HIGH (55%)</span>
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

          {/* Multi-Agency Operations Desk */}
          <section className="gov-panel" id="gov-multi-agency">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>MULTI-AGENCY OPERATIONS DESK</span>
                <span className="gov-panel-badge">Inter-Departmental Command</span>
              </div>
              <span className="gov-panel-sub">Integrated dispatch and logistics telemetry for unified administration</span>
            </div>

            {/* Agency Navigation Tabs */}
            <div className="agency-tabs-nav">
              {['administration', 'transport', 'health', 'disaster', 'municipal'].map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setActiveAgencyTab(dept)}
                  className={`agency-tab-btn ${activeAgencyTab === dept ? 'active' : ''}`}
                >
                  {dept.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="agency-tab-content">
              {/* 1. ADMINISTRATION TAB */}
              {activeAgencyTab === 'administration' && (
                <div className="agency-cards-grid">
                  <div className="agency-card">
                    <div className="agency-card-title">District Administration &amp; Magistracy</div>
                    <div className="agency-key-vals">
                      <div className="ak-row">
                        <span className="ak-lbl">Sector Magistrates Deployed</span>
                        <span className="ak-val font-semibold">6 Zonal Magistrates</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Emergency Ops Center (DEOC)</span>
                        <span className="ak-val font-semibold text-success">Active 24/7 Command</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Inter-Agency Coordination</span>
                        <span className="ak-val font-semibold">Civil, Health, Transport Linked</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Public Helpline 1070</span>
                        <span className="ak-val font-semibold">Operational (12 Lines)</span>
                      </div>
                    </div>
                  </div>

                  <div className="agency-card">
                    <div className="agency-card-title">Administrative Infrastructure &amp; Permits</div>
                    <div className="agency-key-vals">
                      <div className="ak-row">
                        <span className="ak-lbl">Special Yatra Permits Logged</span>
                        <span className="ak-val font-semibold">14,280 Verified</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Holding Ground Capacities</span>
                        <span className="ak-val font-semibold font-mono">Sector A &amp; B Ready</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Citizen Advisory Broadcast</span>
                        <span className="ak-val font-semibold text-success">Highway Signboards Active</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Disaster Relief Contingency</span>
                        <span className="ak-val font-semibold text-success">Allocated &amp; Ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="agency-card">
                    <div className="agency-card-title">Civil Supplies &amp; Public Utilities</div>
                    <div className="agency-key-vals">
                      <div className="ak-row">
                        <span className="ak-lbl">Drinking Water Corridors</span>
                        <span className="ak-val font-bold">48 Sanitized Stations</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Temporary Medical/Sanitation</span>
                        <span className="ak-val font-bold">60 Units Deployed</span>
                      </div>
                      <div className="ak-row">
                        <span className="ak-lbl">Essential Food Rations</span>
                        <span className="ak-val font-semibold text-success">7-Day Corridor Buffer</span>
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: EMERGENCY REROUTING (CIVIL ADMINISTRATION)                     */}
      {/* ===================================================================== */}
      {activeGovTab === 'emergency-rerouting' && !isPoliceOfficial && (
        <div id="gov-emergency-reroute" className="gov-tab-page">
          <div className="gov-live-monitoring-header-strip strip-emergency">
            <div className="live-strip-left">
              <span className="tab-icon">🔄</span>
              <span className="live-strip-title">EMERGENCY CORRIDOR REROUTING COMMAND CENTER</span>
            </div>
            <span className={`live-strip-badge ${isRerouteActive ? 'badge-danger' : 'badge-normal'}`}>
              STATUS: {isRerouteActive ? 'ACTIVE CORRIDOR DIVERSION' : 'STANDBY (NOMINAL)'}
            </span>
          </div>

          {/* Emergency Reroute Control Panel */}
          <section className={`gov-panel ${isRerouteActive ? 'panel-emergency-active' : ''}`} id="gov-reroute-control">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>EMERGENCY REROUTE PROTOCOL</span>
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

          {/* Corridor Deflection Impact Matrix */}
          <div className="gov-panel">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>CORRIDOR DEFLECTION METRICS</span>
                <span className="gov-panel-badge">Load Shedding</span>
              </div>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: REPORTS / ANALYTICS                                            */}
      {/* ===================================================================== */}
      {activeGovTab === 'reports-analytics' && (
        isPoliceOfficial ? (
          <div className="police-panel" id="gov-reports-police">
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
        ) : (
          <div id="gov-reports-analytics" className="gov-tab-page">
          <div className="gov-live-monitoring-header-strip strip-reports">
            <div className="live-strip-left">
              <span className="tab-icon">📈</span>
              <span className="live-strip-title">GOVERNMENT REPORTS &amp; CORRIDOR ANALYTICS</span>
            </div>
            <span className="live-strip-badge">ANALYTICS DESK</span>
          </div>

          {/* Before / After Impact Analytical Assessment */}
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

          {/* Hospitality & Daily Capacity Report */}
          <div className="gov-panel">
            <div className="gov-panel-header">
              <div className="gov-panel-title">
                <span>HOSPITALITY CAPACITY &amp; OCCUPANCY REPORT</span>
                <span className="gov-panel-badge">Accommodation Network</span>
              </div>
              <span className="gov-panel-sub">Hotels, Dharamshalas, and Ashrams across active pilgrimage sectors</span>
            </div>

            <div className="gov-impact-kpis">
              <div className="impact-kpi-item">
                <span className="ik-lbl">Total Rooms Tracked</span>
                <span className="ik-num text-navy">{hotelReport?.total_rooms || 120}</span>
                <span className="ik-sub">Across 22 registered properties</span>
              </div>
              <div className="impact-kpi-item">
                <span className="ik-lbl">Occupied Rooms</span>
                <span className="ik-num text-amber">{hotelReport?.total_occupied_rooms || 36}</span>
                <span className="ik-sub">Current occupancy</span>
              </div>
              <div className="impact-kpi-item">
                <span className="ik-lbl">Available Rooms</span>
                <span className="ik-num text-success">{hotelReport?.total_available_rooms || 51}</span>
                <span className="ik-sub">Immediate vacant capacity</span>
              </div>
              <div className="impact-kpi-item">
                <span className="ik-lbl">Average Occupancy</span>
                <span className="ik-num text-navy">{hotelReport?.overall_occupancy_percentage || 30}%</span>
                <span className="ik-sub">Buffer margin nominal</span>
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* ===================================================================== */}
      {/* 7. INSPECTION MODAL DOSSIER                                           */}
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

      {/* Police Tactical Unit Dispatch Modal */}
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
                  {dispatchModalAlert.user_name || dispatchModalAlert.user_id} • <span style={{ color: '#FCA5A5' }}>{dispatchModalAlert.emergency_type}</span>
                </div>
                <div style={{ color: '#CBD5E1', fontSize: '0.85rem', marginTop: '0.25rem' }}>📍 {dispatchModalAlert.site_name}</div>
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
