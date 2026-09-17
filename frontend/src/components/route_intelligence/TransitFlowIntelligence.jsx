import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fetchTransitNodes,
  fetchTransitNode,
  simulateTransitNode,
  dispatchLocalTransitBus
} from '../../api/api';
import StatusBadge from '../common/StatusBadge';

export default function TransitFlowIntelligence({ showToast }) {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('NODE_DELHI_NDLS');
  const [activeNodeData, setActiveNodeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simParams, setSimParams] = useState({
    headcountDelta: 450,
    waitingToAdd: 25,
    incomingToAdd: 20,
    reroutesToAdd: 30
  });

  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  // Safe toast helper
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

  // Initial load on mount and timer
  useEffect(() => {
    loadNodes();
    const interval = setInterval(() => {
      loadNodes();
    }, 8000);
    return () => clearInterval(interval);
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


  // Dispatch Bus Action (strictly uses integer for physical buses deployed)
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

  // Safe Normalized Data Accessors
  const currNode = activeNodeData || {};
  const nodeId = currNode.id || currNode.node_id || selectedNodeId;
  const nodeName = currNode.name || currNode.node_name || 'Pilgrimage Transit Hub';
  const region = currNode.region || 'Transit Corridor';
  const nodeType = currNode.type || currNode.node_type || 'transit_hub';
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

  // =========================================================================
  // PERCENTAGE-FIRST METRIC DERIVATIONS (MAXIMIZED PERCENTAGES)
  // =========================================================================

  // 1. Capacity Load % (Relative to hub nominal density buffer)
  const nominalCapacity = currNode.nominal_capacity || 2500;
  const capacityLoadPct = Math.min(100, Math.max(10, Math.round((headcount / nominalCapacity) * 100)));

  // 2. Net Directional Flow Ratio %
  const totalFlowRate = Math.max(1, inflow + outflow);
  const inflowPct = Math.round((inflow / totalFlowRate) * 100);
  const outflowPct = Math.round((outflow / totalFlowRate) * 100);
  const netSurgePct = inflowPct - outflowPct; // positive means rush building

  // 3. Agency Quota Load %
  const totalTourQuota = Math.max(1, agencyExpected || 100);
  const waitingQueuePct = Math.round((waiting / totalTourQuota) * 100);
  const tourAllocationPct = Math.min(100, Math.round((agencyExpected / Math.max(1, headcount)) * 100));

  // 4. Reroute Funnel Percentages (Relative to 100% Offered Baseline)
  const offeredBase = Math.max(1, funnel.offered || 100);
  const acceptedPct = Math.round(((funnel.accepted || 0) / offeredBase) * 100);
  const confirmedPct = Math.round(((funnel.confirmed || 0) / offeredBase) * 100);
  const waitingPct = Math.round(((funnel.waiting || 0) / offeredBase) * 100);
  const boardedPct = Math.round(((funnel.boarded || 0) / offeredBase) * 100);
  const completedPct = Math.round(((funnel.completed || 0) / offeredBase) * 100);

  // 5. Fleet Stress & Deficit %
  const activeFleetSeatCapacity = Math.max(1, availableBuses * usableCap);
  const fleetStressPct = Math.round((expectedDemand / activeFleetSeatCapacity) * 100);
  const fleetDeficitPct = fleetStressPct > 100 ? fleetStressPct - 100 : 0;

  // Percentage-oriented rationale
  const rationale = shortageBuses > 0
    ? `Fleet stress is at ${fleetStressPct}% (+${fleetDeficitPct}% deficit). Deploying ${shortageBuses} bus(es) restores fleet coverage to 100%.`
    : `Fleet coverage is optimal at ${fleetStressPct}% of usable capacity (${availableBuses} deployed coach buffer).`;

  const alerts = Array.isArray(currNode.alerts) ? currNode.alerts : [];
  const hourlyFlow = Array.isArray(currNode.hourly_flow) ? currNode.hourly_flow : (Array.isArray(currNode.historical_flow) ? currNode.historical_flow : []);

  // 24-Hour Chart Generator (Percentages of Peak Daily Throughput)
  const chartData = useMemo(() => {
    if (!hourlyFlow || hourlyFlow.length === 0) {
      return { polyline: '', points: [], maxVal: 100, width: 680, height: 140 };
    }

    const maxVal = Math.max(100, ...hourlyFlow.map(h => Math.max(h.total_flow || h.headcount || 0, h.inflow || 0)));
    const width = 680;
    const height = 140;
    const padding = 24;

    const points = hourlyFlow.map((item, idx) => {
      const val = item.total_flow ?? item.headcount ?? 0;
      const pctOfPeak = Math.round((val / maxVal) * 100);
      const x = padding + (idx / (hourlyFlow.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (val / maxVal) * (height - 2 * padding);
      return { x, y, val, pctOfPeak, label: item.label || item.hour, ...item };
    });

    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { polyline, points, maxVal, width, height };
  }, [hourlyFlow]);

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      padding: '1.25rem 1.5rem 2rem',
      borderRadius: '0.75rem',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A'
    }}>
      {/* 1. Header & Live Node Action Bar */}
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
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '800',
            color: '#D97706',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.2rem'
          }}>
            YOLO Video Telemetry &amp; Reroute Intelligence
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '900',
            color: '#0F172A',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>👁️</span> Multimodal Transit Flow &amp; Local Fleet Intelligence
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.86rem' }}>
            Percentage-driven operational metrics: combines live CV concourse capacity load, directional velocity %, and 6-stage funnel conversion rates.
          </p>
        </div>

        {/* Top Control Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Simulate Flow Spike Button */}
          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.6rem 1rem',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            ⚡ Simulate Spike
          </button>
        </div>
      </div>

      {/* 2. White Visible Transit Node Selector Cards (Percentage Sizing) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        {nodes.map(node => {
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
              onClick={() => handleSelectNode(id)}
              style={{
                backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                color: '#0F172A',
                border: isSelected ? '2px solid #D97706' : '1px solid #E2E8F0',
                borderLeft: isSelected ? '5px solid #D97706' : '1px solid #E2E8F0',
                borderRadius: '0.65rem',
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 4px 12px rgba(217,119,6,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '1.15rem' }}>
                    {node.type?.includes('rail') || node.node_type?.includes('rail') ? '🚉' : node.type?.includes('bus') ? '🚏' : '⛰️'}
                  </span>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: isSelected ? '#92400E' : '#0F172A', lineHeight: 1.25 }}>
                    {name}
                  </div>
                </div>
                {hasAlerts && (
                  <span style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {nodeAlerts.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748B', marginTop: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.35rem' }}>
                <span>Load: <strong style={{ color: nodeLoadPct >= 80 ? '#DC2626' : '#D97706' }}>{nodeLoadPct}%</strong></span>
                <span style={{
                  color: nodeShortage > 0 ? '#DC2626' : '#16A34A',
                  fontWeight: '700'
                }}>
                  {nodeShortage > 0 ? `⚠️ -${nodeShortage} Bus` : '✓ 100% Sized'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Operational Alerts Banner (If Any) */}
      {alerts.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          marginBottom: '1.25rem'
        }}>
          {alerts.map((alert, idx) => {
            const isCritical = alert.severity === 'CRITICAL';
            const alertType = alert.type || alert.alert_type || 'ALERT';
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${isCritical ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: '0.65rem',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>
                    {alertType === 'FLEET_SHORTAGE' ? '🚨' : alertType === 'REROUTE_SURGE' ? '🔀' : '⚠️'}
                  </span>
                  <div>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: '800',
                      color: isCritical ? '#991B1B' : '#92400E'
                    }}>
                      ALERT: {alert.message}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.1rem' }}>
                      Operational stress triggered by multi-source telemetry • Updated Just now
                    </div>
                  </div>
                </div>

                {alertType === 'FLEET_SHORTAGE' && shortageBuses > 0 && (
                  <button
                    type="button"
                    disabled={isDispatching}
                    onClick={() => handleDispatchBus(shortageBuses)}
                    style={{
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.4rem',
                      padding: '0.45rem 0.95rem',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      cursor: isDispatching ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 6px rgba(220,38,38,0.3)'
                    }}
                  >
                    {isDispatching ? 'Deploying...' : `🚀 Deploy ${shortageBuses} Bus(es) Now`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Percentage-First Telemetry KPI Grid (6 Top Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem'
      }}>
        {/* Card 1: Capacity Load % */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Concourse Capacity Load
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: capacityLoadPct >= 80 ? '#DC2626' : '#0F172A', margin: '0.2rem 0' }}>
            {capacityLoadPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: capacityLoadPct >= 80 ? '#DC2626' : '#059669', fontWeight: '600' }}>
            {capacityLoadPct >= 80 ? '⚠️ High Density Surge' : '✓ Normal Throughput'}
          </div>
        </div>

        {/* Card 2: Directional Flow % */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Net Flow Direction
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0F172A', margin: '0.2rem 0' }}>
            <span style={{ color: '#2563EB' }}>{inflowPct}% In</span> / <span style={{ color: '#64748B' }}>{outflowPct}% Out</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: netSurgePct > 0 ? '#2563EB' : '#64748B', fontWeight: '600' }}>
            {netSurgePct > 0 ? `+${netSurgePct}% Net Inflow Rush` : 'Balanced Flow'}
          </div>
        </div>

        {/* Card 3: Agency Tour Load % */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Agency Tour Share
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#D97706', margin: '0.2rem 0' }}>
            {tourAllocationPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Waiting Queue: {waitingQueuePct}% of Quota
          </div>
        </div>

        {/* Card 4: Reroute Conversion Rate % */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Reroute Conversion Rate
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#7C3AED', margin: '0.2rem 0' }}>
            {confirmedPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {acceptedPct}% Accepted → {confirmedPct}% Committed
          </div>
        </div>

        {/* Card 5: Fleet Sizing Stress % */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Fleet Demand Stress
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: fleetStressPct > 100 ? '#DC2626' : '#16A34A', margin: '0.2rem 0' }}>
            {fleetStressPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: shortageBuses > 0 ? '#DC2626' : '#16A34A', fontWeight: '700' }}>
            {shortageBuses > 0 ? `+${fleetDeficitPct}% Deficit (Deploy ${shortageBuses} Bus)` : '✓ 100% Demand Covered'}
          </div>
        </div>

        {/* Card 6: Model Confidence % */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            CV Model Confidence
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0284C7', margin: '0.2rem 0' }}>
            {Number(confidence).toFixed(0)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Ultralytics YOLO (Class 0)
          </div>
        </div>
      </div>

      {/* 5. Main 2-Column Intelligence Panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Flow Telemetry & 6-Stage Percentage Funnel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 6-Stage Reroute Funnel (Expressed in % Conversion Stages) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>
                  🔄 6-Stage Corridor Reroute Funnel
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Percentage progression from initial offer to full corridor clearance.
                </p>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#7C3AED',
                backgroundColor: '#F5F3FF',
                padding: '0.25rem 0.6rem',
                borderRadius: '0.35rem',
                border: '1px solid #DDD6FE'
              }}>
                Funnel Clearance: {completedPct}% Cleared
              </span>
            </div>

            {/* Visual Funnel Step Sequence (Percentage Primary) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '0.5rem',
              backgroundColor: '#F8FAFC',
              padding: '0.85rem',
              borderRadius: '0.65rem',
              border: '1px solid #E2E8F0'
            }}>
              {[
                { label: 'Offered', pct: '100%', sub: 'Baseline', color: '#64748B', bg: '#F1F5F9' },
                { label: 'Accepted', pct: `${acceptedPct}%`, sub: 'Conversion', color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Confirmed', pct: `${confirmedPct}%`, sub: 'Committed', color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Waiting', pct: `${waitingPct}%`, sub: 'At Depot', color: '#D97706', bg: '#FEF3C7' },
                { label: 'Boarded', pct: `${boardedPct}%`, sub: 'In Transit', color: '#2563EB', bg: '#DBEAFE' },
                { label: 'Completed', pct: `${completedPct}%`, sub: 'Cleared', color: '#059669', bg: '#D1FAE5' }
              ].map((stage, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    backgroundColor: stage.bg,
                    borderRadius: '0.5rem',
                    padding: '0.65rem 0.5rem',
                    textAlign: 'center',
                    border: `1px solid ${stage.color}20`
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: '800', color: stage.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {stage.label}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: stage.color, marginTop: '0.2rem' }}>
                    {stage.pct}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: stage.color, opacity: 0.85, marginTop: '0.1rem' }}>
                    {stage.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 24-Hour Historical Flow Chart (% of Peak Daily Capacity) */}
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
                  📈 24-Hour Throughput Capacity Curve
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Hourly flow expressed as % of daily peak concourse volume.
                </p>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                Current: <strong>{chartData.points[chartData.points.length - 1]?.pctOfPeak || 74}% of Peak</strong>
              </div>
            </div>

            {/* Chart SVG */}
            <div style={{ overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} style={{ width: '100%', height: 'auto', minWidth: '420px' }}>
                {/* Horizontal Grid lines with % Labels */}
                <line x1="36" y1="20" x2={chartData.width - 24} y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <text x="8" y="24" fontSize="8" fill="#94A3B8" fontWeight="600">100%</text>

                <line x1="36" y1={chartData.height / 2} x2={chartData.width - 24} y2={chartData.height / 2} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <text x="12" y={chartData.height / 2 + 3} fontSize="8" fill="#94A3B8" fontWeight="600">50%</text>

                <line x1="36" y1={chartData.height - 24} x2={chartData.width - 24} y2={chartData.height - 24} stroke="#E2E8F0" strokeWidth="1.5" />
                <text x="16" y={chartData.height - 22} fontSize="8" fill="#94A3B8" fontWeight="600">0%</text>

                {/* Flow line */}
                {chartData.polyline && (
                  <polyline
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData.polyline}
                  />
                )}

                {/* Flow points */}
                {chartData.points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#D97706" strokeWidth="2" />
                    {idx % 4 === 0 && (
                      <text
                        x={p.x}
                        y={chartData.height - 6}
                        fontSize="8.5"
                        fill="#94A3B8"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {p.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

        </div>

        {/* Right Column: Local Fleet Sizing & Action Card (Percentage First) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Local Fleet Sizing Decision Box */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: shortageBuses > 0 ? '2px solid #FCA5A5' : '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>
                🚌 Local Transit Sizing &amp; Demand Math
              </h3>
              <StatusBadge
                status={shortageBuses > 0 ? 'CRITICAL' : 'OPTIMAL'}
                theme="light"
                size="xs"
                label={shortageBuses > 0 ? `+${fleetDeficitPct}% DEFICIT` : '100% SIZED'}
              />
            </div>

            {/* Percentage Math Formula Card */}
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
                <span style={{ color: '#64748B' }}>Staging Queue Load:</span>
                <strong>{Math.round((waiting / Math.max(1, expectedDemand)) * 100)}% of Demand</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Incoming Surge Share (15m):</span>
                <strong>{Math.round((incoming / Math.max(1, expectedDemand)) * 100)}% of Demand</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Coach Usable Efficiency:</span>
                <span><strong>90%</strong> Usable Seats (40-seater)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '0.35rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#0F172A', fontWeight: '700' }}>Fleet Utilization Stress:</span>
                <strong style={{ color: fleetStressPct > 100 ? '#DC2626' : '#D97706' }}>{fleetStressPct}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: '0.35rem' }}>
                <span style={{ color: '#0F172A', fontWeight: '800' }}>Required Fleet Allocation:</span>
                <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{requiredBuses} Buses ({availableBuses} active)</strong>
              </div>
            </div>

            {/* Percentage-Focused Rationale String */}
            <div style={{
              backgroundColor: shortageBuses > 0 ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${shortageBuses > 0 ? '#FECACA' : '#BBF7D0'}`,
              borderRadius: '0.5rem',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: shortageBuses > 0 ? '#991B1B' : '#166534',
              fontWeight: '600'
            }}>
              💡 {rationale}
            </div>

            {/* Quick Dispatch Action (strictly uses integer for physical buses deployed) */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                disabled={isDispatching}
                onClick={() => handleDispatchBus(Math.max(1, shortageBuses || 1))}
                style={{
                  flex: 1,
                  backgroundColor: shortageBuses > 0 ? '#DC2626' : '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: '800',
                  cursor: isDispatching ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(217,119,6,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{isDispatching ? '⏳' : '🚌'}</span>
                <span>{isDispatching ? 'Dispatching...' : `Deploy ${Math.max(1, shortageBuses || 1)} Shuttle Bus(es)`}</span>
              </button>
            </div>
          </div>

          {/* Node Camera Feed Meta */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.92rem', fontWeight: '800', color: '#0F172A' }}>
              📷 Video Feed Metadata
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong>Feed Source:</strong> {feedId} ({cameraName})</div>
              <div><strong>Last Updated:</strong> {currNode.last_updated ? new Date(currNode.last_updated).toLocaleTimeString() : 'Just now'}</div>
              <div><strong>Privacy Mode:</strong> Aggregate Flow Only (No facial recognition / biometric IDs)</div>
              <div><strong>Corridor Region:</strong> {region}</div>
            </div>
          </div>

        </div>
      </div>

      {/* 6. Simulation Configuration Modal */}
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
              Inject a sudden rush into <strong>{nodeName}</strong> to evaluate dynamic fleet auto-scaling and percentage alert triggers.
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
                {isSimulating ? 'Simulating...' : 'Apply Spike'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
