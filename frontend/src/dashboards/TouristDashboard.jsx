import React from 'react';
import SiteSelector from '../components/SiteSelector';
import LiveCrowdCard from '../components/LiveCrowdCard';
import PilgrimAdvisory from '../components/PilgrimAdvisory';
import SafetyAlerts from '../components/SafetyAlerts';
import LocalVendors from '../components/LocalVendors';
import TeamTracker from '../components/TeamTracker';

export default function TouristDashboard({
  sites = [],
  selectedSiteId,
  selectedSite,
  onSelectSite,
  densityMap = {},
  currentDensity,
  currentForecast,
  currentPrediction,
  currentAlternatives,
  safetyInfo,
  alerts = [],
  vendors = [],
  activeAlternateRoute,
  pendingPunyaReward = 0,
  routeStatus = 'IDLE',
  completedRouteIds = [],
  onSelectRoute,
  onCompleteArrival,
  onSwitchBack,
  onOpenSOS
}) {
  return (
    <div className="tourist-dashboard-flow">
      {/* 25 Official Shrines Explorer */}
      <SiteSelector
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSelectSite={onSelectSite}
        densityMap={densityMap}
      />

      {selectedSite && (
        <>
          {/* Live Crowd Card: AI CCTV Telemetry, Occupancy %, Queue Wait Time */}
          <LiveCrowdCard
            site={selectedSite}
            density={currentDensity}
            forecast={currentForecast}
            prediction={currentPrediction}
          />

          {/* AI Pilgrim Advisory & Dynamic Alternative Route Recommendation */}
          <PilgrimAdvisory
            currentSite={selectedSite}
            density={currentDensity}
            forecast={currentForecast}
            prediction={currentPrediction}
            alternativesData={currentAlternatives}
            activeAlternateRoute={activeAlternateRoute}
            pendingPunyaReward={pendingPunyaReward}
            routeStatus={routeStatus}
            completedRouteIds={completedRouteIds}
            onSelectRoute={onSelectRoute}
            onCompleteArrival={onCompleteArrival}
            onSwitchBack={onSwitchBack}
          />

          {/* Yatra Dal Group Tracker */}
          <TeamTracker
            currentSite={selectedSite}
            siteId={selectedSiteId}
          />

          {/* Safety Advisories, Emergency SOS & SDRF Contacts */}
          <SafetyAlerts
            alerts={alerts}
            safetyInfo={safetyInfo}
            currentSite={selectedSite}
            onOpenSOS={onOpenSOS}
          />

          {/* Vocal for Local Temple Bazaar & Registered Vendors */}
          <LocalVendors
            vendors={vendors}
            siteName={selectedSite.name}
          />
        </>
      )}
    </div>
  );
}
