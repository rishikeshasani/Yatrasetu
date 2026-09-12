import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './tourist/LanguageSelector';

export default function Navbar({
  walletPoints,
  pendingPoints = 0,
  onOpenWallet,
  onOpenSOS,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  activeRole = 'tourist',
  onSelectRole,
  currentView = 'landing',
  onToggleView,
  onNavigateSection,
  onLogout,
  onNavigate,
  activeGovTab
}) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive role-specific display info
  const getRoleDisplayName = (role, subrole = null) => {
    switch (role) {
      case 'government':
        if (subrole === 'police_official') return t('roles.govPoliceDisplayName', 'Government (Police Command)');
        return t('roles.govAdminDisplayName', 'Government Administration');
      case 'police':
        return t('roles.govPoliceDisplayName', 'Government (Police Command)');
      case 'hotel':
        return t('roles.hotelDisplayName', 'Hotel Partner');
      case 'travel_company':
        return t('roles.travelDisplayName', 'Travel Company');
      case 'vendor':
        return t('roles.vendorDisplayName', 'Local Vendor');
      case 'tourist':
        return t('roles.touristDisplayName', 'Tourist');
      default:
        return 'Unauthorized Role';
    }
  };

  const getRoleBadgeStyle = (role, subrole = null) => {
    switch (role) {
      case 'government':
        if (subrole === 'police_official') {
          return { bg: '#0B192C', border: '#3B82F6', text: '#93C5FD', badgeBg: '#1E3A8A', badgeText: 'POLICE HQ' };
        }
        return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', badgeBg: '#1D4ED8', badgeText: 'GOVT' };
      case 'police':
        return { bg: '#0B192C', border: '#3B82F6', text: '#93C5FD', badgeBg: '#1E3A8A', badgeText: 'POLICE HQ' };
      case 'hotel':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', badgeBg: '#D97706', badgeText: 'HOTEL' };
      case 'travel_company':
        return { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9', badgeBg: '#7C3AED', badgeText: 'TRAVEL' };
      case 'tourist':
        return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', badgeBg: '#059669', badgeText: 'PILGRIM' };
      default:
        return { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', badgeBg: '#DC2626', badgeText: 'UNAUTHORIZED' };
    }
  };

  // Define role-specific navigation lists strictly matching specifications
  const getRoleNavItems = () => {
    const rawRole = currentUser?.role || activeRole || 'tourist';
    const role = rawRole === 'police' ? 'government' : rawRole;
    const subrole = currentUser?.government_subrole || (rawRole === 'police' ? 'police_official' : 'government_official');

    if (role === 'hotel') {
      return [
        { label: t('nav.dashboard', 'Dashboard'), target: 'hotel-dashboard' },
        { label: t('nav.rooms', 'Rooms'), target: 'hotel-rooms' },
        { label: t('nav.bookings', 'Bookings'), target: 'hotel-bookings' },
        { label: t('nav.occupancy', 'Occupancy'), target: 'hotel-occupancy' }
      ];
    }

    if (role === 'travel_company') {
      return [
        { label: t('nav.dashboard', 'Dashboard'), target: 'travel-dashboard' },
        { label: t('nav.trips', 'Trips'), target: 'travel-trips' },
        { label: t('nav.groups', 'Groups'), target: 'travel-groups' },
        { label: t('nav.crowdAlerts', 'Crowd Alerts'), target: 'travel-crowd-alerts' },
        { label: t('nav.routes', 'Routes'), target: 'travel-routes' }
      ];
    }

    if (role === 'government') {
      if (subrole === 'police_official') {
        return [
          { label: t('nav.overview', 'Overview'), target: 'gov-overview', tabId: 'overview' },
          { label: t('nav.liveCrowdMonitoring', 'Live Crowd Monitoring'), target: 'gov-live-crowd', tabId: 'live-crowd' },
          { label: t('nav.surgeAlerts', 'Crowd Surge Alerts'), target: 'gov-surge-alerts', tabId: 'surge-alerts' },
          { label: `👮 ${t('nav.policeSimulation', 'Police & Crowd Simulation')}`, target: 'gov-police-simulation', tabId: 'police-simulation' },
          { label: t('nav.emergencyResponse', 'Emergency Response'), target: 'gov-emergency-response', tabId: 'emergency-response' },
          { label: t('nav.trafficControl', 'Traffic & Route Control'), target: 'gov-traffic-control', tabId: 'traffic-control' },
          { label: t('nav.sosResponse', 'SOS / Distress Response'), target: 'gov-sos-response', tabId: 'sos-response' },
          { label: t('nav.safetyZones', 'Safety Zones'), target: 'gov-safety-zones', tabId: 'safety-zones' },
          { label: t('nav.reportsAnalytics', 'Reports / Analytics'), target: 'gov-reports-analytics', tabId: 'reports-analytics' }
        ];
      }

      // Default: Civil Administration (government_official)
      return [
        { label: t('nav.overview', 'Overview'), target: 'gov-overview', tabId: 'overview' },
        { label: t('nav.liveCrowdMonitoring', 'Live Crowd Monitoring'), target: 'gov-live-crowd', tabId: 'live-crowd' },
        { label: t('nav.alertsSafety', 'Alerts & Safety'), target: 'gov-alerts-safety', tabId: 'alerts-safety' },
        { label: t('nav.emergencyRerouting', 'Emergency Rerouting'), target: 'gov-emergency-reroute', tabId: 'emergency-rerouting' },
        { label: t('nav.reportsAnalytics', 'Reports / Analytics'), target: 'gov-reports-analytics', tabId: 'reports-analytics' }
      ];
    }

    // Pilgrim / Tourist Navigation
    if (role === 'tourist') {
      return [
        { label: t('nav.home', 'Home'), target: 'tourist-home' },
        { label: t('nav.destinations', 'Explore 25'), target: 'tourist-destinations' },
        { label: t('nav.crowdStatus', 'Live Crowd'), target: 'tourist-crowd-status' },
        { label: t('nav.forecast', 'AI Forecast'), target: 'tourist-forecast' },
        { label: t('nav.alternatives', 'Alternatives'), target: 'tourist-alternatives' },
        { label: t('nav.safety', 'Safety & SOS'), target: 'tourist-safety' },
        { label: t('nav.hotels', 'Hotels'), target: 'tourist-hotels' },
        { label: t('nav.wallet', 'Wallet'), action: 'wallet' },
        { label: t('nav.sos', 'Emergency SOS'), action: 'sos', isDanger: true }
      ];
    }

    // Invalid / Unrecognized role: do not expose navigation items
    return [];
  };

  const navItems = getRoleNavItems();
  const roleStyle = getRoleBadgeStyle(currentUser?.role || activeRole, currentUser?.government_subrole);

  const scrollToTargetElement = (element) => {
    if (!element) return false;
    const navHeader = document.querySelector('.navbar-header') || document.querySelector('.app-header');
    const navHeight = navHeader ? navHeader.getBoundingClientRect().height + 15 : 90;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - navHeight;

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'smooth'
    });
    return true;
  };

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);

    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = sectionId === 'top'
        ? (document.getElementById('top') || document.getElementById('tourist-home') || document.getElementById('gov-command-center') || document.getElementById('hotel-dashboard') || document.getElementById('travel-dashboard'))
        : document.getElementById(sectionId);
      if (el && scrollToTargetElement(el)) {
        return;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemClick = (item) => {
    setMobileMenuOpen(false);

    if (item.action === 'wallet') {
      if (onOpenWallet) onOpenWallet();
      return;
    }

    if (item.action === 'sos') {
      if (onOpenSOS) onOpenSOS();
      return;
    }

    if (onNavigate) {
      onNavigate(item.target, item);
    }

    const candidateIds = [item.target, item.target?.replace('tourist-', ''), item.target?.replace('gov-', ''), item.target?.replace('police-', ''), item.target?.replace('hotel-', ''), item.target?.replace('travel-', '')].filter(Boolean);

    for (const id of candidateIds) {
      const el = document.getElementById(id);
      if (el && scrollToTargetElement(el)) {
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo & Title */}
        <div
          className="brand-wrapper"
          onClick={() => {
            if (currentView === 'landing') {
              handleNavClick('top');
            } else {
              const el = document.getElementById('tourist-home') || document.getElementById('hotel-dashboard') || document.getElementById('travel-dashboard') || document.getElementById('gov-command-center') || document.getElementById('police-command-center');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15 8H9L12 2Z" fill="#F97316" />
              <path d="M4 14H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V14Z" fill="#EA580C" />
              <path d="M8 8V14M16 8V14M12 8V14" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 14C2 14 6 11 12 11C18 11 22 14 22 14" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="5" r="1.5" fill="#FEF08A" />
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-name">
              YatraSetu <span className="devanagari">यात्रासेतु</span>
            </div>
            <div className="brand-tagline">Smart Pilgrimage &amp; Crowd Governance</div>
          </div>
        </div>

        {/* Center: When in Landing View, show Section Anchors; When in Dashboard View, show Role Nav Tabs */}
        {currentView === 'landing' ? (
          <nav className="desktop-nav-links desktop-only" aria-label="Main Navigation">
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('top')}
            >
              {t('nav.home', 'Home')}
            </button>
          </nav>
        ) : (
          <nav className="role-navigation-tabs role-specific-nav desktop-only">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className={`role-nav-link-btn ${item.isDanger ? 'nav-link-danger' : ''} ${item.tabId && item.tabId === activeGovTab ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
                title={item.label}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Action Controls: View Switcher, User Profile, Yatra Dal, Wallet & SOS, Logout */}
        <div className="navbar-actions">
          {/* Multilingual Selector */}
          <LanguageSelector compact={true} />

          {/* Main View Switcher (Landing vs Live Console) */}
          <button
            type="button"
            className={`view-switcher-btn ${currentView === 'dashboard' ? 'active-dashboard' : ''}`}
            onClick={onToggleView}
            title={currentView === 'landing' ? 'Switch to Live Multi-Role Console' : 'Switch to Platform Overview'}
          >
            <span className="view-switch-icon">{currentView === 'landing' ? '⚡' : '🏠'}</span>
            <span className="view-switch-text">
              {currentView === 'landing' ? t('nav.liveConsole', 'Live Console') : t('nav.overview', 'Overview')}
            </span>
          </button>

          {/* Authenticated User / Role Indicator */}
          {currentUser ? (
            <>
              <button
                type="button"
                className="auth-profile-pill"
                onClick={onOpenProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: roleStyle.bg,
                  border: `1px solid ${roleStyle.border}`,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  color: roleStyle.text,
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
                title={`Authenticated as ${currentUser.full_name} (${getRoleDisplayName(currentUser.role, currentUser.government_subrole)})`}
              >
                <span className="user-short-name">
                  {currentUser.full_name?.split(' ')[0] || 'User'}
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    backgroundColor: roleStyle.badgeBg,
                    color: '#FFF',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    fontWeight: '800',
                    letterSpacing: '0.04em'
                  }}
                >
                  {roleStyle.badgeText}
                </span>
              </button>

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  className="nav-logout-btn desktop-only"
                  onClick={onLogout}
                  title="Sign Out & Return to Role Selection"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#EF4444',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{t('nav.logout', 'Logout')}</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="auth-login-btn desktop-only"
              onClick={onOpenAuth}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#0F172A',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '0.6rem',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
              }}
              title="Sign In to YatraSetu"
            >
              <span>Sign In / Demo</span>
            </button>
          )}

          {/* Green Pilgrim Wallet - ONLY for Pilgrims / Tourists, NEVER in Government Command */}
          {(currentUser?.role || activeRole) !== 'government' && (currentUser?.role || activeRole) !== 'police' && (
            <button
              type="button"
              className="wallet-badge-btn"
              onClick={onOpenWallet}
              title="Open Green Pilgrim Wallet"
            >
              <span className="coin-icon">🌿</span>
              <div className="wallet-btn-content">
                <span className="wallet-points-val">{walletPoints ?? 260}</span>
                <span className="wallet-points-unit desktop-only">Pts</span>
              </div>
              {pendingPoints > 0 && (
                <span className="pending-pts-chip desktop-only" title="Pending arrival at alternate route">
                  +{pendingPoints}
                </span>
              )}
            </button>
          )}

          {/* SOS Emergency Distress Beacon - Visually Isolated Action */}
          <div className="sos-nav-wrapper" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              className="sos-nav-btn emergency-isolated"
              onClick={onOpenSOS}
              title="Instant 1-Click SOS Emergency"
            >
              <span className="sos-pulse-ring"></span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span className="sos-btn-text">SOS</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          {currentUser && (
            <div className="mobile-user-row" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                Role: <strong>{getRoleDisplayName(currentUser?.role, currentUser?.government_subrole)}</strong>
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                {currentUser?.full_name || 'User'}
              </span>
            </div>
          )}

          <div className="mobile-nav-links">
            {currentView === 'landing' ? (
              <>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('top')}>{t('nav.home', 'Home')}</button>
              </>
            ) : (
              navItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`mobile-nav-link ${item.isDanger ? 'mobile-link-danger' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <span>{item.label}</span>
                </button>
              ))
            )}

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() => {
                setMobileMenuOpen(false);
                onToggleView && onToggleView();
              }}
            >
              {currentView === 'landing' ? `⚡ ${t('nav.liveConsole', 'Open Live Console')}` : `🏠 ${t('nav.overview', 'Switch to Overview')}`}
            </button>

            {currentUser && onLogout && (
              <button
                type="button"
                className="mobile-nav-link mobile-link-danger mobile-logout-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                style={{
                  gridColumn: 'span 2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{t('nav.logout', 'Logout')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
