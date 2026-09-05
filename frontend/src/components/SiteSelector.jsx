import React from 'react';

const CORRIDOR_STOPS = [
  { id: 'delhi_isbt', name: 'Delhi ISBT Kashmiri Gate', city: 'New Delhi' },
  { id: 'meerut', name: 'Meerut Junction', city: 'Meerut' },
  { id: 'haridwar', name: 'Haridwar — Har Ki Pauri', city: 'Haridwar' },
  { id: 'rishikesh', name: 'Rishikesh — Triveni Ghat', city: 'Rishikesh' },
  { id: 'neelkanth', name: 'Neelkanth Mahadev Temple', city: 'Neelkanth' },
];

const DEFAULT_SEEDS = {
  delhi_isbt: { people_count: 5200, capacity: 15000, status: 'NORMAL', occupancy_percentage: Math.round((5200/15000)*100) },
  meerut: { people_count: 1800, capacity: 5000, status: 'NORMAL', occupancy_percentage: Math.round((1800/5000)*100) },
  haridwar: { people_count: 42000, capacity: 50000, status: 'HIGH', occupancy_percentage: Math.round((42000/50000)*100) },
  rishikesh: { people_count: 18000, capacity: 25000, status: 'MODERATE', occupancy_percentage: Math.round((18000/25000)*100) },
  neelkanth: { people_count: 3200, capacity: 8000, status: 'NORMAL', occupancy_percentage: Math.round((3200/8000)*100) }
};

export default function SiteSelector({ sites, densityMap, selectedSiteId, onSelectSite }) {
  const getBadgeStyle = (status) => {
    switch(status) {
      case 'CRITICAL': return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' };
      case 'HIGH': return { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fb923c' };
      case 'MODERATE': return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fbbf24' };
      default: return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #4ade80' };
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', margin: '16px 0', border: '1px solid #d97706', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fffbeb' }}>
      <div style={{ backgroundColor: '#b45309', color: '#fff', padding: '12px 16px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        Somvati Amavasya — Oct 12, 2026 | Delhi ⇄ Haridwar/Rishikesh Corridor
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {CORRIDOR_STOPS.map((stop) => {
          const isSelected = stop.id === selectedSiteId;
          const liveDensity = densityMap && densityMap[stop.id];
          const seed = DEFAULT_SEEDS[stop.id];
          
          const people = liveDensity?.people_count ?? seed.people_count;
          const capacity = seed.capacity; // live doesn't pass capacity usually
          const status = liveDensity?.status ?? seed.status;
          const occupancy = liveDensity?.occupancy_percentage ?? seed.occupancy_percentage;
          
          const badgeStyle = getBadgeStyle(status);

          return (
            <div 
              key={stop.id}
              onClick={() => onSelectSite(stop.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                border: isSelected ? '2px solid #b45309' : '1px solid #fcd34d',
                borderRadius: '6px',
                backgroundColor: isSelected ? '#fef3c7' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 4px 6px -1px rgba(180, 83, 9, 0.1)' : '0 1px 2px 0 rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ flex: '1' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#78350f', marginBottom: '4px' }}>
                  {stop.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📍 {stop.city}</span>
                  <span>•</span>
                  <span>👥 {people.toLocaleString()} / {capacity.toLocaleString()}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  ...badgeStyle
                }}>
                  {status} ({occupancy}%)
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelectSite(stop.id); }}
                  style={{
                    backgroundColor: isSelected ? '#78350f' : '#b45309',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {isSelected ? 'Monitoring ✓' : 'Monitor →'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
