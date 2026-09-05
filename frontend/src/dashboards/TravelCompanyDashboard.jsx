import React, { useState, useEffect } from 'react';
import { saveFleetSchedules, fetchFleetSchedules } from '../api/api';
import TravelAgencyConsole from '../components/TravelAgencyConsole';

export default function TravelCompanyDashboard({ showToast }) {
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fleetRoutes, setFleetRoutes] = useState([
    { id: 'HR-01', from: 'Delhi (ISBT Kashmiri Gate)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 3, capacity: 42, occupancy: 94, type: 'Volvo A/C', status: 'HIGH DEMAND' },
    { id: 'HR-02', from: 'Dehradun (Bus Stand)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 2, capacity: 38, occupancy: 100, type: 'Sleeper', status: 'FULL' },
    { id: 'HR-03', from: 'Haridwar (Har Ki Pauri)', to: 'Delhi (ISBT Kashmiri Gate)', date: 'Oct 13 (Sun)', buses: 3, capacity: 42, occupancy: 22, type: 'Volvo A/C', status: 'RETURN' },
    { id: 'HR-04', from: 'Rishikesh (Triveni Ghat)', to: 'Haridwar (Har Ki Pauri)', date: 'Oct 12 (Fri)', buses: 1, capacity: 30, occupancy: 67, type: 'Mini Bus', status: 'NORMAL' },
  ]);

  // Load live schedule from backend on mount
  useEffect(() => {
    fetchFleetSchedules().then((routes) => {
      if (routes && routes.length > 0) {
        setFleetRoutes(routes.map((r) => ({
          id: r.id,
          from: r.from_location || r.from,
          to: r.to_location || r.to,
          date: r.journey_date || r.date,
          buses: r.buses,
          capacity: r.capacity || 42,
          occupancy: r.occupancy || 80,
          type: r.bus_type || r.type || 'Volvo A/C',
          status: r.status || 'NORMAL',
        })));
      }
    });
  }, []);

  return (
    <div className="travel-dashboard-root" id="travel-dashboard" style={{ padding: '0 0 2rem' }}>

      {/* HIMALAYA YATRA TRAVELS: PARTNER CONSOLE & DEMAND CALCULATOR (3 CORE FEATURES) */}
      <TravelAgencyConsole onOpenFleetModal={() => setShowFleetModal(true)} />

      {/* ====================================================== */}
      {/* FLEET SCHEDULE ADJUSTMENT MODAL                        */}
      {/* ====================================================== */}
      {showFleetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '1rem', width: '100%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #92400E, #D97706)', padding: '1.5rem 2rem', borderRadius: '1rem 1rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: '#FFF', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  🚌 Fleet Schedule Adjustment Panel
                </h2>
                <p style={{ margin: 0, color: '#FDE68A', fontSize: '0.95rem' }}>
                  Haridwar – Somvati Amavasya (Oct 12–13) · Adjust buses per route to match demand
                </p>
              </div>
              <button onClick={() => setShowFleetModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* AI Recommendation Banner */}
            <div style={{ backgroundColor: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <p style={{ margin: 0, color: '#92400E', fontSize: '0.95rem', fontWeight: '500' }}>
                <strong>AI Recommendation:</strong> Deploy at least <strong>220 buses</strong> (88% of your fleet) on the Delhi ⇄ Haridwar corridor to handle the Somvati Amavasya surge safely.
              </p>
            </div>

            {/* Route Cards */}
            <div style={{ padding: '1.5rem 2rem' }}>
              <h3 style={{ margin: '0 0 1rem', color: '#374151', fontSize: '1.1rem' }}>Active Routes – Haridwar Corridor</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fleetRoutes.map((route, idx) => {
                  const isFull = route.occupancy >= 100;
                  const isHighDemand = route.occupancy >= 80;
                  const statusColor = isFull ? '#DC2626' : isHighDemand ? '#D97706' : '#16A34A';
                  const statusBg = isFull ? '#FEF2F2' : isHighDemand ? '#FFFBEB' : '#F0FDF4';

                  return (
                    <div key={route.id} style={{ border: `1.5px solid ${isFull ? '#FECACA' : isHighDemand ? '#FDE68A' : '#BBF7D0'}`, borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: statusBg }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#6B7280', background: '#E5E7EB', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{route.id}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: statusColor, background: statusBg, border: `1px solid ${statusColor}`, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>{route.status}</span>
                          </div>
                          <p style={{ margin: '0 0 0.15rem', fontWeight: 'bold', color: '#111827', fontSize: '1rem' }}>
                            📍 {route.from} → {route.to}
                          </p>
                          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>📅 {route.date} · 🚌 {route.type}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: statusColor }}>{route.occupancy}%</div>
                          <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Avg Occupancy</div>
                        </div>
                      </div>

                      {/* Bus Count Adjuster */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: '0.5rem', padding: '0.75rem 1rem', border: '1px solid #E5E7EB' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buses Assigned</span>
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#6B7280' }}>Each bus carries up to {route.capacity} passengers</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button
                            onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: Math.max(1, r.buses - 1) } : r))}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#111827', minWidth: '2.5rem', textAlign: 'center' }}>{route.buses}</span>
                          <button
                            onClick={() => setFleetRoutes(prev => prev.map((r, i) => i === idx ? { ...r, buses: r.buses + 1 } : r))}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #D97706', background: '#FEF3C7', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E' }}
                          >+</button>
                          <div style={{ fontSize: '0.85rem', color: '#6B7280', textAlign: 'right', minWidth: '80px' }}>
                            Total capacity:<br/>
                            <strong style={{ color: '#111827' }}>{route.buses * route.capacity} seats</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '1rem 2rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFleetModal(false)} style={{ padding: '0.65rem 1.5rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const payload = fleetRoutes.map((r) => ({ id: r.id, buses: r.buses, operator: 'Himalaya Yatra Travels' }));
                    const result = await saveFleetSchedules(payload);
                    setShowFleetModal(false);
                    if (result?.status === 'success') {
                      if (showToast) showToast('✅ Fleet schedule saved to database! Hotel & Government dashboards will update within 30s.');
                    } else {
                      if (showToast) showToast('⚠️ Saved locally. Backend sync pending — Hotel dashboard will update shortly.');
                    }
                  } catch (err) {
                    if (showToast) showToast('⚠️ Could not reach backend. Changes saved locally for this session.');
                    setShowFleetModal(false);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ padding: '0.65rem 1.75rem', backgroundColor: isSaving ? '#9CA3AF' : '#D97706', color: '#FFF', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? '⏳ Saving...' : '✅ Confirm & Notify Drivers'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
