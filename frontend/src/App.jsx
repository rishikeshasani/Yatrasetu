import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import TouristDashboard from './dashboards/TouristDashboard';
import GovernmentDashboard from './dashboards/GovernmentDashboard';
import HotelDashboard from './dashboards/HotelDashboard';
import TravelCompanyDashboard from './dashboards/TravelCompanyDashboard';
import WalletModal from './components/WalletModal';
import AuthModal from './components/AuthModal';
import DigitalYatriCardModal from './components/DigitalYatriCardModal';
import VendorDashboardModal from './components/VendorDashboardModal';
import SOSModal from './components/SOSModal';
import {
  fetchSites,
  fetchSiteDensity,
  fetchSiteForecast,
  fetchSitePrediction,
  fetchAlternatives,
  fetchAlerts,
  fetchSafetyInfo,
  fetchVendors,
  fetchWallet,
  rewardUser,
  loadUserSession,
  logoutUser
} from './api/api';
import './App.css';

export default function App() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [densityMap, setDensityMap] = useState({});
  const [currentDensity, setCurrentDensity] = useState(null);
  const [currentForecast, setCurrentForecast] = useState(null);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [currentAlternatives, setCurrentAlternatives] = useState(null);
  const [safetyInfo, setSafetyInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [wallet, setWallet] = useState({ total_points: 260, history: [] });
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Role Navigation State: 'tourist' | 'government' | 'hotel' | 'travel_company'
  const [activeRole, setActiveRole] = useState('tourist');

  // Pilgrim Advisory Active Route & Pending Reward State
  const [activeAlternateRoute, setActiveAlternateRoute] = useState(null);
  const [pendingPunyaReward, setPendingPunyaReward] = useState(0);
  const [routeStatus, setRouteStatus] = useState('IDLE'); // 'IDLE' | 'ACTIVE' | 'ARRIVED'
  const [completedRouteIds, setCompletedRouteIds] = useState([]);

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Initial Data Load & Session restore
  useEffect(() => {
    let isMounted = true;

    // Check localStorage session
    const savedUser = loadUserSession();
    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedUser.role && ['tourist', 'government', 'hotel', 'travel_company'].includes(savedUser.role)) {
        setActiveRole(savedUser.role);
      }
    }

    async function loadInitialData() {
      try {
        const fetchedSites = await fetchSites();
        if (!isMounted) return;
        setSites(fetchedSites);

        const defaultSite = fetchedSites.find(s => s.id === 'TS001' || s.id === 'site_kedarnath') || fetchedSites[0];
        const firstSiteId = defaultSite?.id || '';
        setSelectedSiteId(firstSiteId);

        const [fetchedAlerts, fetchedWallet] = await Promise.all([
          fetchAlerts(),
          fetchWallet(savedUser?.user_id || 'pilgrim_demo_user')
        ]);
        if (!isMounted) return;
        setAlerts(fetchedAlerts);
        setWallet(fetchedWallet);

        const dEntries = await Promise.all(
          fetchedSites.map(async (s) => [s.id, await fetchSiteDensity(s.id)])
        );
        if (!isMounted) return;
        setDensityMap(Object.fromEntries(dEntries));
      } catch (err) {
        console.error("Error loading initial YatraSetu data:", err);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Load static site metadata (alternatives, safety info, vendors) once per site selection
  useEffect(() => {
    let isMounted = true;
    if (!selectedSiteId) return;

    async function loadStaticSiteData() {
      try {
        const [alternatives, sInfo, siteVendors] = await Promise.all([
          fetchAlternatives(selectedSiteId),
          fetchSafetyInfo(selectedSiteId),
          fetchVendors(selectedSiteId)
        ]);

        if (!isMounted) return;

        // Defensive state preservation: prevent empty fallback from overwriting valid recommendations
        setCurrentAlternatives((prev) => {
          if (
            prev &&
            prev.site_id === selectedSiteId &&
            Array.isArray(prev.recommendations) &&
            prev.recommendations.length > 0 &&
            (!alternatives || !Array.isArray(alternatives.recommendations) || alternatives.recommendations.length === 0)
          ) {
            return prev;
          }
          return alternatives;
        });

        if (sInfo) setSafetyInfo(sInfo);
        if (siteVendors) setVendors(siteVendors);
      } catch (err) {
        console.error(`Error loading static data for ${selectedSiteId}:`, err);
      }
    }

    loadStaticSiteData();

    return () => {
      isMounted = false;
    };
  }, [selectedSiteId]);

  // 2. Load dynamic telemetry (density, forecast, prediction) with live auto-polling & concurrency guard
  const isPollingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedSiteId) return;

    async function pollTelemetry() {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const [density, forecast, prediction] = await Promise.all([
          fetchSiteDensity(selectedSiteId),
          fetchSiteForecast(selectedSiteId),
          fetchSitePrediction(selectedSiteId)
        ]);

        if (!isMounted) return;

        if (density) {
          setCurrentDensity(density);
          setDensityMap((prev) => ({ ...prev, [selectedSiteId]: density }));
        }
        if (forecast) setCurrentForecast(forecast);
        if (prediction) setCurrentPrediction(prediction);
      } catch (err) {
        console.error(`Error polling telemetry for ${selectedSiteId}:`, err);
      } finally {
        isPollingRef.current = false;
      }
    }

    pollTelemetry();

    const pollInterval = setInterval(pollTelemetry, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      isPollingRef.current = false;
    };
  }, [selectedSiteId]);

  const handleSelectSite = (siteId) => {
    setSelectedSiteId(siteId);
    if (routeStatus === 'ACTIVE') {
      setPendingPunyaReward(0);
      setActiveAlternateRoute(null);
      setRouteStatus('IDLE');
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    if (user.role && ['tourist', 'government', 'hotel', 'travel_company'].includes(user.role)) {
      setActiveRole(user.role);
    }
    if (user.role === 'tourist') {
      showToast(`🛡️ Welcome ${user.full_name}! Digital Yatri Card generated with Aadhaar verification.`);
      setIsProfileOpen(true);
    } else if (user.role === 'vendor') {
      showToast(`🏪 Welcome ${user.business_name}! Local Temple Vendor portal active.`);
      setIsProfileOpen(true);
    } else if (user.role === 'government') {
      showToast(`🏛️ Welcome ${user.full_name}! National Pilgrimage Command Center authorized.`);
    } else if (user.role === 'hotel') {
      showToast(`🏨 Welcome ${user.full_name}! Shrine Hospitality Partner console active.`);
    } else if (user.role === 'travel_company') {
      showToast(`🚌 Welcome ${user.full_name}! Fleet Logistics & Tour Planner ready.`);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsProfileOpen(false);
    showToast('Signed out successfully.');
  };

  // Immediate synchronization when Government updates crowd telemetry (POST /crowd/update)
  const handleCrowdUpdated = (siteId, updatedData) => {
    if (!updatedData) return;
    setDensityMap((prev) => ({
      ...prev,
      [siteId]: updatedData
    }));

    if (siteId === selectedSiteId) {
      setCurrentDensity(updatedData);
      setCurrentForecast((prev) => ({
        ...(prev || {}),
        live_status: {
          people_count: updatedData.people_count,
          occupancy_percentage: updatedData.occupancy_percentage,
          status: updatedData.status,
          last_updated: 'Just now (Govt Command Update)'
        },
        queue_forecast: {
          ...(prev?.queue_forecast || {}),
          estimated_current_wait_mins: updatedData.wait_time_minutes || (updatedData.occupancy_percentage >= 90 ? 540 : 25)
        }
      }));
      setCurrentAlternatives((prev) => ({
        ...(prev || {}),
        current_occupancy_percentage: updatedData.occupancy_percentage,
        current_status: updatedData.status,
        redistribution_needed: updatedData.occupancy_percentage >= 50
      }));
    }
  };

  const handleClaimReward = async (points, reason) => {
    const uid = currentUser?.user_id || 'pilgrim_demo_user';
    try {
      await rewardUser(uid, points, reason);
      setWallet((prev) => ({
        ...prev,
        total_points: (prev.total_points || 0) + points,
        history: [
          { id: Date.now(), points, reason, timestamp: 'Just now' },
          ...(prev.history || [])
        ]
      }));
      showToast(`🎉 Claimed +${points} Green Pilgrim Points!`);
    } catch (err) {
      showToast('Error claiming reward.');
    }
  };

  // Route selection: sets active route and marks +25 pending WITHOUT calling reward API
  const handleSelectRoute = (alt) => {
    const routeKey = alt?.alternative_id || alt?.name;
    const isAlreadyCompleted = completedRouteIds.includes(routeKey);

    if (isAlreadyCompleted) {
      setActiveAlternateRoute(alt);
      setRouteStatus('ARRIVED');
      setPendingPunyaReward(0);
      showToast(`Heading to ${alt.name} (Arrival reward already earned).`);
      return;
    }

    setActiveAlternateRoute(alt);
    setRouteStatus('ACTIVE');
    setPendingPunyaReward(25);
    showToast(`🟡 Alternate route selected: Heading to ${alt.name}. 🎁 +25 Punya Points pending arrival.`);
  };

  // Arrival completion: called ONLY when destination is reached via verified GPS or demo simulation
  const handleCompleteArrival = async (alt, source = 'gps') => {
    const routeKey = alt?.alternative_id || alt?.name;
    if (!routeKey) return;

    if (completedRouteIds.includes(routeKey)) {
      console.log(`[YatraSetu] Duplicate reward blocked for ${routeKey}`);
      return;
    }

    try {
      await rewardUser('pilgrim_demo_user', 25, `Reached alternate destination: ${alt.name}`);

      setCompletedRouteIds((prev) => [...prev, routeKey]);
      setRouteStatus('ARRIVED');
      setPendingPunyaReward(0);

      setWallet((prev) => ({
        ...prev,
        total_points: (prev.total_points || 0) + 25,
        history: [
          { id: Date.now(), points: 25, reason: `Reached alternate destination: ${alt.name}`, timestamp: 'Just now' },
          ...(prev.history || [])
        ]
      }));

      showToast(`🎉 Destination Reached! Welcome to ${alt.name}. +25 Punya Points added to your Green Pilgrim Wallet.`);
    } catch (err) {
      console.error("Error rewarding user upon arrival:", err);
      showToast(`Welcome to ${alt.name}! +25 Punya Points credited.`);
    }
  };

  // Switch Back to original destination
  const handleSwitchBack = () => {
    const siteTitle = selectedSite?.name || 'main shrine';
    if (routeStatus === 'ACTIVE') {
      setPendingPunyaReward(0);
      setActiveAlternateRoute(null);
      setRouteStatus('IDLE');
      showToast(`Alternate route canceled. Returning to ${siteTitle}. (0 points awarded)`);
    } else if (routeStatus === 'ARRIVED') {
      setActiveAlternateRoute(null);
      setRouteStatus('IDLE');
      showToast(`Returned view to ${siteTitle}. Earned Punya Points preserved.`);
    } else {
      setActiveAlternateRoute(null);
      setRouteStatus('IDLE');
    }
  };

  const handleRedeemVoucher = (voucher) => {
    setWallet((prev) => ({
      ...prev,
      total_points: Math.max(0, (prev.total_points || 0) - voucher.cost),
      history: [
        { id: Date.now(), points: -voucher.cost, reason: `Redeemed: ${voucher.title}`, timestamp: 'Just now' },
        ...(prev.history || [])
      ]
    }));
    showToast(`🎁 Redeemed "${voucher.title}" for ${voucher.cost} Points!`);
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  return (
    <div className="yatrasetu-app app-container">
      {/* Top Navigation with 4 Role Tabs */}
      <Navbar
        walletPoints={wallet?.total_points || 260}
        pendingPoints={pendingPunyaReward}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenSOS={() => setIsSOSModalOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        activeRole={activeRole}
        onSelectRole={(role) => setActiveRole(role)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span className="toast-sparkle">✨</span>
          <span className="toast-text">{toastMessage}</span>
          <button className="toast-close" onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Dynamic Role-Based Dashboard View */}
      <main className="main-content-container main-content">
        {activeRole === 'tourist' && (
          <TouristDashboard
            sites={sites}
            selectedSiteId={selectedSiteId}
            selectedSite={selectedSite}
            onSelectSite={handleSelectSite}
            densityMap={densityMap}
            currentDensity={currentDensity}
            currentForecast={currentForecast}
            currentPrediction={currentPrediction}
            currentAlternatives={currentAlternatives}
            safetyInfo={safetyInfo}
            alerts={alerts}
            vendors={vendors}
            activeAlternateRoute={activeAlternateRoute}
            pendingPunyaReward={pendingPunyaReward}
            routeStatus={routeStatus}
            completedRouteIds={completedRouteIds}
            onSelectRoute={handleSelectRoute}
            onCompleteArrival={handleCompleteArrival}
            onSwitchBack={handleSwitchBack}
            onOpenSOS={() => setIsSOSModalOpen(true)}
            currentUser={currentUser}
            onShowToast={showToast}
          />
        )}

        {activeRole === 'government' && (
          <GovernmentDashboard
            sites={sites}
            densityMap={densityMap}
            selectedSiteId={selectedSiteId}
            onSelectSite={handleSelectSite}
            onCrowdUpdated={handleCrowdUpdated}
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeRole === 'hotel' && (
          <HotelDashboard
            currentUser={currentUser}
            showToast={showToast}
          />
        )}

        {activeRole === 'travel_company' && (
          <TravelCompanyDashboard
            sites={sites}
            densityMap={densityMap}
            selectedSiteId={selectedSiteId}
            onSelectSite={handleSelectSite}
            showToast={showToast}
          />
        )}
      </main>

      {/* Green Pilgrim Wallet Modal */}
      {isWalletOpen && (
        <WalletModal
          isOpen={isWalletOpen}
          wallet={wallet}
          pendingReward={{ points: pendingPunyaReward, routeName: activeAlternateRoute?.name }}
          onClose={() => setIsWalletOpen(false)}
          onRedeem={handleRedeemVoucher}
        />
      )}

      {/* Unified Role Authentication & Demo Quick-Login Modal */}
      {isAuthOpen && (
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Tourist / Pilgrim Digital Yatri Suraksha Card Modal */}
      {isProfileOpen && (!currentUser || currentUser?.role === 'tourist') && (
        <DigitalYatriCardModal
          isOpen={isProfileOpen}
          user={currentUser || { full_name: 'Saatvik Sharma', role: 'tourist' }}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Local Temple Vendor Dashboard Modal */}
      {isProfileOpen && currentUser?.role === 'vendor' && (
        <VendorDashboardModal
          isOpen={isProfileOpen}
          user={currentUser}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Shared Emergency Distress SOS Modal */}
      {isSOSModalOpen && (
        <SOSModal
          isOpen={isSOSModalOpen}
          onClose={() => setIsSOSModalOpen(false)}
          currentUser={currentUser}
          currentSite={selectedSite}
          safetyInfo={safetyInfo}
          onSOSBroadcasted={(info) => {
            showToast(`🚨 Distress beacon dispatched for ${info.type}. Emergency network notified.`);
          }}
        />
      )}

      {/* Footer */}
      <footer className="yatrasetu-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-om">ॐ</span> YatraSetu Smart Pilgrimage Platform
            </div>
            <p className="footer-motto">
              Ensuring Safe, Serene &amp; Sustainable Darshan across India’s sacred shrines through Computer Vision, Queue Telemetry &amp; Gamified Flow Balancing.
            </p>
          </div>

          <div className="footer-links">
            <div className="link-col">
              <h4>Quick Emergency</h4>
              <p>National Emergency: <strong>112</strong></p>
              <p>Medical Ambulance: <strong>108</strong></p>
              <p>Disaster Helpline: <strong>1070</strong></p>
            </div>
            <div className="link-col">
              <h4>Active Corridors</h4>
              <p>• 25 Sacred Shrines (TS001–TS025)</p>
              <p>• AI CCTV Vision &amp; Telemetry</p>
              <p>• Punya Green Wallet &amp; Rewards</p>
              <p>• Multi-Agency Command Center</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <span>YatraSetu • Smart India Hackathon (SIH 2026)</span>
          <span>FastAPI Backend: <code>127.0.0.1:8000</code> • Role: <strong style={{ textTransform: 'uppercase' }}>{activeRole}</strong></span>
        </div>
      </footer>
    </div>
  );
}
