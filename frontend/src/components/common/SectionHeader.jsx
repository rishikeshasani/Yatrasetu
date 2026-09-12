import React from 'react';

/**
 * Standardized YatraSetu SectionHeader Component
 * Consistent section titles across all dashboards with icon, subtitle, badge, and actions.
 */
export default function SectionHeader({
  title,
  subtitle = null,
  badge = null,
  icon = null,
  actions = null,
  theme = 'light',
  className = '',
  style = {}
}) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`ys-section-header ${isDark ? 'theme-dark' : 'theme-light'} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {icon && (
          <div
            style={{
              fontSize: '1.25rem',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: isDark ? '#F8FAFC' : '#0F172A',
                letterSpacing: '-0.02em',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
              }}
            >
              {title}
            </h2>
            {badge && <span>{badge}</span>}
          </div>
          {subtitle && (
            <p
              style={{
                margin: '0.25rem 0 0',
                fontSize: '0.85rem',
                color: isDark ? '#94A3B8' : '#64748B',
                lineHeight: 1.4
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
