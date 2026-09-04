import React, { useState } from 'react';
import {
  loginUser,
  signupUser,
  sendAadhaarOTP,
  verifyAadhaarOTP,
  loginVendor,
  DEMO_CREDENTIALS
} from '../api/api';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [authMode, setAuthMode] = useState('demo'); // 'demo' | 'email_login' | 'signup' | 'aadhaar' | 'vendor'
  const [role, setRole] = useState('tourist');

  // Email/Password Login & Signup State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupRole, setSignupRole] = useState('tourist');

  // Aadhaar State
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [aadhaarStep, setAadhaarStep] = useState(1);

  // Vendor State
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [category, setCategory] = useState('Prasad & Puja Offerings');
  const [regId, setRegId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1-Click Quick Demo Login
  const handleQuickDemoLogin = async (selectedRole) => {
    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const demo = DEMO_CREDENTIALS[selectedRole] || DEMO_CREDENTIALS.tourist;
      const res = await loginUser(demo.email, 'DemoPassword123!');
      if (res.status === 'success' && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg('Error initializing demo session.');
      }
    } catch (err) {
      setErrorMsg('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email / Password Login
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
        onClose();
      } else {
        setErrorMsg(res.detail || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMsg('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // User Signup
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
      const res = await signupUser(email.trim(), password, fullName.trim(), signupRole);
      if (res.status === 'success' && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res.detail || 'Registration failed. Try a different email.');
      }
    } catch (err) {
      setErrorMsg('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Aadhaar OTP Handlers
  const handleAadhaarChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 12);
    let formatted = val.match(/.{1,4}/g)?.join('-') || val;
    setAadhaarNumber(formatted);
  };

  const handleSendAadhaarOTP = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const rawAadhaar = aadhaarNumber.replace(/-/g, '');
    if (rawAadhaar.length !== 12) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name as per Aadhaar.');
      return;
    }
    if (phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendAadhaarOTP(rawAadhaar, phone);
      if (res.status === 'success') {
        setInfoMsg(res.message + ' (Demo Hint: Use 123456)');
        setAadhaarStep(2);
      } else {
        setErrorMsg(res.detail || 'Error sending OTP. Please try again.');
      }
    } catch (err) {
      setAadhaarStep(2);
      setInfoMsg('Simulated OTP sent to registered mobile. Use 123456 to verify.');
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
      const payload = {
        aadhaar_number: aadhaarNumber.replace(/-/g, ''),
        otp,
        full_name: fullName,
        phone,
        blood_group: bloodGroup,
        emergency_contact: emergencyContact || 'Primary Relative',
        emergency_phone: emergencyPhone || phone
      };
      const res = await verifyAadhaarOTP(payload);
      if (res.status === 'success') {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res.detail || 'Invalid OTP. Please enter 123456.');
      }
    } catch (err) {
      setErrorMsg('Verification failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Vendor Login
  const handleVendorLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!businessName.trim() || !ownerName.trim()) {
      setErrorMsg('Please fill in business name and owner name.');
      return;
    }
    if (vendorPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit contact number.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        business_name: businessName,
        owner_name: ownerName,
        phone: vendorPhone,
        category,
        spot_id: 'site_kedarnath',
        registration_id: regId || `TEMPLE-REG-${Math.floor(10000 + Math.random() * 90000)}`
      };
      const res = await loginVendor(payload);
      if (res.status === 'success') {
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setErrorMsg('Vendor login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content auth-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', borderRadius: '1.2rem', padding: '1.6rem' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.6rem' }}>
              {authMode === 'demo' ? '⚡' : authMode === 'aadhaar' ? '🪪' : authMode === 'vendor' ? '🏪' : '🔑'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0F172A' }}>
                {authMode === 'demo'
                  ? 'SIH 2026 Evaluation: 1-Click Role Logins'
                  : authMode === 'email_login'
                  ? 'Sign In to YatraSetu'
                  : authMode === 'signup'
                  ? 'Create New Role Account'
                  : authMode === 'aadhaar'
                  ? 'Pilgrim Aadhaar Safety Verification'
                  : 'Local Temple Vendor Portal'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                {authMode === 'demo'
                  ? 'Instant role-swapping for Smart India Hackathon jury evaluation'
                  : 'Secure Supabase Auth & Role-Based Access Control'}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            padding: '0.3rem',
            backgroundColor: '#F1F5F9',
            borderRadius: '0.75rem',
            marginBottom: '1.25rem',
            overflowX: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => { setAuthMode('demo'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.6rem',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: authMode === 'demo' ? '#FFFFFF' : 'transparent',
              color: authMode === 'demo' ? '#EA580C' : '#64748B',
              boxShadow: authMode === 'demo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            ⚡ 1-Click Demo
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('email_login'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.6rem',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: authMode === 'email_login' ? '#FFFFFF' : 'transparent',
              color: authMode === 'email_login' ? '#0F172A' : '#64748B',
              boxShadow: authMode === 'email_login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🔑 Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.6rem',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: authMode === 'signup' ? '#FFFFFF' : 'transparent',
              color: authMode === 'signup' ? '#0F172A' : '#64748B',
              boxShadow: authMode === 'signup' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📝 Register
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('aadhaar'); setAadhaarStep(1); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.6rem',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: authMode === 'aadhaar' ? '#FFFFFF' : 'transparent',
              color: authMode === 'aadhaar' ? '#059669' : '#64748B',
              boxShadow: authMode === 'aadhaar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🪪 Aadhaar OTP
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('vendor'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              flex: 1,
              padding: '0.55rem 0.6rem',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '0.78rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: authMode === 'vendor' ? '#FFFFFF' : 'transparent',
              color: authMode === 'vendor' ? '#D97706' : '#64748B',
              boxShadow: authMode === 'vendor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🏪 Vendor
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.65rem 0.9rem', borderRadius: '0.6rem', fontSize: '0.82rem', marginBottom: '0.85rem', border: '1px solid #FECACA' }}>
            ⚠️ {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.65rem 0.9rem', borderRadius: '0.6rem', fontSize: '0.82rem', marginBottom: '0.85rem', border: '1px solid #A7F3D0' }}>
            ✨ {infoMsg}
          </div>
        )}

        {/* 1-CLICK DEMO QUICK LOGINS */}
        {authMode === 'demo' && (
          <div>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
              Click any role card below to instantly log in as a pre-configured, verified user with authorized JWT permissions:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              {/* Tourist Demo */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickDemoLogin('tourist')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  backgroundColor: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🧳</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#166534' }}>Tourist / Pilgrim</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: '600' }}>Saatvik Sharma (Aadhaar Verified)</span>
                <span style={{ fontSize: '0.7rem', color: '#4ADE80', marginTop: '0.25rem', backgroundColor: '#14532D', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  260 PUNYA POINTS • SOS READY
                </span>
              </button>

              {/* Government Demo */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickDemoLogin('government')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  backgroundColor: '#EFF6FF',
                  border: '1.5px solid #93C5FD',
                  borderRadius: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🏛️</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1E40AF' }}>Government Command</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#1D4ED8', fontWeight: '600' }}>DM Rudraprayag / Temple Affairs</span>
                <span style={{ fontSize: '0.7rem', color: '#93C5FD', marginTop: '0.25rem', backgroundColor: '#1E3A8A', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  POST /CROWD/UPDATE ACCESS
                </span>
              </button>

              {/* Hotel Demo */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickDemoLogin('hotel')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #FDE68A',
                  borderRadius: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🏨</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#92400E' }}>Shrine Hospitality</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: '600' }}>Kedarnath Himalayan Inn</span>
                <span style={{ fontSize: '0.7rem', color: '#FDE68A', marginTop: '0.25rem', backgroundColor: '#78350F', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  ROOM TIERS &amp; BOOKINGS
                </span>
              </button>

              {/* Travel Company Demo */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickDemoLogin('travel_company')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  backgroundColor: '#FAF5FF',
                  border: '1.5px solid #E9D5FF',
                  borderRadius: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(147, 51, 234, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🚌</span>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#6B21A8' }}>Travel Company</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#7E22CE', fontWeight: '600' }}>Garhwal Divine Travels</span>
                <span style={{ fontSize: '0.7rem', color: '#E9D5FF', marginTop: '0.25rem', backgroundColor: '#581C87', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  FLEET &amp; CIRCUIT OPTIMIZER
                </span>
              </button>
            </div>
          </div>
        )}

        {/* EMAIL & PASSWORD LOGIN */}
        {authMode === 'email_login' && (
          <form onSubmit={handleEmailLogin}>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                Email Address *
              </label>
              <input
                type="email"
                placeholder="e.g. name@yatrasetu.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="gov-input"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                Password *
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="gov-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="gov-submit-btn"
              style={{ width: '100%', margin: 0, padding: '0.75rem' }}
            >
              {isLoading ? 'Authenticating with Supabase...' : 'Sign In ➔'}
            </button>
          </form>
        )}

        {/* REGISTER NEW ACCOUNT */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                Full Name / Organization Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Rameshwar Sharma / Alpine Lodges"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="gov-input"
              />
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                Account Email *
              </label>
              <input
                type="email"
                placeholder="e.g. rameshwar@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="gov-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                  Password (min 6 chars) *
                </label>
                <input
                  type="password"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="gov-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.3rem' }}>
                  Select Role *
                </label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  className="gov-select"
                >
                  <option value="tourist">Tourist / Pilgrim</option>
                  <option value="government">Government Official</option>
                  <option value="hotel">Hotel Partner</option>
                  <option value="travel_company">Travel Company</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="gov-submit-btn"
              style={{ width: '100%', margin: 0, padding: '0.75rem' }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account ➔'}
            </button>
          </form>
        )}

        {/* AADHAAR VERIFICATION FLOW */}
        {authMode === 'aadhaar' && (
          <div>
            {aadhaarStep === 1 ? (
              <form onSubmit={handleSendAadhaarOTP}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Saatvik Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="gov-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      required
                      className="gov-input"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>
                      12-Digit Aadhaar Number (Safety Verification) *
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>🔒 UIDAI Vault</span>
                  </div>
                  <input
                    type="text"
                    placeholder="XXXX - XXXX - XXXX"
                    value={aadhaarNumber}
                    onChange={handleAadhaarChange}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1.5px solid #059669', fontSize: '0.95rem', letterSpacing: '0.1em', fontWeight: '600', color: '#0F172A' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '0.25rem' }}>
                    Enables verified SOS dispatch and instant digital yatri wristband pairing.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="gov-select"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Emergency Contact Name &amp; Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh (Father) - 9876500000"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="gov-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0.6rem',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {isLoading ? 'Verifying Aadhaar Vault...' : 'Send Aadhaar Verification OTP ➔'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAadhaarOTP}>
                <div style={{ textAlign: 'center', margin: '1rem 0' }}>
                  <span style={{ fontSize: '2.5rem' }}>📱</span>
                  <h4 style={{ margin: '0.5rem 0 0.2rem', color: '#0F172A' }}>Enter 6-Digit Aadhaar OTP</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    OTP sent to phone linked with Aadhaar <strong>{aadhaarNumber}</strong> (Use: <strong>123456</strong>)
                  </p>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      letterSpacing: '0.4em',
                      fontWeight: '800',
                      borderRadius: '0.6rem',
                      border: '2px solid #059669',
                      color: '#0F172A'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setAadhaarStep(1)}
                    className="preset-btn normal"
                    style={{ flex: 1, padding: '0.7rem' }}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      flex: 2,
                      padding: '0.7rem',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {isLoading ? 'Issuing Digital Card...' : 'Verify & Generate Yatri Card 🛡️'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VENDOR LOGIN FLOW */}
        {authMode === 'vendor' && (
          <form onSubmit={handleVendorLogin}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Stall / Business Name *</label>
              <input
                type="text"
                placeholder="e.g. Kedarnath Mahaprasad Bhandar"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="gov-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Owner / Manager Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  className="gov-input"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 9871122334"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  className="gov-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="gov-select"
                >
                  <option value="Prasad & Puja Offerings">Prasad & Puja Offerings</option>
                  <option value="Sattvic Food & Refreshments">Sattvic Food & Refreshments</option>
                  <option value="Handicrafts & Devotional Items">Handicrafts & Devotional Items</option>
                  <option value="Mule / Porter / Trek Services">Mule / Porter / Trek Services</option>
                  <option value="Pilgrim Lodge / Homestay">Pilgrim Lodge / Homestay</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Temple Registration ID</label>
                <input
                  type="text"
                  placeholder="e.g. BKTC-STALL-104"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  className="gov-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.6rem',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {isLoading ? 'Connecting to Temple Portal...' : 'Access Temple Vendor Portal ➔'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
