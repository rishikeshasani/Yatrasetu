import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GodsEyeMap.css';

// Fix default Leaflet icon paths in Vite / React production builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map Controller: Fits bounds across all canonical destinations
function MapBoundsController({ bounds, fitTrigger }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      } catch {
        // Fallback gracefully if map container is initializing
      }
    }
  }, [fitTrigger, map]);
  return null;
}

// Map Controller: Smoothly flies to selected destination
function MapFlyToController({ targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && Array.isArray(targetCoords) && targetCoords[0] && targetCoords[1]) {
      try {
        map.flyTo(targetCoords, 8, { duration: 1.2 });
      } catch {
        // Safe catch
      }
    }
  }, [targetCoords, map]);
  return null;
}

// Creates an accessible, high-contrast operational status marker
const createGodsEyeMarkerIcon = (siteId, status, isRerouted, isSelected) => {
  const statusLower = (status || 'NORMAL').toLowerCase();
  const rerouteClass = isRerouted ? 'has-reroute' : '';
  const selectedClass = isSelected ? 'selected' : '';

  return L.divIcon({
    className: 'gem-marker-icon',
    html: `
      <div 
        class="gem-marker-pin status-${statusLower} ${rerouteClass} ${selectedClass}"
        role="button"
        aria-label="${siteId} - Status: ${status}"
      >
        <span class="gem-marker-label">${siteId}</span>
        ${isRerouted ? '<span style="font-size: 8px; line-height: 1;">🚨</span>' : ''}
      </div>
    `,
    iconSize: isSelected ? [44, 44] : [38, 38],
    iconAnchor: isSelected ? [22, 22] : [19, 19],
    popupAnchor: [0, -18]
  });
};

