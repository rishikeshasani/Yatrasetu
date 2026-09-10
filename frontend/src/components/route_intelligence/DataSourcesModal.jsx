import React from 'react';
import { getDataSourceProvenance } from '../../services/routeIntelligenceEngine';

export default function DataSourcesModal({
  isOpen,
  onClose,
  destination
}) {
  if (!isOpen) return null;

  const provenance = getDataSourceProvenance(destination);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '0.85rem',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0'
      }}>
        {/* Modal Header */}
        <div style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '1.25rem 1.5rem',
          borderRadius: '0.85rem 0.85rem 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Data Provenance &amp; Verification
            </div>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', fontWeight: '800' }}>
              Why this Forecast? Data Sources &amp; Confidence
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {/* Confidence Banner */}
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: '0.65rem',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Algorithmic Forecast Confidence
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#15803D' }}>
                {provenance.confidence_score}% Verified Influx Reliability
              </div>
            </div>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
          </div>

          {/* Active Real Data Signals */}
          <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.95rem', color: '#0F172A', fontWeight: '800' }}>
            Verified Application Data Signals (Live in System):
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            {provenance.active_signals.map((sig, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  borderLeft: '4px solid #10B981'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>{sig.name}</strong>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#DCFCE7', color: '#166534', padding: '0.15rem 0.45rem', borderRadius: '3px', fontWeight: 'bold' }}>
                    Active Real Data
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  <strong>Source:</strong> {sig.source}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.25rem' }}>
                  {sig.detail}
                </div>
              </div>
            ))}
          </div>

          {/* Explicitly Disclaimed Unavailable Signals */}
          <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.95rem', color: '#64748B', fontWeight: '800' }}>
            Unavailable Backend Signals (Explicit Disclosures):
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {provenance.unavailable_features.map((feat, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  borderLeft: '4px solid #EF4444'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <strong style={{ fontSize: '0.86rem', color: '#991B1B' }}>{feat.name}</strong>
                  <span style={{ fontSize: '0.68rem', backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.15rem 0.45rem', borderRadius: '3px', fontWeight: 'bold' }}>
                    Integration Unavailable
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#7F1D1D', lineHeight: 1.35 }}>
                  {feat.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.5rem',
          backgroundColor: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.4rem',
              fontWeight: 'bold',
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            Close Provenance
          </button>
        </div>
      </div>
    </div>
  );
}
