import React, { useState } from 'react';

export default function VendorDashboardModal({ user, isOpen, onClose, onLogout }) {
  if (!isOpen || !user) return null;

  const [offerings, setOfferings] = useState([
    { id: 1, name: 'Special Panchamrit Mahaprasad Box (Certified Pure)', price: 150, category: 'Prasad', inStock: true },
    { id: 2, name: 'Holy Rudrabhishek Samagri Thali', price: 250, category: 'Puja', inStock: true },
    { id: 3, name: 'Pure Ganga Jal Brass Kalash (Sealed)', price: 80, category: 'Puja', inStock: true },
    { id: 4, name: 'Kedarnath Wooden Carved Temple Replica', price: 350, category: 'Handicrafts', inStock: true }
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [redeemedCode, setRedeemedCode] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');

  const handleAddOffering = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    const newItem = {
      id: Date.now(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      category: 'Prasad',
      inStock: true
    };
    setOfferings([...offerings, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRedeemCoupon = (e) => {
    e.preventDefault();
    if (!redeemedCode.trim()) return;
    setRedeemSuccess(`🎉 Verified! 50 Green Pilgrim Punya Points applied. ₹50 discount approved for pilgrim.`);
    setRedeemedCode('');
    setTimeout(() => setRedeemSuccess(''), 5000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box vendor-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', borderRadius: '1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
          padding: '1.25rem',
          color: '#FFFFFF',
          borderRadius: '1.25rem 1.25rem 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.8rem' }}>🏪</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{user.business_name}</h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Temple Authorized Partner • License: {user.registration_id}
                </span>
              </div>
            </div>
            <button className="close-btn" onClick={onClose} style={{ color: '#FFFFFF' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ backgroundColor: '#FFFBEB', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #FEF3C7', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: '600' }}>Active Offerings</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#B45309' }}>{offerings.length} items</strong>
            </div>
            <div style={{ backgroundColor: '#ECFDF5', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #A7F3D0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: '600' }}>Shrine Footfall</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#059669' }}>High Density</strong>
            </div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #BFDBFE', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: '600' }}>Punya QR Redeemed</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', color: '#2563EB' }}>18 Pilgrims</strong>
            </div>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🎟️</span> Scan / Redeem Pilgrim Green Discount Token
            </h4>
            <form onSubmit={handleRedeemCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter Pilgrim Token (e.g. PUNYA-50-KEDAR)"
                value={redeemedCode}
                onChange={(e) => setRedeemedCode(e.target.value)}
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Validate Token
              </button>
            </form>
            {redeemSuccess && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#065F46', backgroundColor: '#ECFDF5', padding: '0.5rem', borderRadius: '0.4rem' }}>
                {redeemSuccess}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#0F172A' }}>Manage Stall Catalog</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {offerings.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '0.5rem',
                  border: '1px solid #E2E8F0'
                }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{item.name}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>Category: {item.category}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: '700', color: '#059669', fontSize: '0.9rem' }}>₹{item.price}</span>
                    <button
                      onClick={() => setOfferings(offerings.filter(o => o.id !== item.id))}
                      style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: '0.9rem' }}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddOffering} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input
                type="text"
                placeholder="New item name (e.g. Rudraksha Mala)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                style={{ flex: 2, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.5rem 0.85rem',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                + Add
              </button>
            </form>
          </div>

          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '0.65rem',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Logout from Vendor Portal
          </button>
        </div>
      </div>
    </div>
  );
}
