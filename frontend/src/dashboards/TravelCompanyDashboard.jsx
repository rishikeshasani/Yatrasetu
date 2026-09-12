import React, { useState, useEffect } from 'react';
import { saveFleetSchedules, fetchFleetSchedules, fetchActiveRerouteAlert, fetchAlternatives } from '../api/api';
import TravelAgencyConsole from '../components/TravelAgencyConsole';
import StatusBadge from '../components/common/StatusBadge';

export default function TravelCompanyDashboard({
  sites = [],
  densityMap = {},
  selectedSiteId = 'TS001',
  onSelectSite,
  showToast,
  externalTab
}) {
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeReroute, setActiveReroute] = useState(null);
  const [activeSiteId, setActiveSiteId] = useState(selectedSiteId || 'TS001');
  const [alternativesData, setAlternativesData] = useState(null);
  const [isLoadingAlts, setIsLoadingAlts] = useState(false);

  useEffect(() => {
    if (selectedSiteId) {
      setActiveSiteId(selectedSiteId);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAlts(true);
    fetchAlternatives(activeSiteId)
      .then((data) => {
        if (isMounted) {
          setAlternativesData(data);
          setIsLoadingAlts(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingAlts(false);
      });
    return () => {
      isMounted = false;
    };
  }, [activeSiteId]);

  const [fleetRoutes, setFleetRoutes] = useState([
    { id: 'HR-01', from: 'Delhi (ISBT Kashmiri Gate)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 3, capacity: 42, occupancy: 94, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-02', from: 'Dehradun (Bus Stand)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 2, capacity: 38, occupancy: 100, type: 'Sleeper', status: 'FULL' },
    { id: 'HR-03', from: 'Haridwar (Har Ki Pauri)', to: 'Delhi (ISBT Kashmiri Gate)', date: 'Oct 13 (Sun)', buses: 3, capacity: 42, occupancy: 22, type: 'Volvo A/C', status: 'RETURN' },
    { id: 'HR-04', from: 'Rishikesh (Triveni Ghat)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 1, capacity: 30, occupancy: 67, type: 'Mini Bus', status: 'NORMAL' },
  ]);

  // Load live schedule and active reroute directives on mount
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

    const syncReroute = () => {
      fetchActiveRerouteAlert().then((reroute) => {
        if (reroute && reroute.is_active) {
          setActiveReroute(reroute);
        } else {
          setActiveReroute(null);
        }
      }).catch(() => {});
    };
    syncReroute();

    const handleRerouteEvent = (e) => {
      if (e?.detail) {
        setActiveReroute(e.detail.is_active ? e.detail : null);
      }
    };
    window.addEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
    const pollTimer = setInterval(syncReroute, 6000);

    return () => {
      window.removeEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
      clearInterval(pollTimer);
    };
  }, []);

  // Dynamic Bus & Occupancy Adjuster
  const updateRouteBuses = (route, delta) => {
    const newBuses = Math.max(1, (route.buses || 1) + delta);
    const initialBuses = route.initialBuses || route.buses || 3;
    const initialOccupancy = route.initialOccupancy || route.occupancy || 80;
    // Calculate total passenger demand load for this route schedule
    const demand = route.passengerDemand || Math.round(initialBuses * route.capacity * (initialOccupancy / 100));

    const totalSeats = newBuses * route.capacity;
    const newOccupancy = Math.min(100, Math.max(10, Math.round((demand / totalSeats) * 100)));

    let newStatus = 'NORMAL';
    if (newOccupancy >= 98) {
      newStatus = 'FULL';
    } else if (newOccupancy >= 80) {
      newStatus = 'HIGH DEMAND';
    } else if (route.id === 'HR-03' || (route.from && route.from.includes('Haridwar'))) {
      newStatus = newOccupancy < 40 ? 'RETURN' : (newOccupancy >= 75 ? 'HIGH DEMAND' : 'MODERATE');
    } else if (newOccupancy < 50) {
      newStatus = 'OPTIMAL';
    } else {
      newStatus = 'MODERATE';
    }

    return {
      ...route,
      buses: newBuses,
      occupancy: newOccupancy,
      status: newStatus,
      passengerDemand: demand,
      initialBuses: initialBuses,
      initialOccupancy: initialOccupancy
    };
  };

  const currentSite = sites.find((s) => s.id === activeSiteId) || {
    id: activeSiteId,
    name: activeSiteId === 'TS001' ? 'Kedarnath Temple' : activeSiteId,
    capacity: 10000,
    state: 'Uttarakhand'
  };
  const currentDensity = densityMap[activeSiteId] || {
    people_count: 4800,
    occupancy_percentage: 48,
    status: 'NORMAL',
    wait_time_minutes: 25,
    source: 'demo_simulation'
  };
  const peopleCount = currentDensity.people_count ?? 0;
  const capacity = currentDensity.capacity || currentSite.capacity || 10000;
  const occPct = currentDensity.occupancy_percentage ?? Math.round((peopleCount / capacity) * 100);
  const status = currentDensity.status || (occPct >= 90 ? 'CRITICAL' : occPct >= 75 ? 'HIGH' : occPct >= 50 ? 'MODERATE' : 'NORMAL');
  const waitMins = currentDensity.wait_time_minutes ?? (occPct >= 90 ? 540 : occPct >= 75 ? 360 : occPct >= 50 ? 120 : 25);
  const source = currentDensity.source || 'demo_simulation';

  const getTheme = (st) => {
    switch (st) {
      case 'CRITICAL':
        return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', badgeBg: '#FEE2E2', icon: '🚨' };
      case 'HIGH':
        return { color: '#EA580C', bg: '#FFF7ED', border: '#FFEDD5', badgeBg: '#FFEDD5', icon: '⚠️' };
      case 'MODERATE':
        return { color: '#D97706', bg: '#FFFBEB', border: '#FEF3C7', badgeBg: '#FEF3C7', icon: '⚡' };
      default:
        return { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', badgeBg: '#D1FAE5', icon: '✅' };
    }
  };
  const currentTheme = getTheme(status);

  return (
    <div className="travel-dashboard-root" id="travel-dashboard" style={{ padding: '0 0 2rem' }}>

      {/* Active State Emergency Directive Banner */}
      {activeReroute?.is_active && (
        <div style={{
          margin: '1.25rem 1.5rem',
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
          border: '1px solid #EF4444',
          borderRadius: '0.75rem',
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.8rem', animation: 'bounce 1s infinite' }}>🚨</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#DC2626',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  STATE EMERGENCY DIRECTIVE
                </span>
                <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                  Halt &amp; Divert Fleet: {activeReroute.source_site || 'Primary Sacred Corridor'}
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#FEE2E2', lineHeight: 1.4 }}>
                {activeReroute.message || 'Haridwar Corridor Overtourism Override Active. Re-route buses to satellite parking.'}
              </p>
              {activeReroute.target_sites && activeReroute.target_sites.length > 0 && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#FECACA' }}>
                  Suggested Sister Shrines:{' '}
                  <strong>{activeReroute.target_sites.join(', ')}</strong>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '0.5rem 0.85rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Diverted Pilgrims
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#FFFFFF' }}>
                {activeReroute.diverted_tourists_count || 320}
              </div>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              padding: '0.5rem 0.85rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#FCA5A5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Buses Assigned
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#FFFFFF' }}>
                {activeReroute.assigned_buses_count || 8}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* DESTINATION CONGESTION & SISTER SHRINE REROUTING       */}
      {/* ====================================================== */}
      <section style={{ margin: '1.25rem 1.5rem', backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Section Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', padding: '1rem 1.5rem', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🧭</span>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                DESTINATION CONGESTION &amp; ROUTE REROUTING INTELLIGENCE
              </h2>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#BFDBFE' }}>
              Canonical real-time crowd occupancy, queue wait times, and authoritative sister shrine alternatives
            </p>
          </div>

          {/* Destination Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#E2E8F0' }}>Inspect Shrine:</label>
            <select
              value={activeSiteId}
              onChange={(e) => {
                const newId = e.target.value;
                setActiveSiteId(newId);
                if (onSelectSite) onSelectSite(newId);
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.4rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {(sites.length > 0 ? sites : [
                { id: 'TS001', name: 'Kedarnath Temple' },
                { id: 'TS003', name: 'Badrinath Temple' },
                { id: 'TS006', name: 'Gangotri Temple' },
                { id: 'TS008', name: 'Yamunotri Temple' },
                { id: 'TS015', name: 'Har Ki Pauri, Haridwar' }
              ]).map((s) => (
                <option key={s.id} value={s.id} style={{ color: '#0F172A', backgroundColor: '#FFF' }}>
                  {s.id}: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body: 2 Columns */}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Left Card: Selected Destination Live Congestion */}
          <div style={{ border: `1.5px solid ${currentTheme.border}`, borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: currentTheme.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {currentSite.id} · {currentSite.city || currentSite.state || 'Sacred Site'}
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {currentSite.name}
                </h3>
              </div>
              <StatusBadge
                status={status}
                theme="light"
                size="sm"
                pulse={status === 'CRITICAL'}
                label={`${currentTheme.icon} ${status}`}
              />
            </div>

            {/* Occupancy Progress */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Sanctum Congestion:</span>
                <span style={{ fontWeight: 800, color: currentTheme.color }}>{occPct}% Capacity</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, occPct)}%`, height: '100%', backgroundColor: currentTheme.color, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: '#FFF', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Live Headcount</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
                  {peopleCount.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>/ {(capacity).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ backgroundColor: '#FFF', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Est. Darshan Queue</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
                  ⏱️ {waitMins} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>mins</span>
                </div>
              </div>
            </div>

            {/* Source Attribution & Operator Advice */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.78rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ color: '#64748B' }}>
                Telemetry Source:{' '}
                <strong style={{ color: '#0F172A' }}>
                  {source === 'yolo_video'
                    ? '🎥 YOLO AI Detection'
                    : source === 'live_telemetry'
                    ? '📡 Live Telemetry'
                    : source === 'historical_baseline'
                    ? '📊 Historical Baseline'
                    : '⚙️ Demo Simulation'}
                </strong>
              </span>
              <span style={{ color: status === 'CRITICAL' || status === 'HIGH' ? '#DC2626' : '#059669', fontWeight: 700 }}>
                {status === 'CRITICAL' || status === 'HIGH' ? '⚠️ Rerouting Advisable' : '✓ Normal Transit'}
              </span>
            </div>
          </div>

          {/* Right Column: Authoritative Sister Shrines / Alternatives */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🏔️ Authoritative Sister Shrines for Rerouting</span>
                <span style={{ fontSize: '0.75rem', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                  {alternativesData?.recommendations?.length || 0} registered
                </span>
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>data/alternatives.csv</span>
            </div>

            {isLoadingAlts ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.88rem' }}>
                Loading verified sister shrine corridors...
              </div>
            ) : (!alternativesData?.recommendations || alternativesData.recommendations.length === 0) ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '0.5rem', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.85rem' }}>
                No designated sister shrines within 50km for {currentSite.name}. Fleet must maintain scheduled pilgrim holding zones.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
                {alternativesData.recommendations.map((alt, idx) => (
                  <div key={alt.alternative_id || idx} style={{ border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.85rem 1rem', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{alt.name}</span>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#E2E8F0', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>{alt.type || 'Sister Shrine'}</span>
                        <span style={{ fontSize: '0.72rem', backgroundColor: '#DCFCE7', color: '#15803D', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>{alt.crowd_savings || 'Less Crowded'}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>
                        📍 {alt.distance_km} km · ⏱️ {alt.travel_time_mins} mins away · 🛣️ <span style={{ color: '#2563EB', fontWeight: 600 }}>{alt.road_connectivity || 'NH Highway Open'}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        "{alt.why_visit}"
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (showToast) {
                          showToast(`🚌 [Fleet Directive] Sister shrine rerouting suggested: Diverting passenger overflow to ${alt.name} (${alt.crowd_savings}).`);
                        }
                      }}
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.4rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Plan Tour Divert ➔
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HIMALAYA YATRA TRAVELS: PARTNER CONSOLE & DEMAND CALCULATOR (3 CORE FEATURES) */}
      <TravelAgencyConsole onOpenFleetModal={() => setShowFleetModal(true)} showToast={showToast} />

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
                <strong>AI Recommendation:</strong> Deploy at least <strong>220 buses</strong> (88% of your fleet) on the Delhi ⇄ Haridwar corridor to handle the Somvati Amavasya surge safely.
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
                            <StatusBadge
                              status={route.status === 'FULL' ? 'CRITICAL' : route.status === 'HIGH DEMAND' ? 'HIGH' : route.status === 'RETURN' ? 'PENDING' : 'NORMAL'}
                              theme="light"
                              size="xs"
                              label={route.status}
                            />
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
                            onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? updateRouteBuses(r, -1) : r))}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827', minWidth: '2.5rem', textAlign: 'center' }}>{route.buses}</span>
                          <button
                            onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? updateRouteBuses(r, 1) : r))}
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
                    const payload = fleetRoutes.map((r) => ({ id: r.id, buses: r.buses, operator: 'Himalaya Yatra Travels' }));
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
