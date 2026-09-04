import React, { useState, useEffect } from 'react';
import { fetchSiteDensity } from '../api/api';

export default function VendorDashboardModal({ user, isOpen, onClose, onLogout }) {
  if (!isOpen || !user) return null;

  // Domain locking based on user.category
  const getVendorDomain = (categoryStr = '') => {
    const cat = (categoryStr || '').toLowerCase();
    if (
      cat.includes('travel') ||
      cat.includes('mule') ||
      cat.includes('trek') ||
      cat.includes('guide') ||
      cat.includes('transport') ||
      cat.includes('taxi') ||
      cat.includes('aero')
    ) {
      return 'travel';
    }
    if (
      cat.includes('hotel') ||
      cat.includes('lodge') ||
      cat.includes('homestay') ||
      cat.includes('dormitory') ||
      cat.includes('stay') ||
      cat.includes('sarai') ||
      cat.includes('guest') ||
      cat.includes('resort') ||
      cat.includes('cottage')
    ) {
      return 'hotel';
    }
    return 'food_prasad';
  };

  const domain = getVendorDomain(user.category);

  // =========================================================================
  // 1. FOOD & PRASAD STATE (e.g. Raghu Tiffins / Mandakini Bhojanalaya)
  // =========================================================================
  const [punyaDiscountPct, setPunyaDiscountPct] = useState(20); // 20% discount slider
  const [thaliBasePrice, setThaliBasePrice] = useState(150);
  const [preparedBatches, setPreparedBatches] = useState({
    thalis: 65,
    khichdi: 40,
    prasadBoxes: 110,
    kadhaCups: 85
  });

  const [foodMenu, setFoodMenu] = useState([
    { id: 'FP-1', name: 'Satvik Mahaprasad Thali (Pahadi Dal, Roti, Kheer, Sabji)', basePrice: 150, category: 'Full Meal', inStock: true, readyCount: 65, prepTime: 'Ready to Serve' },
    { id: 'FP-2', name: 'Pure Desi Ghee Khichdi Bowl + Pickle', basePrice: 90, category: 'Hot Meal', inStock: true, readyCount: 40, prepTime: 'Fresh Hot' },
    { id: 'FP-3', name: 'Special Panchamrit Sealed Prasad Box (500g)', basePrice: 160, category: 'Prasad', inStock: true, readyCount: 110, prepTime: 'Packaged' },
    { id: 'FP-4', name: 'Herbal Tulsi-Ginger Mountain Kadha (Immunity Booster)', basePrice: 40, category: 'Beverage', inStock: true, readyCount: 85, prepTime: 'Simmering' },
    { id: 'FP-5', name: 'Garhwali Jhangore Ki Kheer (Nutritious Millet Sweet)', basePrice: 80, category: 'Prasad Sweet', inStock: true, readyCount: 30, prepTime: 'Chilled' }
  ]);

  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodPrice, setNewFoodPrice] = useState('');
  const [newFoodCategory, setNewFoodCategory] = useState('Full Meal');

  const [foodRedeemedCode, setFoodRedeemedCode] = useState('');
  const [foodRedeemSuccess, setFoodRedeemSuccess] = useState('');
  const [foodRedemptions, setFoodRedemptions] = useState([
    { id: 'FR-101', code: 'PUNYA-40-KEDAR', pilgrim: 'Saatvik Devotee (O+)', meal: 'Satvik Mahaprasad Thali', discountApplied: 30, time: '8 mins ago', pointsUsed: 40 },
    { id: 'FR-102', code: 'OFFPEAK-50-PUNYA', pilgrim: 'Ramesh Patel', meal: '2x Khichdi Bowls', discountApplied: 40, time: '22 mins ago', pointsUsed: 50 },
    { id: 'FR-103', code: 'GREEN-YATRI-30', pilgrim: 'Pooja Verma', meal: 'Sealed Prasad Box', discountApplied: 25, time: '41 mins ago', pointsUsed: 30 }
  ]);

  const handleAddFoodItem = (e) => {
    e.preventDefault();
    if (!newFoodName.trim() || !newFoodPrice) return;
    const newItem = {
      id: `FP-${Date.now()}`,
      name: newFoodName,
      basePrice: parseFloat(newFoodPrice),
      category: newFoodCategory,
      inStock: true,
      readyCount: 20,
      prepTime: 'Prep in 10m'
    };
    setFoodMenu([...foodMenu, newItem]);
    setNewFoodName('');
    setNewFoodPrice('');
  };

  const handleToggleFoodStock = (id) => {
    setFoodMenu(prev => prev.map(item => item.id === id ? { ...item, inStock: !item.inStock } : item));
  };

  const handleIncrementBatch = (id) => {
    setFoodMenu(prev => prev.map(item => item.id === id ? { ...item, readyCount: item.readyCount + 10 } : item));
  };

  const handleRedeemFoodCoupon = (e) => {
    e.preventDefault();
    if (!foodRedeemedCode.trim()) return;
    const clean = foodRedeemedCode.trim().toUpperCase();
    const discountAmt = clean.includes('50') ? 45 : (clean.includes('40') ? 35 : 25);
    const pts = clean.includes('50') ? 50 : (clean.includes('40') ? 40 : 30);

    const logEntry = {
      id: `FR-${Math.floor(100 + Math.random() * 900)}`,
      code: clean,
      pilgrim: 'Verified Green Yatri',
      meal: 'Thali / Prasad Combo',
      discountApplied: discountAmt,
      time: 'Just now',
      pointsUsed: pts
    };

    setFoodRedemptions([logEntry, ...foodRedemptions]);
    setFoodRedeemSuccess(`🎉 Verified! ${pts} Punya Points redeemed. ₹${discountAmt} meal discount applied. Subsidy credited to your vendor payout ledger.`);
    setFoodRedeemedCode('');
    setTimeout(() => setFoodRedeemSuccess(''), 6000);
  };

  // =========================================================================
  // 2. TRAVEL & TRANSPORT STATE
  // =========================================================================
  const [fleetStats, setFleetStats] = useState({ total: 16, available: 10, onTrip: 5, maintenance: 1 });
  const [travelAccepting, setTravelAccepting] = useState(true);
  const [crowdMultiplier, setCrowdMultiplier] = useState(1.2);
  const [activeRoutes, setActiveRoutes] = useState([
    { id: 'TR-101', type: 'Registered Mule & Handler', route: 'Gaurikund Basecamp ➔ Kedarnath Mandir', pilgrimName: 'Vikas Sharma (4 Yatris)', fare: 2500, status: 'On Trek', eta: '45 mins' },
    { id: 'TR-102', type: 'Certified Mountain Guide', route: 'Temple Perimeter ➔ Bhairavnath Temple', pilgrimName: 'Ananya Gupta (2 Yatris)', fare: 800, status: 'Departed', eta: '20 mins' },
    { id: 'TR-103', type: 'Shared SUV / Shuttle', route: 'Sonprayag Shuttle ➔ Gaurikund Gate', pilgrimName: 'Pooja Verma (6 Yatris)', fare: 300, status: 'Completed', eta: 'Arrived' }
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

  // =========================================================================
  // 3. HOTEL & HOMESTAY STATE
  // =========================================================================
  const [totalRooms, setTotalRooms] = useState(30);
  const [occupiedBeds, setOccupiedBeds] = useState(22);
  const [hotelSurgeMultiplier, setHotelSurgeMultiplier] = useState(1.15);
  const [greenDiscountEnabled, setGreenDiscountEnabled] = useState(true);
  const [roomTypes] = useState([
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

  // Domain metadata
  const domainConfig = {
    food_prasad: {
      title: 'Food, Prasad & Refreshments Portal',
      badge: '🍲 Food & Hospitality Partner',
      gradient: 'linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%)',
      icon: '🍲'
    },
    travel: {
      title: 'Travel, Guides & Transport Syndicate',
      badge: '🚗 Transport Fleet Operator',
      gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%)',
      icon: '🚗'
    },
    hotel: {
      title: 'Pilgrim Homestay & Sarai Lodging Portal',
      badge: '🏨 Homestay & Lodging Host',
      gradient: 'linear-gradient(135deg, #065F46 0%, #059669 50%, #10B981 100%)',
      icon: '🏨'
    }
  };

  const currentConfig = domainConfig[domain];

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
        {/* Top Domain Header */}
        <div
          style={{
            background: currentConfig.gradient,
            padding: '1.25rem 1.5rem',
            color: '#FFFFFF',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                {currentConfig.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                    {user.business_name || 'Mandakini Annapurna Pure Veg Bhojanalaya'}
                  </h3>
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    color: '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {currentConfig.badge}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.92, marginTop: '0.2rem' }}>
                  <span>Manager: <strong>{user.owner_name || 'Raghuveer Sharma'}</strong></span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>ID: <code style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>{user.registration_id || 'FSSAI-22621034'}</code></span>
                  <span style={{ margin: '0 0.5rem' }}>•</span>
                  <span>Category: <strong>{user.category || 'Sattvic Food & Refreshments'}</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
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
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#F8FAFC' }}>

          {/* ========================================================================= */}
          {/* DOMAIN 1: FOOD & PRASAD VIEW (e.g. Raghu Tiffins / Mandakini Bhojanalaya) */}
          {/* ========================================================================= */}
          {domain === 'food_prasad' && (
            <div>
              {/* Prominent Live Upstream Rerouting AI Banner */}
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '0.85rem',
                padding: '0.9rem 1.1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
              }}>
                <span style={{ fontSize: '1.6rem' }}>📢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>LIVE UPSTREAM CROWD TELEMETRY ALERT</span>
                    {liveAlert?.is_surge && (
                      <span style={{ backgroundColor: '#DC2626', color: '#FFF', fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: '800' }}>
                        +{liveAlert.surge_percentage}% SURGE
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#78350F', lineHeight: '1.35' }}>
                    {liveAlert?.is_surge ? (
                      <><strong>+{liveAlert.surge_percentage}% footfall spike detected in live feed!</strong> Upstream crowd from {vendor?.spot_id || 'temple'} is being routed toward your zone.</>
                    ) : (
                      "Crowd telemetry is currently normal. Normal routing active."
                    )}
                  </p>
                </div>
              </div>

              {/* Top Metrics Row for Food & Prasad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Est. Footfall (Next 60m)</span>
                  <strong style={{ display: 'block', fontSize: '1.25rem', color: '#D97706', marginTop: '0.2rem' }}>~145 Yatris</strong>
                  <span style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: '700' }}>↑ +28% Peak Rush</span>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Upstream Congestion</span>
                  <strong style={{ display: 'block', fontSize: '1.25rem', color: '#DC2626', marginTop: '0.2rem' }}>88% High</strong>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>Zone 2 Queue Diversion</span>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Meal Recommendation</span>
                  <strong style={{ display: 'block', fontSize: '1.25rem', color: '#059669', marginTop: '0.2rem' }}>Prep 65 Thalis</strong>
                  <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '600' }}>⚡ Ready in Advance</span>
                </div>

                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Punya Points Scanned</span>
                  <strong style={{ display: 'block', fontSize: '1.25rem', color: '#2563EB', marginTop: '0.2rem' }}>48 Scans</strong>
                  <span style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: '600' }}>₹2,400 Subsidy Credited</span>
                </div>
              </div>

              {/* Dynamic Off-Peak Punya Points Discount Slider */}
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
                      <span>🌿</span> Punya Points Off-Peak Pilgrim Subsidy Slider
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748B' }}>
                      Incentivize pilgrims to pause, rest, and eat during peak choke hours. YatraSetu reimburses the discount.
                    </p>
                  </div>
                  <span style={{
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #A7F3D0'
                  }}>
                    {punyaDiscountPct}% Pilgrim Subsidy Active
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '0.35rem' }}>
                      Set Pilgrim Meal Discount Percentage:
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="35"
                      step="5"
                      value={punyaDiscountPct}
                      onChange={(e) => setPunyaDiscountPct(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      <span>5% (Standard Reward)</span>
                      <span>20% (Recommended Crowd Balance)</span>
                      <span>35% (Max High-Congestion Incentive)</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Satvik Thali Pricing with Subsidy:</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#059669' }}>
                      ₹{Math.round(thaliBasePrice * (1 - punyaDiscountPct / 100))}
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', textDecoration: 'line-through', marginLeft: '0.4rem' }}>₹{thaliBasePrice}</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: '600' }}>
                      Vendor receives full ₹{thaliBasePrice} (Pilgrim pays ₹{Math.round(thaliBasePrice * (1 - punyaDiscountPct / 100))} + Govt subsidy ₹{Math.round(thaliBasePrice * (punyaDiscountPct / 100))})
                    </span>
                  </div>
                </div>
              </div>

              {/* Punya Points Voucher Scanner */}
              <div style={{
                backgroundColor: '#FFFFFF',
                padding: '1.25rem',
                borderRadius: '0.85rem',
                border: '1px solid #E2E8F0',
                marginBottom: '1.25rem'
              }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🪙</span> Scan Pilgrim Green Punya Discount Token
                </h4>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                  Scan the QR / Enter the coupon code presented on the tourist's Digital Yatri Card.
                </p>

                <form onSubmit={handleRedeemFoodCoupon} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter Pilgrim Token (e.g. PUNYA-40-KEDAR, TIFFIN-30-SATVIK)"
                    value={foodRedeemedCode}
                    onChange={(e) => setFoodRedeemedCode(e.target.value)}
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
                    Verify & Apply Subsidy
                  </button>
                </form>

                {foodRedeemSuccess && (
                  <div style={{ marginTop: '0.75rem', backgroundColor: '#ECFDF5', color: '#065F46', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8rem', border: '1px solid #A7F3D0' }}>
                    {foodRedeemSuccess}
                  </div>
                )}
              </div>

              {/* Live Kitchen & Thali Preparation Batch Monitor */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🍱</span> Live Kitchen Inventory & Prasad Batch Monitor
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {foodMenu.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.7rem 0.85rem',
                        borderRadius: '0.55rem',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0F172A' }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Category: <strong>{item.category}</strong> • Status: <span style={{ color: '#059669', fontWeight: '600' }}>{item.prepTime}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#B45309' }}>₹{item.basePrice}</span>
                          <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>{item.readyCount} Prepped</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleIncrementBatch(item.id)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            backgroundColor: '#EFF6FF',
                            color: '#1E40AF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '0.4rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          +10 Ready
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFoodStock(item.id)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            borderRadius: '0.4rem',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            backgroundColor: item.inStock ? '#ECFDF5' : '#FEF2F2',
                            color: item.inStock ? '#065F46' : '#991B1B'
                          }}
                        >
                          {item.inStock ? 'Active' : 'Paused'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Menu Item Form */}
                <form onSubmit={handleAddFoodItem} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Item Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Special Raghu Masala Dosa / Thali"
                      value={newFoodName}
                      onChange={(e) => setNewFoodName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Category</label>
                    <select
                      value={newFoodCategory}
                      onChange={(e) => setNewFoodCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                    >
                      <option value="Full Meal">Full Meal</option>
                      <option value="Hot Meal">Hot Meal</option>
                      <option value="Prasad">Prasad</option>
                      <option value="Beverage">Beverage</option>
                      <option value="Prasad Sweet">Prasad Sweet</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Price (₹)</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={newFoodPrice}
                      onChange={(e) => setNewFoodPrice(e.target.value)}
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
                    + Add Dish
                  </button>
                </form>
              </div>

              {/* Recent Punya Voucher Redemptions Log */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid #E2E8F0' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📜</span> Recent Pilgrim Punya Discount Redemptions
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {foodRedemptions.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '700', color: '#0F172A' }}>{log.pilgrim}</span>
                        <span style={{ margin: '0 0.4rem', color: '#94A3B8' }}>•</span>
                        <span style={{ color: '#64748B' }}>{log.meal}</span>
                        <span style={{ margin: '0 0.4rem', color: '#94A3B8' }}>•</span>
                        <code style={{ color: '#059669', fontWeight: '700' }}>{log.code}</code>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: '#D97706', fontWeight: '700' }}>-₹{log.discountApplied} off</span>
                        <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOMAIN 2: TRAVEL & TRANSPORT VIEW */}
          {/* ========================================================================= */}
          {domain === 'travel' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>ACTIVE FLEET</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#0F172A', marginTop: '0.2rem' }}>{fleetStats.total} Units</strong>
                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>✓ Syndicate Certified</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>STAND READY</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#059669', marginTop: '0.2rem' }}>{fleetStats.available} Units</strong>
                  <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Ready for dispatch</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>ON TRAIL / TREK</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#D97706', marginTop: '0.2rem' }}>{fleetStats.onTrip} Active</strong>
                  <span style={{ fontSize: '0.7rem', color: '#D97706' }}>In transit</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>DISPATCH STATUS</span>
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
                      color: travelAccepting ? '#065F46' : '#991B1B'
                    }}
                  >
                    {travelAccepting ? '● Accepting Yatris' : '● Stand Paused'}
                  </button>
                </div>
              </div>

              {/* Dynamic Congestion Fare Multiplier */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0F172A' }}>⚡ AI Trail Congestion Dynamic Rate Card</h4>
                  <span style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontSize: '0.72rem', fontWeight: '700' }}>
                    Multiplier: {crowdMultiplier}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={crowdMultiplier}
                  onChange={(e) => setCrowdMultiplier(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  <span>0.8x (Off-Peak Eco Incentive)</span>
                  <span>1.0x (Standard Tariff)</span>
                  <span>1.5x (High Congestion Cap)</span>
                </div>
              </div>

              {/* Route Manifest */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: '#0F172A' }}>📋 Active Fleet Route Manifest</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {activeRoutes.map((route) => (
                    <div key={route.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.85rem', borderRadius: '0.55rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{route.type} <span style={{ fontSize: '0.7rem', color: '#64748B' }}>({route.id})</span></div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>📍 {route.route} • Pilgrim: {route.pilgrimName}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>₹{route.fare}</span>
                        {route.status !== 'Completed' ? (
                          <button
                            type="button"
                            onClick={() => handleCompleteTrip(route.id)}
                            style={{ padding: '0.35rem 0.65rem', backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Mark Completed ✓
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700' }}>Completed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Vehicle */}
                <form onSubmit={handleAddTransport} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Vehicle / Guide Type</label>
                    <select value={newVehicleType} onChange={(e) => setNewVehicleType(e.target.value)} style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}>
                      <option value="Certified Mountain Guide">Certified Mountain Guide</option>
                      <option value="Registered Mule & Handler">Registered Mule & Handler</option>
                      <option value="Helicopter Shuttle Link">Helicopter Shuttle Link</option>
                      <option value="Eco Electric Transit Cart">Eco Electric Transit Cart</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Route Path</label>
                    <input type="text" placeholder="e.g. Gaurikund ➔ Lincholi" value={newVehicleRoute} onChange={(e) => setNewVehicleRoute(e.target.value)} required style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>Rate (₹)</label>
                    <input type="number" placeholder="1200" value={newVehicleRate} onChange={(e) => setNewVehicleRate(e.target.value)} required style={{ width: '100%', padding: '0.45rem', borderRadius: '0.4rem', border: '1px solid #CBD5E1', fontSize: '0.78rem' }} />
                  </div>
                  <button type="submit" style={{ padding: '0.45rem 0.9rem', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '0.4rem', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}>
                    + Add to Fleet
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOMAIN 3: HOTEL & HOMESTAY VIEW */}
          {/* ========================================================================= */}
          {domain === 'hotel' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>TOTAL CAPACITY</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#0F172A', marginTop: '0.2rem' }}>{totalRooms} Beds / Bunks</strong>
                  <span style={{ fontSize: '0.7rem', color: '#059669' }}>UTDB Homestay Verified</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>OCCUPIED BEDS</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#D97706', marginTop: '0.2rem' }}>{occupiedBeds} Yatris Staying</strong>
                  <span style={{ fontSize: '0.7rem', color: '#D97706' }}>{Math.round((occupiedBeds / totalRooms) * 100)}% Occupancy</span>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: '600' }}>AVAILABLE BEDS</span>
                  <strong style={{ display: 'block', fontSize: '1.3rem', color: '#059669', marginTop: '0.2rem' }}>{totalRooms - occupiedBeds} Beds Left</strong>
                  <span style={{ fontSize: '0.7rem', color: '#059669' }}>Live on Portal</span>
                </div>
              </div>

              {/* Bed Inventory Slider */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0F172A' }}>🛏️ Live Room & Bed Inventory Slider</h4>
                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#059669' }}>{totalRooms - occupiedBeds} Vacant Beds</span>
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
                  <span>0 Occupied</span>
                  <span>{occupiedBeds} Occupied</span>
                  <span>{totalRooms} Max Capacity</span>
                </div>
              </div>

              {/* Guest Manifest */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.85rem', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', color: '#0F172A' }}>🪪 Pilgrim Guest Check-in Manifest (Aadhaar Verified)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {guestList.map((g) => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', borderRadius: '0.55rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div>
                        <strong style={{ fontSize: '0.85rem' }}>{g.name}</strong> <span style={{ fontSize: '0.7rem', color: '#059669' }}>🔒 {g.aadhaarMasked}</span>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Room: {g.room} • Group of {g.groupSize}</div>
                      </div>
                      <div>
                        {g.status === 'Checked In' ? (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700', backgroundColor: '#ECFDF5', padding: '0.2rem 0.5rem', borderRadius: '0.35rem' }}>✓ In Room</span>
                        ) : (
                          <button type="button" onClick={() => handleCheckInGuest(g.id)} style={{ padding: '0.35rem 0.65rem', backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}>
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
        </div>

        {/* Modal Bottom Footer */}
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
              backgroundColor: '#0F172A',
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
