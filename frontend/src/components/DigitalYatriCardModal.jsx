import React from 'react';

export default function DigitalYatriCardModal({ user, isOpen, onClose, onLogout }) {
  if (!isOpen || !user) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box yatri-card-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', borderRadius: '1.25rem', overflow: 'hidden' }}>
        <div style={{
          background: 'linear-gradient(135deg, #065F46 0%, #059669 50%, #10B981 100%)',
          padding: '1.25rem',
          color: '#FFFFFF',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🪪</span>
              <div>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.9 }}>Government of Uttarakhand & Temple Board</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>Digital Yatri Suraksha Card</h3>
              </div>
            </div>
            <button className="close-btn" onClick={onClose} style={{ color: '#FFFFFF' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '1rem',
            padding: '1.25rem',
            border: '2px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              backgroundColor: '#ECFDF5',
              border: '1px solid #10B981',
              borderRadius: '999px',
              padding: '0.25rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: '700',
              color: '#047857'
            }}>
              <span>🛡️</span> AADHAAR VERIFIED
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                border: '2px solid #059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem'
              }}>
                🙏
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', fontWeight: '800', color: '#0F172A' }}>
                  {user.full_name || 'Pilgrim Devotee'}
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '600' }}>
                  ID: {user.user_id}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>Aadhaar (Masked)</span>
                <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{user.aadhaar_masked || 'XXXX-XXXX-8912'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>Blood Group</span>
                <strong style={{ fontSize: '0.85rem', color: '#DC2626' }}>{user.blood_group || 'O+'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>Registered Phone</span>
                <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>+91 {user.phone || '9876543210'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block' }}>Emergency SOS Relative</span>
                <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{user.emergency_contact || 'Family'}</strong>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '0.75rem',
              border: '1px solid #BFDBFE'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1D4ED8', marginBottom: '0.2rem' }}>
                  Rescue & Medical QR Pass
                </div>
                <div style={{ fontSize: '0.72rem', color: '#3B82F6' }}>
                  Scannable by SDRF, Police & Temple Control Room
                </div>
              </div>
              <div style={{
                width: '56px',
                height: '56px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #93C5FD',
                borderRadius: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem'
              }}>
                🏁
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              onClick={handlePrint}
              style={{
                flex: 1,
                padding: '0.65rem',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <span>🖨️</span> Print / Save Offline
            </button>
            <button
              onClick={onLogout}
              style={{
                padding: '0.65rem 1rem',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
