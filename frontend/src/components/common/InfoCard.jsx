import React from 'react';

/**
 * Standardized YatraSetu InfoCard Component
 * Unified panel container with header, optional badge/action, and clean body padding.
 */
export default function InfoCard({
  title,
  subtitle = null,
  badge = null,
  icon = null,
  actions = null,
  children,
  theme = 'light',
  id = null,
  className = '',
  bodyStyle = {},
  style = {}
}) {
  const isDark = theme === 'dark';

  return (
    <div
      id={id}
      className={`ys-info-card ${isDark ? 'theme-dark' : 'theme-light'} ${className}`}
      style={{
        backgroundColor: isDark ? 'var(--ys-dark-surface, #111C38)' : 'var(--ys-light-surface, #FFFFFF)',
        border: `1px solid ${isDark ? 'var(--ys-dark-border, #1E293B)' : 'var(--ys-light-border, #E2E8F0)'}`,
        borderRadius: 'var(--ys-radius-md, 10px)',
        boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {/* Header Bar */}
      {(title || badge || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${isDark ? 'rgba(30, 41, 59, 0.8)' : '#F1F5F9'}`,
            backgroundColor: isDark ? 'var(--ys-dark-surface-subtle, #172346)' : '#FAFCFF',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            {icon && (
              <span style={{ fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center' }}>
                {icon}
              </span>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {title && (
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: isDark ? '#F8FAFC' : '#0F172A',
                      letterSpacing: '-0.01em',
                      textTransform: 'uppercase',
                      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
                    }}
                  >
                    {title}
                  </h3>
                )}
                {badge && <span>{badge}</span>}
              </div>
              {subtitle && (
                <p
                  style={{
                    margin: '0.2rem 0 0',
                    fontSize: '0.8rem',
                    color: isDark ? '#94A3B8' : '#64748B'
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Card Content Body */}
      <div
        style={{
          padding: '1.25rem',
          color: isDark ? '#E2E8F0' : '#1E293B',
          ...bodyStyle
        }}
      >
        {children}
      </div>
    </div>
  );
}
