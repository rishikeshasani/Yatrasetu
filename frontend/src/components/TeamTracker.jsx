import React from 'react';

export default function TeamTracker({ currentSite }) {
  return (
    <section className="team-tracker-section" id="my-yatra-team" style={{ margin: '2rem 0' }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '1.15rem',
        border: '1px solid #E2E8F0',
        padding: '1.8rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '2rem' }}>👥</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                My Yatra Team — Coming Soon
              </h3>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#475569',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                Backend Gap
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#64748B' }}>
              Team tracking backend is not yet connected.
            </p>
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px dashed #CBD5E1',
          borderRadius: '0.85rem',
          padding: '1.35rem',
          marginTop: '1rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
            Upcoming Pilgrimage Group Features
          </h4>
          <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.6', color: '#64748B' }}>
            Real-time family and yatra dal coordination is planned for future backend integration. When connected to the YatraSetu database, this module will support:
          </p>
          <ul style={{ margin: '0.75rem 0 0 1.25rem', padding: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.6' }}>
            <li><strong>Group Coordination:</strong> Live roster synchronization and waypoint tracking for registered tour groups and families.</li>
            <li><strong>Group Distress Beacons:</strong> Automated mutual alert broadcasts to party members if an emergency occurs.</li>
            <li><strong>Pilgrim Group Locator:</strong> Proximity indicators to prevent members from being separated on busy temple trails.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
