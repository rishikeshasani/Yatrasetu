import React, { useState } from 'react';
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
  onNavigate
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Derive role-specific display info
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'government':
        return 'Government';
      case 'hotel':
        return 'Hotel Partner';
      case 'travel_company':
        return 'Travel Company';
      case 'vendor':
        return 'Local Vendor';
      default:
        return 'Tourist';
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'government':
        return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', badgeBg: '#1D4ED8', badgeText: 'GOVT' };
      case 'hotel':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', badgeBg: '#D97706', badgeText: 'HOTEL' };
      case 'travel_company':
        return { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9', badgeBg: '#7C3AED', badgeText: 'TRAVEL' };
      default:
        return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', badgeBg: '#059669', badgeText: 'PILGRIM' };
    }
  };

  // Define role-specific navigation lists strictly matching specifications
  const getRoleNavItems = () => {
    const role = currentUser?.role || activeRole || 'tourist';

    if (role === 'hotel') {
      return [
        { label: 'Dashboard', target: 'hotel-dashboard' },
        { label: 'Rooms', target: 'hotel-rooms' },
        { label: 'Bookings', target: 'hotel-bookings' },
        { label: 'Occupancy', target: 'hotel-occupancy' }
      ];
    }

    if (role === 'travel_company') {
      return [
        { label: 'Dashboard', target: 'travel-dashboard' },
        { label: 'Trips', target: 'travel-trips' },
        { label: 'Groups', target: 'travel-groups' },
        { label: 'Crowd Alerts', target: 'travel-crowd-alerts' },
        { label: 'Routes', target: 'travel-routes' }
      ];
    }

    if (role === 'government') {
      return [
        { label: 'Command Center', target: 'gov-command-center' },
        { label: 'Sites', target: 'gov-sites' },
        { label: 'Crowd Monitoring', target: 'gov-crowd-monitoring' },
        { label: 'Forecast', target: 'gov-forecast' },
        { label: 'Emergency Reroute', target: 'gov-emergency-reroute' },
        { label: 'SOS', target: 'gov-sos' },
        { label: 'Hotels', target: 'gov-hotels' },
        { label: 'Agencies', target: 'gov-agencies' }
      ];
    }

    // Default: Tourist
    return [
      { label: 'Home', target: 'tourist-home' },
      { label: 'Destinations', target: 'tourist-destinations' },
      { label: 'Crowd Status', target: 'tourist-crowd-status' },
      { label: 'Forecast', target: 'tourist-forecast' },
      { label: 'Alternatives', target: 'tourist-alternatives' },
      { label: 'Safety', target: 'tourist-safety' },
      { label: 'Hotels', target: 'tourist-hotels' },
      { label: 'Wallet', action: 'wallet' },
      { label: 'SOS', action: 'sos', isDanger: true }
    ];
  };

  const navItems = getRoleNavItems();
  const roleStyle = getRoleBadgeStyle(currentUser?.role || activeRole);

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(sectionId);
      return;
    }

    const targetMap = {
      'top': ['top', 'tourist-home', 'yatrasetu-app'],
      'smart-destinations': ['smart-destinations', 'tourist-destinations', 'destinations'],
      'crowd-intelligence': ['crowd-intelligence', 'tourist-crowd-status', 'tourist-forecast', 'live-crowd-card'],
      'how-it-works': ['how-it-works', 'tourist-alternatives', 'pilgrim-advisory'],
      'safety': ['safety', 'tourist-safety', 'safety-section'],
      'impact': ['impact', 'tourist-hotels', 'yatrasetu-footer']
    };

    const candidateIds = targetMap[sectionId] || [sectionId];
    for (const id of candidateIds) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (sectionId === 'safety' && onOpenSOS) {
      onOpenSOS();
    } else if (sectionId === 'impact' && onOpenWallet) {
      onOpenWallet();
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
      onNavigate(item.target);
    }

    const candidateIds = [item.target, item.target?.replace('tourist-', ''), item.target?.replace('gov-', ''), item.target?.replace('hotel-', ''), item.target?.replace('travel-', '')].filter(Boolean);

    for (const id of candidateIds) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
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
              const el = document.getElementById('tourist-home') || document.getElementById('hotel-dashboard') || document.getElementById('travel-dashboard') || document.getElementById('gov-command-center');
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
              Home
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('smart-destinations')}
            >
              Explore 25
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('crowd-intelligence')}
            >
              Crowd AI
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('safety')}
            >
              Safety &amp; SOS
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('impact')}
            >
              Civic Impact
            </button>
          </nav>
        ) : (
          <nav className="role-navigation-tabs role-specific-nav desktop-only">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className={`role-nav-link-btn ${item.isDanger ? 'nav-link-danger' : ''}`}
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
              {currentView === 'landing' ? 'Live Console' : 'Overview'}
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
                title={`Authenticated as ${currentUser.full_name} (${getRoleDisplayName(currentUser.role)})`}
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
                  <span>Logout</span>
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

          {/* Green Pilgrim Wallet */}
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

          {/* SOS Emergency Distress Beacon */}
          <button
            type="button"
            className="sos-nav-btn"
            onClick={onOpenSOS}
            title="Instant 1-Click SOS Emergency"
          >
            <span className="sos-pulse-ring"></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="sos-btn-text">SOS</span>
          </button>

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
                Role: <strong>{getRoleDisplayName(currentUser?.role)}</strong>
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                {currentUser?.full_name || 'User'}
              </span>
            </div>
          )}

          <div className="mobile-nav-links">
            {currentView === 'landing' ? (
              <>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('top')}>Home Overview</button>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('smart-destinations')}>Explore 25 Shrines</button>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('crowd-intelligence')}>Crowd Intelligence</button>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('how-it-works')}>How It Works</button>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('safety')}>Emergency Safety &amp; SOS</button>
                <button type="button" className="mobile-nav-link" onClick={() => handleNavClick('impact')}>Civic &amp; Economic Impact</button>
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
              {currentView === 'landing' ? '⚡ Open Live Console' : '🏠 Switch to Overview'}
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
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
