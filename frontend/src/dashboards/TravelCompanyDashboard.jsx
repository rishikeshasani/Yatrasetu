import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fetchTransitNodes,
  fetchTransitNode,
  simulateTransitNode,
  dispatchLocalTransitBus,
  uploadTransitVideo,
  saveFleetSchedules,
  fetchFleetSchedules,
  fetchActiveRerouteAlert,
  fetchTravelAgencyProfile
} from '../api/api';
import {
  DEFAULT_AGENCY_CONFIG,
  resolveRoute,
  parseDateSelection,
  detectEventsForRouteAndDates,
  generateDemandForecast,
  simulateOperations,
  generateAiRecommendation,
  getCorridorNodesForRoute
} from '../services/routeIntelligenceEngine';

// Route Intelligence Sub-components
import RouteCommandBar from '../components/route_intelligence/RouteCommandBar';
import EventContextBanner from '../components/route_intelligence/EventContextBanner';
import AiRecommendationPanel from '../components/route_intelligence/AiRecommendationPanel';
import FleetSimulator from '../components/route_intelligence/FleetSimulator';
import DataSourcesModal from '../components/route_intelligence/DataSourcesModal';
import DispatchSummaryModal from '../components/route_intelligence/DispatchSummaryModal';
import '../components/route_intelligence/RouteIntelligence.css';

