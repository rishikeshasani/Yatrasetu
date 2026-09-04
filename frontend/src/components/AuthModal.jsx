import React, { useState } from 'react';
import { sendAadhaarOTP, verifyAadhaarOTP, loginVendor } from '../api/api';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [role, setRole] = useState('tourist');
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [category, setCategory] = useState('Prasad & Puja Offerings');
  const [regId, setRegId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        setStep(2);
      } else {
        setErrorMsg(res.detail || 'Error sending OTP. Please try again.');
      }
    } catch (err) {
      setStep(2);
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
      <div className="modal-content auth-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '1rem' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{role === 'tourist' ? '🪪' : '🏪'}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0F172A' }}>
                {role === 'tourist' ? 'Pilgrim Sign In & Aadhaar Safety' : 'Local Temple Vendor Portal'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                {role === 'tourist'
                  ? 'Verify Aadhaar for safe tracking, Digital Yatri Card & SOS lifeline'
                  : 'Commercial Partner login for Prasad & Puja inventory'}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          padding: '0.35rem',
          backgroundColor: '#F1F5F9',
          borderRadius: '0.75rem',
          margin: '1rem 0'
        }}>
          <button
            type="button"
            onClick={() => { setRole('tourist'); setStep(1); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              backgroundColor: role === 'tourist' ? '#FFFFFF' : 'transparent',
              color: role === 'tourist' ? '#0F172A' : '#64748B',
              boxShadow: role === 'tourist' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span>🙏</span> Login as Tourist
          </button>
          <button
            type="button"
            onClick={() => { setRole('vendor'); setErrorMsg(''); setInfoMsg(''); }}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              backgroundColor: role === 'vendor' ? '#FFFFFF' : 'transparent',
              color: role === 'vendor' ? '#0F172A' : '#64748B',
              boxShadow: role === 'vendor' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <span>🏪</span> Login as Vendor
          </button>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.82rem', marginBottom: '0.85rem', border: '1px solid #FECACA' }}>
            ⚠️ {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', fontSize: '0.82rem', marginBottom: '0.85rem', border: '1px solid #A7F3D0' }}>
            ✨ {infoMsg}
          </div>
        )}

        {role === 'tourist' && (
          <div>
            {step === 1 ? (
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
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
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
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#334155' }}>
                      12-Digit Aadhaar Number (Safety Verification) *
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>🔒 256-bit UIDAI Vault</span>
                  </div>
                  <input
                    type="text"
                    placeholder="XXXX - XXXX - XXXX"
                    value={aadhaarNumber}
                    onChange={handleAadhaarChange}
                    required
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #059669', fontSize: '0.95rem', letterSpacing: '0.1em', fontWeight: '600', color: '#0F172A' }}
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
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Emergency Contact Name & Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh (Father) - 9876500000"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
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
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
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
                    OTP sent to phone linked with Aadhaar <strong>{aadhaarNumber}</strong>
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
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1,
                      padding: '0.7rem',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
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

        {role === 'vendor' && (
          <form onSubmit={handleVendorLogin}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Stall / Business Name *</label>
              <input
                type="text"
                placeholder="e.g. Kedarnath Mahaprasad Bhandar"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
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
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
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
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
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
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
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
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
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
