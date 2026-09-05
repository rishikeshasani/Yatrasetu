import React from 'react';
import { useEmergencyBanner } from '../hooks/useEmergencyBanner';

export default function EmergencyAlertBanner() {
  const { isEmergency, emergencyMessage, emergencyTimestamp } = useEmergencyBanner();

  if (!isEmergency) return null;

  return (
    <div style={{
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      padding: '0.85rem 1.5rem',
      fontSize: '1.05rem',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      animation: 'pulseBanner 2s infinite ease-in-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.6rem', animation: 'bounce 1s infinite' }}>🚨</span>
        <div>
          <span style={{ backgroundColor: '#7F1D1D', padding: '0.2rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.8rem', letterSpacing: '0.05em', marginRight: '0.75rem', textTransform: 'uppercase' }}>
            Government Emergency Reroute
          </span>
          <span>{emergencyMessage || 'HARIDWAR CORRIDOR OVERTOURISM OVERRIDE ACTIVE. All inbound traffic diverted to satellite parking.'}</span>
        </div>
      </div>
      {emergencyTimestamp && (
        <div style={{ fontSize: '0.85rem', backgroundColor: '#991B1B', padding: '0.3rem 0.75rem', borderRadius: '0.25rem', whiteSpace: 'nowrap' }}>
          Issued: {emergencyTimestamp}
        </div>
      )}
    </div>
  );
}
