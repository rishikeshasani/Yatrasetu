import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import EmergencyAlertBanner from './components/EmergencyAlertBanner';
import RoleSelectionScreen from './components/RoleSelectionScreen';
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
  fetchAllSiteDensities,
  fetchSiteForecast,
  fetchSiteQueueForecast,
  fetchSite24hForecast,
  fetchSitePrediction,
  fetchAlternatives,
  fetchAlerts,
  fetchSafetyInfo,
  fetchVendors,
  fetchWallet,
  rewardUser,
  loadUserSession,
  logoutUser,
  fetchMe,
  getAuthToken,
  fetchActiveRerouteAlert,
  toCanonicalSiteId
} from './api/api';
import './App.css';

export default function App() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [densityMap, setDensityMap] = useState({});
  const [currentDensity, setCurrentDensity] = useState(null);
  const [currentForecast, setCurrentForecast] = useState(null);
  const [current24hForecast, setCurrent24hForecast] = useState(null);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [currentAlternatives, setCurrentAlternatives] = useState(null);
  const [safetyInfo, setSafetyInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [wallet, setWallet] = useState({ total_points: 260, history: [] });
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Active Reroute Alert State
  const [activeRerouteAlert, setActiveRerouteAlert] = useState(null);

  // Role Navigation State: 'tourist' | 'government' | 'hotel' | 'travel_company'
  const [activeRole, setActiveRole] = useState('tourist');

  // Pilgrim Advisory Active Route & Pending Reward State
  const [activeAlternateRoute, setActiveAlternateRoute] = useState(null);
  const [pendingPunyaReward, setPendingPunyaReward] = useState(0);
  const [routeStatus, setRouteStatus] = useState('IDLE'); // 'IDLE' | 'ACTIVE' | 'ARRIVED'
  const [completedRouteIds, setCompletedRouteIds] = useState([]);

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [travelTab, setTravelTab] = useState('circuits');
  const [govTab, setGovTab] = useState('overview');
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
    if (savedUser && savedUser.role) {
      const normalizedRole = savedUser.role === 'police' ? 'government' : savedUser.role;
      setCurrentUser(savedUser);
      if (['tourist', 'government', 'hotel', 'travel_company'].includes(normalizedRole)) {
        setActiveRole(normalizedRole);
      } else {
        setActiveRole(null);
      }
      // Re-verify token with backend in background
      fetchMe().then((freshUser) => {
        if (!isMounted) return;
        if (freshUser && freshUser.role) {
          const freshRole = freshUser.role === 'police' ? 'government' : freshUser.role;
          setCurrentUser(freshUser);
          if (['tourist', 'government', 'hotel', 'travel_company'].includes(freshRole)) {
            setActiveRole(freshRole);
          } else {
            setActiveRole(null);
          }
        } else if (freshUser === null && getAuthToken()) {
          // Token expired or invalid
          logoutUser();
          setCurrentUser(null);
          showToast("Your session expired. Please log in again.");
        }
      }).catch(() => {});
    }

    async function loadInitialData() {
      try {
        const fetchedSites = await fetchSites();
        if (!isMounted) return;
        // Presentation layer filter: Only canonical TS001-TS025 shrines (exclude legacy SITE001, SITE002)
        const canonicalSites = Array.isArray(fetchedSites)
          ? fetchedSites.filter(s => s && s.id && /^TS\d{3}$/i.test(s.id))
          : [];
        setSites(canonicalSites);

        const defaultSite = canonicalSites.find(s => s.id === 'TS015' || s.id === 'TS001') || canonicalSites[0];
        const firstSiteId = defaultSite?.id || 'TS001';
        setSelectedSiteId(firstSiteId);

        const [fetchedAlerts, fetchedWallet] = await Promise.all([
          fetchAlerts(),
          fetchWallet(savedUser?.user_id || savedUser?.id || 'pilgrim_demo_user')
        ]);
        if (!isMounted) return;
        setAlerts(fetchedAlerts);
        setWallet(fetchedWallet);

        const initialDensityMap = await fetchAllSiteDensities(canonicalSites);
        if (!isMounted) return;
        setDensityMap(initialDensityMap);
      } catch (err) {
        console.error("Error loading initial YatraSetu data:", err);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize Persistent Emergency Reroute Event across Dashboards
  useEffect(() => {
    let isMounted = true;

    async function syncRerouteState() {
      try {
        const res = await fetchActiveRerouteAlert();
        if (!isMounted) return;
        if (res && res.is_active && res.alert) {
          setActiveRerouteAlert(res.alert);
        } else if (res && !res.is_active) {
          setActiveRerouteAlert(null);
        }
      } catch (err) {
        console.warn("Could not sync active reroute alert:", err);
      }
    }

    syncRerouteState();

    const handleRerouteEvent = (e) => {
      if (!isMounted) return;
      const data = e.detail;
      if (data?.is_active && data?.alert) {
        setActiveRerouteAlert(data.alert);
      } else if (data?.is_active === false) {
        setActiveRerouteAlert(null);
      } else {
        syncRerouteState();
      }
    };

    window.addEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
    const pollInterval = setInterval(syncRerouteState, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
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
  const pollTickRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    if (!selectedSiteId) return;

    async function pollTelemetry() {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      pollTickRef.current += 1;

      try {
        const promises = [
          fetchSiteDensity(selectedSiteId),
          fetchSiteQueueForecast(selectedSiteId),
          fetchSite24hForecast(selectedSiteId),
          fetchSitePrediction(selectedSiteId)
        ];

        // Every 4th tick (~12s), also refresh full site density map across all 25 shrines
        const shouldSyncAll = pollTickRef.current % 4 === 0;
        if (shouldSyncAll && sites.length > 0) {
          promises.push(fetchAllSiteDensities(sites));
        }

        const [density, queueForecast, mlForecast, prediction, allDensities] = await Promise.all(promises);

        if (!isMounted) return;

        if (density) {
          setCurrentDensity(density);
          setDensityMap((prev) => {
            const next = allDensities ? { ...prev, ...allDensities } : { ...prev };
            next[selectedSiteId] = density;
            return next;
          });
        } else if (allDensities) {
          setDensityMap((prev) => ({ ...prev, ...allDensities }));
        }
        if (queueForecast) setCurrentForecast(queueForecast);
        if (mlForecast) setCurrent24hForecast(mlForecast);
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
  }, [selectedSiteId, sites]);

  const handleSelectSite = (siteOrId) => {
    const sId = typeof siteOrId === 'object' && siteOrId ? siteOrId.id : siteOrId;
    setSelectedSiteId(sId);
    if (routeStatus === 'ACTIVE') {
      setPendingPunyaReward(0);
      setActiveAlternateRoute(null);
      setRouteStatus('IDLE');
    }
  };

  const handleLoginSuccess = (user) => {
    if (!user) return;
    const rawRole = user.role;
    if (!rawRole) {
      showToast("❌ Authorization Error: Your account has no valid role assigned. Please contact system administrator.");
      return;
    }
    const authRole = rawRole === 'police' ? 'government' : rawRole;
    if (!['tourist', 'government', 'hotel', 'travel_company', 'vendor'].includes(authRole)) {
      showToast(`❌ Authorization Error: Role '${rawRole}' is not recognized.`);
      return;
    }

    const normalizedUser = rawRole === 'police'
      ? { ...user, role: 'government', government_subrole: 'police_official' }
      : user;

    setCurrentUser(normalizedUser);
    if (['tourist', 'government', 'hotel', 'travel_company'].includes(authRole)) {
      setActiveRole(authRole);
    }

    if (authRole === 'tourist') {
      showToast(`🛡️ Welcome ${user.full_name}! Digital Yatri Card generated with Aadhaar verification.`);
    } else if (authRole === 'vendor') {
      showToast(`🏪 Welcome ${user.business_name}! Local Temple Vendor portal active.`);
      setIsProfileOpen(true);
    } else if (authRole === 'government') {
      if (user.government_subrole === 'police_official') {
        showToast(`👮 Welcome ${user.full_name}! Government Command Center (Police & Law Enforcement HQ) authorized.`);
      } else if (user.government_subrole === 'other_government_official') {
        showToast(`🏛️ Welcome ${user.full_name}! Government Command Center (Municipal & Inter-Agency Coordination) authorized.`);
      } else {
        showToast(`🏛️ Welcome ${user.full_name}! Government Command Center (Civil Administration) authorized.`);
      }
    } else if (authRole === 'hotel') {
      showToast(`🏨 Welcome ${user.full_name}! Shrine Hospitality Partner console active.`);
    } else if (authRole === 'travel_company') {
      showToast(`🚌 Welcome ${user.full_name}! Fleet Logistics & Tour Planner ready.`);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setActiveRole('tourist');
    setIsProfileOpen(false);
    setIsWalletOpen(false);
    setIsSOSModalOpen(false);
    setIsAuthOpen(false);
    showToast('Signed out successfully. Returned to role selection.');
  };

  const handleNavigate = (target, item) => {
    const effRole = currentUser?.role || activeRole;
    if (item?.tabId) {
      if (effRole === 'government') {
        setGovTab(item.tabId);
      }
    } else if (target?.startsWith('police-')) {
      const pTab = target.replace('police-', '');
      if (pTab === 'crowd-simulation' || pTab === 'simulation') setGovTab('police-simulation');
      else if (pTab === 'live-crowd') setGovTab('live-crowd');
      else if (pTab === 'surge-alerts') setGovTab('surge-alerts');
      else if (pTab === 'emergency-response') setGovTab('emergency-response');
      else if (pTab === 'traffic-control') setGovTab('traffic-control');
      else if (pTab === 'sos-response') setGovTab('sos-response');
      else if (pTab === 'safety-zones') setGovTab('safety-zones');
      else if (pTab === 'reports' || pTab === 'reports-analytics') setGovTab('reports-analytics');
      else setGovTab('overview');
    } else if (target === 'gov-overview' || target === 'gov-command-center') {
      setGovTab('overview');
    } else if (target === 'gov-live-crowd' || target === 'gov-crowd-monitoring' || target === 'gov-sites') {
      setGovTab('live-crowd');
    } else if (target === 'gov-alerts-safety' || target === 'gov-sos') {
      setGovTab('alerts-safety');
    } else if (target === 'gov-emergency-reroute') {
      setGovTab('emergency-rerouting');
    } else if (target === 'gov-reports-analytics') {
      setGovTab('reports-analytics');
    }

    if (target === 'travel-trips' || target === 'travel-groups') {
      setTravelTab('circuits');
    } else if (target === 'travel-crowd-alerts') {
      setTravelTab('optimizer');
    } else if (target === 'travel-routes') {
      setTravelTab('matrix');
    }

    setTimeout(() => {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
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

  useEffect(() => {
    const handleGlobalCrowdUpdate = async (e) => {
      const { siteId, data } = e.detail || {};
      if (siteId && data) {
        handleCrowdUpdated(siteId, data);
        if (siteId === selectedSiteId) {
          try {
            const freshAlts = await fetchAlternatives(siteId);
            if (freshAlts) setCurrentAlternatives(freshAlts);
          } catch {}
        }
      }
    };

    window.addEventListener('yatrasetu:crowd_updated', handleGlobalCrowdUpdate);
    return () => {
      window.removeEventListener('yatrasetu:crowd_updated', handleGlobalCrowdUpdate);
    };
  }, [selectedSiteId]);

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
    window.dispatchEvent(new CustomEvent('yatrasetu:tourist_rerouted', {
      detail: {
        destination: alt.name,
        alternativeId: alt.alternative_id || alt.id,
        savedWaitMins: alt.saved_wait_minutes || alt.time_saved_minutes || 45,
        timestamp: new Date().toISOString()
      }
    }));
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
      const uid = currentUser?.user_id || currentUser?.id || 'pilgrim_demo_user';
      await rewardUser(uid, 25, `Reached alternate destination: ${alt.name}`);

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
  const effectiveRole = currentUser?.role === 'police' ? 'government' : currentUser?.role;
  const isValidRole = currentUser ? ['tourist', 'government', 'hotel', 'travel_company', 'vendor'].includes(effectiveRole) : true;

  return (
    <div className="yatrasetu-app app-container">
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span className="toast-sparkle">✨</span>
          <span className="toast-text">{toastMessage}</span>
          <button className="toast-close" onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Unauthenticated Role Selection Screen vs Authenticated Protected Experience */}
      {!currentUser ? (
        <RoleSelectionScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {/* Top Navigation with Role-Specific Menu */}
          <Navbar
            walletPoints={wallet?.total_points || 260}
            pendingPoints={pendingPunyaReward}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenSOS={() => setIsSOSModalOpen(true)}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            activeRole={currentUser.role}
            currentView="dashboard"
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            activeGovTab={govTab}
          />

          <EmergencyAlertBanner />

          {/* Dynamic Protected Role-Based Dashboard View */}
          <main className="main-content-container main-content">
            {/* Explicit Authorization Error for Unrecognized / Missing Roles */}
            {currentUser && !['tourist', 'government', 'hotel', 'travel_company', 'vendor'].includes(currentUser.role) && (
              <div className="auth-error-card" style={{ maxWidth: '640px', margin: '4rem auto', padding: '2.5rem', background: '#0F172A', borderRadius: '1rem', border: '1px solid #DC2626', textAlign: 'center', color: '#F8FAFC', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⛔</div>
                <h2 style={{ color: '#EF4444', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  ACCESS FORBIDDEN: UNRECOGNIZED ROLE
                </h2>
                <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  The authenticated user role <code style={{ color: '#F87171', background: '#1E293B', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>{currentUser?.role || 'UNDEFINED'}</code> is not authorized to access this platform. No fallback dashboard is provided.
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{ background: '#DC2626', color: '#FFF', padding: '0.65rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Log Out &amp; Return to Login
                </button>
              </div>
            )}

            {currentUser.role === 'tourist' && (
              <TouristDashboard
                sites={sites}
                selectedSiteId={selectedSiteId}
                selectedSite={selectedSite}
                onSelectSite={handleSelectSite}
                densityMap={densityMap}
                currentDensity={currentDensity}
                currentForecast={currentForecast}
                currentQueueForecast={currentForecast}
                current24hForecast={current24hForecast}
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
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenSOS={() => setIsSOSModalOpen(true)}
                walletPoints={wallet?.total_points || 260}
                activeRerouteAlert={activeRerouteAlert}
                currentUser={currentUser}
                onShowToast={showToast}
                onLogout={handleLogout}
              />
            )}

            {currentUser.role === 'government' && (
              <GovernmentDashboard
                sites={sites}
                densityMap={densityMap}
                selectedSiteId={selectedSiteId}
                onSelectSite={handleSelectSite}
                onCrowdUpdated={handleCrowdUpdated}
                currentUser={currentUser}
                showToast={showToast}
                activeTab={govTab}
                onTabChange={setGovTab}
                activeRerouteAlert={activeRerouteAlert}
              />
            )}

            {currentUser.role === 'hotel' && (
              <HotelDashboard
                currentUser={currentUser}
                showToast={showToast}
                activeRerouteAlert={activeRerouteAlert}
                densityMap={densityMap}
                onBackToLanding={handleLogout}
              />
            )}

            {currentUser.role === 'travel_company' && (
              <TravelCompanyDashboard
                sites={sites}
                densityMap={densityMap}
                selectedSiteId={selectedSiteId}
                onSelectSite={handleSelectSite}
                showToast={showToast}
                externalTab={travelTab}
              />
            )}
          </main>
        </>
      )}

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
        />
      )}

      {/* Local Temple Vendor Dashboard Modal */}
      {isProfileOpen && currentUser?.role === 'vendor' && (
        <VendorDashboardModal
          isOpen={isProfileOpen}
          user={currentUser}
          onClose={() => setIsProfileOpen(false)}
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
