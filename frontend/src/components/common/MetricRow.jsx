import React from 'react';

/**
 * Standardized YatraSetu MetricRow Component
 * Consistent key-value row for metadata, price breakdowns, and stats.
 */
export default function MetricRow({
  label,
  value,
  sub = null,
  badge = null,
  highlight = false,
  theme = 'light',
  className = '',
  style = {}
}) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`ys-metric-row ${highlight ? 'highlight' : ''} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.45rem 0',
        borderBottom: `1px solid ${isDark ? 'rgba(30, 41, 59, 0.5)' : '#F1F5F9'}`,
        fontSize: '0.85rem',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDark ? '#94A3B8' : '#64748B' }}>
        <span>{label}</span>
        {sub && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({sub})</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {badge && <span>{badge}</span>}
        <strong
          style={{
            fontWeight: 700,
            color: highlight
              ? (isDark ? '#60A5FA' : '#1D4ED8')
              : (isDark ? '#F8FAFC' : '#0F172A'),
            fontSize: highlight ? '0.95rem' : '0.875rem'
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}
