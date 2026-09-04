export default function Navbar({ walletPoints, pendingPoints = 0, onOpenWallet, onOpenSOS, currentUser, onOpenAuth, onOpenProfile }) {
  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo & Title */}
        <div className="brand-wrapper">
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
            <div className="brand-tagline">Smart Pilgrimage & Crowd Governance</div>
          </div>
        </div>

        {/* Live Monitoring Badge */}
        <div className="live-status-pill desktop-only">
          <span className="pulse-dot"></span>
          <span className="live-status-label">AI CCTV & Telemetry Active</span>
        </div>

        {/* Action Controls: Yatra Dal, Wallet & SOS */}
        <div className="navbar-actions">
          {/* User Profile / Auth Button */}
          {currentUser && currentUser.role === 'tourist' ? (
            <button
              type="button"
              className="auth-profile-pill"
              onClick={onOpenProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#ECFDF5',
                border: '1px solid #10B981',
                padding: '0.4rem 0.75rem',
                borderRadius: '999px',
                color: '#065F46',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="View Digital Yatri Suraksha Card"
            >
              <span>🛡️</span>
              <span>{currentUser.full_name?.split(' ')[0] || 'Pilgrim'}</span>
              <span style={{ fontSize: '0.65rem', backgroundColor: '#059669', color: '#FFF', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>VERIFIED</span>
            </button>
          ) : currentUser && currentUser.role === 'vendor' ? (
            <button
              type="button"
              className="auth-profile-pill"
              onClick={onOpenProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#FFFBEB',
                border: '1px solid #F59E0B',
                padding: '0.4rem 0.75rem',
                borderRadius: '999px',
                color: '#92400E',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="Open Vendor Dashboard"
            >
              <span>🏪</span>
              <span>{currentUser.business_name?.slice(0, 14) || 'Vendor'}</span>
              <span style={{ fontSize: '0.65rem', backgroundColor: '#D97706', color: '#FFF', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>PARTNER</span>
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
            >
              <span>🪪</span>
              <span>Sign In / Link Aadhaar</span>
            </button>
          )}

          <button 
            type="button" 
            className="team-nav-btn desktop-only"
            onClick={() => {
              const el = document.querySelector('.team-tracker-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Track Yatra Dal & Group Members"
          >
            <span className="team-icon">👥</span>
            <span className="team-btn-text">Yatra Dal</span>
            <span className="team-count-chip">5 Linked</span>
          </button>

          <button 
            type="button" 
            className="wallet-badge-btn" 
            onClick={onOpenWallet}
            title="Open Green Pilgrim Wallet"
          >
            <span className="coin-icon">🪙</span>
            <div className="wallet-btn-content">
              <span className="wallet-points-val">{walletPoints ?? 260}</span>
              <span className="wallet-points-unit">Punya Pts</span>
            </div>
            {pendingPoints > 0 && (
              <span className="pending-pts-chip" title="Pending arrival at alternate route">
                +{pendingPoints} pending
              </span>
            )}
          </button>

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
        </div>
      </div>
    </header>
  );
}
