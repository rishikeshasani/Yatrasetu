import React, { useState, useEffect } from 'react';
import SiteSelector from '../components/SiteSelector';
import LiveCrowdCard from '../components/LiveCrowdCard';
import PilgrimAdvisory from '../components/PilgrimAdvisory';
import SafetyAlerts from '../components/SafetyAlerts';
import LocalVendors from '../components/LocalVendors';
import TeamTracker from '../components/TeamTracker';
import { fetchHotels } from '../api/api';

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
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadHotels() {
      try {
        const hotelList = await fetchHotels();
        if (isMounted && Array.isArray(hotelList)) {
          setHotels(hotelList);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadHotels();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="tourist-dashboard-flow" id="tourist-home">
      {/* 25 Official Shrines Explorer */}
      <div id="tourist-destinations">
        <SiteSelector
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={onSelectSite}
          densityMap={densityMap}
        />
      </div>

      {selectedSite && (
        <>
          {/* Live Crowd Card: AI CCTV Telemetry, Occupancy %, Queue Wait Time */}
          <div id="tourist-crowd-status">
            <div id="tourist-forecast">
              <LiveCrowdCard
                site={selectedSite}
                density={currentDensity}
                forecast={currentForecast}
                prediction={currentPrediction}
              />
            </div>
          </div>

          {/* AI Pilgrim Advisory & Dynamic Alternative Route Recommendation */}
          <div id="tourist-alternatives">
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
          </div>

          {/* Yatra Dal Group Tracker */}
          <TeamTracker
            currentSite={selectedSite}
            siteId={selectedSiteId}
          />

          {/* Safety Advisories, Emergency SOS & SDRF Contacts */}
          <div id="tourist-safety">
            <SafetyAlerts
              alerts={alerts}
              safetyInfo={safetyInfo}
              currentSite={selectedSite}
              onOpenSOS={onOpenSOS}
            />
          </div>

          {/* Verified Shrines Lodges & Accommodations Section */}
          <div id="tourist-hotels" className="tourist-hotels-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '1rem',
              border: '1px solid #E2E8F0',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🏨</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0F172A' }}>
                      Verified Shrine Accommodations &amp; Lodges
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                      Official temple ashrams, GMVN rest houses, and verified hospitality partners near {selectedSite?.name || 'shrine'}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  border: '1px solid #A7F3D0'
                }}>
                  ✓ Official YatraSetu Verified
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {(hotels.length > 0 ? hotels.slice(0, 3) : [
                  { id: 'h1', name: 'Kedarnath Himalayan Inn & Ashrams', address: 'Temple Path, Zone B', price_per_night: 1200, rating: 4.8 },
                  { id: 'h2', name: 'GMVN Kedarnath Tourist Rest House', address: 'Helipad Approach Road', price_per_night: 850, rating: 4.6 },
                  { id: 'h3', name: 'Badrinath Yatri Niwas & Bhavan', address: 'Main Temple Gate #2', price_per_night: 950, rating: 4.7 }
                ]).map((h) => (
                  <div key={h.id} style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    background: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '700', color: '#0F172A' }}>{h.name}</h4>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#D97706', background: '#FEF3C7', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          ★ {h.rating || '4.8'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>📍 {h.address || 'Near Sacred Pilgrimage Sector'}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0F172A' }}>
                        ₹{h.price_per_night || 1000}<span style={{ fontSize: '0.72rem', fontWeight: '500', color: '#64748B' }}> / night</span>
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700' }}>
                        • Express Check-in Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