export default function GodsEyeMap({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  activeRerouteAlert,
  isLoading = false,
  onRefresh,
  onOpenCrowdUpdate
}) {
  const { t } = useTranslation();

  // Search and Operational Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [fitTrigger, setFitTrigger] = useState(0);

  // Authoritative Site Telemetry Resolution across all 25 shrines
  const telemetrySites = useMemo(() => {
    if (!Array.isArray(sites) || sites.length === 0) return [];

    return sites.map((site) => {
      const d = densityMap[site.id] || {};
      const cap = site.capacity || d.capacity || 10000;
      const count = d.people_count != null ? d.people_count : Math.round(cap * 0.48);
      const occupancy = d.occupancy_percentage != null ? d.occupancy_percentage : Math.round((count / cap) * 100);
      const status = d.status || (occupancy >= 90 ? 'CRITICAL' : occupancy >= 75 ? 'HIGH' : occupancy >= 50 ? 'MODERATE' : 'NORMAL');
      
      let estWait = d.wait_time_minutes != null ? d.wait_time_minutes : 25;
      if (d.wait_time_minutes == null) {
        if (occupancy >= 90) estWait = 540;
        else if (occupancy >= 75) estWait = 360;
        else if (occupancy >= 50) estWait = 120;
      }

      const isRerouted = Boolean(
        activeRerouteAlert &&
        activeRerouteAlert.is_active &&
        activeRerouteAlert.alert &&
        activeRerouteAlert.alert.site_id === site.id
      );

      const lat = Number(site.latitude || d.latitude || 0);
      const lon = Number(site.longitude || d.longitude || 0);

      return {
        ...site,
        latitude: lat,
        longitude: lon,
        people_count: count,
        capacity: cap,
        occupancy_percentage: occupancy,
        status,
        wait_time_minutes: estWait,
        source: d.source || 'demo_simulation',
        last_updated: d.last_updated || 'Just now',
        timestamp: d.timestamp || new Date().toISOString(),
        relative_surge_alert: d.relative_surge_alert || null,
        yolo_people_count: d.yolo_people_count != null ? d.yolo_people_count : null,
        gps_active_devices: d.gps_active_devices != null ? d.gps_active_devices : null,
        gps_estimated_people: d.gps_estimated_people != null ? d.gps_estimated_people : null,
        fused_people_count: d.fused_people_count != null ? d.fused_people_count : null,
        fusion_applied: Boolean(d.fusion_applied),
        fusion_metadata: d.fusion_metadata || null,
        isRerouted
      };
    });
  }, [sites, densityMap, activeRerouteAlert]);

  // Overall KPI Counters directly computed from live telemetry
  const kpis = useMemo(() => {
    const total = telemetrySites.length;
    const critical = telemetrySites.filter(s => s.status === 'CRITICAL').length;
    const high = telemetrySites.filter(s => s.status === 'HIGH').length;
    const moderate = telemetrySites.filter(s => s.status === 'MODERATE').length;
    const normal = telemetrySites.filter(s => s.status === 'NORMAL').length;
    const devotees = telemetrySites.reduce((sum, s) => sum + (s.people_count || 0), 0);
    const reroutes = telemetrySites.filter(s => s.isRerouted).length;

    return { total, critical, high, moderate, normal, devotees, reroutes };
  }, [telemetrySites]);

  // Filtered Shrines for Map Rendering
  const filteredSites = useMemo(() => {
    return telemetrySites.filter((site) => {
      // 1. Search filter (name, id, city, state)
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        site.name.toLowerCase().includes(q) ||
        site.id.toLowerCase().includes(q) ||
        (site.city && site.city.toLowerCase().includes(q)) ||
        (site.state && site.state.toLowerCase().includes(q));

      // 2. Status filter
      const matchStatus = statusFilter === 'ALL' || site.status === statusFilter;

      // 3. Source filter
      let matchSource = true;
      if (sourceFilter !== 'ALL') {
        const src = (site.source || '').toLowerCase();
        if (sourceFilter === 'FUSED') matchSource = src.includes('fused');
        else if (sourceFilter === 'YOLO') matchSource = src.includes('yolo');
        else if (sourceFilter === 'GPS') matchSource = src.includes('gps');
        else if (sourceFilter === 'LIVE') matchSource = src.includes('telemetry') || src.includes('live');
        else if (sourceFilter === 'HISTORICAL') matchSource = src.includes('hist');
        else if (sourceFilter === 'DEMO') matchSource = src.includes('demo');
      }

      return matchSearch && matchStatus && matchSource;
    });
  }, [telemetrySites, searchTerm, statusFilter, sourceFilter]);

  // Map Geographic Bounding Box
  const mapBounds = useMemo(() => {
    const valid = telemetrySites
      .filter(s => s.latitude && s.longitude && s.latitude !== 0 && s.longitude !== 0)
      .map(s => [s.latitude, s.longitude]);
    return valid.length > 0 ? valid : [[8.0, 68.0], [35.5, 97.0]];
  }, [telemetrySites]);

  // Currently Selected Shrine Details
  const activeSelectedSite = useMemo(() => {
    if (!selectedSiteId) return telemetrySites[0] || null;
    return telemetrySites.find(s => s.id === selectedSiteId) || telemetrySites[0] || null;
  }, [selectedSiteId, telemetrySites]);

  // Coords for fly-to controller
  const selectedCoords = useMemo(() => {
    if (activeSelectedSite && activeSelectedSite.latitude && activeSelectedSite.longitude) {
      return [activeSelectedSite.latitude, activeSelectedSite.longitude];
    }
    return null;
  }, [activeSelectedSite]);

  // Handle marker click or select
  const handleMarkerClick = (site) => {
    if (onSelectSite) {
      onSelectSite(site.id);
    }
  };

  const handleResetView = () => {
    setFitTrigger(prev => prev + 1);
  };

  const activeRerouteSiteName = useMemo(() => {
    if (!activeRerouteAlert?.is_active || !activeRerouteAlert?.alert?.site_id) return '';
    const found = sites.find(s => s.id === activeRerouteAlert.alert.site_id);
    return found ? found.name : activeRerouteAlert.alert.site_id;
  }, [activeRerouteAlert, sites]);

  return (
    <section className="godseye-root" aria-label="God's-Eye Crowd Command Center">
      {/* 1. Header with Live Pulse */}
      <div className="godseye-header">
        <div className="godseye-title-wrap">
          <span className="godseye-emblem" role="img" aria-label="Command Eye">👁️</span>
          <div>
            <h2 className="godseye-title">
              {t('godsEye.title', "God's-Eye Crowd Command Map")}
              <span className="godseye-badge">2D GIS</span>
            </h2>
            <p className="godseye-subtitle">
              {t('godsEye.subtitle', 'Authoritative 2D GIS operational intelligence across all 25 canonical shrines')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="godseye-live-pill">
            <span className="godseye-pulse-dot"></span>
            <span>LIVE TELEMETRY</span>
          </div>
          {onRefresh && (
            <button
              type="button"
              className="godseye-action-btn"
              onClick={onRefresh}
              title="Refresh Telemetry"
            >
              🔄 {t('godsEye.retry', 'Refresh')}
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Summary Metrics Bar */}
      <div className="godseye-metrics-bar">
        <div className="godseye-metric-card">
          <span className="gem-label">🏛️ {t('godsEye.totalMonitoredSites', 'Total Shrines')}</span>
          <span className="gem-val text-accent">{kpis.total}</span>
        </div>
        <div className="godseye-metric-card">
          <span className="gem-label">🔴 {t('godsEye.criticalSites', 'Critical')}</span>
          <span className="gem-val text-critical">{kpis.critical}</span>
        </div>
        <div className="godseye-metric-card">
          <span className="gem-label">🟠 {t('godsEye.highSites', 'High')}</span>
          <span className="gem-val text-high">{kpis.high}</span>
        </div>
        <div className="godseye-metric-card">
          <span className="gem-label">🟡 {t('godsEye.moderateSites', 'Moderate')}</span>
          <span className="gem-val text-moderate">{kpis.moderate}</span>
        </div>
        <div className="godseye-metric-card">
          <span className="gem-label">🟢 {t('godsEye.normalSites', 'Normal')}</span>
          <span className="gem-val text-normal">{kpis.normal}</span>
        </div>
        <div className="godseye-metric-card">
          <span className="gem-label">👥 {t('godsEye.activeDevotees', 'Active Devotees')}</span>
          <span className="gem-val">{kpis.devotees.toLocaleString()}</span>
        </div>
      </div>

      {/* 3. Emergency Reroute Active Banner */}
      {activeRerouteAlert?.is_active && (
        <div className="godseye-reroute-banner" role="alert">
          <div className="reroute-banner-left">
            <span className="reroute-banner-icon">🚨</span>
            <div>
              <div className="reroute-banner-title">
                {t('godsEye.rerouteBannerTitle', 'EMERGENCY REROUTE ACTIVE')}
              </div>
              <div className="reroute-banner-desc">
                {t('godsEye.rerouteBannerDesc', {
                  siteName: activeRerouteSiteName || activeRerouteAlert.alert?.site_id || 'Corridor',
                  defaultValue: `High congestion diversion in effect for ${activeRerouteSiteName || 'Corridor'}. Inbound traffic diverted.`
                })}
              </div>
            </div>
          </div>
          {activeRerouteAlert.alert?.site_id && (
            <button
              type="button"
              className="reroute-banner-btn"
              onClick={() => onSelectSite && onSelectSite(activeRerouteAlert.alert.site_id)}
            >
              📍 {t('godsEye.viewRerouteSite', 'Inspect Affected Shrine')}
            </button>
          )}
        </div>
      )}

      {/* 4. Controls & Filters Toolbar */}
      <div className="godseye-toolbar">
        {/* Search */}
        <div className="godseye-search-wrap">
          <span className="godseye-search-icon">🔍</span>
          <input
            type="text"
            className="godseye-search-input"
            placeholder={t('godsEye.searchPlaceholder', 'Search by shrine, city, state, or ID (e.g. TS001)...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search shrines"
          />
        </div>

        {/* Status Filters */}
        <div className="godseye-filter-pills">
          <button
            type="button"
            className={`godseye-pill-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            {t('godsEye.filterAll', 'All')} ({telemetrySites.length})
          </button>
          <button
            type="button"
            className={`godseye-pill-btn pill-critical ${statusFilter === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('CRITICAL')}
          >
            🔴 {t('godsEye.filterCritical', 'Critical')} ({kpis.critical})
          </button>
          <button
            type="button"
            className={`godseye-pill-btn pill-high ${statusFilter === 'HIGH' ? 'active' : ''}`}
            onClick={() => setStatusFilter('HIGH')}
          >
            🟠 {t('godsEye.filterHigh', 'High')} ({kpis.high})
          </button>
          <button
            type="button"
            className={`godseye-pill-btn pill-moderate ${statusFilter === 'MODERATE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('MODERATE')}
          >
            🟡 {t('godsEye.filterModerate', 'Moderate')} ({kpis.moderate})
          </button>
          <button
            type="button"
            className={`godseye-pill-btn pill-normal ${statusFilter === 'NORMAL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('NORMAL')}
          >
            🟢 {t('godsEye.filterNormal', 'Normal')} ({kpis.normal})
          </button>
        </div>

        {/* Source Dropdown & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <select
            className="godseye-source-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter intelligence source"
          >
            <option value="ALL">{t('godsEye.sourceAll', 'All Sources')}</option>
            <option value="FUSED">{t('godsEye.sourceFused', 'Fused (YOLO + GPS)')}</option>
            <option value="YOLO">{t('godsEye.sourceYolo', 'YOLO Video')}</option>
            <option value="GPS">{t('godsEye.sourceGps', 'Mobile GPS')}</option>
            <option value="LIVE">{t('godsEye.sourceLive', 'Live Telemetry')}</option>
            <option value="HISTORICAL">{t('godsEye.sourceHistorical', 'Historical')}</option>
            <option value="DEMO">{t('godsEye.sourceDemo', 'Demo Simulation')}</option>
          </select>

          <button
            type="button"
            className="godseye-action-btn"
            onClick={handleResetView}
            title="Reset Map Bounds"
          >
            🗺️ {t('godsEye.fitAll', 'Fit All')}
          </button>
        </div>
      </div>

      {/* 5. Main Map & Intelligence Layout */}
      <div className="godseye-main-grid">
        {/* Left: 2D GIS Leaflet Map Container */}
        <div className="godseye-map-container" id="godseye-leaflet-wrapper">
          <MapContainer
            center={[22.9734, 78.6569]}
            zoom={5}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={18}
            />

            <MapBoundsController bounds={mapBounds} fitTrigger={fitTrigger} />
            <MapFlyToController targetCoords={selectedCoords} />

            {filteredSites.map((site) => {
              if (!site.latitude || !site.longitude) return null;
              const isSelected = selectedSiteId === site.id;

              return (
                <Marker
                  key={site.id}
                  position={[site.latitude, site.longitude]}
                  icon={createGodsEyeMarkerIcon(site.id, site.status, site.isRerouted, isSelected)}
                  eventHandlers={{
                    click: () => handleMarkerClick(site),
                  }}
                >
                  <Popup className="gem-popup">
                    <div className="popup-header">
                      <span className="popup-title">[{site.id}] {site.name}</span>
                      <span className={`police-badge-status status-${site.status.toLowerCase()}`}>
                        {site.status}
                      </span>
                    </div>
                    <div className="popup-body">
                      <div className="popup-row">
                        <span className="popup-label">{t('godsEye.peopleCount', 'Headcount')}:</span>
                        <span className="popup-val">{site.people_count.toLocaleString()}</span>
                      </div>
                      <div className="popup-row">
                        <span className="popup-label">{t('godsEye.occupancy', 'Occupancy')}:</span>
                        <span className="popup-val">{site.occupancy_percentage}%</span>
                      </div>
                      <div className="popup-row">
                        <span className="popup-label">{t('godsEye.estimatedWait', 'Est. Wait')}:</span>
                        <span className="popup-val">~{site.wait_time_minutes} min</span>
                      </div>
                      <div className="popup-row">
                        <span className="popup-label">{t('godsEye.dataSource', 'Source')}:</span>
                        <span className="popup-val" style={{ fontSize: '0.72rem', color: '#38BDF8' }}>
                          {site.source}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="popup-inspect-btn"
                        onClick={() => handleMarkerClick(site)}
                      >
                        {t('godsEye.inspectBtn', 'Inspect Operational Details')} ➔
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right: Selected Shrine Operational Intelligence Panel */}
        <aside className="godseye-side-panel" aria-label="Selected Shrine Operational Details">
          <div className="intel-panel-header">
            <div className="intel-panel-title">
              <span>🎯</span>
              <span>{t('godsEye.selectedIntelTitle', 'Selected Shrine Intelligence')}</span>
            </div>
            {activeSelectedSite && (
              <span className="intel-panel-badge">{activeSelectedSite.id}</span>
            )}
          </div>

          <div className="intel-panel-content">
            {activeSelectedSite ? (
              <>
                {/* Shrine Header */}
                <div className="intel-shrine-header">
                  <div className="intel-shrine-name">{activeSelectedSite.name}</div>
                  <div className="intel-shrine-meta">
                    <span>📍 {activeSelectedSite.city || activeSelectedSite.state}</span>
                    <span>•</span>
                    <span>🕒 {activeSelectedSite.darshan_timings || 'Open for Darshan'}</span>
                  </div>
                </div>

                {/* Occupancy Progress Bar */}
                <div className="intel-occupancy-wrap">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                    <span style={{ color: '#94A3B8' }}>{t('godsEye.occupancy', 'Capacity Occupancy')}</span>
                    <span className={`text-${activeSelectedSite.status.toLowerCase()}`}>
                      {activeSelectedSite.occupancy_percentage}% ({activeSelectedSite.status})
                    </span>
                  </div>
                  <div className="intel-occupancy-bar-bg">
                    <div
                      className={`intel-occupancy-bar-fill status-${activeSelectedSite.status.toLowerCase()}`}
                      style={{ width: `${Math.min(100, activeSelectedSite.occupancy_percentage)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="intel-stats-grid">
                  <div className="intel-stat-box">
                    <span className="isb-label">{t('godsEye.peopleCount', 'Current Crowd')}</span>
                    <span className="isb-val">{activeSelectedSite.people_count.toLocaleString()}</span>
                  </div>
                  <div className="intel-stat-box">
                    <span className="isb-label">{t('godsEye.capacity', 'Daily Capacity')}</span>
                    <span className="isb-val">{(activeSelectedSite.capacity || 10000).toLocaleString()}</span>
                  </div>
                  <div className="intel-stat-box">
                    <span className="isb-label">{t('godsEye.estimatedWait', 'Estimated Wait')}</span>
                    <span className="isb-val" style={{ color: activeSelectedSite.wait_time_minutes > 120 ? '#F87171' : '#60A5FA' }}>
                      ~{activeSelectedSite.wait_time_minutes}m
                    </span>
                  </div>
                  <div className="intel-stat-box">
                    <span className="isb-label">{t('godsEye.dataSource', 'Data Source')}</span>
                    <span className="isb-val" style={{ fontSize: '0.82rem', color: '#38BDF8' }}>
                      {activeSelectedSite.source}
                    </span>
                  </div>
                </div>

                {/* Multi-Source Fusion Intelligence Breakdown */}
                {activeSelectedSite.fusion_applied || activeSelectedSite.yolo_people_count != null || activeSelectedSite.gps_active_devices != null ? (
                  <div className="intel-fusion-card">
                    <div className="ifc-title">
                      <span>⚡</span>
                      <span>{t('godsEye.fusedBadge', 'Multi-Source Fusion Intelligence')}</span>
                    </div>

                    {activeSelectedSite.yolo_people_count != null && (
                      <div className="ifc-row">
                        <span className="ifc-label">📹 {t('godsEye.yoloCount', 'YOLO Visual Headcount')}:</span>
                        <span className="ifc-val">{activeSelectedSite.yolo_people_count.toLocaleString()}</span>
                      </div>
                    )}

                    {activeSelectedSite.gps_active_devices != null && (
                      <div className="ifc-row">
                        <span className="ifc-label">📡 {t('godsEye.gpsDevices', 'GPS Active Devices')}:</span>
                        <span className="ifc-val">{activeSelectedSite.gps_active_devices.toLocaleString()}</span>
                      </div>
                    )}

                    {activeSelectedSite.gps_estimated_people != null && (
                      <div className="ifc-row">
                        <span className="ifc-label">👥 {t('godsEye.gpsPeople', 'GPS Estimated Devotees (1.2x)')}:</span>
                        <span className="ifc-val">{activeSelectedSite.gps_estimated_people.toLocaleString()}</span>
                      </div>
                    )}

                    {activeSelectedSite.fused_people_count != null && (
                      <div className="ifc-row" style={{ borderTop: '1px solid #334155', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                        <span className="ifc-label" style={{ fontWeight: 700, color: '#F8FAFC' }}>
                          🎯 {t('godsEye.fusedCount', 'Fused Operational Count')}:
                        </span>
                        <span className="ifc-val" style={{ color: '#34D399', fontSize: '1.05rem' }}>
                          {activeSelectedSite.fused_people_count.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="ifc-formula">
                      Fused = round(0.6 × YOLO + 0.4 × GPS_devotees)
                    </div>
                  </div>
                ) : (
                  <div className="intel-fusion-card">
                    <div className="ifc-title">
                      <span>📊</span>
                      <span>{t('godsEye.dataSource', 'Operational Provenance')}</span>
                    </div>
                    <div className="ifc-row">
                      <span className="ifc-label">Telemetry Tier:</span>
                      <span className="ifc-val" style={{ textTransform: 'capitalize' }}>
                        {activeSelectedSite.source.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="ifc-row">
                      <span className="ifc-label">{t('godsEye.lastUpdated', 'Updated')}:</span>
                      <span className="ifc-val">{activeSelectedSite.last_updated}</span>
                    </div>
                  </div>
                )}

                {/* Relative Surge Alert if triggered by ML */}
                {activeSelectedSite.relative_surge_alert && activeSelectedSite.relative_surge_alert.is_relative_surge && (
                  <div className="intel-surge-alert">
                    <span>⚠️</span>
                    <div>
                      <strong>RELATIVE SURGE DETECTED ({activeSelectedSite.relative_surge_alert.surge_percentage})</strong>
                      <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                        {activeSelectedSite.relative_surge_alert.message}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tactical Actions */}
                <div className="intel-actions">
                  {onOpenCrowdUpdate && (
                    <button
                      type="button"
                      className="intel-primary-btn"
                      onClick={() => onOpenCrowdUpdate(activeSelectedSite.id)}
                    >
                      ✏️ {t('godsEye.updateCrowdBtn', 'Submit Live Telemetry Update')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="intel-empty-state">
                <span style={{ fontSize: '2.5rem' }}>🗺️</span>
                <p>{t('godsEye.selectPrompt', 'Select any shrine marker on the map to inspect live operational intelligence.')}</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 6. Footer Legend & Integrity Disclaimer */}
      <div className="godseye-footer">
        <div className="godseye-legend">
          <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{t('godsEye.legendTitle', 'Legend')}:</span>
          <div className="legend-item">
            <span className="legend-dot dot-normal"></span>
            <span>{t('godsEye.legendNormal', 'Normal (<50%)')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-moderate"></span>
            <span>{t('godsEye.legendModerate', 'Moderate (50-74%)')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-high"></span>
            <span>{t('godsEye.legendHigh', 'High (75-89%)')}</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-critical"></span>
            <span>{t('godsEye.legendCritical', 'Critical (≥90%)')}</span>
          </div>
        </div>

        <div className="godseye-disclaimer">
          🛡️ <strong>{t('godsEye.disclaimerTitle', 'Privacy & Integrity')}:</strong>{' '}
          {t('godsEye.disclaimerText', 'YOLO counts represent camera Field-of-View. Mobile GPS aggregates active devices inside geofences multiplied by 1.2x. Zero individual tracking or private trails.')}
        </div>
      </div>
    </section>
  );
}
