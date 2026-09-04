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
    } else {
      const el = document.getElementById(item.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo & Title */}
        <div
          className="brand-wrapper"
          onClick={() => {
            const el = document.getElementById('tourist-home') || document.getElementById('hotel-dashboard') || document.getElementById('travel-dashboard') || document.getElementById('gov-command-center');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{ cursor: 'pointer' }}
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

        {/* Center: Role-Specific Navigation Menu */}
        <nav className="role-navigation-tabs role-specific-nav">
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

        {/* Right Side: Current Role / User Indicator, Actions & Logout */}
        <div className="navbar-actions">
          {currentUser ? (
            <>
              {/* Authenticated User & Verified Role Indicator */}
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
                <span>
                  {currentUser.role === 'government'
                    ? '🏛️'
                    : currentUser.role === 'hotel'
                    ? '🏨'
                    : currentUser.role === 'travel_company'
                    ? '🚌'
                    : '🛡️'}
                </span>
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

              {/* Green Pilgrim Wallet (for tourist) */}
              {(currentUser.role === 'tourist' || !currentUser.role) && (
                <button
                  type="button"
                  className="wallet-badge-btn"
                  onClick={onOpenWallet}
                  title="Open Green Pilgrim Wallet"
                >
                  <span className="coin-icon">🪙</span>
                  <div className="wallet-btn-content">
                    <span className="wallet-points-val">{walletPoints ?? 260}</span>
                    <span className="wallet-points-unit">Pts</span>
                  </div>
                  {pendingPoints > 0 && (
                    <span className="pending-pts-chip" title="Pending arrival at alternate route">
                      +{pendingPoints}
                    </span>
                  )}
                </button>
              )}

              {/* SOS Emergency Distress Beacon (for tourist) */}
              {(currentUser.role === 'tourist' || !currentUser.role) && (
                <button
                  type="button"
                  className="sos-nav-btn"
                  onClick={onOpenSOS}
                  title="Instant 1-Click SOS Emergency"
                >
                  <span className="sos-pulse-ring"></span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span className="sos-btn-text">SOS</span>
                </button>
              )}

              {/* Top Logout Button */}
              <button
                type="button"
                className="nav-logout-btn"
                onClick={onLogout}
                title="Sign Out & Return to Role Selection"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout</span>
              </button>
            </>
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
              title="Sign In to YatraSetu"
            >
              <span>🪪</span>
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle Hamburger */}
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

      {/* Mobile Drawer Dropdown for Small Screens */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-user-row">
            <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
              Role: <strong>{getRoleDisplayName(currentUser?.role)}</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              {currentUser?.full_name || 'Pilgrim Devotee'}
            </span>
          </div>

          <div className="mobile-nav-links">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className={`mobile-nav-link ${item.isDanger ? 'mobile-link-danger' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <span>{item.label}</span>
              </button>
            ))}

            {currentUser && (
              <button
                type="button"
                className="mobile-nav-link mobile-link-danger mobile-logout-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onLogout) onLogout();
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
