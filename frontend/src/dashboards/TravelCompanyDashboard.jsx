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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeReroute, setActiveReroute] = useState(null);

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
  const capacityPressureStatus = shortageBuses >= 2 ? 'CRITICAL' : shortageBuses === 1 ? 'CONSTRAINED' : 'OPTIMAL';

  const rationale = shortageBuses > 0
    ? `Additional capacity recommended: waiting pressure is at ${waitingPressurePct}% with rising incoming flow (${inflowPct}%). Deploying ${shortageBuses} bus(es) restores fleet coverage to 100%.`
    : `Fleet coverage is optimal at ${fleetUtilizationPct}% utilization (${availableBuses} deployed coach buffer).`;

  const alerts = Array.isArray(currNode.alerts) ? currNode.alerts : [];

  // Corridor Summary Stats
  const totalCorridorShortage = nodes.reduce((acc, n) => acc + (n.shortage_buses ?? n.fleet?.net_shortage ?? 0), 0);
  const avgCrowdLoad = nodes.length > 0 ? Math.round(nodes.reduce((acc, n) => acc + (n.crowd_load_pct ?? 65), 0) / nodes.length) : 74;

  return (
    <div className="travel-dashboard-root" id="travel-dashboard" style={{ padding: '0.75rem 1.5rem 2.5rem', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0F172A', backgroundColor: '#F8FAFC' }}>
      
      {/* 1. TOP OPERATIONS COMMAND HEADER */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.74rem', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
            Himalaya Yatra Travels · Central Fleet Operations
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚌</span> Travel Operations Command Center
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.86rem' }}>
            Observe crowd concentration → Predict next-hour demand → Sizing &amp; Forward/Return balance → Deploy local shuttles.
          </p>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowFleetModal(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.55rem 1rem',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            ⚙️ Route Allocations ({fleetRoutes.length})
          </button>

          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.55rem 0.95rem',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ⚡ Simulate Surge
          </button>
        </div>
      </div>

      {/* Active State Emergency Directive Banner (if triggered) */}
      {activeReroute?.is_active && (
        <div style={{
          marginBottom: '1rem',
          padding: '1.15rem 1.4rem',
          background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
          border: '1px solid #EF4444',
          borderRadius: '0.65rem',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🚨</span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.98rem' }}>
                STATE EMERGENCY DIRECTIVE: Divert Fleet on {activeReroute.source_site || 'Char Dham Corridor'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#FEE2E2', marginTop: '0.15rem' }}>
                {activeReroute.message || 'Capacity override active. Re-route forward buses to sister shrine circuits.'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            Sister Shrines: <strong>{activeReroute.target_sites?.join(', ') || 'Ukhimath, Triyuginarayan'}</strong>
          </div>
        </div>
      )}

      {/* 2. TOP KPI STRIP (8 COMPACT PERCENTAGE & STATUS INDICATORS) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: '0.65rem',
        marginBottom: '1.25rem'
      }}>
        {/* KPI 1: Crowd Load % */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Crowd Load</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: crowdLoadPct >= 80 ? '#DC2626' : '#0F172A', marginTop: '0.15rem' }}>{crowdLoadPct}%</div>
          <div style={{ fontSize: '0.68rem', color: crowdLoadPct >= 80 ? '#DC2626' : '#059669', fontWeight: '700' }}>{crowdLoadPct >= 80 ? 'High' : crowdLoadPct >= 50 ? 'Moderate' : 'Low'}</div>
        </div>

        {/* KPI 2: Incoming Flow % */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Incoming Flow</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#2563EB', marginTop: '0.15rem' }}>{inflowPct}%</div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Outflow: {outflowPct}%</div>
        </div>

        {/* KPI 3: Waiting Pressure % */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Waiting Pressure</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#D97706', marginTop: '0.15rem' }}>{waitingPressurePct}%</div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>At Staging Depot</div>
        </div>

        {/* KPI 4: Forward Occupancy % */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Forward Occupancy</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: forwardOccupancyPct >= 85 ? '#DC2626' : '#D97706', marginTop: '0.15rem' }}>{forwardOccupancyPct}%</div>
          <div style={{ fontSize: '0.68rem', color: forwardOccupancyPct >= 85 ? '#DC2626' : '#D97706', fontWeight: '700' }}>{forwardOccupancyPct >= 85 ? 'High Demand' : 'Normal'}</div>
        </div>

        {/* KPI 5: Return Occupancy % */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Return Occupancy</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0284C7', marginTop: '0.15rem' }}>{returnOccupancyPct}%</div>
          <div style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: '700' }}>Available Space</div>
        </div>

        {/* KPI 6: Fleet Utilization % */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Fleet Utilization</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: fleetUtilizationPct > 100 ? '#DC2626' : '#16A34A', marginTop: '0.15rem' }}>{fleetUtilizationPct}%</div>
          <div style={{ fontSize: '0.68rem', color: shortageBuses > 0 ? '#DC2626' : '#16A34A', fontWeight: '700' }}>{shortageBuses > 0 ? `+${fleetDeficitPct}% Deficit` : 'Covered'}</div>
        </div>

        {/* KPI 7: Capacity Pressure Status */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Capacity Pressure</div>
          <div style={{ fontSize: '1.15rem', fontWeight: '900', color: capacityPressureStatus === 'CRITICAL' ? '#DC2626' : capacityPressureStatus === 'CONSTRAINED' ? '#D97706' : '#16A34A', marginTop: '0.35rem' }}>
            {capacityPressureStatus}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Corridor Status</div>
        </div>

        {/* KPI 8: Active Alerts */}
        <div style={{ backgroundColor: alerts.length > 0 ? '#FEF2F2' : '#FFFFFF', borderRadius: '0.6rem', padding: '0.85rem 1rem', border: alerts.length > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.68rem', color: alerts.length > 0 ? '#991B1B' : '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Active Alerts</div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: alerts.length > 0 ? '#DC2626' : '#16A34A', marginTop: '0.15rem' }}>{alerts.length}</div>
          <div style={{ fontSize: '0.68rem', color: alerts.length > 0 ? '#DC2626' : '#16A34A', fontWeight: '700' }}>{alerts.length > 0 ? 'Action Needed' : 'Nominal'}</div>
        </div>
      </div>

      {/* 3. LIVE PILGRIMAGE CORRIDOR (CENTRAL VISUAL STEPPER) */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>🛣️</span> Live Pilgrimage Corridor Route Sequence
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Sequential transit flow from interstate gateway to sacred shrine base. Select any hub to view live telemetry &amp; deployment options.
            </p>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: '600' }}>
            Corridor Length: <strong>480 km</strong> · Fleet Shortage: <strong style={{ color: totalCorridorShortage > 0 ? '#DC2626' : '#16A34A' }}>{totalCorridorShortage > 0 ? `${totalCorridorShortage} Buses` : '0 (Optimal)'}</strong>
          </div>
        </div>

        {/* Stepper Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.65rem'
        }}>
          {nodes.map((node, sIdx) => {
            const id = node.id || node.node_id;
            const name = node.name || node.node_name || id;
            const isSelected = id === selectedNodeId;
            const nodeLoad = node.crowd_load_pct ?? 70;
            const nodeShortage = node.shortage_buses ?? node.fleet?.net_shortage ?? 0;
            const nodeStatus = nodeShortage >= 2 ? 'Critical' : nodeShortage === 1 ? 'Busy' : 'Normal';

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectNode(id)}
                style={{
                  backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                  color: '#0F172A',
                  border: isSelected ? '2px solid #D97706' : '1px solid #E2E8F0',
                  borderTop: isSelected ? '4px solid #D97706' : '1px solid #E2E8F0',
                  borderRadius: '0.65rem',
                  padding: '0.85rem 0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 12px rgba(217,119,6,0.18)' : '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    backgroundColor: isSelected ? '#D97706' : '#E2E8F0',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '0.25rem'
                  }}>
                    {sIdx + 1}. {node.type?.includes('rail') ? '🚉' : node.type?.includes('bus') ? '🚏' : '⛰️'}
                  </span>
                  <StatusBadge
                    status={nodeStatus === 'Critical' ? 'CRITICAL' : nodeStatus === 'Busy' ? 'HIGH' : 'NORMAL'}
                    theme="light"
                    size="xs"
                    label={nodeStatus}
                  />
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: isSelected ? '#92400E' : '#0F172A', lineHeight: 1.25, margin: '0.2rem 0' }}>
                  {name.split('&')[0]}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '0.35rem' }}>
                  <span>Load: <strong>{nodeLoad}%</strong></span>
                  <span style={{ color: nodeShortage > 0 ? '#DC2626' : '#16A34A', fontWeight: '700' }}>
                    {nodeShortage > 0 ? `⚠️ -${nodeShortage} Bus` : '✓ Sized'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN 2-COLUMN OPERATIONAL WORKSPACE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1.05fr)',
        gap: '1.25rem',
        alignItems: 'start',
        marginBottom: '1.25rem'
      }}>
        
        {/* LEFT COLUMN: SELECTED NODE YOLO TELEMETRY + NEXT-HOUR + REROUTE FUNNEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card A: Selected Node + YOLO Telemetry & Dynamic Ingestion */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Camera Feed · {feedId} ({cameraName})
                </div>
                <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.25rem', fontWeight: '900', color: '#0F172A' }}>
                  {nodeName}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {region} · Aggregate Non-Biometric Flow Mode
                </div>
              </div>

              {/* Direct Video Upload Trigger */}
              <label style={{
                backgroundColor: isUploading ? '#94A3B8' : '#0284C7',
                color: '#FFFFFF',
                borderRadius: '0.5rem',
                padding: '0.55rem 1.05rem',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 5px rgba(2,132,199,0.25)',
                transition: 'all 0.15s ease'
              }}>
                <span>{isUploading ? '⏳' : '📹'}</span>
                {isUploading ? 'Analyzing Video...' : 'Upload Video to Node Feed'}
                <input
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  disabled={isUploading}
                  onChange={handleVideoUpload}
                />
              </label>
            </div>

            {isUploading && uploadProgress && (
              <div style={{ backgroundColor: '#E0F2FE', border: '1px solid #7DD3FC', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#0369A1', fontSize: '0.85rem', fontWeight: '600' }}>
                🔄 {uploadProgress}
              </div>
            )}

            {/* 4 Core Percentage Indicators */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.65rem',
              marginBottom: '1rem'
            }}>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Crowd Load</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: crowdLoadPct >= 80 ? '#DC2626' : '#0F172A', marginTop: '0.15rem' }}>{crowdLoadPct}%</div>
                <div style={{ fontSize: '0.68rem', color: crowdLoadPct >= 80 ? '#DC2626' : '#059669', fontWeight: '700' }}>{crowdLoadPct >= 80 ? 'High' : 'Normal'}</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Inflow / Outflow</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0F172A', marginTop: '0.15rem' }}>
                  <span style={{ color: '#2563EB' }}>{inflowPct}%</span> / <span style={{ color: '#64748B' }}>{outflowPct}%</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: '600' }}>{inflowPct > 50 ? 'Net Inflow Rush' : 'Balanced'}</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Waiting Pressure</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#D97706', marginTop: '0.15rem' }}>{waitingPressurePct}%</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Staging Depot</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>CV Confidence</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0284C7', marginTop: '0.15rem' }}>{Number(confidence).toFixed(0)}%</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>YOLO (Class 0)</div>
              </div>
            </div>

            {/* Next-Hour Intelligence Card */}
            <div style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '0.55rem',
              border: '1px solid #BFDBFE',
              padding: '0.85rem 1.15rem',
              fontSize: '0.82rem',
              color: '#1E40AF',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  ⏱️ <strong>Upcoming Departure:</strong> In <strong>{nextDepartureMins} mins</strong> to {nextHub} (Transit ETA: <strong>{transitEta}</strong>)
                </div>
                <div>
                  📈 <strong>Next-Hour Demand Level:</strong> <strong style={{ color: '#1E40AF' }}>{crowdLoadPct >= 80 ? 'HIGH SURGE' : 'MODERATE'}</strong>
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#3B82F6', borderTop: '1px dashed #BFDBFE', paddingTop: '0.35rem' }}>
                Forward trend: <strong>+35% Rush Expected</strong> · Return flow: <strong>Available Capacity</strong>
              </div>
            </div>
          </div>

          {/* Card B: Reroute Intelligence Funnel */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>
                  🔄 6-Stage Corridor Reroute Funnel
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Tracks pilgrim progression through rerouting offers without overcounting tentative accepts.
                </p>
              </div>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                color: '#7C3AED',
                backgroundColor: '#F5F3FF',
                padding: '0.25rem 0.6rem',
                borderRadius: '0.35rem',
                border: '1px solid #DDD6FE'
              }}>
                Clearance: {completedPct}%
              </span>
            </div>

            {/* Visual 6 Stages */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '0.45rem',
              backgroundColor: '#F8FAFC',
              padding: '0.75rem',
              borderRadius: '0.65rem',
              border: '1px solid #E2E8F0'
            }}>
              {[
                { label: 'Offered', pct: '100%', sub: 'Baseline', color: '#64748B', bg: '#F1F5F9' },
                { label: 'Accepted', pct: `${acceptedPct}%`, sub: 'Interest', color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Confirmed', pct: `${confirmedPct}%`, sub: 'Committed', color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Waiting', pct: `${waitingPct}%`, sub: 'Needs Bus', color: '#D97706', bg: '#FEF3C7' },
                { label: 'Boarded', pct: `${boardedPct}%`, sub: 'En Route', color: '#2563EB', bg: '#DBEAFE' },
                { label: 'Completed', pct: `${completedPct}%`, sub: 'Cleared', color: '#059669', bg: '#D1FAE5' }
              ].map((stage, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    backgroundColor: stage.bg,
                    borderRadius: '0.45rem',
                    padding: '0.6rem 0.4rem',
                    textAlign: 'center',
                    border: `1px solid ${stage.color}20`
                  }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: '800', color: stage.color, textTransform: 'uppercase' }}>
                    {stage.label}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: stage.color, marginTop: '0.15rem' }}>
                    {stage.pct}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: stage.color, opacity: 0.85 }}>
                    {stage.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: FORWARD/RETURN OCCUPANCY + ACTION REQUIRED + ALERTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card C: Forward + Return Occupancy & Imbalance */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>
                ⇄ Forward vs Return Occupancy Balance
              </h3>
              <StatusBadge
                status={imbalancePct >= 40 ? 'HIGH' : 'OPTIMAL'}
                theme="light"
                size="xs"
                label={imbalancePct >= 40 ? `+${imbalancePct}% Imbalance` : 'Balanced'}
              />
            </div>

            {/* Progress Bars for Forward & Return */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.85rem' }}>
              {/* Forward */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>FORWARD CORRIDOR (Inbound to Sacred Shrine):</span>
                  <strong style={{ color: forwardOccupancyPct >= 80 ? '#DC2626' : '#D97706' }}>{forwardOccupancyPct}% — High Demand</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${forwardOccupancyPct}%`, height: '100%', backgroundColor: forwardOccupancyPct >= 80 ? '#DC2626' : '#D97706', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Return */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>RETURN CORRIDOR (Outbound to Gateways):</span>
                  <strong style={{ color: '#0284C7' }}>{returnOccupancyPct}% — Available Capacity</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${returnOccupancyPct}%`, height: '100%', backgroundColor: '#0284C7', borderRadius: '4px' }} />
                </div>
              </div>
            </div>

            {/* Imbalance notice */}
            <div style={{
              backgroundColor: imbalancePct >= 40 ? '#FFFBEB' : '#F0FDF4',
              border: `1px solid ${imbalancePct >= 40 ? '#FDE68A' : '#BBF7D0'}`,
              borderRadius: '0.5rem',
              padding: '0.65rem 0.85rem',
              fontSize: '0.78rem',
              color: imbalancePct >= 40 ? '#92400E' : '#166534',
              lineHeight: 1.4
            }}>
              {imbalancePct >= 40 ? (
                <>⚖️ <strong>Capacity Imbalance:</strong> Forward leg outpaces return by <strong>+{imbalancePct}%</strong>. Suggest offering dynamic return fare discounts or holding return coaches for evening temple exodus.</>
              ) : (
                <>✓ Forward and return passenger flows are evenly distributed across active schedule.</>
              )}
            </div>
          </div>

          {/* Card D: Action Required & Bus Deployment */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: shortageBuses > 0 ? '2px solid #FCA5A5' : '1px solid #BBF7D0',
            padding: '1.25rem 1.5rem',
            boxShadow: shortageBuses > 0 ? '0 4px 14px rgba(220,38,38,0.1)' : '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: shortageBuses > 0 ? '#DC2626' : '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fleet Sizing Recommendation
              </div>
              <StatusBadge
                status={shortageBuses > 0 ? 'CRITICAL' : 'OPTIMAL'}
                theme="light"
                size="xs"
                label={shortageBuses > 0 ? `🚨 ${shortageBuses} BUS SHORTAGE` : '✓ 100% SIZED'}
              />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: '900', color: shortageBuses > 0 ? '#991B1B' : '#166534' }}>
              {shortageBuses > 0 ? `Deploy ${shortageBuses} Additional Shuttle Bus(es)` : 'Fleet is Currently Sized to Demand'}
            </h3>

            {/* Sizing Status Breakdown */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '0.5rem',
              padding: '0.75rem 0.95rem',
              border: '1px solid #E2E8F0',
              fontSize: '0.8rem',
              marginBottom: '0.85rem',
              lineHeight: 1.5
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Active Fleet on Hub:</span>
                <strong>{availableBuses} Coach(es) ({availableBuses * usableCap} Usable Seats)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#64748B' }}>Required Fleet Allocation:</span>
                <strong>{requiredBuses} Coaches ({requiredBuses * usableCap} Seats)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '0.35rem' }}>
                <span style={{ color: '#0F172A', fontWeight: '700' }}>Fleet Utilization Stress:</span>
                <strong style={{ color: fleetUtilizationPct > 100 ? '#DC2626' : '#16A34A' }}>{fleetUtilizationPct}%</strong>
              </div>
            </div>

            {/* WHY Rationale */}
            <div style={{
              backgroundColor: shortageBuses > 0 ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${shortageBuses > 0 ? '#FECACA' : '#BBF7D0'}`,
              borderRadius: '0.5rem',
              padding: '0.75rem 0.95rem',
              marginBottom: '1rem',
              fontSize: '0.84rem',
              color: shortageBuses > 0 ? '#991B1B' : '#166534',
              fontWeight: '600',
              lineHeight: 1.4
            }}>
              💡 <strong>WHY:</strong> {rationale}
            </div>

            {/* Direct Deployment Action Button */}
            <button
              type="button"
              disabled={isDispatching}
              onClick={() => handleDispatchBus(Math.max(1, shortageBuses || 1))}
              style={{
                width: '100%',
                backgroundColor: shortageBuses > 0 ? '#DC2626' : '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.85rem 1.25rem',
                fontSize: '0.96rem',
                fontWeight: '900',
                cursor: isDispatching ? 'not-allowed' : 'pointer',
                boxShadow: shortageBuses > 0 ? '0 4px 14px rgba(220,38,38,0.3)' : '0 4px 14px rgba(217,119,6,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{isDispatching ? '⏳' : '🚀'}</span>
              <span>{isDispatching ? 'Deploying...' : `Deploy ${Math.max(1, shortageBuses || 1)} Shuttle Bus(es) to ${nodeName.split('&')[0]}`}</span>
            </button>
          </div>

          {/* Card E: Operational Alerts with Explanations */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.94rem', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🚨</span> Meaningful Operational Alerts ({alerts.length})
            </h4>

            {alerts.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #BBF7D0' }}>
                ✓ No active alerts for {nodeName}. Operations are running smoothly.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {alerts.map((alert, aIdx) => {
                  const isCrit = alert.severity === 'CRITICAL';
                  return (
                    <div
                      key={aIdx}
                      style={{
                        backgroundColor: isCrit ? '#FEF2F2' : '#FFFBEB',
                        border: `1px solid ${isCrit ? '#FCA5A5' : '#FDE68A'}`,
                        borderRadius: '0.5rem',
                        padding: '0.75rem 0.95rem',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ fontWeight: '800', color: isCrit ? '#991B1B' : '#92400E', marginBottom: '0.2rem' }}>
                        {isCrit ? '🚨' : '⚠️'} {alert.message}
                      </div>
                      <div style={{ color: '#64748B', fontSize: '0.75rem' }}>
                        Operational Action: <strong>{alert.action || 'Deploy standby local fleet'}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 5. EXPANDABLE ADVANCED OPERATIONS / ANALYTICS DRAWER */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: '100%',
            backgroundColor: '#FFFFFF',
            border: 'none',
            padding: '1.15rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📊</span> Advanced Operations: Multi-Scenario Matrix, Route Simulator &amp; Dynamic Pricing
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
              Deep-dive operational tools: Comparative deployment scenarios, highway corridor map, and revenue/fare calculators.
            </div>
          </div>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: '800',
            color: '#D97706',
            backgroundColor: '#FEF3C7',
            padding: '0.35rem 0.75rem',
            borderRadius: '0.4rem'
          }}>
            {showAdvanced ? '▲ Hide Advanced Operations' : '▼ Expand Advanced Operations'}
          </span>
        </button>

        {showAdvanced && (
          <div style={{ borderTop: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', backgroundColor: '#F8FAFC' }}>
            <TravelAgencyConsole onOpenFleetModal={() => setShowFleetModal(true)} showToast={showToast} />
          </div>
        )}
      </div>

      {/* 6. SURGE SIMULATION MODAL */}
      {showSimModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            maxWidth: '480px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '800' }}>
              ⚡ Simulate Flow &amp; Passenger Surge
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748B' }}>
              Inject a sudden surge into <strong>{nodeName}</strong> to evaluate dynamic fleet auto-scaling and occupancy recalculations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Headcount Surge (+passengers)
                </label>
                <input
                  type="number"
                  value={simParams.headcountDelta}
                  onChange={e => setSimParams({ ...simParams, headcountDelta: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Waiting at Depot (+passengers)
                  </label>
                  <input
                    type="number"
                    value={simParams.waitingToAdd}
                    onChange={e => setSimParams({ ...simParams, waitingToAdd: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Incoming Inflow (+passengers)
                  </label>
                  <input
                    type="number"
                    value={simParams.incomingToAdd}
                    onChange={e => setSimParams({ ...simParams, incomingToAdd: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  New Reroutes Diverted to Node
                </label>
                <input
                  type="number"
                  value={simParams.reroutesToAdd}
                  onChange={e => setSimParams({ ...simParams, reroutesToAdd: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                style={{
                  padding: '0.55rem 1rem',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '0.4rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSimulating}
                onClick={handleRunSimulation}
                style={{
                  padding: '0.55rem 1.25rem',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.4rem',
                  fontWeight: '800',
                  cursor: isSimulating ? 'not-allowed' : 'pointer'
                }}
              >
                {isSimulating ? 'Simulating...' : 'Apply Surge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. ROUTE ALLOCATIONS MODAL */}
      {showFleetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #92400E, #D97706)', padding: '1.5rem 2rem', borderRadius: '1rem 1rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: '#FFF', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  🚌 Fleet Schedule Allocation Panel
                </h2>
                <p style={{ margin: 0, color: '#FDE68A', fontSize: '0.95rem' }}>
                  Manage scheduled coach allocations and balance forward/return occupancy.
                </p>
              </div>
              <button onClick={() => setShowFleetModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fleetRoutes.map((route, idx) => (
                  <div key={route.id} style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#6B7280', background: '#E5E7EB', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{route.id}</span>
                        <p style={{ margin: '0.25rem 0 0.15rem', fontWeight: 'bold', color: '#111827', fontSize: '1rem' }}>
                          📍 {route.from} → {route.to}
                        </p>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>📅 {route.date} · 🚌 {route.type}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: route.forwardOccupancy >= 90 ? '#DC2626' : '#16A34A' }}>
                          Forward: {route.forwardOccupancy}% · Return: {route.returnOccupancy}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Corridor Balance</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: '0.5rem', padding: '0.65rem 1rem', border: '1px solid #E5E7EB' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>Assigned Coaches:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: Math.max(1, r.buses - 1) } : r))}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', cursor: 'pointer' }}
                        >−</button>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', minWidth: '2rem', textAlign: 'center' }}>{route.buses}</span>
                        <button
                          onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: r.buses + 1 } : r))}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #D97706', background: '#FEF3C7', fontWeight: 'bold', cursor: 'pointer', color: '#92400E' }}
                        >+</button>
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
