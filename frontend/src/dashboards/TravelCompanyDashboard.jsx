import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fetchTransitNodes,
  fetchTransitNode,
  simulateTransitNode,
  dispatchLocalTransitBus,
  uploadTransitVideo,
  saveFleetSchedules,
  fetchFleetSchedules,
  fetchActiveRerouteAlert
} from '../api/api';
import TravelAgencyConsole from '../components/TravelAgencyConsole';
import StatusBadge from '../components/common/StatusBadge';

export default function TravelCompanyDashboard({
  showToast,
  externalTab
}) {
  // Transit Nodes & Active Selected Node State
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('NODE_DELHI_NDLS');
  const [activeNodeData, setActiveNodeData] = useState(null);

  // Operational State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeReroute, setActiveReroute] = useState(null);

  // Collapsible Technical Detail Drawers (Default: Closed for Field Operator Simplicity)
  const [openDrawers, setOpenDrawers] = useState({
    yolo: false,
    funnel: false,
    routes: false,
    advanced: false
  });

  const toggleDrawer = (key) => {
    setOpenDrawers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [simParams, setSimParams] = useState({
    headcountDelta: 450,
    waitingToAdd: 25,
    incomingToAdd: 20,
    reroutesToAdd: 30
  });

  // Active Corridor Route Allocations
  const [fleetRoutes, setFleetRoutes] = useState([
    { id: 'HR-01', from: 'Delhi (ISBT Kashmiri Gate)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 3, capacity: 42, forwardOccupancy: 94, returnOccupancy: 22, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-02', from: 'Dehradun (Bus Stand)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 2, capacity: 38, forwardOccupancy: 100, returnOccupancy: 35, type: 'Sleeper', status: 'FULL' },
    { id: 'HR-03', from: 'Haridwar (Har Ki Pauri)', to: 'Delhi (ISBT Kashmiri Gate)', date: 'Oct 13 (Sun)', buses: 3, capacity: 42, forwardOccupancy: 88, returnOccupancy: 26, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-04', from: 'Rishikesh (Triveni Ghat)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 1, capacity: 30, forwardOccupancy: 67, returnOccupancy: 40, type: 'Mini Bus', status: 'NORMAL' },
  ]);

  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  const notify = useCallback((msg) => {
    if (typeof showToast === 'function') {
      showToast(msg);
    }
  }, [showToast]);

  // Load all transit nodes from backend
  const loadNodes = useCallback(async (explicitId = null) => {
    try {
      const res = await fetchTransitNodes();
      if (res && Array.isArray(res.nodes) && res.nodes.length > 0) {
        setNodes(res.nodes);
        const currentTargetId = explicitId || selectedNodeIdRef.current || res.nodes[0].id || res.nodes[0].node_id;
        const matching = res.nodes.find(n => (n.id || n.node_id) === currentTargetId) || res.nodes[0];
        setActiveNodeData(matching);
        const matchedId = matching.id || matching.node_id;
        if (matchedId && matchedId !== selectedNodeIdRef.current) {
          setSelectedNodeId(matchedId);
        }
      }
    } catch (err) {
      console.warn('Could not fetch transit nodes, using existing state:', err?.message || err);
    }
  }, []);

  // Initial load and periodic synchronization
  useEffect(() => {
    loadNodes();
    const interval = setInterval(() => {
      loadNodes();
    }, 7000);

    fetchFleetSchedules().then((routes) => {
      if (routes && routes.length > 0) {
        setFleetRoutes(routes.map((r) => ({
          id: r.id,
          from: r.from_location || r.from,
          to: r.to_location || r.to,
          date: r.journey_date || r.date,
          buses: r.buses,
          capacity: r.capacity || 42,
          forwardOccupancy: r.occupancy || r.forwardOccupancy || 85,
          returnOccupancy: r.returnOccupancy || Math.round((r.occupancy || 85) * 0.35),
          type: r.bus_type || r.type || 'Volvo A/C',
          status: r.status || 'NORMAL',
        })));
      }
    }).catch(() => {});

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

    return () => {
      clearInterval(interval);
      window.removeEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
    };
  }, [loadNodes]);

  // Handle switching active transit node
  const handleSelectNode = async (nodeId) => {
    setSelectedNodeId(nodeId);
    const existing = nodes.find(n => (n.id || n.node_id) === nodeId);
    if (existing) setActiveNodeData(existing);
    try {
      const fresh = await fetchTransitNode(nodeId);
      const nodeObj = fresh?.node || fresh;
      if (nodeObj && (nodeObj.id || nodeObj.node_id)) {
        setActiveNodeData(nodeObj);
      }
    } catch (err) {
      console.warn('Failed to refresh selected node details:', err?.message);
    }
  };

  // Video Upload Ingestion Handler (Dynamic YOLO pipeline)
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress('Uploading video to YOLO neural engine...');
      const nodeTitle = activeNodeData?.name || activeNodeData?.node_name || selectedNodeId;
      notify(`🎥 Processing video feed for ${nodeTitle}...`);

      const res = await uploadTransitVideo(selectedNodeId, file, { sampleInterval: 15 });

      if (res && res.flow_analysis) {
        setUploadProgress('YOLO inference complete. Updating fleet demand & reroutes...');
        notify(`✅ Video processed! Detected ${(res.flow_analysis.confidence * 100).toFixed(1)}% confidence. Fleet demand, occupancy & reroute queues recalculated.`);
        await loadNodes(selectedNodeId);
      } else {
        notify('✅ Video uploaded and processed successfully.');
        await loadNodes(selectedNodeId);
      }
    } catch (err) {
      console.error('Video upload failed:', err);
      notify(`❌ Video analysis error: ${err.message || 'Check video format and backend connectivity.'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Dispatch Bus Action (strictly integer count for physical deployment)
  const handleDispatchBus = async (busesToDeploy = 1) => {
    try {
      setIsDispatching(true);
      const res = await dispatchLocalTransitBus(selectedNodeId, busesToDeploy);
      notify(`🚌 ${res?.message || `Dispatched ${busesToDeploy} local transit bus(es)!`}`);
      await loadNodes(selectedNodeId);
    } catch (err) {
      console.error('Dispatch failed:', err);
      notify(`❌ Dispatch failed: ${err.message || 'Server error'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Run Surge Simulation
  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const currentHeadcount = activeNodeData?.headcount ?? 1000;
      const currentWaiting = activeNodeData?.passengers_waiting ?? 30;
      const currentIncoming = activeNodeData?.expected_incoming ?? 20;
      const currentConfirmed = activeNodeData?.reroutes_confirmed ?? 40;

      const payload = {
        headcount: currentHeadcount + Number(simParams.headcountDelta || 0),
        passengers_waiting: currentWaiting + Number(simParams.waitingToAdd || 0),
        expected_incoming: currentIncoming + Number(simParams.incomingToAdd || 0),
        reroutes_confirmed: currentConfirmed + Number(simParams.reroutesToAdd || 0)
      };

      const res = await simulateTransitNode(selectedNodeId, payload);
      notify(`⚡ Injected flow surge into ${activeNodeData?.name || activeNodeData?.node_name}! Fleet demand recalculated.`);
      setShowSimModal(false);
      if (res?.node) {
        setActiveNodeData(res.node);
        setNodes(prev => prev.map(n => ((n.id || n.node_id) === (res.node.id || res.node.node_id) ? res.node : n)));
      } else {
        await loadNodes(selectedNodeId);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      notify(`❌ Simulation failed: ${err.message || 'Server error'}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Safe Normalized Active Node Data
  const currNode = activeNodeData || {};
  const nodeId = currNode.id || currNode.node_id || selectedNodeId;
  const nodeName = currNode.name || currNode.node_name || 'Pilgrimage Transit Hub';
  const region = currNode.region || 'Transit Corridor';
  const feedId = currNode.feed_id || 'FEED-LIVE';
  const cameraName = currNode.camera_name || 'Corridor Camera Feed';

  const headcount = currNode.headcount ?? currNode.observation?.people_count ?? 0;
  const inflow = currNode.inflow_per_min ?? currNode.observation?.inflow_rate_per_min ?? 0;
  const outflow = currNode.outflow_per_min ?? currNode.observation?.outflow_rate_per_min ?? 0;
  const confidence = currNode.confidence ?? (currNode.observation?.confidence_score ? currNode.observation.confidence_score * 100 : 94.5);

  const funnel = currNode.funnel || currNode.reroute_funnel || {
    offered: currNode.reroutes_offered ?? 100,
    accepted: currNode.reroutes_accepted ?? 70,
    confirmed: currNode.reroutes_confirmed ?? 55,
    waiting: currNode.passengers_waiting ?? 30,
    boarded: currNode.passengers_boarded ?? 20,
    completed: currNode.passengers_completed ?? 35
  };

  const waiting = currNode.passengers_waiting ?? funnel.waiting ?? 0;
  const incoming = currNode.expected_incoming ?? Math.round(inflow * 0.75) ?? 0;
  const expectedDemand = currNode.expected_demand ?? (waiting + incoming);
  const requiredBuses = currNode.required_buses ?? 0;
  const availableBuses = currNode.available_buses ?? 1;
  const shortageBuses = currNode.shortage_buses ?? currNode.fleet?.net_shortage ?? Math.max(0, requiredBuses - availableBuses);
  const usableCap = currNode.usable_capacity ?? currNode.usable_seat_capacity ?? 36;
  const nextDepartureMins = currNode.next_departure_mins ?? 12;
  const transitEta = currNode.transit_eta ?? '1h 30m';
  const nextHub = currNode.next_hub ?? 'Next Staging Base';

  // Capacity & Flow Ratios (Strictly Percentage Primary)
  const nominalCapacity = currNode.nominal_capacity || 2500;
  const crowdLoadPct = currNode.crowd_load_pct ?? Math.min(100, Math.max(10, Math.round((headcount / (nominalCapacity * 0.15)) * 100)));
  const totalFlow = Math.max(1, inflow + outflow);
  const inflowPct = Math.round((inflow / totalFlow) * 100);
  const outflowPct = Math.round((outflow / totalFlow) * 100);
  const waitingPressurePct = Math.round((waiting / Math.max(1, expectedDemand)) * 100);

  // Forward vs Return Occupancy Metrics
  const forwardOccupancyPct = currNode.forward_occupancy_pct ?? Math.min(100, Math.max(20, Math.round((expectedDemand / Math.max(1, availableBuses * usableCap)) * 85)));
  const returnOccupancyPct = currNode.return_occupancy_pct ?? Math.max(15, Math.min(60, Math.round(forwardOccupancyPct * 0.38)));
  const imbalancePct = forwardOccupancyPct - returnOccupancyPct;

  // Funnel conversion percentages
  const offeredBase = Math.max(1, funnel.offered || 100);
  const acceptedPct = Math.round(((funnel.accepted || 0) / offeredBase) * 100);
  const confirmedPct = Math.round(((funnel.confirmed || 0) / offeredBase) * 100);
  const waitingPct = Math.round(((funnel.waiting || 0) / offeredBase) * 100);
  const boardedPct = Math.round(((funnel.boarded || 0) / offeredBase) * 100);
  const completedPct = Math.round(((funnel.completed || 0) / offeredBase) * 100);

  // Fleet stress
  const activeFleetSeats = Math.max(1, availableBuses * usableCap);
  const fleetUtilizationPct = Math.round((expectedDemand / activeFleetSeats) * 100);
  const fleetDeficitPct = fleetUtilizationPct > 100 ? fleetUtilizationPct - 100 : 0;
  const capacityPressureStatus = shortageBuses >= 2 ? 'Critical' : shortageBuses === 1 ? 'Constrained' : 'Optimal';

  const rationale = shortageBuses > 0
    ? `Waiting pressure is at ${waitingPressurePct}% with rising incoming flow (${inflowPct}%). Deploying ${shortageBuses} bus(es) restores fleet coverage to 100%.`
    : `Fleet coverage is optimal at ${fleetUtilizationPct}% utilization (${availableBuses} deployed coach buffer).`;

  const alerts = Array.isArray(currNode.alerts) ? currNode.alerts : [];

  // Corridor Summary Stats
  const totalCorridorShortage = nodes.reduce((acc, n) => acc + (n.shortage_buses ?? n.fleet?.net_shortage ?? 0), 0);

  return (
    <div className="travel-dashboard-root" id="travel-dashboard" style={{ padding: '0.75rem 1.5rem 2.5rem', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0F172A', backgroundColor: '#F8FAFC' }}>
      
      {/* 1. COMPACT COMMAND CENTER HEADER */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Himalaya Yatra Travels · Field Fleet Command
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0F172A', margin: '0.15rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚌</span> Travel Operations Command Center
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ⚡ Test Surge Simulation
          </button>
        </div>
      </div>

      {/* 2. 5-SECOND DECISION & FLEET VERDICT CARD (HERO BANNER) */}
      <div style={{
        backgroundColor: shortageBuses > 0 ? '#FEF2F2' : '#F0FDF4',
        borderRadius: '0.75rem',
        border: shortageBuses > 0 ? '2px solid #FCA5A5' : '2px solid #BBF7D0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        boxShadow: shortageBuses > 0 ? '0 4px 16px rgba(220,38,38,0.12)' : '0 2px 8px rgba(22,163,74,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ flex: '1 1 450px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.6rem' }}>{shortageBuses > 0 ? '🚨' : '✅'}</span>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: shortageBuses > 0 ? '#DC2626' : '#16A34A',
              backgroundColor: shortageBuses > 0 ? '#FEE2E2' : '#DCFCE7',
              padding: '0.2rem 0.6rem',
              borderRadius: '0.35rem'
            }}>
              {shortageBuses > 0 ? `ACTION REQUIRED: ${shortageBuses} BUS DEFICIT` : 'FLEET OPTIMAL: CAPACITY FULLY COVERED'}
            </div>
          </div>

          <h2 style={{ margin: '0.2rem 0', fontSize: '1.35rem', fontWeight: '900', color: shortageBuses > 0 ? '#991B1B' : '#166534' }}>
            {shortageBuses > 0
              ? `Deploy ${shortageBuses} Additional Shuttle Bus to ${nodeName.split('&')[0]}`
              : `All Scheduled Departures at ${nodeName.split('&')[0]} are Fully Sized`}
          </h2>

          <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: shortageBuses > 0 ? '#7F1D1D' : '#14532D', fontWeight: '600', lineHeight: 1.4 }}>
            💡 <strong>Reason:</strong> {rationale}
          </p>
        </div>

        {/* 1-Click Action Button */}
        <div>
          {shortageBuses > 0 ? (
            <button
              type="button"
              disabled={isDispatching}
              onClick={() => handleDispatchBus(shortageBuses)}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.55rem',
                padding: '0.85rem 1.65rem',
                fontSize: '1rem',
                fontWeight: '900',
                cursor: isDispatching ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{isDispatching ? '⏳' : '🚀'}</span>
              <span>{isDispatching ? 'Deploying...' : `Deploy ${shortageBuses} Bus Now`}</span>
            </button>
          ) : (
            <div style={{
              backgroundColor: '#DCFCE7',
              color: '#166534',
              padding: '0.65rem 1.25rem',
              borderRadius: '0.5rem',
              fontWeight: '800',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              border: '1px solid #86EFAC'
            }}>
              <span>✓</span> 100% Demand Covered
            </div>
          )}
        </div>
      </div>

      {/* 3. 5 CORE HIGH-LEVEL HEALTH METERS (PERCENTAGES ONLY) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        {/* Metric 1: Crowd Load */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', padding: '0.95rem 1.15rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>👥 Crowd Load</div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: crowdLoadPct >= 80 ? '#DC2626' : '#0F172A', marginTop: '0.15rem' }}>{crowdLoadPct}%</div>
          <div style={{ fontSize: '0.72rem', color: crowdLoadPct >= 80 ? '#DC2626' : '#059669', fontWeight: '700' }}>
            {crowdLoadPct >= 80 ? '🔴 High Concourse Density' : crowdLoadPct >= 50 ? '🟡 Moderate Rush' : '🟢 Normal'}
          </div>
        </div>

        {/* Metric 2: Net Inflow */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', padding: '0.95rem 1.15rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>🌊 Inflow Velocity</div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#2563EB', marginTop: '0.15rem' }}>{inflowPct}%</div>
          <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: '700' }}>
            {inflowPct > 50 ? 'Inflow Exceeds Outflow' : 'Balanced Transit'}
          </div>
        </div>

        {/* Metric 3: Forward Occupancy */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', padding: '0.95rem 1.15rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>🚌 Forward Occupancy</div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: forwardOccupancyPct >= 85 ? '#DC2626' : '#D97706', marginTop: '0.15rem' }}>{forwardOccupancyPct}%</div>
          <div style={{ fontSize: '0.72rem', color: forwardOccupancyPct >= 85 ? '#DC2626' : '#D97706', fontWeight: '700' }}>
            {forwardOccupancyPct >= 85 ? '🔴 Near Capacity' : '🟢 Normal'}
          </div>
        </div>

        {/* Metric 4: Return Occupancy */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', padding: '0.95rem 1.15rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>🔄 Return Occupancy</div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#0284C7', marginTop: '0.15rem' }}>{returnOccupancyPct}%</div>
          <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: '700' }}>
            Available Return Seats
          </div>
        </div>

        {/* Metric 5: Next Departure ETA */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', padding: '0.95rem 1.15rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>⏱️ Next Departure</div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#0F172A', marginTop: '0.15rem' }}>{nextDepartureMins}m</div>
          <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: '700' }}>
            To {nextHub.split(' ')[0]} (ETA: {transitEta})
          </div>
        </div>
      </div>

      {/* 4. LIVE PILGRIMAGE CORRIDOR (6-NODE VISUAL ROUTE BAR) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>🛣️</span> Pilgrimage Corridor Route Status (Delhi ➔ Sonprayag)
            </h3>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Select any station to inspect its live status and trigger shuttle deployment.
            </p>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
            Corridor Shortage: <strong style={{ color: totalCorridorShortage > 0 ? '#DC2626' : '#16A34A' }}>{totalCorridorShortage > 0 ? `${totalCorridorShortage} Buses Needed` : '0 (Optimal)'}</strong>
          </div>
        </div>

        {/* 6 Hub Stepper Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.65rem'
        }}>
          {nodes.map((node, sIdx) => {
            const id = node.id || node.node_id;
            const name = node.name || node.node_name || id;
            const isSelected = id === selectedNodeId;
            const nodeLoad = node.crowd_load_pct ?? 70;
            const nodeShortage = node.shortage_buses ?? node.fleet?.net_shortage ?? 0;
            const indicatorEmoji = nodeShortage > 0 ? '🔴' : nodeLoad >= 75 ? '🟡' : '🟢';

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectNode(id)}
                style={{
                  backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                  color: '#0F172A',
                  border: isSelected ? '2px solid #D97706' : '1px solid #E2E8F0',
                  borderRadius: '0.6rem',
                  padding: '0.75rem 0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 12px rgba(217,119,6,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isSelected ? '#92400E' : '#64748B' }}>
                    {sIdx + 1}. {name.split(' ')[0]}
                  </span>
                  <span>{indicatorEmoji}</span>
                </div>

                <div style={{ fontSize: '0.84rem', fontWeight: '800', color: isSelected ? '#92400E' : '#0F172A', lineHeight: 1.2 }}>
                  {name.split('&')[0]}
                </div>

                <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.25rem' }}>
                  <span>Load: <strong>{nodeLoad}%</strong></span>
                  <strong style={{ color: nodeShortage > 0 ? '#DC2626' : '#16A34A' }}>
                    {nodeShortage > 0 ? `-${nodeShortage} Bus` : '✓ OK'}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. SELECTED STATION FIELD OPERATIONS CARD (CLEAN & SIMPLE) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase' }}>
            Selected Station Operational View
          </div>
          <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.25rem', fontWeight: '900', color: '#0F172A' }}>
            {nodeName} ({region})
          </h3>
          <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>
            Status: <strong style={{ color: capacityPressureStatus === 'Critical' ? '#DC2626' : '#16A34A' }}>{capacityPressureStatus}</strong> · Waiting Pressure: <strong>{waitingPressurePct}%</strong> · Forward Rush: <strong>{forwardOccupancyPct}%</strong>
          </div>
        </div>

        {/* Ingest Video Button */}
        <label style={{
          backgroundColor: isUploading ? '#94A3B8' : '#0284C7',
          color: '#FFFFFF',
          borderRadius: '0.5rem',
          padding: '0.65rem 1.15rem',
          fontSize: '0.86rem',
          fontWeight: '700',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          boxShadow: '0 2px 5px rgba(2,132,199,0.25)'
        }}>
          <span>{isUploading ? '⏳' : '📹'}</span>
          {isUploading ? 'Analyzing Video...' : 'Ingest Video for YOLO Analysis'}
          <input
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            disabled={isUploading}
            onChange={handleVideoUpload}
          />
        </label>
      </div>

      {/* 6. OPERATIONAL ALERTS BANNER (ONLY MEANINGFUL ALERTS) */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {alerts.map((alert, idx) => {
            const isCrit = alert.severity === 'CRITICAL';
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isCrit ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${isCrit ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: '0.55rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.84rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: '800', color: isCrit ? '#991B1B' : '#92400E' }}>
                    {isCrit ? '🚨' : '⚠️'} ALERT: {alert.message}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Recommended Action: <strong>{alert.action || 'Deploy standby local bus'}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EXPANDABLE TECHNICAL DETAILS & ANALYTICS DRAWERS (COLLAPSED BY DEFAULT) */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* DRAWER 1: YOLO Video & Camera Feed Details */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleDrawer('yolo')}
            style={{ width: '100%', padding: '0.85rem 1.25rem', backgroundColor: '#FFFFFF', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#334155' }}>
              📁 Technical Details: YOLO Neural Inference &amp; Camera Feed Telemetry
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0284C7' }}>
              {openDrawers.yolo ? '▲ Hide Details' : '▼ Show Details'}
            </span>
          </button>
          {openDrawers.yolo && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '0.82rem', color: '#475569' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div><strong>Feed Identifier:</strong> {feedId}</div>
                <div><strong>Camera Name:</strong> {cameraName}</div>
                <div><strong>Model Confidence:</strong> {Number(confidence).toFixed(1)}% (Ultralytics YOLO Class 0)</div>
                <div><strong>Privacy Protocol:</strong> Aggregate count only (No facial biometrics)</div>
              </div>
            </div>
          )}
        </div>

        {/* DRAWER 2: 6-Stage Reroute Funnel Progression */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleDrawer('funnel')}
            style={{ width: '100%', padding: '0.85rem 1.25rem', backgroundColor: '#FFFFFF', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#334155' }}>
              📁 Technical Details: 6-Stage Corridor Reroute Funnel
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#7C3AED' }}>
              {openDrawers.funnel ? '▲ Hide Funnel' : '▼ Show Funnel'}
            </span>
          </button>
          {openDrawers.funnel && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.45rem', textAlign: 'center' }}>
                {[
                  { label: 'Offered', pct: '100%', sub: 'Baseline', color: '#64748B', bg: '#F1F5F9' },
                  { label: 'Accepted', pct: `${acceptedPct}%`, sub: 'Interest', color: '#0284C7', bg: '#E0F2FE' },
                  { label: 'Confirmed', pct: `${confirmedPct}%`, sub: 'Committed', color: '#7C3AED', bg: '#F5F3FF' },
                  { label: 'Waiting', pct: `${waitingPct}%`, sub: 'Needs Bus', color: '#D97706', bg: '#FEF3C7' },
                  { label: 'Boarded', pct: `${boardedPct}%`, sub: 'En Route', color: '#2563EB', bg: '#DBEAFE' },
                  { label: 'Completed', pct: `${completedPct}%`, sub: 'Cleared', color: '#059669', bg: '#D1FAE5' }
                ].map((s, idx) => (
                  <div key={idx} style={{ backgroundColor: s.bg, padding: '0.6rem 0.35rem', borderRadius: '0.4rem', border: `1px solid ${s.color}20` }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: s.color }}>{s.label}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '900', color: s.color }}>{s.pct}</div>
                    <div style={{ fontSize: '0.65rem', color: s.color, opacity: 0.85 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DRAWER 3: Scheduled Fleet Routes & Occupancy Adjuster */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleDrawer('routes')}
            style={{ width: '100%', padding: '0.85rem 1.25rem', backgroundColor: '#FFFFFF', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#334155' }}>
              📁 Operations: Scheduled Coach Routes &amp; Fleet Allocation Matrix ({fleetRoutes.length} Routes)
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#D97706' }}>
              {openDrawers.routes ? '▲ Hide Routes' : '▼ Show Routes'}
            </span>
          </button>
          {openDrawers.routes && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {fleetRoutes.map((r, idx) => (
                  <div key={r.id} style={{ border: '1px solid #E2E8F0', borderRadius: '0.5rem', padding: '0.85rem', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '800' }}>
                      <span style={{ color: '#D97706' }}>{r.id}</span>
                      <span style={{ color: r.forwardOccupancy >= 90 ? '#DC2626' : '#16A34A' }}>Fwd: {r.forwardOccupancy}% · Ret: {r.returnOccupancy}%</span>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', margin: '0.2rem 0' }}>{r.from.split('(')[0]} → {r.to.split('(')[0]}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Assigned: <strong>{r.buses} Coaches</strong> ({r.buses * r.capacity} seats)</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DRAWER 4: Advanced Scenario Simulator & Dynamic Pricing Console */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.65rem', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleDrawer('advanced')}
            style={{ width: '100%', padding: '0.85rem 1.25rem', backgroundColor: '#FFFFFF', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#334155' }}>
              📁 Analytics: Multi-Scenario Matrix, Route Simulator &amp; Revenue Models
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#D97706' }}>
              {openDrawers.advanced ? '▲ Hide Advanced Console' : '▼ Show Advanced Console'}
            </span>
          </button>
          {openDrawers.advanced && (
            <div style={{ padding: '1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <TravelAgencyConsole onOpenFleetModal={() => setShowFleetModal(true)} showToast={showToast} />
            </div>
          )}
        </div>

      </div>

      {/* 8. SURGE SIMULATION MODAL */}
      {showSimModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.75rem', maxWidth: '440px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '800' }}>⚡ Test Corridor Surge</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748B' }}>
              Simulate an influx at <strong>{nodeName}</strong> to verify real-time alert triggers and bus recommendation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.2rem' }}>Surge Crowd Increase</label>
                <input
                  type="number"
                  value={simParams.headcountDelta}
                  onChange={e => setSimParams({ ...simParams, headcountDelta: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.2rem' }}>Waiting at Depot</label>
                <input
                  type="number"
                  value={simParams.waitingToAdd}
                  onChange={e => setSimParams({ ...simParams, waitingToAdd: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setShowSimModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: '700' }}>Cancel</button>
              <button type="button" disabled={isSimulating} onClick={handleRunSimulation} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#D97706', color: '#FFF', border: 'none', borderRadius: '0.4rem', fontWeight: '800', cursor: 'pointer' }}>
                {isSimulating ? 'Simulating...' : 'Apply Surge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. FLEET SCHEDULE ADJUSTMENT MODAL */}
      {showFleetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <div style={{ background: 'linear-gradient(135deg, #92400E, #D97706)', padding: '1.5rem 2rem', borderRadius: '1rem 1rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: '#FFF', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  🚌 Fleet Schedule Allocation Panel
                </h2>
                <p style={{ margin: 0, color: '#FDE68A', fontSize: '0.92rem' }}>
                  Adjust scheduled coach allocations across active Char Dham corridors.
                </p>
              </div>
              <button onClick={() => setShowFleetModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fleetRoutes.map((route, idx) => (
                  <div key={route.id} style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#6B7280', background: '#E5E7EB', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{route.id}</span>
                        <p style={{ margin: '0.25rem 0 0.15rem', fontWeight: 'bold', color: '#111827', fontSize: '1rem' }}>📍 {route.from} → {route.to}</p>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>📅 {route.date} · 🚌 {route.type}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: route.forwardOccupancy >= 90 ? '#DC2626' : '#16A34A' }}>Fwd: {route.forwardOccupancy}% · Ret: {route.returnOccupancy}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Corridor Occupancy</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: '0.5rem', padding: '0.65rem 1rem', border: '1px solid #E5E7EB' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>Assigned Coaches:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: Math.max(1, r.buses - 1) } : r))} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', cursor: 'pointer' }}>−</button>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', minWidth: '2rem', textAlign: 'center' }}>{route.buses}</span>
                        <button onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: r.buses + 1 } : r))} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #D97706', background: '#FEF3C7', fontWeight: 'bold', cursor: 'pointer', color: '#92400E' }}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '1rem 2rem 1.5rem', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFleetModal(false)} style={{ padding: '0.65rem 1.5rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const payload = fleetRoutes.map((r) => ({ id: r.id, buses: r.buses, operator: 'Himalaya Yatra Travels' }));
                    await saveFleetSchedules(payload);
                    setShowFleetModal(false);
                    notify('✅ Fleet schedule saved & synchronized with Hotel & Government dashboards.');
                  } catch (err) {
                    notify('⚠️ Saved locally for this session.');
                    setShowFleetModal(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ padding: '0.65rem 1.75rem', backgroundColor: isSaving ? '#9CA3AF' : '#D97706', color: '#FFF', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? '⏳ Saving...' : '✅ Save & Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
