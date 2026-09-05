import React, { useState } from 'react';
import {
  loginUser,
  signupUser,
  sendAadhaarOTP,
  verifyAadhaarOTP,
  DEMO_CREDENTIALS
} from '../api/api';
import './RoleSelectionScreen.css';

export default function RoleSelectionScreen({
  onLoginSuccess,
  initialRole = null,
  initialView = 'select',
  onSelectRole,
  onBackToSelect,
  onViewLanding
}) {
  // Screen state: 'select' (4 role cards) | 'login' (role-specific auth form)
  const [currentView, setCurrentView] = useState(initialView || 'select');
  const [selectedRole, setSelectedRole] = useState(initialRole || null); // 'government' | 'hotel' | 'travel_company' | 'tourist'

  // Auth Mode within login view: 'signin' | 'signup' | 'aadhaar'
  const [authMode, setAuthMode] = useState('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Aadhaar Specific State (for Tourist)
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [aadhaarStep, setAadhaarStep] = useState(1);

  // Status & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Pre-configured role metadata: exactly 4 roles in specified order
  const ROLES_DATA = [
    {
      id: 'government',
      name: 'Government',
      badge: 'NATIONAL COMMAND CENTER',
      iconEmoji: '🏛️',
      iconSvg: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M4 18h16" />
          <path d="M6 18V10" />
          <path d="M10 18V10" />
          <path d="M14 18V10" />
          <path d="M18 18V10" />
          <polygon points="12 2 2 8 22 8 12 2" />
        </svg>
      ),
      description: 'Monitor crowds, safety, alerts and emergency rerouting.',
      actionText: 'Continue as Government',
      colorClass: 'role-government',
      accentColor: '#1D4ED8',
      features: ['Centralized AI CCTV Heatmap', 'Active Emergency Rerouting', 'Multi-Agency Dispatch (Police/NDRF)']
    },
    {
      id: 'hotel',
      name: 'Hotel',
      badge: 'SHRINE LODGING PARTNER',
      iconEmoji: '🏨',
      iconSvg: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
          <path d="M9 9h1" />
          <path d="M9 13h1" />
          <path d="M9 17h1" />
          <path d="M14 9h1" />
          <path d="M14 13h1" />
          <path d="M14 17h1" />
        </svg>
      ),
      description: 'Manage rooms, bookings, occupancy and incoming fleet.',
      actionText: 'Continue as Hotel',
      colorClass: 'role-hotel',
      accentColor: '#D97706',
      features: ['Dynamic QR Check-In Terminal', 'Automated Surge Pricing Layer', 'Inbound Fleet & Highway Route Demand']
    },
    {
      id: 'travel_company',
      name: 'Travel Company',
      badge: 'FLEET & TOUR OPERATOR',
      iconEmoji: '🚌',
      iconSvg: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M16 2v2" />
          <path d="M8 2v2" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
          <path d="M3 11h18" />
        </svg>
      ),
      description: 'Manage trips, fleet schedules, rerouting and travel planning.',
      actionText: 'Continue as Travel Company',
      colorClass: 'role-travel',
      accentColor: '#7C3AED',
      features: ['Char Dham Sacred Circuits', 'Fleet Rerouting & Bus Schedules', 'Multi-Shrine Fleet Intelligence']
    },
    {
      id: 'tourist',
      name: 'Tourist',
      badge: 'DEVOTEE & PILGRIM',
      iconEmoji: '🎒',
      iconSvg: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V4a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
          <path d="M9 2v4" />
          <path d="M15 2v4" />
          <path d="M10 14h4" />
        </svg>
      ),
      description: 'Explore destinations, crowd status, forecasts, safety and hotels.',
      actionText: 'Continue as Tourist',
      colorClass: 'role-tourist',
      accentColor: '#EA580C',
      features: ['Live 25 Shrines Telemetry', 'Punya Green Wallet & Rewards', 'Verified Lodges & 1-Click SOS']
    }
  ];

  const currentRoleMeta = ROLES_DATA.find((r) => r.id === selectedRole) || ROLES_DATA[0];

  // Sync external route props
  React.useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
      const demo = DEMO_CREDENTIALS[initialRole];
      if (demo) {
        setEmail(demo.email || '');
      }
      setPassword('DemoPassword123!');
    }
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialRole, initialView]);

  // Open login view for a specific role
  const handleSelectRole = (roleId) => {
    setSelectedRole(roleId);
    setCurrentView('login');
    setAuthMode('signin');
    setErrorMsg('');
    setInfoMsg('');

    // Prepopulate demo credentials for seamless testing
    const demo = DEMO_CREDENTIALS[roleId];
    if (demo) {
      setEmail(demo.email || '');
    } else {
      setEmail('');
    }
    setPassword('DemoPassword123!');

    if (onSelectRole) {
      onSelectRole(roleId);
    }
  };

  // Return to 4-card role selector
  const handleBackToRoleSelect = () => {
    setCurrentView('select');
    setSelectedRole(null);
    setErrorMsg('');
    setInfoMsg('');
    setPassword('');

    if (onBackToSelect) {
      onBackToSelect();
    }
  };

  // 1-Click Demo Login
  const handleQuickDemo = async (roleIdToLogin) => {
    const targetRole = roleIdToLogin || selectedRole || 'tourist';
    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const demo = DEMO_CREDENTIALS[targetRole] || DEMO_CREDENTIALS.tourist;
      const res = await loginUser(demo.email, 'DemoPassword123!');
      if (res.status === 'success' && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.detail || 'Demo login could not be initialized.');
      }
    } catch (err) {
      setErrorMsg('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (res.status === 'success' && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.detail || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMsg('Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Flow
  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signupUser(email.trim(), password, fullName.trim(), selectedRole || 'tourist');
      if (res.status === 'success' && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.detail || 'Registration failed. Try a different email.');
      }
    } catch (err) {
      setErrorMsg('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Aadhaar OTP Verification for Tourist
  const handleSendAadhaarOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const raw = aadhaarNumber.replace(/\D/g, '');
    if (raw.length !== 12) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendAadhaarOTP(raw, phone);
      if (res.status === 'success') {
        setInfoMsg(res.message || 'OTP sent! Use demo code: 123456');
        setAadhaarStep(2);
      } else {
        setErrorMsg(res.detail || 'Failed to send OTP.');
      }
    } catch {
      setInfoMsg('Simulated OTP sent. Demo code: 123456');
      setAadhaarStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAadhaarOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyAadhaarOTP({
        aadhaar_number: aadhaarNumber.replace(/\D/g, ''),
        otp,
        full_name: fullName || 'Pilgrim Devotee',
        phone
      });
      if (res.status === 'success' && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.detail || 'Invalid OTP. Please use 123456.');
      }
    } catch {
      setErrorMsg('Verification failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="role-selection-wrapper">
      {/* Subtle Spiritual Ambient Background */}
      <div className="role-ambient-glow glow-top-left"></div>
      <div className="role-ambient-glow glow-bottom-right"></div>
      <div className="role-subtle-pattern"></div>

      {/* Top Header & Branding */}
      <header className="role-selection-nav">
        <div className="role-nav-inner">
          <div className="role-nav-brand">
            <div className="role-nav-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15 8H9L12 2Z" fill="#F97316" />
                <path d="M4 14H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V14Z" fill="#EA580C" />
                <path d="M8 8V14M16 8V14M12 8V14" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 14C2 14 6 11 12 11C18 11 22 14 22 14" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="5" r="1.5" fill="#FEF08A" />
              </svg>
            </div>
            <div className="role-brand-titles">
              <div className="role-brand-name">
                YatraSetu <span className="devanagari">यात्रासेतु</span>
              </div>
              <div className="role-brand-sub">Smart Pilgrimage &amp; Crowd Governance</div>
            </div>
          </div>

          <div className="role-nav-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {onViewLanding && (
              <button
                type="button"
                className="role-view-landing-btn"
                onClick={onViewLanding}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>Platform Overview</span>
                <span>→</span>
              </button>
            )}
            <span className="sih-dot"></span>
            <span>Smart India Hackathon 2026</span>
          </div>
        </div>
      </header>

      {/* VIEW 1: 4 ROLE CARDS SELECTION SCREEN */}
      {currentView === 'select' && (
        <main className="role-selection-main">
          {/* Hero Heading Section */}
          <div className="role-hero-section">
            <div className="role-badge-pill">
              <span>🏛️</span>
              <span>National Sacred Corridor Portal</span>
            </div>
            <h1 className="role-main-title">Login As</h1>
            <p className="role-main-subtitle">
              Select your role to access your authorized dashboard
            </p>
            <p className="role-intro-caption">
              Government Command, Shrine Lodging Partners, Fleet Operators, and Devotee Pilgrims.
            </p>
          </div>

          {/* 4 Beautiful Role Cards Grid */}
          <div className="role-cards-grid">
            {ROLES_DATA.map((role) => (
              <div
                key={role.id}
                className={`role-card ${role.colorClass}`}
                onClick={() => handleSelectRole(role.id)}
              >
                <div className="role-card-top">
                  <div className="role-icon-box">
                    <span className="role-icon-svg">{role.iconSvg}</span>
                  </div>
                  <span className="role-type-badge">{role.badge}</span>
                </div>

                <div className="role-card-body">
                  <h3 className="role-card-title">{role.name}</h3>
                  <p className="role-card-desc">{role.description}</p>

                  <ul className="role-features-list">
                    {role.features.map((feat, idx) => (
                      <li key={idx}>
                        <span className="feat-check">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="role-card-footer">
                  <button
                    type="button"
                    className="role-continue-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole(role.id);
                    }}
                  >
                    <span>{role.actionText}</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SIH Fast-Track Hackathon Evaluation Banner */}
          <div className="role-demo-helper-strip">
            <div className="demo-strip-content">
              <span className="demo-spark">⚡</span>
              <div>
                <strong>Smart India Hackathon Jury Quick Evaluation:</strong>
                <span> Each role provides authentic FastAPI backend JWT authentication with pre-configured credentials.</span>
              </div>
            </div>
            <div className="demo-strip-buttons">
              <button
                type="button"
                className="quick-eval-chip"
                onClick={() => handleQuickDemo('tourist')}
              >
                🧳 Demo Tourist
              </button>
              <button
                type="button"
                className="quick-eval-chip"
                onClick={() => handleQuickDemo('government')}
              >
                🏛️ Demo Govt
              </button>
              <button
                type="button"
                className="quick-eval-chip"
                onClick={() => handleQuickDemo('hotel')}
              >
                🏨 Demo Hotel
              </button>
              <button
                type="button"
                className="quick-eval-chip"
                onClick={() => handleQuickDemo('travel_company')}
              >
                🚌 Demo Travel
              </button>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 2: AUTHENTICATION FORM FOR SELECTED ROLE */}
      {currentView === 'login' && (
        <main className="role-login-main">
          <div className="role-login-container">
            {/* Top Navigation Bar inside Login Form */}
            <div className="login-top-bar">
              <button
                type="button"
                onClick={handleBackToRoleSelect}
                className="login-back-btn"
              >
                <span>←</span>
                <span>Back to &quot;Login as&quot;</span>
              </button>

              <span className="login-role-tag" style={{ color: currentRoleMeta.accentColor }}>
                {currentRoleMeta.badge}
              </span>
            </div>

            {/* Role Header Banner */}
            <div className="login-header-banner">
              <div className="login-role-icon-box" style={{ borderColor: currentRoleMeta.accentColor }}>
                {currentRoleMeta.iconSvg}
              </div>
              <div className="login-header-texts">
                <h2 className="login-title">
                  {authMode === 'signup'
                    ? `Create ${currentRoleMeta.name} Account`
                    : authMode === 'aadhaar'
                    ? 'Pilgrim Aadhaar e-KYC Verification'
                    : `Login as ${currentRoleMeta.name}`}
                </h2>
                <p className="login-desc">{currentRoleMeta.description}</p>
              </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="login-mode-tabs">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(''); setInfoMsg(''); }}
                className={`mode-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
              >
                🔑 Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); setInfoMsg(''); }}
                className={`mode-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
              >
                📝 Register
              </button>
              {selectedRole === 'tourist' && (
                <button
                  type="button"
                  onClick={() => { setAuthMode('aadhaar'); setAadhaarStep(1); setErrorMsg(''); setInfoMsg(''); }}
                  className={`mode-tab-btn ${authMode === 'aadhaar' ? 'active' : ''}`}
                >
                  🪪 Aadhaar OTP
                </button>
              )}
            </div>

            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="auth-feedback-box error">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && (
              <div className="auth-feedback-box info">
                <span>✨</span>
                <span>{infoMsg}</span>
              </div>
            )}

            {/* FORM 1: EMAIL & PASSWORD SIGN IN */}
            {authMode === 'signin' && (
              <form onSubmit={handleEmailLogin} className="auth-form">
                <div className="auth-input-group">
                  <label htmlFor="auth-email">Email Address *</label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder={`e.g. ${DEMO_CREDENTIALS[selectedRole]?.email || 'user@yatrasetu.org'}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-text-input"
                  />
                </div>

                <div className="auth-input-group">
                  <div className="label-row">
                    <label htmlFor="auth-password">Password *</label>
                    <span className="auth-sub-note">Default Demo: DemoPassword123!</span>
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    placeholder="Enter password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-text-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="auth-submit-btn"
                  style={{ backgroundColor: currentRoleMeta.accentColor }}
                >
                  {isLoading ? 'Verifying Credentials...' : `Sign In as ${currentRoleMeta.name} →`}
                </button>

                {/* 1-Click Fast Track for the Current Role */}
                <div className="auth-divider">
                  <span>OR FAST-TRACK EVALUATION</span>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickDemo(selectedRole)}
                  className="auth-demo-quick-btn"
                >
                  <span>⚡ 1-Click Demo Login as {currentRoleMeta.name}</span>
                  <span className="demo-email-hint">
                    ({DEMO_CREDENTIALS[selectedRole]?.email || 'Official Demo Account'})
                  </span>
                </button>
              </form>
            )}

            {/* FORM 2: USER REGISTRATION / SIGN UP */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignup} className="auth-form">
                <div className="auth-input-group">
                  <label htmlFor="signup-name">Full Name / Organization *</label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="e.g. Saatvik Sharma or Hospitality Ltd"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="auth-text-input"
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-email">Official Email *</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="your-email@yatrasetu.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-text-input"
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-password">Create Password *</label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength="6"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-text-input"
                  />
                </div>

                <div className="auth-input-group">
                  <label>Assigning Role</label>
                  <div className="role-lock-pill">
                    <span>Role:</span>
                    <strong>{currentRoleMeta.name.toUpperCase()}</strong>
                    <span className="lock-tag">🔒 Pre-selected</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="auth-submit-btn"
                  style={{ backgroundColor: currentRoleMeta.accentColor }}
                >
                  {isLoading ? 'Registering...' : `Create ${currentRoleMeta.name} Account →`}
                </button>
              </form>
            )}

            {/* FORM 3: AADHAAR OTP (FOR TOURIST) */}
            {authMode === 'aadhaar' && selectedRole === 'tourist' && (
              <div className="auth-aadhaar-box">
                {aadhaarStep === 1 ? (
                  <form onSubmit={handleSendAadhaarOTP} className="auth-form">
                    <div className="auth-input-group">
                      <label>12-Digit Aadhaar Number *</label>
                      <input
                        type="text"
                        maxLength="14"
                        placeholder="XXXX-XXXX-XXXX"
                        value={aadhaarNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                          const formatted = val.match(/.{1,4}/g)?.join('-') || val;
                          setAadhaarNumber(formatted);
                        }}
                        required
                        className="auth-text-input font-mono"
                      />
                    </div>

                    <div className="auth-input-group">
                      <label>Full Name as per Aadhaar *</label>
                      <input
                        type="text"
                        placeholder="Enter full legal name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="auth-text-input"
                      />
                    </div>

                    <div className="auth-input-group">
                      <label>Linked Mobile Number *</label>
                      <input
                        type="tel"
                        maxLength="10"
                        placeholder="10-digit phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        required
                        className="auth-text-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="auth-submit-btn"
                      style={{ backgroundColor: '#059669' }}
                    >
                      {isLoading ? 'Sending OTP...' : 'Send Aadhaar Verification OTP →'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAadhaarOTP} className="auth-form">
                    <div className="auth-input-group">
                      <label>Enter 6-Digit OTP *</label>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="e.g. 123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        className="auth-text-input font-mono"
                        style={{ fontSize: '1.25rem', letterSpacing: '0.25rem', textAlign: 'center' }}
                      />
                      <span className="auth-sub-note" style={{ color: '#059669', marginTop: '0.35rem' }}>
                        💡 Demo OTP Code: <strong>123456</strong>
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="auth-submit-btn"
                      style={{ backgroundColor: '#059669' }}
                    >
                      {isLoading ? 'Verifying OTP...' : 'Verify & Generate Digital Yatri Card →'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAadhaarStep(1)}
                      className="login-back-btn"
                      style={{ marginTop: '0.75rem', alignSelf: 'center' }}
                    >
                      ← Re-enter Aadhaar Details
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
