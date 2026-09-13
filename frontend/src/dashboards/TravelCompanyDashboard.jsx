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
  // Transit Nodes & Selected Node Telemetry State
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('NODE_DELHI_NDLS');
  const [activeNodeData, setActiveNodeData] = useState(null);

  // Operational State
  const [isLoading, setIsLoading] = useState(false);
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

  const [fleetRoutes, setFleetRoutes] = useState([
    { id: 'HR-01', from: 'Delhi (ISBT Kashmiri Gate)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 3, capacity: 42, occupancy: 94, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-02', from: 'Dehradun (Bus Stand)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 2, capacity: 38, occupancy: 100, type: 'Sleeper', status: 'FULL' },
    { id: 'HR-03', from: 'Haridwar (Har Ki Pauri)', to: 'Delhi (ISBT Kashmiri Gate)', date: 'Oct 13 (Sun)', buses: 3, capacity: 42, occupancy: 22, type: 'Volvo A/C', status: 'RETURN' },
    { id: 'HR-04', from: 'Rishikesh (Triveni Ghat)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 1, capacity: 30, occupancy: 67, type: 'Mini Bus', status: 'NORMAL' },
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
          occupancy: r.occupancy || 80,
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

  // Handle switching nodes
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
        notify(`✅ Video processed! Detected ${(res.flow_analysis.confidence * 100).toFixed(1)}% confidence with ${res.flow_analysis.average_headcount} avg people. Fleet demand recalculated.`);
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

  // Dispatch Bus Action
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

  // Run Traffic / Surge Simulation
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
  const agencyExpected = currNode.agency_passengers_expected ?? 0;

  const funnel = currNode.funnel || currNode.reroute_funnel || {
    offered: currNode.reroutes_offered ?? 0,
    accepted: currNode.reroutes_accepted ?? 0,
    confirmed: currNode.reroutes_confirmed ?? 0,
    waiting: currNode.passengers_waiting ?? 0,
    boarded: currNode.passengers_boarded ?? 0,
    completed: currNode.passengers_completed ?? 0
  };

  const waiting = currNode.passengers_waiting ?? funnel.waiting ?? 0;
  const incoming = currNode.expected_incoming ?? Math.round(inflow * 0.75) ?? 0;
  const expectedDemand = currNode.expected_demand ?? (waiting + incoming);
  const requiredBuses = currNode.required_buses ?? 0;
  const availableBuses = currNode.available_buses ?? 1;
  const shortageBuses = currNode.shortage_buses ?? currNode.fleet?.net_shortage ?? Math.max(0, requiredBuses - availableBuses);
  const usableCap = currNode.usable_capacity ?? currNode.usable_seat_capacity ?? 36;
  const nextHourDemand = currNode.next_hour_demand ?? Math.round(expectedDemand * 1.35);
  const nextDepartureMins = currNode.next_departure_mins ?? 12;
  const transitEta = currNode.transit_eta ?? '1h 30m';
  const nextHub = currNode.next_hub ?? 'Next Staging Base';

  // Capacity & Flow Ratios
  const nominalCapacity = currNode.nominal_capacity || 2500;
  const capacityLoadPct = Math.min(100, Math.max(10, Math.round((headcount / nominalCapacity) * 100)));
  const totalFlow = Math.max(1, inflow + outflow);
  const inflowPct = Math.round((inflow / totalFlow) * 100);
  const outflowPct = Math.round((outflow / totalFlow) * 100);

  // Funnel conversion percentages
  const offeredBase = Math.max(1, funnel.offered || 100);
  const acceptedPct = Math.round(((funnel.accepted || 0) / offeredBase) * 100);
  const confirmedPct = Math.round(((funnel.confirmed || 0) / offeredBase) * 100);
  const waitingPct = Math.round(((funnel.waiting || 0) / offeredBase) * 100);
  const boardedPct = Math.round(((funnel.boarded || 0) / offeredBase) * 100);
  const completedPct = Math.round(((funnel.completed || 0) / offeredBase) * 100);

  // Fleet stress
  const activeFleetSeats = Math.max(1, availableBuses * usableCap);
  const fleetStressPct = Math.round((expectedDemand / activeFleetSeats) * 100);
  const fleetDeficitPct = fleetStressPct > 100 ? fleetStressPct - 100 : 0;

  const rationale = currNode.rationale || currNode.fleet?.rationale || (
    shortageBuses > 0
      ? `Deploy ${shortageBuses} additional local bus(es) — ${waiting} passengers waiting, ${incoming} expected incoming, and ${funnel.confirmed ?? 0} reroutes confirmed.`
      : `Current fleet of ${availableBuses} bus(es) covers demand of ${expectedDemand} passengers.`
  );

  const alerts = Array.isArray(currNode.alerts) ? currNode.alerts : [];

  // Total Corridor Summary Stats
  const totalCorridorWaiting = nodes.reduce((acc, n) => acc + (n.passengers_waiting ?? n.funnel?.waiting ?? 0), 0);
  const totalCorridorShortage = nodes.reduce((acc, n) => acc + (n.shortage_buses ?? n.fleet?.net_shortage ?? 0), 0);
  const totalCorridorHeadcount = nodes.reduce((acc, n) => acc + (n.headcount ?? 0), 0);

  return (
    <div className="travel-dashboard-root" id="travel-dashboard" style={{ padding: '0.75rem 1.5rem 2.5rem', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0F172A', backgroundColor: '#F8FAFC' }}>
      
      {/* 1. TOP HEADER & OPERATIONAL STATUS */}
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
            <span>🚌</span> Char Dham Corridor Fleet &amp; Transit Flow Command
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.86rem' }}>
            Unified view: Passenger locations, YOLO camera telemetry, corridor reroute flow, and real-time shuttle deployment.
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
            ⚙️ Fleet Allocations ({fleetRoutes.length})
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

      {/* 2. THE 3 CORE OPERATIONAL QUESTIONS BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem'
      }}>
        {/* Question 1 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          border: '1px solid #E2E8F0',
          padding: '1rem 1.25rem',
          borderLeft: '4px solid #2563EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📍 1. Where are my passengers?
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginTop: '0.25rem' }}>
            <strong>{totalCorridorHeadcount.toLocaleString()}</strong> across corridor · <strong>{totalCorridorWaiting}</strong> waiting
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
            Selected: <strong>{nodeName}</strong> has {waiting} waiting &amp; {incoming} incoming.
          </div>
        </div>

        {/* Question 2 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          border: '1px solid #E2E8F0',
          padding: '1rem 1.25rem',
          borderLeft: '4px solid #D97706',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⏱️ 2. What is happening next?
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginTop: '0.25rem' }}>
            Next departure in <strong>{nextDepartureMins} mins</strong> · {inflowPct}% Inflow velocity
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
            Next-hour projected load: <strong>{nextHourDemand} passengers</strong> to {nextHub}.
          </div>
        </div>

        {/* Question 3 */}
        <div style={{
          backgroundColor: totalCorridorShortage > 0 ? '#FEF2F2' : '#F0FDF4',
          borderRadius: '0.65rem',
          border: totalCorridorShortage > 0 ? '1px solid #FECACA' : '1px solid #BBF7D0',
          padding: '1rem 1.25rem',
          borderLeft: totalCorridorShortage > 0 ? '4px solid #DC2626' : '4px solid #16A34A',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: totalCorridorShortage > 0 ? '#DC2626' : '#16A34A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🚌 3. Do I need to deploy a bus?
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: totalCorridorShortage > 0 ? '#991B1B' : '#166534', marginTop: '0.25rem' }}>
            {totalCorridorShortage > 0 ? `🚨 YES — ${totalCorridorShortage} Bus Shortage across corridor` : '✓ NO — Fleet currently sufficient'}
          </div>
          <div style={{ fontSize: '0.78rem', color: totalCorridorShortage > 0 ? '#B91C1C' : '#15803D', marginTop: '0.15rem' }}>
            {shortageBuses > 0 ? `Selected hub (${nodeName}) requires ${shortageBuses} bus(es).` : 'All scheduled departures are covered.'}
          </div>
        </div>
      </div>

      {/* 3. LIVE CORRIDOR TRANSIT FLOW STEPPER (DELHI → HARIDWAR → RISHIKESH → RUDRAPRAYAG → GUPTKASHI → SONPRAYAG) */}
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
              Sequential transit flow from interstate origin to sacred shrine trek base. Click any hub to focus live YOLO telemetry.
            </p>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: '600' }}>
            Corridor Length: <strong>480 km</strong> · Transit Chain: <strong>6 Hubs</strong>
          </div>
        </div>

        {/* Horizontal Visual Step Flow */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.65rem'
        }}>
          {nodes.map((node, sIdx) => {
            const id = node.id || node.node_id;
            const name = node.name || node.node_name || id;
            const isSelected = id === selectedNodeId;
            const nodeHeadcount = node.headcount ?? node.observation?.people_count ?? 0;
            const nodeCapacity = node.nominal_capacity || 2500;
            const nodeLoadPct = Math.min(100, Math.max(10, Math.round((nodeHeadcount / nodeCapacity) * 100)));
            const nodeShortage = node.shortage_buses ?? node.fleet?.net_shortage ?? 0;
            const nodeAlerts = Array.isArray(node.alerts) ? node.alerts : [];
            const hasAlerts = nodeAlerts.length > 0;

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
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {/* Step number badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    backgroundColor: isSelected ? '#D97706' : '#E2E8F0',
                    color: isSelected ? '#FFFFFF' : '#475569',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '0.25rem'
                  }}>
                    Step {sIdx + 1}
                  </span>
                  {hasAlerts && (
                    <span style={{
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      fontSize: '0.68rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800'
                    }}>
                      {nodeAlerts.length}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.86rem', fontWeight: '800', color: isSelected ? '#92400E' : '#0F172A', lineHeight: 1.25, marginBottom: '0.35rem' }}>
                  {name.split('&')[0]}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '0.35rem' }}>
                  <span>Load: <strong>{nodeLoadPct}%</strong></span>
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
        {/* LEFT COLUMN: LIVE TELEMETRY & 6-STAGE REROUTE FUNNEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card A: Selected Node Live YOLO Telemetry & Video Upload */}
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
                  Live Camera Feed · {feedId}
                </div>
                <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.2rem', fontWeight: '900', color: '#0F172A' }}>
                  {nodeName}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                  {cameraName} · {region}
                </div>
              </div>

              {/* Video Upload CTA directly on the node */}
              <label style={{
                backgroundColor: isUploading ? '#94A3B8' : '#0284C7',
                color: '#FFFFFF',
                borderRadius: '0.5rem',
                padding: '0.55rem 1rem',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 5px rgba(2,132,199,0.25)'
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

            {/* Ingestion notice */}
            {isUploading && uploadProgress && (
              <div style={{ backgroundColor: '#E0F2FE', border: '1px solid #7DD3FC', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#0369A1', fontSize: '0.85rem', fontWeight: '600' }}>
                🔄 {uploadProgress}
              </div>
            )}

            {/* 4 Core Real-Time Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.65rem',
              marginBottom: '1rem'
            }}>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Current Headcount</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0F172A', marginTop: '0.15rem' }}>{headcount.toLocaleString()}</div>
                <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>{capacityLoadPct}% Concourse Load</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Inflow / Outflow</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0F172A', marginTop: '0.15rem' }}>
                  <span style={{ color: '#2563EB' }}>+{inflow}</span> / <span style={{ color: '#64748B' }}>-{outflow}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#2563EB' }}>{inflowPct}% Inflow Share</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Waiting at Depot</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#D97706', marginTop: '0.15rem' }}>{waiting}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{incoming} incoming (15m)</div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>YOLO Confidence</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0284C7', marginTop: '0.15rem' }}>{Number(confidence).toFixed(0)}%</div>
                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Class 0 Detection</div>
              </div>
            </div>

            {/* ETA & Next-Hour Projection Bar */}
            <div style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '0.5rem',
              border: '1px solid #BFDBFE',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: '#1E40AF'
            }}>
              <div>
                ⏱️ <strong>Next Departure:</strong> In <strong>{nextDepartureMins} mins</strong> to {nextHub} (Transit ETA: <strong>{transitEta}</strong>)
              </div>
              <div>
                📈 <strong>Next-Hour Projected Demand:</strong> <strong>{nextHourDemand} passengers</strong>
              </div>
            </div>
          </div>

          {/* Card B: 6-Stage Reroute Funnel */}
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
                  Progression when overcrowding overrides divert pilgrims to alternate circuits.
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
                Funnel Clearance: {completedPct}% ({funnel.completed || 0} pilgrims)
              </span>
            </div>

            {/* 6 Stages Row */}
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
                { label: 'Offered', count: funnel.offered || 0, pct: '100%', color: '#64748B', bg: '#F1F5F9' },
                { label: 'Accepted', count: funnel.accepted || 0, pct: `${acceptedPct}%`, color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Confirmed', count: funnel.confirmed || 0, pct: `${confirmedPct}%`, color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Waiting', count: funnel.waiting || 0, pct: `${waitingPct}%`, color: '#D97706', bg: '#FEF3C7' },
                { label: 'Boarded', count: funnel.boarded || 0, pct: `${boardedPct}%`, color: '#2563EB', bg: '#DBEAFE' },
                { label: 'Completed', count: funnel.completed || 0, pct: `${completedPct}%`, color: '#059669', bg: '#D1FAE5' }
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
                  <div style={{ fontSize: '0.68rem', color: stage.color, opacity: 0.85 }}>
                    {stage.count} pax
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ACTION REQUIRED, FLEET DEPLOYMENT & ALERTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* ACTION REQUIRED & FLEET SIZING CARD */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: shortageBuses > 0 ? '2px solid #FCA5A5' : '1px solid #BBF7D0',
            padding: '1.35rem 1.5rem',
            boxShadow: shortageBuses > 0 ? '0 4px 14px rgba(220,38,38,0.1)' : '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: shortageBuses > 0 ? '#DC2626' : '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Operational Recommendation
              </div>
              <StatusBadge
                status={shortageBuses > 0 ? 'CRITICAL' : 'OPTIMAL'}
                theme="light"
                size="xs"
                label={shortageBuses > 0 ? `🚨 ${shortageBuses} BUS SHORTAGE` : '✓ SUFFICIENT'}
              />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: '900', color: shortageBuses > 0 ? '#991B1B' : '#166534' }}>
              {shortageBuses > 0 ? `Deploy ${shortageBuses} Additional Shuttle Bus(es)` : 'Fleet is Currently Sized to Demand'}
            </h3>

            {/* Sizing Math Table */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '0.5rem',
              padding: '0.85rem 1rem',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              lineHeight: 1.5
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Waiting Queue + Incoming:</span>
                <strong>{waiting} waiting + {incoming} incoming = {expectedDemand} pax</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Active Capacity ({availableBuses} bus @ 90% load):</span>
                <span><strong>{activeFleetSeats} usable seats</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '0.35rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#0F172A', fontWeight: '700' }}>Fleet Stress &amp; Sizing:</span>
                <strong style={{ color: fleetStressPct > 100 ? '#DC2626' : '#16A34A' }}>{fleetStressPct}% ({requiredBuses} buses needed)</strong>
              </div>
            </div>

            {/* Plain-language WHY rationale */}
            <div style={{
              backgroundColor: shortageBuses > 0 ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${shortageBuses > 0 ? '#FECACA' : '#BBF7D0'}`,
              borderRadius: '0.5rem',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.86rem',
              color: shortageBuses > 0 ? '#991B1B' : '#166534',
              fontWeight: '600',
              lineHeight: 1.45
            }}>
              💡 <strong>WHY:</strong> {rationale}
            </div>

            {/* Big Action Button */}
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
                padding: '0.85rem 1.5rem',
                fontSize: '0.98rem',
                fontWeight: '900',
                cursor: isDispatching ? 'not-allowed' : 'pointer',
                boxShadow: shortageBuses > 0 ? '0 4px 14px rgba(220,38,38,0.35)' : '0 4px 14px rgba(217,119,6,0.3)',
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

          {/* OPERATIONAL ALERTS CARD */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.96rem', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🚨</span> Active Operational Alerts ({alerts.length})
            </h4>

            {alerts.length === 0 ? (
              <div style={{ fontSize: '0.84rem', color: '#166534', backgroundColor: '#F0FDF4', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #BBF7D0' }}>
                ✓ No critical alerts for {nodeName}. Operations are nominal.
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
                        Action: <strong>{alert.action || 'Deploy standby fleet'}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 5. COLLAPSIBLE ADVANCED ANALYTICS & SCENARIO SIMULATION SECTION */}
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
              <span>📊</span> Advanced Corridor AI, Demand Forecasts &amp; Scenario Simulator
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
              Deep-dive tools: Multi-hub scenario comparisons, 24-hour demand curves, and dynamic pricing simulation.
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
            {showAdvanced ? '▲ Collapse Advanced' : '▼ Expand Advanced'}
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
              ⚡ Simulate Flow &amp; Passenger Spike
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748B' }}>
              Inject a sudden rush into <strong>{nodeName}</strong> to evaluate dynamic fleet auto-scaling and alert triggers.
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

      {/* 7. FLEET SCHEDULE ADJUSTMENT MODAL */}
      {showFleetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #92400E, #D97706)', padding: '1.5rem 2rem', borderRadius: '1rem 1rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: '#FFF', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  🚌 Fleet Schedule Allocation Panel
                </h2>
                <p style={{ margin: 0, color: '#FDE68A', fontSize: '0.95rem' }}>
                  Manage scheduled coach allocations across active Char Dham corridors.
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
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: route.occupancy >= 90 ? '#DC2626' : '#16A34A' }}>{route.occupancy}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Occupancy</div>
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
