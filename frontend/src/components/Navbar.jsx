import React, { useState } from 'react';

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
  onNavigateSection
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo & Title */}
        <div 
          className="brand-wrapper" 
          onClick={() => handleNavClick('top')} 
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

        {/* Center: When in Landing View, show Section Anchors; When in Dashboard View, show 4 Role Tabs */}
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
          <nav className="role-navigation-tabs desktop-only">
            <button
              type="button"
              className={`role-tab-btn ${activeRole === 'tourist' ? 'active' : ''}`}
              onClick={() => onSelectRole && onSelectRole('tourist')}
              title="Devotee & Pilgrim Dashboard"
            >
              <span className="role-tab-icon">🧳</span>
              <span className="role-tab-label">Tourist</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${activeRole === 'government' ? 'active' : ''}`}
              onClick={() => onSelectRole && onSelectRole('government')}
              title="DM & Command Center Dashboard"
            >
              <span className="role-tab-icon">🏛️</span>
              <span className="role-tab-label">Government</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${activeRole === 'hotel' ? 'active' : ''}`}
              onClick={() => onSelectRole && onSelectRole('hotel')}
              title="Shrine Lodging & Hospitality Partner"
            >
              <span className="role-tab-icon">🏨</span>
              <span className="role-tab-label">Hotel Partner</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${activeRole === 'travel_company' ? 'active' : ''}`}
              onClick={() => onSelectRole && onSelectRole('travel_company')}
              title="Tour Operator & Fleet Route Planner"
            >
              <span className="role-tab-icon">🚌</span>
              <span className="role-tab-label">Travel Company</span>
            </button>
          </nav>
        )}

        {/* Action Controls: View Switcher, User Profile, Yatra Dal, Wallet & SOS */}
        <div className="navbar-actions">
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

          {/* User Profile / Auth Button */}
          {currentUser ? (
            <button
              type="button"
              className="auth-profile-pill"
              onClick={onOpenProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor:
                  currentUser.role === 'government'
                    ? '#EFF6FF'
                    : currentUser.role === 'hotel'
                    ? '#FEF3C7'
                    : currentUser.role === 'travel_company'
                    ? '#F3E8FF'
                    : '#ECFDF5',
                border: `1px solid ${
                  currentUser.role === 'government'
                    ? '#3B82F6'
                    : currentUser.role === 'hotel'
                    ? '#F59E0B'
                    : currentUser.role === 'travel_company'
                    ? '#A855F7'
                    : '#10B981'
                }`,
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                color:
                  currentUser.role === 'government'
                    ? '#1E40AF'
                    : currentUser.role === 'hotel'
                    ? '#92400E'
                    : currentUser.role === 'travel_company'
                    ? '#6B21A8'
                    : '#065F46',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title={`Logged in as ${currentUser.full_name} (${getRoleDisplayName(currentUser.role)})`}
            >
              <span>
                {currentUser.role === 'government'
                  ? '🏛️'
                  : currentUser.role === 'hotel'
                  ? '🏨'
                  : currentUser.role === 'travel_company'
                  ? '🚌'
                  : currentUser.role === 'vendor'
                  ? '🏪'
                  : '🛡️'}
              </span>
              <span className="desktop-only">{currentUser.full_name?.split(' ')[0] || 'User'}</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  backgroundColor:
                    currentUser.role === 'government'
                      ? '#1D4ED8'
                      : currentUser.role === 'hotel'
                      ? '#D97706'
                      : currentUser.role === 'travel_company'
                      ? '#7E22CE'
                      : '#059669',
                  color: '#FFF',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  fontWeight: '800'
                }}
              >
                {currentUser.role === 'government'
                  ? 'GOVT'
                  : currentUser.role === 'hotel'
                  ? 'HOTEL'
                  : currentUser.role === 'travel_company'
                  ? 'TOUR'
                  : currentUser.role === 'vendor'
                  ? 'VENDOR'
                  : 'VERIFIED'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="auth-login-btn"
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
              title="Sign In or Access 1-Click Demo Accounts"
            >
              <span>🪪</span>
              <span className="desktop-only">Sign In / Demo</span>
            </button>
          )}

          {/* Yatra Dal (visible in tourist dashboard or on desktop) */}
          <button
            type="button"
            className="team-nav-btn desktop-only"
            onClick={() => {
              if (currentView !== 'dashboard') {
                onToggleView && onToggleView();
              }
              if (activeRole !== 'tourist') {
                onSelectRole && onSelectRole('tourist');
              }
              setTimeout(() => {
                const el = document.querySelector('.team-tracker-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 120);
            }}
            title="Track Yatra Dal & Group Members"
          >
            <span className="team-icon">👥</span>
            <span className="team-btn-text">Yatra Dal</span>
            <span className="team-count-chip">5 Linked</span>
          </button>

          {/* Green Pilgrim Wallet */}
          <button
            type="button"
            className="wallet-badge-btn"
            onClick={onOpenWallet}
            title="Open Green Pilgrim Wallet"
          >
            <span className="coin-icon">🪙</span>
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

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-hamburger-btn mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer mobile-only">
          <div className="mobile-nav-links">
            <button
              type="button"
              className="mobile-nav-item"
              onClick={() => handleNavClick('top')}
            >
              🏠 Home Overview
            </button>
            <button
              type="button"
              className="mobile-nav-item"
              onClick={() => handleNavClick('smart-destinations')}
            >
              📍 Explore 25 Shrines
            </button>
            <button
              type="button"
              className="mobile-nav-item"
              onClick={() => handleNavClick('crowd-intelligence')}
            >
              👁️ Crowd Intelligence
            </button>
            <button
              type="button"
              className="mobile-nav-item"
              onClick={() => handleNavClick('how-it-works')}
            >
              🧠 How It Works
            </button>
            <button
              type="button"
              className="mobile-nav-item"
              onClick={() => handleNavClick('safety')}
            >
              🚨 Emergency Safety &amp; SOS
            </button>
            <button
              type="button"
              className="mobile-nav-item"
              onClick={() => handleNavClick('impact')}
            >
              📊 Civic &amp; Economic Impact
            </button>
          </div>

          <div className="mobile-drawer-footer">
            <button
              type="button"
              className="mobile-switch-view-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                onToggleView && onToggleView();
              }}
            >
              {currentView === 'landing' ? '⚡ Open Live Console' : '🏠 Switch to Overview'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
