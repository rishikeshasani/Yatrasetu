import React, { useState, useEffect } from 'react';
import {
  updateCrowdObservation,
  fetchActiveSOSAlerts,
  fetchGovernmentOccupancyReport
} from '../api/api';

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

  // Crowd Update Form State
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

  // Filtered list for table
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
        showToast(`🏛️ [Govt Command] Updated ${siteName} to ${Number(updatePeopleCount).toLocaleString()} devotees (${res.data?.occupancy_percentage}% ${res.data?.status}).`);
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

  return (
    <div className="gov-dashboard-root">
      {/* Top Banner */}
      <div className="gov-header-banner">
        <div className="gov-header-title-row">
          <div className="gov-badge-icon">🏛️</div>
          <div>
            <div className="gov-top-tag">
              <span>MINISTRY OF TOURISM & NATIONAL DISASTER MANAGEMENT</span>
              <span className="gov-live-indicator">● LIVE SECURE FEED</span>
            </div>
            <h1 className="gov-header-title">YatraSetu National Pilgrimage Command Center</h1>
            <p className="gov-header-subtitle">
              Centralized AI CCTV Vision, Crowd Influx Governance, Queue Corridors & Emergency Response for India's 25 Sacred Shrines
            </p>
          </div>
        </div>

        <div className="gov-authority-pill">
          <span className="gov-pill-shield">🛡️</span>
          <div>
            <div className="gov-pill-name">{currentUser?.full_name || 'DM Rudraprayag / Uttarakhand Command'}</div>
            <div className="gov-pill-role">CHIEF CROWD DISPATCHER • VERIFIED GOVT JWT</div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="gov-kpi-grid">
        <div className="gov-kpi-card total-sites">
          <div className="gov-kpi-header">
            <span className="kpi-label">MONITORED SHRINES</span>
            <span className="kpi-icon">📍</span>
          </div>
          <div className="kpi-value">{totalSites}</div>
          <div className="kpi-subtext">All 25 Official National Sites (TS001–TS025)</div>
        </div>

        <div className="gov-kpi-card normal-sites">
          <div className="gov-kpi-header">
            <span className="kpi-label">NORMAL FLOW</span>
            <span className="kpi-status-dot dot-normal"></span>
          </div>
          <div className="kpi-value text-normal">{normalCount}</div>
          <div className="kpi-subtext">Occupancy &lt; 50% • Smooth Darshan</div>
        </div>

        <div className="gov-kpi-card moderate-sites">
          <div className="gov-kpi-header">
            <span className="kpi-label">MODERATE SURGE</span>
            <span className="kpi-status-dot dot-moderate"></span>
          </div>
          <div className="kpi-value text-moderate">{moderateCount}</div>
          <div className="kpi-subtext">50% - 74% • Managed Barricades</div>
        </div>

        <div className="gov-kpi-card high-sites">
          <div className="gov-kpi-header">
            <span className="kpi-label">HIGH CONGESTION</span>
            <span className="kpi-status-dot dot-high"></span>
          </div>
          <div className="kpi-value text-high">{highCount}</div>
          <div className="kpi-subtext">75% - 89% • Buffer Holding Active</div>
        </div>

        <div className="gov-kpi-card critical-sites">
          <div className="gov-kpi-header">
            <span className="kpi-label">CRITICAL DENSITY</span>
            <span className="kpi-status-dot dot-critical"></span>
          </div>
          <div className="kpi-value text-critical">{criticalCount}</div>
          <div className="kpi-subtext">&gt;= 90% • Immediate Diversion Required</div>
        </div>

        <div className="gov-kpi-card total-transit">
          <div className="gov-kpi-header">
            <span className="kpi-label">PILGRIMS IN TRANSIT</span>
            <span className="kpi-icon">👥</span>
          </div>
          <div className="kpi-value">{totalDevotees.toLocaleString()}</div>
          <div className="kpi-subtext">Active Live Count Across Shrines</div>
        </div>

        <div className="gov-kpi-card active-sos">
          <div className="gov-kpi-header">
            <span className="kpi-label">ACTIVE SOS BEACONS</span>
            <span className="kpi-icon">🚨</span>
          </div>
          <div className={`kpi-value ${activeSOSCount > 0 ? 'text-sos-alert' : ''}`}>
            {activeSOSCount}
          </div>
          <div className="kpi-subtext">Disaster Helpline (1070/112) Linked</div>
        </div>
      </div>

      {/* Main 2-Column Section: Live Crowd Telemetry Update + Real-Time SOS Alerts Feed */}
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

      {/* Full-Width Section: All 25 Shrines Monitoring Table */}
      <div className="gov-card-panel monitoring-table-panel">
        <div className="panel-header table-header-flex">
          <div className="panel-title-box">
            <span className="panel-icon">📊</span>
            <div>
              <h3 className="panel-title">National Shrine Density & Queue Corridor Monitoring (25 Sites)</h3>
              <p className="panel-desc">
                Comprehensive multi-shrine surveillance matrix across Uttarakhand, Uttar Pradesh, Jammu & Kashmir, Andhra Pradesh, Gujarat, Odisha, and more.
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

      {/* Bottom Section: Pilgrimage Hospitality & Hotel Capacity Report */}
      {hotelReport && (
        <div className="gov-card-panel hospitality-report-panel">
          <div className="panel-header">
            <div className="panel-title-box">
              <span className="panel-icon">🏨</span>
              <div>
                <h3 className="panel-title">City-Wide Pilgrimage Hospitality & Lodge Capacity Report</h3>
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

      {/* Inspect Site Modal Drawer */}
      {inspectSite && (
        <div className="modal-backdrop" onClick={() => setInspectSite(null)}>
          <div className="modal-content gov-inspect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🏛️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0F172A' }}>
                    {inspectSite.name} Telemetry & Buffer Governance
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
                <span className={`val ${inspectSite.status.toLowerCase()}`}>{inspectSite.occupancy_percentage}% ({inspectSite.status})</span>
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
