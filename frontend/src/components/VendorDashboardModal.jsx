import React, { useState } from 'react';

export default function VendorDashboardModal({ user, isOpen, onClose, onLogout }) {
  if (!isOpen || !user) return null;

  // Detect default tab based on user's registered category
  const detectDefaultTab = (categoryStr = '') => {
    const cat = (categoryStr || '').toLowerCase();
    if (cat.includes('mule') || cat.includes('trek') || cat.includes('travel') || cat.includes('guide') || cat.includes('transport') || cat.includes('taxi')) {
      return 'travel';
    }
    if (cat.includes('lodge') || cat.includes('homestay') || cat.includes('hotel') || cat.includes('dormitory') || cat.includes('stay') || cat.includes('sarai') || cat.includes('guest')) {
      return 'hotel';
    }
    return 'retail';
  };

  const [activeTab, setActiveTab] = useState(() => detectDefaultTab(user.category));

  // ==========================================
  // 1. TRAVEL & TRANSPORT STATE
  // ==========================================
  const [fleetStats, setFleetStats] = useState({
    total: 16,
    available: 10,
    onTrip: 5,
    maintenance: 1
  });
  const [travelAccepting, setTravelAccepting] = useState(true);
  const [baseFare, setBaseFare] = useState(2500);
  const [crowdMultiplier, setCrowdMultiplier] = useState(1.2); // 1.2x for peak season
  const [activeRoutes, setActiveRoutes] = useState([
    { id: 'TR-101', type: 'Registered Mule & Handler', route: 'Gaurikund Basecamp ➔ Kedarnath Mandir', pilgrimName: 'Vikas Sharma (4 Yatris)', fare: 2500, status: 'On Trek', eta: '45 mins' },
    { id: 'TR-102', type: 'Certified Mountain Guide', route: 'Temple Perimeter ➔ Bhairavnath Temple', pilgrimName: 'Ananya Gupta (2 Yatris)', fare: 800, status: 'Departed', eta: '20 mins' },
    { id: 'TR-103', type: 'Shared SUV / Taxi', route: 'Sonprayag Shuttle ➔ Gaurikund Gate', pilgrimName: 'Pooja Verma (6 Yatris)', fare: 300, status: 'Completed', eta: 'Arrived' }
  ]);
  const [newVehicleType, setNewVehicleType] = useState('Certified Mountain Guide');
  const [newVehicleRoute, setNewVehicleRoute] = useState('Gaurikund Basecamp ➔ Kedarnath');
  const [newVehicleRate, setNewVehicleRate] = useState('1200');

  const handleAddTransport = (e) => {
    e.preventDefault();
    if (!newVehicleRoute.trim() || !newVehicleRate) return;
    const newEntry = {
      id: `TR-${Math.floor(100 + Math.random() * 900)}`,
      type: newVehicleType,
      route: newVehicleRoute,
      pilgrimName: 'Available for Booking',
      fare: parseFloat(newVehicleRate),
      status: 'Ready at Stand',
      eta: 'Immediate'
    };
    setActiveRoutes([newEntry, ...activeRoutes]);
    setFleetStats(prev => ({ ...prev, total: prev.total + 1, available: prev.available + 1 }));
    setNewVehicleRoute('');
    setNewVehicleRate('');
  };

  const handleCompleteTrip = (id) => {
    setActiveRoutes(prev => prev.map(r => r.id === id ? { ...r, status: 'Completed', eta: 'Standby' } : r));
    setFleetStats(prev => ({
      ...prev,
      available: Math.min(prev.total, prev.available + 1),
      onTrip: Math.max(0, prev.onTrip - 1)
    }));
  };

  // ==========================================
  // 2. HOTEL & ACCOMMODATION STATE
  // ==========================================
  const [totalRooms, setTotalRooms] = useState(30);
  const [occupiedBeds, setOccupiedBeds] = useState(22);
  const [hotelSurgeMultiplier, setHotelSurgeMultiplier] = useState(1.15); // Demand-linked
  const [greenDiscountEnabled, setGreenDiscountEnabled] = useState(true);
  const [roomTypes, setRoomTypes] = useState([
    { id: 'RT-1', name: 'Heated Dormitory Bunk (Swargarohini Wing)', total: 18, available: 5, price: 650, amenities: 'Hot Water Thermos, Medical Oxygen Support' },
    { id: 'RT-2', name: 'Deluxe Alpine Cottage (Family 4-Bed)', total: 8, available: 2, price: 2800, amenities: 'Insulated Wooden Walls, Electric Blankets' },
    { id: 'RT-3', name: 'Emergency Transit Pod', total: 4, available: 1, price: 400, amenities: 'Direct Basecamp Access, High Altitude First-Aid' }
  ]);
  const [guestList, setGuestList] = useState([
    { id: 'GST-901', name: 'Ramesh Patel', groupSize: 3, room: 'Cottage #4', checkIn: 'Today, 2:00 PM', aadhaarMasked: 'XXXX-XXXX-4912', status: 'Checked In', punyaUsed: true },
    { id: 'GST-902', name: 'Sunita Reddy', groupSize: 2, room: 'Dorm Bunk #11-12', checkIn: 'Today, 4:30 PM', aadhaarMasked: 'XXXX-XXXX-8821', status: 'Confirmed Arrival', punyaUsed: false },
    { id: 'GST-903', name: 'Col. Rajesh Iyer (Retd.)', groupSize: 4, room: 'Cottage #2', checkIn: 'Today, 6:00 PM', aadhaarMasked: 'XXXX-XXXX-1044', status: 'Awaiting Check-in', punyaUsed: true }
  ]);

  const handleCheckInGuest = (id) => {
    setGuestList(prev => prev.map(g => g.id === id ? { ...g, status: 'Checked In' } : g));
  };

  // ==========================================
  // 3. PRASAD & RETAIL STATE
  // ==========================================
  const [offerings, setOfferings] = useState([
    { id: 1, name: 'Special Panchamrit Mahaprasad Box (Certified Pure)', price: 150, category: 'Prasad', inStock: true, salesCount: 84 },
    { id: 2, name: 'Holy Rudrabhishek Samagri Thali', price: 250, category: 'Puja', inStock: true, salesCount: 42 },
    { id: 3, name: 'Pure Ganga Jal Brass Kalash (Sealed)', price: 80, category: 'Puja', inStock: true, salesCount: 110 },
    { id: 4, name: 'Kedarnath Wooden Carved Temple Replica', price: 350, category: 'Handicrafts', inStock: true, salesCount: 19 },
    { id: 5, name: 'Hand-spun Pure Mountain Woolen Shawl', price: 850, category: 'Handicrafts', inStock: true, salesCount: 12 }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Prasad');

  const [redeemedCode, setRedeemedCode] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');
  const [redemptionsLog, setRedemptionsLog] = useState([
    { id: 'RED-881', code: 'PUNYA-40-KEDAR', pilgrim: 'Saatvik Devotee', discount: 120, time: '10 mins ago', points: 40 },
    { id: 'RED-882', code: 'OFFPEAK-50-PUNYA', pilgrim: 'Amit Joshi', discount: 150, time: '35 mins ago', points: 50 }
  ]);

  const handleAddOffering = (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    const newItem = {
      id: Date.now(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      category: newItemCategory,
      inStock: true,
      salesCount: 0
    };
    setOfferings([...offerings, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleToggleStock = (id) => {
    setOfferings(prev => prev.map(item => item.id === id ? { ...item, inStock: !item.inStock } : item));
  };

  const handleRedeemCoupon = (e) => {
    e.preventDefault();
    if (!redeemedCode.trim()) return;
    const cleanCode = redeemedCode.trim().toUpperCase();
    const discountAmount = cleanCode.includes('50') ? 150 : (cleanCode.includes('40') ? 120 : 100);
    const pts = cleanCode.includes('50') ? 50 : 40;

    const newLogEntry = {
      id: `RED-${Math.floor(100 + Math.random() * 900)}`,
      code: cleanCode,
      pilgrim: 'Verified Green Pilgrim',
      discount: discountAmount,
      time: 'Just now',
      points: pts
    };

    setRedemptionsLog([newLogEntry, ...redemptionsLog]);
    setRedeemSuccess(`Verified! ${pts} Green Pilgrim Punya Points applied. ₹${discountAmount} subsidy credited to vendor settlement account.`);
    setRedeemedCode('');
    setTimeout(() => setRedeemSuccess(''), 6000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content vendor-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '94vw',
          borderRadius: '1.25rem',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
            padding: '1.25rem 1.5rem',
            color: '#FFFFFF',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                🏪
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                    {user.business_name || 'Authorized Yatra Vendor'}
                  </h3>
                  <span style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}>
                    ✓ Verified Partner
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '0.15rem' }}>
                  <span>Manager: <strong>{user.owner_name || 'Partner Admin'}</strong></span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>ID: <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>{user.registration_id || 'REG-77401'}</code></span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>Category: <strong>{user.category || 'Multi-Service'}</strong></span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Tab Navigation Pill Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            marginTop: '1.2rem',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: '0.3rem',
            borderRadius: '0.75rem'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('travel')}
              style={{
                padding: '0.55rem 0.5rem',
                borderRadius: '0.55rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                backgroundColor: activeTab === 'travel' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'travel' ? '#92400E' : '#FEF3C7',
                boxShadow: activeTab === 'travel' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <span>🚗</span> Travel & Transport
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hotel')}
              style={{
                padding: '0.55rem 0.5rem',
                borderRadius: '0.55rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                backgroundColor: activeTab === 'hotel' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'hotel' ? '#92400E' : '#FEF3C7',
                boxShadow: activeTab === 'hotel' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <span>🏨</span> Hotel & Homestay
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('retail')}
              style={{
                padding: '0.55rem 0.5rem',
                borderRadius: '0.55rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                backgroundColor: activeTab === 'retail' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'retail' ? '#92400E' : '#FEF3C7',
                boxShadow: activeTab === 'retail' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <span>🛍️</span> Prasad & Retail
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#F8FAFC' }}>
          
          {/* ========================================================================= */}
          {/* TAB 1: TRAVEL & TRANSPORT PORTAL */}
          {/* ========================================================================= */}
          {activeTab === 'travel' && (
            <div>
              {/* Top Quick Status Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Active Fleet</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#0F172A', marginTop: '0.2rem' }}>{fleetStats.total} Units</strong>
                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>✓ Registered with Syndicate</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Available at Stand</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#059669', marginTop: '0.2rem' }}>{fleetStats.available} Available</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Ready for dispatch</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Currently on Trail</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#D97706', marginTop: '0.2rem' }}>{fleetStats.onTrip} on Trek</strong>
                  <span style={{ fontSize: '0.7rem', color: '#D97706' }}>Active pilgrim journeys</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Booking Status</span>
                  <button
                    type="button"
                    onClick={() => setTravelAccepting(!travelAccepting)}
                    style={{
                      marginTop: '0.35rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      backgroundColor: travelAccepting ? '#ECFDF5' : '#FEF2F2',
                      color: travelAccepting ? '#065F46' : '#991B1B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: travelAccepting ? '#10B981' : '#EF4444' }}></span>
                    {travelAccepting ? 'Accepting Yatris' : 'Stand Paused'}
                  </button>
                </div>
              </div>

              {/* Dynamic Demand-Linked Pricing Rate Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.85rem',
                border: '1px solid #E2E8F0',
                padding: '1.25rem',
                marginBottom: '1.25rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>⚡</span> AI Crowd-Linked Dynamic Rate Card
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                      Automatically regulates transport pricing during peak trail congestion to prevent bottlenecking.
                    </p>
                  </div>
                  <span style={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #FDE68A'
                  }}>
                    Multiplier: {crowdMultiplier}x ({crowdMultiplier >= 1 ? `+${Math.round((crowdMultiplier - 1) * 100)}% Peak Surge` : `-${Math.round((1 - crowdMultiplier) * 100)}% Off-Peak`})
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
                      Set Crowd Congestion Pricing Multiplier:
                    </label>
                    <input
                      type="range"
                      min="0.8"
                      max="1.5"
                      step="0.05"
                      value={crowdMultiplier}
                      onChange={(e) => setCrowdMultiplier(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#D97706', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      <span>0.8x (Off-Peak Eco Incentive)</span>
                      <span>1.0x (Standard Govt Tariff)</span>
                      <span>1.5x (High Congestion Cap)</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Computed Yatra Base Fare:</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#B45309' }}>
                      ₹{Math.round(baseFare * crowdMultiplier)}
                      <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748B' }}> / standard route</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#059669' }}>Government Authorized Ceiling Compliant</span>
                  </div>
                </div>
              </div>

              {/* Active Trips & Manifest Table */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📋</span> Live Fleet Dispatch & Route Manifest
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {activeRoutes.map((route) => (
                    <div
                      key={route.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.6rem',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0F172A' }}>{route.type}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>({route.id})</span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '0.3rem',
                            backgroundColor: route.status === 'Completed' ? '#ECFDF5' : (route.status === 'On Trek' ? '#FEF3C7' : '#EFF6FF'),
                            color: route.status === 'Completed' ? '#065F46' : (route.status === 'On Trek' ? '#92400E' : '#1E40AF')
                          }}>
                            {route.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                          📍 {route.route} • Pilgrim: <strong>{route.pilgrimName}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0F172A' }}>₹{route.fare}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B' }}>ETA: {route.eta}</div>
                        </div>
                        {route.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleCompleteTrip(route.id)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              backgroundColor: '#059669',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '0.4rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Mark Completed ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Transport Vehicle Form */}
                <form onSubmit={handleAddTransport} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Vehicle / Service Type</label>
                    <select
                      value={newVehicleType}
                      onChange={(e) => setNewVehicleType(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    >
                      <option value="Certified Mountain Guide">Certified Mountain Guide</option>
                      <option value="Registered Mule & Handler">Registered Mule & Handler</option>
                      <option value="Helicopter Shuttle Link">Helicopter Shuttle Link</option>
                      <option value="Eco Electric Transit Cart">Eco Electric Transit Cart</option>
                      <option value="Shared SUV / 4x4 Jeep">Shared SUV / 4x4 Jeep</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Route Path</label>
                    <input
                      type="text"
                      placeholder="e.g. Gaurikund ➔ Lincholi"
                      value={newVehicleRoute}
                      onChange={(e) => setNewVehicleRoute(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Rate (₹)</label>
                    <input
                      type="number"
                      placeholder="1200"
                      value={newVehicleRate}
                      onChange={(e) => setNewVehicleRate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '0.45rem 0.9rem',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.4rem',
                      fontWeight: '700',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Add to Fleet
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: HOTEL & HOMESTAY PORTAL */}
          {/* ========================================================================= */}
          {activeTab === 'hotel' && (
            <div>
              {/* Bed Inventory & Occupancy Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Total Capacity</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#0F172A', marginTop: '0.2rem' }}>{totalRooms} Beds / Bunks</strong>
                  <span style={{ fontSize: '0.7rem', color: '#059669' }}>UTDB Homestay Verified</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Occupied Currently</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#D97706', marginTop: '0.2rem' }}>{occupiedBeds} Yatris Staying</strong>
                  <span style={{ fontSize: '0.7rem', color: '#D97706' }}>{Math.round((occupiedBeds / totalRooms) * 100)}% Occupancy</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Available for Booking</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#059669', marginTop: '0.2rem' }}>{totalRooms - occupiedBeds} Beds Left</strong>
                  <span style={{ fontSize: '0.7rem', color: '#059669' }}>Live on YatraSetu Portal</span>
                </div>
              </div>

              {/* Interactive Bed Inventory Adjuster Slider */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.85rem',
                border: '1px solid #E2E8F0',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🛏️</span> Live Room / Bed Inventory Slider
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                      Adjust your available bed count instantly for incoming walking yatris at the temple gate.
                    </p>
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#059669' }}>
                    {totalRooms - occupiedBeds} Vacant Beds
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={totalRooms}
                  value={occupiedBeds}
                  onChange={(e) => setOccupiedBeds(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B', marginTop: '0.25rem' }}>
                  <span>0 Occupied (100% Vacant)</span>
                  <span>{occupiedBeds} Occupied Beds</span>
                  <span>{totalRooms} Max Capacity</span>
                </div>
              </div>

              {/* Dynamic Demand Pricing & Punya Subsidy */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '0.85rem',
                border: '1px solid #E2E8F0',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📈</span> Dynamic Tariff & Green Pilgrim Subsidy
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>Accept Green Pilgrim Vouchers:</span>
                    <input
                      type="checkbox"
                      checked={greenDiscountEnabled}
                      onChange={(e) => setGreenDiscountEnabled(e.target.checked)}
                      style={{ accentColor: '#059669', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {roomTypes.map((rt) => {
                    const finalPrice = Math.round(rt.price * hotelSurgeMultiplier * (greenDiscountEnabled ? 0.9 : 1.0));
                    return (
                      <div key={rt.id} style={{ backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0F172A', marginBottom: '0.25rem' }}>{rt.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '0.5rem' }}>{rt.amenities}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#B45309' }}>₹{finalPrice}</span>
                          <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>{rt.available} left</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Guest Manifest & Check-In Table */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🪪</span> Pilgrim Guest Check-in Manifest (Aadhaar Verified)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {guestList.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '0.55rem',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{g.name}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>🔒 {g.aadhaarMasked}</span>
                          {g.punyaUsed && (
                            <span style={{ fontSize: '0.65rem', backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontWeight: '700' }}>
                              🌿 Punya Discount
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                          Room: <strong>{g.room}</strong> • Group of {g.groupSize} • Check-In: {g.checkIn}
                        </div>
                      </div>

                      <div>
                        {g.status === 'Checked In' ? (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700', backgroundColor: '#ECFDF5', padding: '0.25rem 0.6rem', borderRadius: '0.4rem' }}>
                            ✓ In Room
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCheckInGuest(g.id)}
                            style={{
                              padding: '0.35rem 0.7rem',
                              backgroundColor: '#D97706',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '0.4rem',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Check In Yatri →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PRASAD & RETAIL PORTAL */}
          {/* ========================================================================= */}
          {activeTab === 'retail' && (
            <div>
              {/* Retail Metric Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: '600' }}>Active Offerings</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#B45309' }}>{offerings.length} Products</strong>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: '600' }}>Shrine Footfall</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#059669' }}>High Density (Peak)</strong>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: '600' }}>Punya Subsidies</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#2563EB' }}>₹{redemptionsLog.reduce((acc, r) => acc + r.discount, 0)} Total</strong>
                </div>
              </div>

              {/* Punya Points Token Voucher Scanner */}
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1.25rem',
                borderRadius: '0.85rem',
                border: '1px solid #E2E8F0',
                marginBottom: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🪙</span> Scan / Redeem Pilgrim Green Punya Discount Token
                </h4>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                  Pilgrims who diverted to off-peak hours earn points redeemable at your registered stall.
                </p>

                <form onSubmit={handleRedeemCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter Pilgrim Token (e.g. PUNYA-50-KEDAR, OFFPEAK-40)"
                    value={redeemedCode}
                    onChange={(e) => setRedeemedCode(e.target.value)}
                    style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '0.55rem 1.25rem',
                      backgroundColor: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Verify & Apply Discount
                  </button>
                </form>

                {redeemSuccess && (
                  <div style={{ marginTop: '0.75rem', backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8rem', border: '1px solid #A7F3D0' }}>
                    {redeemSuccess}
                  </div>
                )}
              </div>

              {/* Product Offerings Catalog */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📦</span> Stall Inventory & Offerings Catalog
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {offerings.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.55rem',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0F172A' }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Category: <strong>{item.category}</strong> • Sold Today: {item.salesCount || 0}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#B45309' }}>₹{item.price}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleStock(item.id)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '0.4rem',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            backgroundColor: item.inStock ? '#ECFDF5' : '#FEF2F2',
                            color: item.inStock ? '#065F46' : '#991B1B'
                          }}
                        >
                          {item.inStock ? 'In Stock ✓' : 'Sold Out ✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Offering Form */}
                <form onSubmit={handleAddOffering} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Item Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Pure Ghee Laddu (500g)"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    >
                      <option value="Prasad">Prasad</option>
                      <option value="Puja">Puja Samagri</option>
                      <option value="Handicrafts">Handicrafts</option>
                      <option value="Sattvic Food">Sattvic Food</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Price (₹)</label>
                    <input
                      type="number"
                      placeholder="180"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '0.45rem 0.9rem',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '0.4rem',
                      fontWeight: '700',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    + Add Item
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Logout Vendor Account
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Done & Return to Live App
          </button>
        </div>
      </div>
    </div>
  );
}
