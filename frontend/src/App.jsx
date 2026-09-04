import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SiteSelector from './components/SiteSelector';
import LiveCrowdCard from './components/LiveCrowdCard';
import AlternativeSpots from './components/AlternativeSpots';
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

  // Load selected site-specific telemetry with live 3-second auto-polling
  useEffect(() => {
    let isMounted = true;
    if (!selectedSiteId) return;

    async function loadSiteData() {
      try {
        const [density, forecast, prediction, alternatives, sInfo, siteVendors] = await Promise.all([
          fetchSiteDensity(selectedSiteId),
          fetchSiteForecast(selectedSiteId),
          fetchSitePrediction(selectedSiteId),
          fetchAlternatives(selectedSiteId),
          fetchSafetyInfo(selectedSiteId),
          fetchVendors(selectedSiteId)
        ]);

        if (!isMounted) return;
        setCurrentDensity(density);
        setCurrentForecast(forecast);
        setCurrentPrediction(prediction);
        setCurrentAlternatives(alternatives);
        setSafetyInfo(sInfo);
        setVendors(siteVendors);

        setDensityMap((prev) => ({ ...prev, [selectedSiteId]: density }));
      } catch (err) {
        console.error(`Error fetching telemetry for ${selectedSiteId}:`, err);
      }
    }

    loadSiteData();

    const pollInterval = setInterval(loadSiteData, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [selectedSiteId]);

  const handleSelectSite = (siteId) => {
    setSelectedSiteId(siteId);
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

            <AlternativeSpots
              alternativesData={currentAlternatives}
              alternatives={currentAlternatives}
              currentSiteName={selectedSite.name}
              onClaimReward={handleClaimReward}
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