export default function TravelCompanyDashboard({
  showToast,
  externalTab
}) {
  // Agency Profile configuration
  const [agencyConfig, setAgencyConfig] = useState(DEFAULT_AGENCY_CONFIG);

  // 1. Primary Route Inputs (Multi-Route Selection)
  const [source, setSource] = useState('HUB_DELHI_ISBT');
  const [destination, setDestination] = useState('TS015'); // Har Ki Pauri Haridwar
  const [dateInput, setDateInput] = useState('weekend');

  // Interactive Simulation Controls (+5, +10 buses, slider)
  const [deployedBuses, setDeployedBuses] = useState(150);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Modals & UI Controls
  const [showDataSources, setShowDataSources] = useState(false);
  const [showDispatchSummary, setShowDispatchSummary] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [activeReroute, setActiveReroute] = useState(null);

  // Transit Nodes & Active Selected Node State
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('NODE_DELHI_NDLS');
  const [activeNodeData, setActiveNodeData] = useState(null);

  const [simParams, setSimParams] = useState({
    headcountDelta: 450,
    waitingToAdd: 25,
    incomingToAdd: 20,
    reroutesToAdd: 30
  });

  // Active Corridor Route Allocations
  const [fleetRoutes, setFleetRoutes] = useState([
    { id: 'HR-01', from: 'Delhi (ISBT Kashmiri Gate)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 3, capacity: 42, baseDemand: 118, forwardOccupancy: 94, returnOccupancy: 33, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-02', from: 'Dehradun (Bus Stand)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 2, capacity: 38, baseDemand: 76, forwardOccupancy: 100, returnOccupancy: 35, type: 'Sleeper', status: 'FULL' },
    { id: 'HR-03', from: 'Haridwar (Har Ki Pauri)', to: 'Delhi (ISBT Kashmiri Gate)', date: 'Oct 13 (Sun)', buses: 3, capacity: 42, baseDemand: 110, forwardOccupancy: 88, returnOccupancy: 31, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-04', from: 'Rishikesh (Triveni Ghat)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 1, capacity: 30, baseDemand: 20, forwardOccupancy: 67, returnOccupancy: 23, type: 'Mini Bus', status: 'NORMAL' },
  ]);

  // Dynamic route bus adjustment & occupancy recalculation
  const handleUpdateRouteBuses = (idx, delta) => {
    setFleetRoutes(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const newBuses = Math.max(1, (r.buses || 1) + delta);
      const capacityPerBus = r.capacity || 42;
      const totalSeats = newBuses * capacityPerBus;
      
      // Calculate or retrieve stable passenger demand baseline
      const baseDemand = r.baseDemand || Math.round((r.buses || 3) * capacityPerBus * ((r.forwardOccupancy || 85) / 100));
      
      // Recalculate forward & return occupancies dynamically
      const forwardOccupancy = Math.min(100, Math.max(12, Math.round((baseDemand / totalSeats) * 100)));
      const returnOccupancy = Math.max(10, Math.min(65, Math.round(forwardOccupancy * 0.35)));
      const status = forwardOccupancy >= 95 ? 'FULL' : forwardOccupancy >= 80 ? 'HIGH DEMAND' : 'NORMAL';

      return {
        ...r,
        buses: newBuses,
        baseDemand,
        forwardOccupancy,
        returnOccupancy,
        status
      };
    }));
  };

  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  const notify = useCallback((msg) => {
    if (typeof showToast === 'function') {
      showToast(msg);
    }
  }, [showToast]);

  // Load agency configuration on mount
  useEffect(() => {
    fetchTravelAgencyProfile().then((data) => {
      if (data) {
        setAgencyConfig((prev) => ({
          ...prev,
          agency_name: data.agency_name || prev.agency_name,
          total_fleet_capacity: data.total_fleet_capacity || prev.total_fleet_capacity,
          agency_id: data.agency_id || prev.agency_id
        }));
      }
    }).catch(() => {});
  }, []);

  // Step 1: Route Resolution
  const routeInfo = useMemo(() => {
    return resolveRoute(source, destination);
  }, [source, destination]);

  // Step 2: Date Selection Parsing
  const dateSelection = useMemo(() => {
    return parseDateSelection(dateInput);
  }, [dateInput]);

  // Step 3: Event Detection
  const eventContext = useMemo(() => {
    return detectEventsForRouteAndDates(routeInfo.destination, dateSelection);
  }, [routeInfo.destination, dateSelection]);

  // Step 4: Demand Forecast
  const demandForecast = useMemo(() => {
    return generateDemandForecast(routeInfo.destination, eventContext, dateSelection, routeInfo);
  }, [routeInfo.destination, eventContext, dateSelection, routeInfo]);

  // Step 5: AI Recommendation Synthesis
  const aiRecommendation = useMemo(() => {
    return generateAiRecommendation({
      demandForecast,
      currentDeployed: deployedBuses,
      routeInfo,
      agencyConfig,
      eventContext
    });
  }, [demandForecast, deployedBuses, routeInfo, agencyConfig, eventContext]);

  // Auto-adapt initial deployment when route or event changes
  useEffect(() => {
    if (aiRecommendation) {
      setDeployedBuses(aiRecommendation.recommended_buses);
    }
  }, [routeInfo.route_key, eventContext.event_name]);

  // Step 6: Fleet Operations Simulation (Dynamic to slider changes)
  const simulationResult = useMemo(() => {
    return simulateOperations({
      deployedBuses,
      demandForecast,
      forwardFare: 1000,
      returnFare: 1000,
      routeInfo,
      agencyConfig
    });
  }, [deployedBuses, demandForecast, routeInfo, agencyConfig]);

  // Handle explicit [Analyze Route] button trigger
  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      notify(`⚡ Route analysis refreshed for ${routeInfo.source.name} ⇄ ${routeInfo.destination.name}`);
    }, 450);
  };

  // 1-Click apply AI recommendation
  const handleApplyAiRecommendation = () => {
    if (aiRecommendation) {
      setDeployedBuses(aiRecommendation.recommended_buses);
      notify(`✨ Applied AI Recommended deployment: ${aiRecommendation.recommended_buses} buses (${(aiRecommendation.recommended_buses * agencyConfig.bus_seat_capacity).toLocaleString()} seats) on ${routeInfo.source.name} ⇄ ${routeInfo.destination.name}`);
    }
  };

  // Synchronize route-specific corridor stops across all 25 shrines
  useEffect(() => {
    const routeNodes = getCorridorNodesForRoute(routeInfo, eventContext, deployedBuses);
    if (routeNodes && routeNodes.length > 0) {
      setNodes(routeNodes);
      const activeExists = routeNodes.some(n => (n.id || n.node_id) === selectedNodeIdRef.current);
      if (!activeExists) {
        setSelectedNodeId(routeNodes[0].id);
        setActiveNodeData(routeNodes[0]);
      } else {
        const matching = routeNodes.find(n => (n.id || n.node_id) === selectedNodeIdRef.current) || routeNodes[0];
        setActiveNodeData(matching);
      }
    }
  }, [routeInfo, eventContext, deployedBuses]);

  // Load backend telemetry if available
  const loadNodes = useCallback(async (explicitId = null) => {
    try {
      const res = await fetchTransitNodes();
      if (res && Array.isArray(res.nodes) && res.nodes.length > 0) {
        const currentTargetId = explicitId || selectedNodeIdRef.current;
        const matching = res.nodes.find(n => (n.id || n.node_id) === currentTargetId);
        if (matching) {
          setActiveNodeData(prev => ({ ...prev, ...matching }));
        }
      }
    } catch (err) {
      // Keep dynamic route nodes
    }
  }, []);

  // Initial load and periodic synchronization
  useEffect(() => {
    loadNodes();
    const interval = setInterval(() => {
      loadNodes();
    }, 10000);

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
        setActiveNodeData(prev => ({ ...prev, ...nodeObj }));
      }
    } catch (err) {
      // Keep local selected node
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
        const detConf = res.flow_analysis.confidence ? (res.flow_analysis.confidence * 100).toFixed(1) : 95.8;
        const newInflow = res.flow_analysis.inflow_rate || Math.round((activeNodeData?.inflow_per_min || 35) * 1.3);
        const newOutflow = res.flow_analysis.outflow_rate || Math.round((activeNodeData?.outflow_per_min || 30) * 0.9);
        const newLoad = Math.min(98, Math.max(30, Math.round((newInflow / (newInflow + newOutflow)) * 115)));
        const newShortage = newInflow > newOutflow ? 2 : 0;

        setUploadProgress('YOLO inference complete. Updating fleet demand & reroutes...');
        notify(`✅ Video processed! Detected ${detConf}% confidence. Staging load updated to ${newLoad}%.`);

        setNodes(prev => prev.map(n => {
          if ((n.id || n.node_id) === selectedNodeId) {
            return {
              ...n,
              confidence: Number(detConf),
              inflow_per_min: newInflow,
              outflow_per_min: newOutflow,
              crowd_load_pct: newLoad,
              shortage_buses: newShortage,
              fleet: { net_shortage: newShortage, recommended_buses: newShortage + 1 }
            };
          }
          return n;
        }));

        setActiveNodeData(prev => ({
          ...prev,
          confidence: Number(detConf),
          inflow_per_min: newInflow,
          outflow_per_min: newOutflow,
          crowd_load_pct: newLoad,
          shortage_buses: newShortage,
          fleet: { net_shortage: newShortage, recommended_buses: newShortage + 1 }
        }));
      } else {
        notify('✅ Video uploaded and processed successfully.');
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

  // Safe Normalized Active Node Data
  const currNode = activeNodeData || {};
  const currNodeName = currNode.name || currNode.node_name || 'Haridwar Railway Station & Bus Terminal';
  const currRegion = currNode.region || 'Transit Corridor';
  const cameraName = currNode.camera_name || 'Corridor Camera Feed';

  const inflow = currNode.inflow_per_min ?? currNode.observation?.inflow_rate_per_min ?? 0;
  const outflow = currNode.outflow_per_min ?? currNode.observation?.outflow_rate_per_min ?? 0;
  const confidence = currNode.confidence ?? (currNode.observation?.confidence_score ? currNode.observation.confidence_score * 100 : 94.5);

  const totalFlow = Math.max(1, inflow + outflow);
  const nodeInflowPct = Math.round((inflow / totalFlow) * 100);
  const outflowPct = Math.round((outflow / totalFlow) * 100);

  const alerts = Array.isArray(currNode.alerts) ? currNode.alerts : [];
  const totalCorridorShortage = nodes.reduce((acc, n) => acc + (n.shortage_buses ?? n.fleet?.net_shortage ?? 0), 0);

  // Operational Percentage-First Metrics (As shown in Pic 1, responding dynamically to chosen route/dates)
  const forwardOccupancyPct = simulationResult?.forward_occupancy_pct ?? 86;
  const returnOccupancyPct = simulationResult?.return_occupancy_pct ?? 31;
  
  const forwardStatusLevel = forwardOccupancyPct >= 90 ? 'Critical' : forwardOccupancyPct >= 75 ? 'High' : 'Normal';
  const forwardStatusColor = forwardStatusLevel === 'Critical' ? '#DC2626' : forwardStatusLevel === 'High' ? '#EA580C' : '#16A34A';
  const forwardStatusLabel = forwardStatusLevel === 'Critical' ? '🔴 Capacity Saturated' : forwardStatusLevel === 'High' ? '🟡 High Demand' : '🟢 Normal Flow';

  const activeCoaches = fleetRoutes.reduce((acc, r) => acc + (r.buses || 0), 0) || 14;
  const reserveCoaches = simulationResult?.reserve_fleet ?? 4;

  // Dynamic crowd load percentage driven by selected shrine metadata and event multiplier
  const destCapacity = routeInfo?.destination?.metadata?.official_capacity_daily || 25000;
  const surgeMultiplier = eventContext?.demand_multiplier || 1.0;
  const rawCrowd = Math.round((Math.log10(destCapacity) / Math.log10(150000)) * 52 * surgeMultiplier);
  const crowdLoadPct = Math.min(94, Math.max(18, rawCrowd));
  const crowdStatusLevel = crowdLoadPct >= 85 ? 'Critical' : crowdLoadPct >= 65 ? 'High' : crowdLoadPct >= 40 ? 'Moderate' : 'Normal';
  const crowdStatusColor = crowdStatusLevel === 'Critical' ? '#DC2626' : crowdStatusLevel === 'High' ? '#EA580C' : crowdStatusLevel === 'Moderate' ? '#D97706' : '#16A34A';

  // Dynamic inflow velocity
  const inflowVelocityPct = surgeMultiplier >= 1.4 ? 64 : surgeMultiplier >= 1.2 ? 56 : 48;

  // Dynamic departure info driven by route destination and distance
  const routeDist = routeInfo?.distance_km || 220;
  const nextDepartureMins = routeDist > 500 ? 25 : routeDist > 300 ? 18 : 12;
  const nextHubName = routeInfo?.destination?.name ? routeInfo.destination.name.split(' ')[0] : 'Haridwar';
  const transitEta = routeInfo?.estimated_travel_time || '4h 15m';

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

  return (
    <div className="travel-dashboard-root" id="travel-dashboard" style={{ padding: '0.5rem 1.5rem 2.5rem', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0F172A', backgroundColor: '#F8FAFC' }}>
      
      {/* ========================================================================= */}
      {/* 1. COMPANY HEADER (Himalaya Yatra Travels Identity & Top Bar)              */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '0.85rem 1.25rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '0.5rem',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            🏔️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {agencyConfig.agency_name}
              </span>
              <span style={{ fontSize: '0.65rem', backgroundColor: '#DCFCE7', color: '#166534', padding: '0.1rem 0.45rem', borderRadius: '0.25rem', fontWeight: '800', border: '1px solid #86EFAC' }}>
                ● {agencyConfig.partner_tier || 'Verified Yatra Partner'} · Fleet: {agencyConfig.total_fleet_capacity} Coaches
              </span>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0F172A', margin: '0.1rem 0 0' }}>
              Fleet Operations &amp; Route Intelligence Command Center
            </h1>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowDataSources(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            🛡️ Data Sources &amp; Confidence
          </button>
          <button
            type="button"
            onClick={() => setShowFleetModal(true)}
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(217,119,6,0.25)'
            }}
          >
            <span>🚌</span> Adjust Fleet Schedules
          </button>
          <button
            type="button"
            onClick={() => setShowSimModal(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <span>⚡</span> Test Surge
          </button>
        </div>
      </div>

      {/* EMERGENCY REROUTE DIRECTIVE (If state alert active) */}
      {activeReroute?.is_active && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1.5px solid #F87171',
          borderRadius: '0.75rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#DC2626', textTransform: 'uppercase' }}>
                STATE EMERGENCY DIRECTIVE ACTIVE
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#991B1B' }}>
                {activeReroute.message || 'Haridwar Corridor Overtourism: Divert scheduled coaches to satellite basecamp.'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#7F1D1D', fontWeight: '700' }}>
            Diverted: <strong>{activeReroute.diverted_tourists_count || 320} Pilgrims</strong> · Assigned: <strong>{activeReroute.assigned_buses_count || 8} Coaches</strong>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP BLACK ROUTE SELECTION COMMAND BAR (MULTI-ROUTE ENABLED)            */}
      {/* ========================================================================= */}
      <RouteCommandBar
        source={source}
        setSource={setSource}
        destination={destination}
        setDestination={setDestination}
        dateInput={dateInput}
        setDateInput={setDateInput}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
      />

      {/* ========================================================================= */}
      {/* 3. DYNAMIC EVENT & YATRA CONTEXT BANNER                                   */}
      {/* ========================================================================= */}
      <EventContextBanner
        eventContext={eventContext}
        routeInfo={routeInfo}
        dateSelection={dateSelection}
      />

      {/* ========================================================================= */}
      {/* 4. CORE OPERATIONAL KPI ROW (6 PERCENTAGE-FIRST CARDS)                    */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem'
      }}>
        {/* Card 1: Forward Occupancy */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '0.85rem 1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🚌</span> FORWARD OCCUPANCY
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: forwardStatusColor, margin: '0.2rem 0 0.1rem' }}>
            {forwardOccupancyPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: forwardStatusColor, fontWeight: '700' }}>
            {forwardStatusLabel}
          </div>
        </div>

        {/* Card 2: Return Occupancy */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '0.85rem 1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🔄</span> RETURN OCCUPANCY
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0284C7', margin: '0.2rem 0 0.1rem' }}>
            {returnOccupancyPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: '700' }}>
            Available Return Seats
          </div>
        </div>

        {/* Card 3: Fleet Status */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '0.85rem 1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🚍</span> FLEET STATUS
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0F172A', margin: '0.2rem 0 0.1rem' }}>
            {activeCoaches} <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#64748B' }}>Active</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: '700' }}>
            {reserveCoaches} Reserve Coaches Standby
          </div>
        </div>

        {/* Card 4: Crowd Load */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '0.85rem 1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>👥</span> CROWD LOAD
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: crowdStatusColor, margin: '0.2rem 0 0.1rem' }}>
            {crowdLoadPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: crowdStatusColor, fontWeight: '700' }}>
            Status: {crowdStatusLevel}
          </div>
        </div>

        {/* Card 5: Inflow Velocity */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '0.85rem 1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>🌊</span> INFLOW VELOCITY
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#2563EB', margin: '0.2rem 0 0.1rem' }}>
            {inflowVelocityPct}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: '700' }}>
            {inflowVelocityPct > 50 ? 'Inflow Exceeds Outflow' : 'Steady Transit Rate'}
          </div>
        </div>

        {/* Card 6: Next Scheduled Departure */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '0.85rem 1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>⏱️</span> NEXT DEPARTURE
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0F172A', margin: '0.2rem 0 0.1rem' }}>
            {nextDepartureMins}m
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '700' }}>
            To {nextHubName} ({transitEta})
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. AI ROUTE INTELLIGENCE PLAN (OPTIMIZED ALGORITHMIC RECOMMENDATION)      */}
      {/* ========================================================================= */}
      <AiRecommendationPanel
        aiRecommendation={aiRecommendation}
        onApplyRecommendation={handleApplyAiRecommendation}
        routeInfo={routeInfo}
      />

      {/* ========================================================================= */}
      {/* 6. FLEET DEPLOYMENT SIMULATOR (+5, +10 BUSSES INTERACTIVE CONTROLS)       */}
      {/* ========================================================================= */}
      <FleetSimulator
        deployedBuses={deployedBuses}
        setDeployedBuses={setDeployedBuses}
        simulationResult={simulationResult}
        aiRecommendation={aiRecommendation}
        agencyConfig={agencyConfig}
        demandForecast={demandForecast}
      />

      {/* ========================================================================= */}
      {/* 7. PILGRIMAGE CORRIDOR & LIVE YOLO TRANSIT FLOW                           */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '0.85rem 1.25rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>🛣️</span>
            <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0F172A' }}>
              Active Transit Corridor: {routeInfo.source.name} ➔ {routeInfo.destination.name}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Corridor Shortage: <strong style={{ color: totalCorridorShortage > 0 ? '#DC2626' : '#16A34A' }}>{totalCorridorShortage > 0 ? `${totalCorridorShortage} Coaches Needed` : '0 (Optimal)'}</strong>
          </div>
        </div>

        {/* Node Station Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.55rem',
          marginBottom: '0.85rem'
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
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  boxShadow: isSelected ? '0 2px 8px rgba(217,119,6,0.18)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: '800', color: isSelected ? '#92400E' : '#64748B' }}>
                    {sIdx + 1}. {name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '0.75rem' }}>{indicatorEmoji}</span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: isSelected ? '#92400E' : '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name.split('&')[0]}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                  <span>Load: <strong>{nodeLoad}%</strong></span>
                  <strong style={{ color: nodeShortage > 0 ? '#DC2626' : '#16A34A' }}>
                    {nodeShortage > 0 ? `-${nodeShortage} Bus` : '✓ OK'}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Hub YOLO & Real-Time Flow Sub-Card */}
        <div style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '0.65rem',
          border: '1px solid #E2E8F0',
          padding: '0.85rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#0284C7', fontWeight: '800', textTransform: 'uppercase' }}>
              Selected Transit Hub: {currRegion} · {cameraName}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0F172A', marginTop: '0.1rem' }}>
              {currNodeName} — Inflow: <strong style={{ color: '#2563EB' }}>{nodeInflowPct}%</strong> · Outflow: {outflowPct}% · YOLO Confidence: <strong style={{ color: '#059669' }}>{Number(confidence).toFixed(1)}%</strong>
            </div>
          </div>

          <label style={{
            backgroundColor: isUploading ? '#94A3B8' : '#0284C7',
            color: '#FFFFFF',
            borderRadius: '0.45rem',
            padding: '0.45rem 0.9rem',
            fontSize: '0.82rem',
            fontWeight: '800',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 6px rgba(2,132,199,0.2)'
          }}>
            <span>{isUploading ? '⏳' : '📹'}</span>
            <span>{isUploading ? 'Processing...' : 'Upload Video to YOLO'}</span>
            <input
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              disabled={isUploading}
              onChange={handleVideoUpload}
            />
          </label>
        </div>
      </div>

      {/* OPERATIONAL ALERTS (If meaningful conditions exist) */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {alerts.map((alert, idx) => {
            const isCrit = alert.severity === 'CRITICAL';
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isCrit ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${isCrit ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: '0.5rem',
                  padding: '0.65rem 1rem',
                  fontSize: '0.82rem',
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
                <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                  Action: <strong>{alert.action || 'Deploy standby coach'}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SCHEDULED COACH ROUTES & FLEET ALLOCATION MATRIX                       */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        padding: '1rem 1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🚌</span>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0F172A' }}>
                Active Company Coach Routes &amp; Fleet Allocations
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '0.5rem' }}>
                ({fleetRoutes.length} Active Corridors)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFleetModal(true)}
            style={{
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              borderRadius: '0.4rem',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            ⚙️ Adjust Coach Schedules
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {fleetRoutes.map((r) => (
            <div key={r.id} style={{ border: '1px solid #E2E8F0', borderRadius: '0.55rem', padding: '0.85rem', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '800' }}>
                <span style={{ color: '#D97706', backgroundColor: '#FEF3C7', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>{r.id}</span>
                <span style={{ color: r.forwardOccupancy >= 90 ? '#DC2626' : r.forwardOccupancy >= 75 ? '#EA580C' : '#16A34A', transition: 'color 0.2s ease' }}>
                  Fwd: {r.forwardOccupancy}% · Ret: {r.returnOccupancy}%
                </span>
              </div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#0F172A', margin: '0.4rem 0 0.2rem' }}>
                {r.from.split('(')[0]} → {r.to.split('(')[0]}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <span>{r.date} · {r.type}</span>
                <strong style={{ color: '#0F172A' }}>{r.buses} Coaches ({r.buses * r.capacity} seats)</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9. MODALS & OVERLAYS                                                      */}
      {/* ========================================================================= */}

      {/* DATA SOURCES MODAL */}
      {showDataSources && (
        <DataSourcesModal
          onClose={() => setShowDataSources(false)}
          eventContext={eventContext}
          routeInfo={routeInfo}
        />
      )}

      {/* DISPATCH SUMMARY MODAL */}
      {showDispatchSummary && (
        <DispatchSummaryModal
          onClose={() => setShowDispatchSummary(false)}
          routeInfo={routeInfo}
          simulationResult={simulationResult}
          dateSelection={dateSelection}
          agencyConfig={agencyConfig}
          onConfirmDispatch={(payload) => {
            notify(`✅ Bus schedule confirmed & dispatched: ${payload.deployed_buses} buses to ${routeInfo.source.name} ⇄ ${routeInfo.destination.name}`);
            setShowDispatchSummary(false);
          }}
        />
      )}

      {/* SURGE SIMULATION MODAL */}
      {showSimModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.75rem', maxWidth: '440px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '800' }}>⚡ Test Corridor Surge</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748B' }}>
              Simulate an influx at <strong>{currNodeName}</strong> to verify real-time alert triggers and bus recommendation.
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

      {/* FLEET SCHEDULE ADJUSTMENT MODAL */}
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
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          color: route.forwardOccupancy >= 90 ? '#DC2626' : route.forwardOccupancy >= 75 ? '#EA580C' : '#16A34A',
                          transition: 'color 0.2s ease'
                        }}>
                          Fwd: {route.forwardOccupancy}% · Ret: {route.returnOccupancy}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Corridor Occupancy</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: '0.5rem', padding: '0.65rem 1rem', border: '1px solid #E5E7EB' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' }}>Assigned Coaches:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateRouteBuses(idx, -1)}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          −
                        </button>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', minWidth: '2rem', textAlign: 'center' }}>{route.buses}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateRouteBuses(idx, 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #D97706', background: '#FEF3C7', fontWeight: 'bold', cursor: 'pointer', color: '#92400E' }}
                        >
                          +
                        </button>
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
                    const payload = fleetRoutes.map((r) => ({ id: r.id, buses: r.buses, operator: agencyConfig.agency_name }));
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

