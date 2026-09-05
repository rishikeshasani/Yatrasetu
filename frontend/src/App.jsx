import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import RoleSelectionScreen from './components/RoleSelectionScreen';
import TouristDashboard from './dashboards/TouristDashboard';
import ExplorePage from './components/ExplorePage';
import GovernmentDashboard from './dashboards/GovernmentDashboard';
import HotelDashboard from './dashboards/HotelDashboard';
import HotelPartnerPortal from './components/HotelPartnerPortal';
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
  logoutUser,
  fetchMe,
  getAuthToken,
  SITE_ID_ALIASES,
  fetchActiveRerouteAlert
} from './api/api';
import './App.css';

// Helpers for role and path routing
export const pathToRole = (path) => {
  if (!path) return null;
  const p = path.toLowerCase();
  if (p === 'travel-company' || p === 'travel_company' || p === 'travel') return 'travel_company';
  if (p === 'government' || p === 'govt') return 'government';
  if (p === 'hotel') return 'hotel';
  if (p === 'tourist') return 'tourist';
  return null;
};

export const roleToPath = (role) => {
  if (role === 'travel_company') return 'travel-company';
  return role || 'tourist';
};

export const getInitialRoute = () => {
  if (typeof window === 'undefined') return { view: 'role_select', role: null, path: '/' };
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';

  if (pathname === '/' || pathname === '/login' || pathname === '') {
    return { view: 'role_select', role: null, path: '/' };
  }

  const loginMatch = pathname.match(/^\/login\/([a-z0-9_-]+)/);
  if (loginMatch) {
    const role = pathToRole(loginMatch[1]);
    if (role) {
      return { view: 'role_login', role, path: `/login/${roleToPath(role)}` };
    }
    return { view: 'role_select', role: null, path: '/' };
  }

  const dashMatch = pathname.match(/^\/dashboard(?:\/([a-z0-9_-]+))?/);
  if (dashMatch) {
    const role = pathToRole(dashMatch[1]);
    return { view: 'dashboard', role, path: pathname };
  }

  if (pathname === '/landing') {
    return { view: 'landing', role: null, path: '/landing' };
  }
  if (pathname === '/explore') {
    return { view: 'explore', role: null, path: '/explore' };
  }
  if (pathname === '/hotel-portal' || pathname === '/hotel') {
    return { view: 'hotel_portal', role: null, path: '/hotel-portal' };
  }

  return { view: 'role_select', role: null, path: '/' };
};

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

  // Emergency Reroute Persistent Cross-Dashboard Event State
  const [activeRerouteAlert, setActiveRerouteAlert] = useState(null);

  // URL-synchronized Route State: 'role_select' ('/') | 'role_login' ('/login/:role') | 'dashboard' | 'landing' | 'explore' | 'hotel_portal'
  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);

  const navigateTo = (path, replace = false) => {
    if (typeof window === 'undefined') return;
    const cleanPath = path.toLowerCase();
    if (replace) {
      window.history.replaceState({}, '', cleanPath);
    } else {
      window.history.pushState({}, '', cleanPath);
    }

    const normalized = cleanPath.replace(/\/+$/, '') || '/';
    if (normalized === '/' || normalized === '/login') {
      setCurrentRoute({ view: 'role_select', role: null, path: '/' });
    } else if (normalized.startsWith('/login/')) {
      const seg = normalized.split('/login/')[1];
      const role = pathToRole(seg);
      if (role) {
        setCurrentRoute({ view: 'role_login', role, path: `/login/${roleToPath(role)}` });
      } else {
        setCurrentRoute({ view: 'role_select', role: null, path: '/' });
      }
    } else if (normalized.startsWith('/dashboard')) {
      const parts = normalized.split('/');
      const role = parts[2] ? pathToRole(parts[2]) : null;
      setCurrentRoute({ view: 'dashboard', role, path: normalized });
    } else if (normalized === '/landing') {
      setCurrentRoute({ view: 'landing', role: null, path: '/landing' });
    } else if (normalized === '/explore') {
      setCurrentRoute({ view: 'explore', role: null, path: '/explore' });
    } else if (normalized === '/hotel-portal') {
      setCurrentRoute({ view: 'hotel_portal', role: null, path: '/hotel-portal' });
    } else {
      setCurrentRoute({ view: 'role_select', role: null, path: '/' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      setCurrentUser(savedUser);
      if (['tourist', 'government', 'hotel', 'travel_company'].includes(savedUser.role)) {
        setActiveRole(savedUser.role);
      }
      // Re-verify token with backend in background
      fetchMe().then((freshUser) => {
        if (!isMounted) return;
        if (freshUser && freshUser.role) {
          setCurrentUser(freshUser);
          if (['tourist', 'government', 'hotel', 'travel_company'].includes(freshUser.role)) {
            setActiveRole(freshUser.role);
          }
        } else if (freshUser === null && getAuthToken()) {
          // Token expired or invalid
          logoutUser();
          setCurrentUser(null);
        }
      }).catch(() => {});
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
          const alias = SITE_ID_ALIASES[selectedSiteId];
          setDensityMap((prev) => {
            const next = { ...prev, [selectedSiteId]: density };
            if (alias) next[alias] = density;
            return next;
          });
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
    if (!user) return;
    const authRole = user.role || 'tourist';
    setCurrentUser(user);
    if (['tourist', 'government', 'hotel', 'travel_company'].includes(authRole)) {
      setActiveRole(authRole);
    }
    navigateTo(`/dashboard/${roleToPath(authRole)}`);

    if (authRole === 'tourist') {
      showToast(`🛡️ Welcome ${user.full_name}! Digital Yatri Card generated with Aadhaar verification.`);
    } else if (authRole === 'vendor') {
      showToast(`🏪 Welcome ${user.business_name}! Local Temple Vendor portal active.`);
      setIsProfileOpen(true);
    } else if (authRole === 'government') {
      showToast(`🏛️ Welcome ${user.full_name}! National Pilgrimage Command Center authorized.`);
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
    navigateTo('/');
    showToast('Signed out successfully. Returned to role selection.');
  };

  const handleNavigate = (target) => {
    if (target === 'travel-groups') {
      setTravelTab('groups');
    } else if (target === 'travel-trips' || target === 'travel-dashboard') {
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
    const alias = SITE_ID_ALIASES[siteId];
    setDensityMap((prev) => {
      const next = { ...prev, [siteId]: updatedData };
      if (alias) next[alias] = updatedData;
      return next;
    });

    if (siteId === selectedSiteId) {
      setCurrentDensity(updatedData);
      setCurrentForecast((prev) => ({
        ...(prev || {}),
        live_status: {
          people_count: updatedData.people_count,
          occupancy_percentage: updatedData.occupancy_percentage,
          status: updatedData.status
        }
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

  // Navigation Helper for Navbar and Footer anchor links
  const handleNavigateSection = (sectionId) => {
    if (sectionId === 'top') {
      navigateTo('/landing');
      return;
    }
    if (currentRoute.view !== 'landing') {
      navigateTo('/landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  return (
    <div className="yatrasetu-app app-container">
      {/* Top Navigation Header: Rendered on Dashboards & Landing, but NOT on Login As screen */}
      {currentRoute.view !== 'role_select' && currentRoute.view !== 'role_login' && (
        <Navbar
          walletPoints={wallet?.total_points || 260}
          pendingPoints={pendingPunyaReward}
          onOpenWallet={() => setIsWalletOpen(true)}
          onOpenSOS={() => setIsSOSModalOpen(true)}
          currentUser={currentUser}
          onOpenAuth={() => navigateTo('/')}
          onOpenProfile={() => setIsProfileOpen(true)}
          activeRole={currentUser?.role || activeRole}
          onSelectRole={(role) => {
            setActiveRole(role);
            navigateTo(`/dashboard/${roleToPath(role)}`);
          }}
          currentView={currentRoute.view}
          onToggleView={() => {
            if (currentRoute.view === 'dashboard') {
              navigateTo('/landing');
            } else {
              if (currentUser) {
                navigateTo(`/dashboard/${roleToPath(currentUser.role)}`);
              } else {
                navigateTo('/');
              }
            }
          }}
          onNavigateSection={handleNavigateSection}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span className="toast-sparkle">✨</span>
          <span className="toast-text">{toastMessage}</span>
          <button className="toast-close" onClick={() => setToastMessage(null)}>✕</button>
        </div>
      )}

      {/* Dynamic Main View: Role Selection ('Login As'), Role Login, Landing Page, Explore, or Dashboards */}
      <main className="main-content-container main-content">
        {currentRoute.view === 'role_select' ? (
          <RoleSelectionScreen
            initialView="select"
            initialRole={null}
            onSelectRole={(roleId) => navigateTo(`/login/${roleToPath(roleId)}`)}
            onLoginSuccess={handleLoginSuccess}
            onViewLanding={() => navigateTo('/landing')}
          />
        ) : currentRoute.view === 'role_login' ? (
          <RoleSelectionScreen
            initialView="login"
            initialRole={currentRoute.role || 'tourist'}
            onSelectRole={(roleId) => navigateTo(`/login/${roleToPath(roleId)}`)}
            onBackToSelect={() => navigateTo('/')}
            onLoginSuccess={handleLoginSuccess}
            onViewLanding={() => navigateTo('/landing')}
          />
        ) : currentRoute.view === 'landing' ? (
          <LandingPage
            sites={sites}
            densityMap={densityMap}
            selectedSiteId={selectedSiteId}
            onSelectSite={(siteId) => {
              handleSelectSite(siteId);
              setActiveRole('tourist');
            }}
            onOpenDashboard={() => {
              if (currentUser) {
                navigateTo(`/dashboard/${roleToPath(currentUser.role)}`);
              } else {
                navigateTo('/');
              }
            }}
            onOpenSOS={() => setIsSOSModalOpen(true)}
            onOpenAuth={() => navigateTo('/')}
            currentUser={currentUser}
          />
        ) : currentRoute.view === 'hotel_portal' ? (
          <HotelPartnerPortal
            currentUser={currentUser}
            showToast={showToast}
            onBackToLanding={() => navigateTo('/landing')}
          />
        ) : currentRoute.view === 'explore' ? (
          <ExplorePage
            sites={sites}
            densityMap={densityMap}
            onSelectShrine={(siteId) => {
              handleSelectSite(siteId);
              setActiveRole('tourist');
              navigateTo('/dashboard/tourist');
            }}
            onBackToLanding={() => navigateTo('/landing')}
          />
        ) : !currentUser ? (
          <RoleSelectionScreen
            initialView="select"
            initialRole={null}
            onSelectRole={(roleId) => navigateTo(`/login/${roleToPath(roleId)}`)}
            onLoginSuccess={handleLoginSuccess}
            onViewLanding={() => navigateTo('/landing')}
          />
        ) : (
          <div className="pilgrim-dashboard-wrapper">
            {/* Dashboard Sub-Header Strip */}
            <div className="dashboard-top-nav-strip">
              <button
                type="button"
                className="btn-back-to-landing"
                onClick={() => navigateTo('/')}
              >
                <span>← Role Selection ("Login As")</span>
              </button>
              <button
                type="button"
                className="btn-back-to-landing"
                onClick={() => navigateTo('/landing')}
                style={{ marginLeft: '0.5rem' }}
              >
                <span>Platform Overview</span>
              </button>
              <div className="dashboard-mode-indicator">
                <span className="live-pulse-radar"></span>
                <span>
                  {(currentUser?.role || activeRole).toUpperCase().replace('_', ' ')} CONSOLE • AUTO-POLLING TELEMETRY (3s)
                </span>
              </div>
            </div>

            {(currentUser?.role === 'tourist' || (!currentUser?.role && activeRole === 'tourist')) && (
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
              />
            )}

            {(currentUser?.role === 'government' || (!currentUser?.role && activeRole === 'government')) && (
              <GovernmentDashboard
                sites={sites}
                densityMap={densityMap}
                selectedSiteId={selectedSiteId}
                onSelectSite={handleSelectSite}
                onCrowdUpdated={handleCrowdUpdated}
                currentUser={currentUser}
                showToast={showToast}
                activeRerouteAlert={activeRerouteAlert}
                onRerouteChanged={(newAlert) => setActiveRerouteAlert(newAlert)}
              />
            )}

            {(currentUser?.role === 'hotel' || (!currentUser?.role && activeRole === 'hotel')) && (
              <HotelDashboard
                currentUser={currentUser}
                showToast={showToast}
                activeRerouteAlert={activeRerouteAlert}
                onBackToLanding={() => navigateTo('/landing')}
              />
            )}

            {(currentUser?.role === 'travel_company' || (!currentUser?.role && activeRole === 'travel_company')) && (
              <TravelCompanyDashboard
                sites={sites}
                selectedSite={selectedSite}
                densityMap={densityMap}
                selectedSiteId={selectedSiteId}
                onSelectSite={handleSelectSite}
                showToast={showToast}
                externalTab={travelTab}
                activeRerouteAlert={activeRerouteAlert}
              />
            )}
          </div>
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

      {/* Professional Civic-Tech Footer */}
      <footer className="yatrasetu-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-om">ॐ</span> YatraSetu <span className="devanagari-sm">यात्रासेतु</span>
            </div>
            <p className="footer-motto">
              Next-generation smart tourism &amp; pilgrimage crowd management platform powered by edge computer vision,
              queue-theory analytics, gamified route redistribution, and civic emergency coordination.
            </p>
            <div className="footer-badges-row">
              <span className="footer-badge">Smart India Hackathon 2026</span>
              <span className="footer-badge">Ministry of Tourism</span>
              <span className="footer-badge">Vision AI 3.0</span>
            </div>
          </div>

          <div className="footer-links">
            <div className="link-col">
              <h4>Emergency Helplines</h4>
              <p>National Emergency: <strong>112</strong></p>
              <p>Medical Ambulance: <strong>108</strong></p>
              <p>Disaster Helpline: <strong>1070</strong></p>
              <p>Tourist Helpline: <strong>1363</strong></p>
            </div>
            <div className="link-col">
              <h4>Platform Navigation</h4>
              <p><button type="button" className="footer-link-btn" onClick={() => handleNavigateSection('top')}>Platform Overview</button></p>
              <p><button type="button" className="footer-link-btn" onClick={() => handleNavigateSection('smart-destinations')}>Explore 25 Shrines</button></p>
              <p><button type="button" className="footer-link-btn" onClick={() => handleNavigateSection('crowd-intelligence')}>Crowd Intelligence</button></p>
              <p><button type="button" className="footer-link-btn" onClick={() => handleNavigateSection('how-it-works')}>How It Works</button></p>
              <p><button type="button" className="footer-link-btn" onClick={() => { const targetRole = currentUser?.role || activeRole || 'tourist'; navigateTo(`/dashboard/${roleToPath(targetRole)}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Live Consoles</button></p>
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
          <span>FastAPI Backend: <code>127.0.0.1:8000</code> • Mode: <strong style={{ textTransform: 'uppercase' }}>{currentRoute.view === 'landing' ? 'Platform Overview' : (currentRoute.view === 'role_select' ? 'Role Selection' : (currentRoute.view === 'role_login' ? 'Role Login' : activeRole.replace('_', ' ')))}</strong></span>
        </div>
      </footer>
    </div>
  );
}
