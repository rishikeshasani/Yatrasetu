import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTravelAgencyProfile, fetchActiveRerouteAlert } from '../api/api';
import {
  DEFAULT_AGENCY_CONFIG,
  resolveRoute,
  parseDateSelection,
  detectEventsForRouteAndDates,
  generateDemandForecast,
  simulateOperations,
  generateAiRecommendation,
  buildScenarioComparison
} from '../services/routeIntelligenceEngine';

// Sub-components
import RouteCommandBar from './route_intelligence/RouteCommandBar';
import EventContextBanner from './route_intelligence/EventContextBanner';
import RouteKpiRow from './route_intelligence/RouteKpiRow';
import DemandForecastChart from './route_intelligence/DemandForecastChart';
import RouteIntelligenceMap from './route_intelligence/RouteIntelligenceMap';
import FleetSimulator from './route_intelligence/FleetSimulator';
import AiRecommendationPanel from './route_intelligence/AiRecommendationPanel';
import ScenarioComparison from './route_intelligence/ScenarioComparison';
import DataSourcesModal from './route_intelligence/DataSourcesModal';
import DispatchSummaryModal from './route_intelligence/DispatchSummaryModal';
import './route_intelligence/RouteIntelligence.css';

export default function TravelAgencyConsole({ onOpenFleetModal, showToast: externalShowToast }) {
  // Agency Profile configuration from API / defaults
  const [agencyConfig, setAgencyConfig] = useState(DEFAULT_AGENCY_CONFIG);
  const [activeReroute, setActiveReroute] = useState(null);

  // 1. Primary Route Inputs (Source, Destination, Dates)
  const [source, setSource] = useState('HUB_DELHI_ISBT');
  const [destination, setDestination] = useState('TS015'); // Har Ki Pauri Haridwar
  const [dateInput, setDateInput] = useState('weekend');

  // Interactive Simulation Controls
  const [deployedBuses, setDeployedBuses] = useState(220);

  // UI Modals & State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDataSources, setShowDataSources] = useState(false);
  const [showDispatchSummary, setShowDispatchSummary] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Helper toast emitter
  const notify = useCallback((msg) => {
    if (externalShowToast) {
      externalShowToast(msg);
    } else {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 5000);
    }
  }, [externalShowToast]);

  // Load Agency Profile & Active Directives on mount
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

    fetchActiveRerouteAlert().then((reroute) => {
      if (reroute && reroute.is_active) {
        setActiveReroute(reroute);
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

  // Step 7: Scenario Comparison Matrix
  const scenarioMatrix = useMemo(() => {
    return buildScenarioComparison({
      demandForecast,
      customBuses: deployedBuses,
      customForwardFare: 1000,
      customReturnFare: 1000,
      aiRecommendation,
      routeInfo,
      agencyConfig
    });
  }, [demandForecast, deployedBuses, aiRecommendation, routeInfo, agencyConfig]);

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
    setDeployedBuses(aiRecommendation.recommended_buses);
    notify(`✨ Applied AI Recommended deployment: ${aiRecommendation.recommended_buses} buses (${(aiRecommendation.recommended_buses * agencyConfig.bus_seat_capacity).toLocaleString()} seats) on ${routeInfo.source.name} ⇄ ${routeInfo.destination.name}`);
  };

  // Handle scenario selection from matrix
  const handleSelectScenario = (sc) => {
    setDeployedBuses(sc.deployed_buses);
    notify(`Loaded ${sc.name} deployment: ${sc.deployed_buses} buses (${(sc.deployed_buses * agencyConfig.bus_seat_capacity).toLocaleString()} seats)`);
  };

  return (
    <div className="ri-console-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '0.85rem 1.25rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          border: '1px solid #334155',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>🔔</span> {toastMessage}
        </div>
      )}

      {/* Main Console Header */}
      <div className="ri-header-card">
        <div>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '800',
            color: '#D97706',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.2rem'
          }}>
            YatraSetu Fleet Operations
          </div>
          <h2 style={{
            fontSize: '1.65rem',
            fontWeight: '900',
            color: '#0F172A',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <span>🚌</span> {agencyConfig.agency_name} — AI Route Intelligence
          </h2>
          <div style={{ fontSize: '0.86rem', color: '#64748B', marginTop: '0.25rem' }}>
            Enterprise Partner Console • Fleet Asset Base: <strong>{agencyConfig.total_fleet_capacity} Buses</strong> • Active Corridor Operations
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowDataSources(true)}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '0.5rem',
              padding: '0.55rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            🛡️ Data Sources &amp; Confidence
          </button>

          <button
            type="button"
            onClick={() => setShowDispatchSummary(true)}
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.55rem 1.15rem',
              fontSize: '0.86rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
            }}
          >
            🚌 Dispatch &amp; Confirm Bus Schedule
          </button>
        </div>
      </div>

      {/* 1. ROUTE SEARCH / CONTROL BAR (STICKY/PROMINENT) */}
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

      {/* 2. DYNAMIC EVENT / YATRA CONTEXT BANNER */}
      <EventContextBanner
        eventContext={eventContext}
        routeInfo={routeInfo}
        dateSelection={dateSelection}
      />

      {/* 3. ROUTE INTELLIGENCE KPI ROW (6 OPERATIONAL METRICS) */}
      <RouteKpiRow
        demandForecast={demandForecast}
        simulationResult={simulationResult}
        agencyConfig={agencyConfig}
      />

      {/* 4. MAIN OPERATIONAL WORKSPACE */}
      <div className="ri-operations-workspace">
        {/* Module 1: AI Recommendation */}
        <div className="ri-order-airec">
          <AiRecommendationPanel
            aiRecommendation={aiRecommendation}
            onApplyRecommendation={handleApplyAiRecommendation}
            routeInfo={routeInfo}
          />
        </div>

        {/* Module 2: Demand Forecast Responsive Chart */}
        <div className="ri-order-forecast">
          <DemandForecastChart
            demandForecast={demandForecast}
            deployedBuses={deployedBuses}
            routeInfo={routeInfo}
            dateSelection={dateSelection}
          />
        </div>

        {/* Module 3: Highway Corridor Map */}
        <div className="ri-order-map">
          <RouteIntelligenceMap
            routeInfo={routeInfo}
            deployedBuses={deployedBuses}
            activeReroute={activeReroute}
          />
        </div>

        {/* Module 4: Fleet Deployment Simulator */}
        <div className="ri-order-fleet">
          <FleetSimulator
            deployedBuses={deployedBuses}
            setDeployedBuses={setDeployedBuses}
            simulationResult={simulationResult}
            aiRecommendation={aiRecommendation}
            agencyConfig={agencyConfig}
            demandForecast={demandForecast}
          />
        </div>

        {/* Module 5: Scenario Comparison Matrix */}
        <div className="ri-order-scenarios">
          <ScenarioComparison
            scenarios={scenarioMatrix}
            onSelectScenario={handleSelectScenario}
          />
        </div>
      </div>

      {/* Final Action Bar */}
      <div style={{
        marginTop: '1.25rem',
        padding: '1.25rem 1.5rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '0.75rem',
        border: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0F172A' }}>
            Ready to deploy schedule for {routeInfo.source.name} ⇄ {routeInfo.destination.name}?
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.15rem' }}>
            Current simulation assigns <strong>{deployedBuses} buses</strong> (<strong>{(deployedBuses * agencyConfig.bus_seat_capacity).toLocaleString()} seats</strong>) with <strong>{simulationResult.reserve_fleet} standby coaches</strong> in depot.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDispatchSummary(true)}
          style={{
            backgroundColor: '#D97706',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.75rem',
            fontSize: '0.96rem',
            fontWeight: '900',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
          }}
        >
          🚌 Dispatch &amp; Confirm Bus Schedule
        </button>
      </div>

      {/* MODAL 1: Data Sources & Provenance */}
      <DataSourcesModal
        isOpen={showDataSources}
        onClose={() => setShowDataSources(false)}
        destination={routeInfo.destination}
      />

      {/* MODAL 2: Final Dispatch Confirmation Summary */}
      <DispatchSummaryModal
        isOpen={showDispatchSummary}
        onClose={() => setShowDispatchSummary(false)}
        routeInfo={routeInfo}
        dateSelection={dateSelection}
        simulationResult={simulationResult}
        agencyConfig={agencyConfig}
        onDispatchSuccess={(data) => {
          notify(data.message);
          // Optional backward compatibility trigger if parent dashboard listens
          if (onOpenFleetModal) {
            // parent modal can remain closed or sync
          }
        }}
      />
    </div>
  );
}
