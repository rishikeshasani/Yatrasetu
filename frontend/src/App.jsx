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
  const [selectedSiteId, setSelectedSiteId] = useState('site_kedarnath');
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
        const firstSiteId = fetchedSites[0]?.id || 'site_kedarnath';
        setSelectedSiteId(firstSiteId);

        const [fetchedAlerts, fetchedWallet] = await Promise.all([
          fetchAlerts(),
          fetchWallet('pilgrim_demo_user')
        ]);
        if (!isMounted) return;
        setAlerts(fetchedAlerts);
        setWallet(fetchedWallet);

        const dMap = {};
        for (const s of fetchedSites) {
          const d = await fetchSiteDensity(s.id);
          dMap[s.id] = d;
        }
        if (!isMounted) return;
        setDensityMap(dMap);
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

  const handleSOS = async (reason = 'Medical / Crowd Crush') => {
    try {
      const res = await triggerSOS(selectedSiteId, 'GPS: 30.7352° N, 79.0669° E (Kedarnath Sanctum)', reason);
      showToast(res.message || '🚨 Emergency SOS broadcasted to SDRF & Temple Command Center.');
    } catch (err) {
      showToast('Emergency SOS dispatched.');
    }
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  return (
    <div className="app-container">
      <Navbar
        walletPoints={wallet.total_points || 260}
        onOpenWallet={() => setIsWalletOpen(true)}
        onTriggerSOS={() => handleSOS('Emergency Alert')}
      />

      <main className="main-content">
        <SiteSelector
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={handleSelectSite}
          densityMap={densityMap}
        />

        <LiveCrowdCard
          site={selectedSite}
          density={currentDensity}
          forecast={currentForecast}
          prediction={currentPrediction}
        />

        <AlternativeSpots
          alternatives={currentAlternatives}
          onClaimReward={handleClaimReward}
        />

        <SafetyAlerts alerts={alerts} safetyInfo={safetyInfo} />

        <LocalVendors vendors={vendors} siteName={selectedSite?.name} />

        <TeamTracker siteId={selectedSiteId} />
      </main>

      {isWalletOpen && (
        <WalletModal
          wallet={wallet}
          onClose={() => setIsWalletOpen(false)}
        />
      )}

      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
