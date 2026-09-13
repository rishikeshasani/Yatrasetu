import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchTransitNodes,
  fetchTransitNode,
  simulateTransitNode,
  dispatchLocalTransitBus,
  uploadTransitVideo
} from '../../api/api';
import StatusBadge from '../common/StatusBadge';

export default function TransitFlowIntelligence({ showToast }) {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('NODE_HW_STN');
  const [activeNodeData, setActiveNodeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simParams, setSimParams] = useState({
    headcountDelta: 30,
    inflow: 25,
    outflow: 10,
    waitingToAdd: 15,
    reroutesToAdd: 10
  });

  // Helper notification
  const notify = useCallback((msg) => {
    if (showToast) {
      showToast(msg);
    } else {
      console.log(msg);
    }
  }, [showToast]);

  // Load all transit nodes
  const loadNodes = useCallback(async (selectId = null) => {
    try {
      setIsLoading(true);
      const res = await fetchTransitNodes();
      if (res?.nodes) {
        setNodes(res.nodes);
        const targetId = selectId || selectedNodeId || res.nodes[0]?.node_id;
        setSelectedNodeId(targetId);
        const current = res.nodes.find(n => n.node_id === targetId) || res.nodes[0];
        setActiveNodeData(current);
      }
    } catch (err) {
      console.error('Failed to load transit nodes:', err);
      notify('⚠️ Could not connect to transit telemetry server.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedNodeId, notify]);

  // Initial load and periodic polling
  useEffect(() => {
    loadNodes();
    const interval = setInterval(() => {
      loadNodes(selectedNodeId);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedNodeId]);

  // Handle switching nodes
  const handleSelectNode = async (nodeId) => {
    setSelectedNodeId(nodeId);
    const existing = nodes.find(n => n.node_id === nodeId);
    if (existing) setActiveNodeData(existing);
    try {
      const fresh = await fetchTransitNode(nodeId);
      if (fresh) setActiveNodeData(fresh);
    } catch (err) {
      console.error('Failed to refresh node details:', err);
    }
  };

  // Video Upload Ingestion Handler
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress('Uploading video to YOLO pipeline...');
      notify(`🎥 Processing feed for ${activeNodeData?.node_name || selectedNodeId}...`);

      const res = await uploadTransitVideo(selectedNodeId, file, { sampleInterval: 15 });

      if (res && res.flow_analysis) {
        setUploadProgress('YOLO inference complete. Updating fleet demand & reroutes...');
        notify(`✅ Video processed! Detected ${res.flow_analysis.average_headcount} avg people (peak ${res.flow_analysis.peak_headcount}) with ${(res.flow_analysis.confidence * 100).toFixed(1)}% confidence.`);
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
      notify(`🚌 ${res.message || `Dispatched ${busesToDeploy} local transit bus(es)!`}`);
      await loadNodes(selectedNodeId);
    } catch (err) {
      console.error('Dispatch failed:', err);
      notify(`❌ Dispatch failed: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  // Run Traffic / Surge Simulation
  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const res = await simulateTransitNode(selectedNodeId, simParams);
      notify(`⚡ Injected flow spike into ${activeNodeData?.node_name}! Fleet demand recalculated.`);
      setShowSimModal(false);
      if (res?.node) {
        setActiveNodeData(res.node);
        setNodes(prev => prev.map(n => n.node_id === res.node.node_id ? res.node : n));
      } else {
        await loadNodes(selectedNodeId);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      notify(`❌ Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Derived metrics from active node
  const observation = activeNodeData?.observation || {};
  const rerouteFunnel = activeNodeData?.reroute_funnel || {};
  const fleet = activeNodeData?.fleet || {};
  const alerts = activeNodeData?.alerts || [];
  const history = activeNodeData?.historical_flow || [];

  // 24h Flow Chart Coordinates Helper
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return { polyline: '', points: [], maxVal: 100 };
    const maxVal = Math.max(100, ...history.map(h => Math.max(h.headcount, h.inflow || 0)));
    const width = 680;
    const height = 140;
    const padding = 20;

    const points = history.map((item, idx) => {
      const x = padding + (idx / (history.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (item.headcount / maxVal) * (height - 2 * padding);
      return { x, y, ...item };
    });

    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { polyline, points, maxVal, width, height };
  }, [history]);

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      padding: '1.25rem 1.5rem 2rem',
      borderRadius: '0.75rem',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A'
    }}>
      {/* 1. Header & Live Node Bar */}
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
            Combines live CCTV computer-vision aggregate headcount, entering/exiting flow rates, with YatraSetu bookings &amp; reroute funnel queues.
          </p>
        </div>

        {/* Top Control Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Video Upload Button */}
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
            gap: '0.4rem',
            boxShadow: '0 2px 4px rgba(2,132,199,0.2)'
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

          {/* Simulate Flow Spike Button */}
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
            ⚡ Simulate Spike
          </button>
        </div>
      </div>

      {/* Upload Progress Overlay Notice */}
      {isUploading && uploadProgress && (
        <div style={{
          backgroundColor: '#E0F2FE',
          border: '1px solid #7DD3FC',
          borderRadius: '0.5rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          color: '#0369A1',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <span style={{ animation: 'spin 1s infinite' }}>🔄</span>
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* 2. Transit Node Selector Pills */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '1.25rem'
      }}>
        {nodes.map(node => {
          const isSelected = node.node_id === selectedNodeId;
          const hasAlert = node.alerts && node.alerts.length > 0;
          return (
            <button
              key={node.node_id}
              onClick={() => handleSelectNode(node.node_id)}
              style={{
                backgroundColor: isSelected ? '#0F172A' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#334155',
                border: isSelected ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                borderRadius: '0.65rem',
                padding: '0.65rem 1.15rem',
                fontSize: '0.86rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                boxShadow: isSelected ? '0 4px 10px rgba(15,23,42,0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{node.node_type === 'railway_station' ? '🚉' : node.node_type === 'bus_terminal' ? '🚏' : '⛰️'}</span>
              <span>{node.node_name}</span>
              {hasAlert && (
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
                  {node.alerts.length}
                </span>
              )}
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
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: alert.severity === 'CRITICAL' ? '#FEF2F2' : alert.severity === 'WARNING' ? '#FFFBEB' : '#EFF6FF',
                border: `1px solid ${alert.severity === 'CRITICAL' ? '#FCA5A5' : alert.severity === 'WARNING' ? '#FDE68A' : '#BFDBFE'}`,
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
                  {alert.alert_type === 'FLEET_SHORTAGE' ? '🚨' : alert.alert_type === 'REROUTE_SURGE' ? '🔀' : '⚠️'}
                </span>
                <div>
                  <div style={{
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    color: alert.severity === 'CRITICAL' ? '#991B1B' : alert.severity === 'WARNING' ? '#92400E' : '#1E40AF'
                  }}>
                    {alert.alert_type.replace(/_/g, ' ')}: {alert.message}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.1rem' }}>
                    Triggered by dynamic multi-source flow monitoring • Telemetry updated {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {alert.alert_type === 'FLEET_SHORTAGE' && fleet.net_shortage > 0 && (
                <button
                  type="button"
                  disabled={isDispatching}
                  onClick={() => handleDispatchBus(fleet.net_shortage)}
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
                  {isDispatching ? 'Deploying...' : `🚀 Deploy ${fleet.net_shortage} Bus(es) Now`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Telemetry KPI Grid (6 Top Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem'
      }}>
        {/* Card 1: Headcount */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Current Headcount
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0F172A', margin: '0.2rem 0' }}>
            {observation.people_count || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>
            YOLO Video Inference
          </div>
        </div>

        {/* Card 2: Flow Rates */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Inflow / Outflow
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#0F172A', margin: '0.2rem 0' }}>
            <span style={{ color: '#2563EB' }}>+{observation.inflow_rate_per_min || 0}</span> / <span style={{ color: '#64748B' }}>-{observation.outflow_rate_per_min || 0}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            rate per min
          </div>
        </div>

        {/* Card 3: Agency Bookings Waiting */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Agency Expected
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#D97706', margin: '0.2rem 0' }}>
            {activeNodeData?.agency_passengers_expected || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {rerouteFunnel.waiting || 0} waiting at depot
          </div>
        </div>

        {/* Card 4: Confirmed Reroutes */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Reroute Funnel
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#7C3AED', margin: '0.2rem 0' }}>
            {rerouteFunnel.confirmed || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {rerouteFunnel.offered || 0} offered / {rerouteFunnel.accepted || 0} accepted
          </div>
        </div>

        {/* Card 5: Required Fleet */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            Required Buses
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: fleet.net_shortage > 0 ? '#DC2626' : '#16A34A', margin: '0.2rem 0' }}>
            {fleet.required_buses || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {fleet.available_buses || 0} currently deployed
          </div>
        </div>

        {/* Card 6: Model Confidence */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.65rem',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
            CV Confidence
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: '#0284C7', margin: '0.2rem 0' }}>
            {((observation.confidence_score || 0.94) * 100).toFixed(0)}%
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
        {/* Left Column: Flow Telemetry & 6-Stage Funnel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 6-Stage Reroute Funnel Component */}
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
                  Tracks pilgrim state progression when capacity overrides or weather diversions occur.
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
                Funnel Throughput: {rerouteFunnel.completed || 0} completed
              </span>
            </div>

            {/* Visual Funnel Step Sequence */}
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
                { label: 'Offered', count: rerouteFunnel.offered || 0, color: '#64748B', bg: '#F1F5F9' },
                { label: 'Accepted', count: rerouteFunnel.accepted || 0, color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Confirmed', count: rerouteFunnel.confirmed || 0, color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Waiting', count: rerouteFunnel.waiting || 0, color: '#D97706', bg: '#FEF3C7' },
                { label: 'Boarded', count: rerouteFunnel.boarded || 0, color: '#2563EB', bg: '#DBEAFE' },
                { label: 'Completed', count: rerouteFunnel.completed || 0, color: '#059669', bg: '#D1FAE5' }
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
                    {stage.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 24-Hour Historical Flow Chart */}
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
                  📈 24-Hour Aggregate Headcount &amp; Flow Rate
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Continuous hourly trend derived from YOLO aggregate frame observations.
                </p>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                Peak Flow: <strong>{chartData.maxVal} people</strong>
              </div>
            </div>

            {/* Chart SVG */}
            <div style={{ overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} style={{ width: '100%', height: 'auto', minWidth: '420px' }}>
                {/* Horizontal Grid lines */}
                <line x1="20" y1="20" x2={chartData.width - 20} y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1={chartData.height / 2} x2={chartData.width - 20} y2={chartData.height / 2} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1={chartData.height - 20} x2={chartData.width - 20} y2={chartData.height - 20} stroke="#E2E8F0" strokeWidth="1.5" />

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
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5" />
                    {idx % 4 === 0 && (
                      <text
                        x={p.x}
                        y={chartData.height - 5}
                        fontSize="9"
                        fill="#94A3B8"
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {p.hour}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </div>

        </div>

        {/* Right Column: Local Fleet Sizing & Action Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Local Fleet Sizing Decision Box */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0.75rem',
            border: fleet.net_shortage > 0 ? '2px solid #FCA5A5' : '1px solid #E2E8F0',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>
                🚌 Local Transit Sizing &amp; Demand Math
              </h3>
              <StatusBadge
                status={fleet.net_shortage > 0 ? 'CRITICAL' : 'OPTIMAL'}
                theme="light"
                size="xs"
                label={fleet.net_shortage > 0 ? `${fleet.net_shortage} SHORT` : 'SUFFICIENT'}
              />
            </div>

            {/* Math Formula Card */}
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
                <span style={{ color: '#64748B' }}>Waiting at Staging:</span>
                <strong>{rerouteFunnel.waiting || 0} passengers</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Incoming Demand (15m):</span>
                <strong>{observation.inflow_rate_per_min ? Math.round(observation.inflow_rate_per_min * 15 * 0.4) : 0} passengers</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', borderTop: '1px dashed #CBD5E1', paddingTop: '0.35rem' }}>
                <span style={{ color: '#0F172A', fontWeight: '700' }}>Total Expected Demand:</span>
                <strong style={{ color: '#D97706' }}>{fleet.expected_demand || 0} passengers</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748B' }}>Usable Bus Capacity:</span>
                <span>{fleet.usable_seat_capacity || 36} seats (40 × 90%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: '0.35rem' }}>
                <span style={{ color: '#0F172A', fontWeight: '800' }}>Required Fleet:</span>
                <strong style={{ color: '#0F172A', fontSize: '0.95rem' }}>{fleet.required_buses || 0} Buses</strong>
              </div>
            </div>

            {/* Rationale String */}
            <div style={{
              backgroundColor: fleet.net_shortage > 0 ? '#FEF2F2' : '#F0FDF4',
              border: `1px solid ${fleet.net_shortage > 0 ? '#FECACA' : '#BBF7D0'}`,
              borderRadius: '0.5rem',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: fleet.net_shortage > 0 ? '#991B1B' : '#166534',
              fontWeight: '600'
            }}>
              💡 {fleet.rationale || 'Fleet is currently sufficient to meet passenger load.'}
            </div>

            {/* Quick Dispatch Action */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                disabled={isDispatching}
                onClick={() => handleDispatchBus(Math.max(1, fleet.net_shortage || 1))}
                style={{
                  flex: 1,
                  backgroundColor: fleet.net_shortage > 0 ? '#DC2626' : '#D97706',
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
                <span>{isDispatching ? 'Dispatching...' : `Deploy ${Math.max(1, fleet.net_shortage || 1)} Shuttle Bus(es)`}</span>
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
              <div><strong>Feed Source:</strong> {observation.feed_id || 'FEED-LIVE'}</div>
              <div><strong>Last Updated:</strong> {observation.timestamp ? new Date(observation.timestamp).toLocaleString() : 'Just now'}</div>
              <div><strong>Privacy Mode:</strong> Aggregate Flow Only (No facial recognition / biometric IDs)</div>
              <div><strong>Corridor Route:</strong> {activeNodeData?.route_corridor || 'Haridwar - Kedarnath Highway'}</div>
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
              Inject a sudden rush into <strong>{activeNodeData?.node_name}</strong> to evaluate dynamic fleet auto-scaling and alert triggers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Headcount Increase (+passengers)
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
                    Inflow (/min)
                  </label>
                  <input
                    type="number"
                    value={simParams.inflow}
                    onChange={e => setSimParams({ ...simParams, inflow: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                    Outflow (/min)
                  </label>
                  <input
                    type="number"
                    value={simParams.outflow}
                    onChange={e => setSimParams({ ...simParams, outflow: Number(e.target.value) })}
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
