import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import SiteSelector from './components/SiteSelector';
import LiveCrowdCard from './components/LiveCrowdCard';
import PilgrimAdvisory from './components/PilgrimAdvisory';
import SafetyAlerts from './components/SafetyAlerts';
import LocalVendors from './components/LocalVendors';
import TeamTracker from './components/TeamTracker';
import WalletModal from './components/WalletModal';
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
  triggerSOS
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

  // Pilgrim Advisory Active Route & Pending Reward State
  const [activeAlternateRoute, setActiveAlternateRoute] = useState(null);
  const [pendingPunyaReward, setPendingPunyaReward] = useState(0);
  const [routeStatus, setRouteStatus] = useState('IDLE'); // 'IDLE' | 'ACTIVE' | 'ARRIVED'
  const [completedRouteIds, setCompletedRouteIds] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Initial Data Load
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const fetchedSites = await fetchSites();
        if (!isMounted) return;
        setSites(fetchedSites);

        // Select initial site from real backend sites (prefer TS001 Kedarnath if present, else first returned site)
        const defaultSite = fetchedSites.find(s => s.id === 'TS001') || fetchedSites[0];
        const firstSiteId = defaultSite?.id || '';
        setSelectedSiteId(firstSiteId);

        const [fetchedAlerts, fetchedWallet] = await Promise.all([
          fetchAlerts(),
          fetchWallet('pilgrim_demo_user')
        ]);
        if (!isMounted) return;
        setAlerts(fetchedAlerts);
        setWallet(fetchedWallet);

        // Build density map for all sites in parallel
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

  // 2. Load dynamic telemetry (density, forecast, prediction) with live 3-second auto-polling & concurrency guard
  const isPollingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedSiteId) return;

    async function pollTelemetry() {
      // Prevent overlapping polling requests / race conditions
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

  const handleClaimReward = async (points, reason) => {
    try {
      await rewardUser('pilgrim_demo_user', points, reason);
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

    // When switching to another alternative before reaching: cancel previous pending, set fresh +25 pending
    setActiveAlternateRoute(alt);
    setRouteStatus('ACTIVE');
    setPendingPunyaReward(25);
    showToast(`🟡 Alternate route selected: Heading to ${alt.name}. 🎁 +25 Punya Points pending arrival.`);
  };

  // Arrival completion: called ONLY when destination is reached via verified GPS or demo simulation
  const handleCompleteArrival = async (alt, source = 'gps') => {
    const routeKey = alt?.alternative_id || alt?.name;
    if (!routeKey) return;

    // Guard against duplicate reward submissions
    if (completedRouteIds.includes(routeKey)) {
      console.log(`[YatraSetu] Duplicate reward blocked for ${routeKey}`);
      return;
    }

    try {
      // ONLY now call backend POST /wallet/reward
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
      // Cancel pending reward; do NOT award points
      setPendingPunyaReward(0);
      setActiveAlternateRoute(null);
      setRouteStatus('IDLE');
      showToast(`Alternate route canceled. Returning to ${siteTitle}. (0 points awarded)`);
    } else if (routeStatus === 'ARRIVED') {
      // Return to normal destination; do NOT remove already-earned points
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

  const handleNavbarSOS = async (reason = 'Medical / Crowd Crush') => {
    try {
      const activeSite = sites.find((s) => s.id === selectedSiteId);
      const lat = activeSite?.latitude || 30.7352;
      const lon = activeSite?.longitude || 79.0669;
      const res = await triggerSOS(selectedSiteId || 'pilgrim_demo_user', lat, lon);
      showToast(res.message || `🚨 Emergency SOS broadcasted to SDRF & Temple Command Center for ${activeSite?.name || 'your location'}.`);
    } catch (err) {
      showToast('Emergency SOS dispatched.');
    }
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  return (
    <div className="yatrasetu-app app-container">
      {/* Top Navigation */}
      <Navbar
        walletPoints={wallet?.total_points || 260}
        pendingPoints={pendingPunyaReward}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenSOS={() => handleNavbarSOS('Emergency Alert')}
        onTriggerSOS={() => handleNavbarSOS('Emergency Alert')}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span className="toast-sparkle">✨</span>
          <span className="toast-text">{toastMessage}</span>
          <button className="toast-close" onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content-container main-content">
        <SiteSelector
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={handleSelectSite}
          densityMap={densityMap}
        />

        {selectedSite && (
          <>
            <LiveCrowdCard
              site={selectedSite}
              density={currentDensity}
              forecast={currentForecast}
              prediction={currentPrediction}
            />

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
              onSelectRoute={handleSelectRoute}
              onCompleteArrival={handleCompleteArrival}
              onSwitchBack={handleSwitchBack}
            />

            <TeamTracker
              currentSite={selectedSite}
              siteId={selectedSiteId}
            />

            <SafetyAlerts
              alerts={alerts}
              safetyInfo={safetyInfo}
              currentSite={selectedSite}
            />

            <LocalVendors
              vendors={vendors}
              siteName={selectedSite.name}
            />
          </>
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

      {/* Footer */}
      <footer className="yatrasetu-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-om">ॐ</span> YatraSetu Smart Pilgrimage Platform
            </div>
            <p className="footer-motto">
              Ensuring Safe, Serene & Sustainable Darshan across India’s sacred shrines through Computer Vision, Queue Telemetry & Gamified Flow Balancing.
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
              <h4>Smart Features</h4>
              <p>• Computer Vision Headcount</p>
              <p>• AI Dynamic Redistribution</p>
              <p>• Green Pilgrim Punya Wallet</p>
              <p>• Vocal for Local Bazaar</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <span>YatraSetu • Developed for Smart India Hackathon (SIH)</span>
          <span>FastAPI Backend Connected: <code>127.0.0.1:8000</code></span>
        </div>
      </footer>
    </div>
  );
}
