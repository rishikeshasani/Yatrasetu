import React from 'react';

/**
 * Standardized YatraSetu EmptyState Component
 * Clean, consistent empty and loading states across all dashboards.
 */
export default function EmptyState({
  icon = '📋',
  title = 'No Data Available',
  description = 'There are currently no records to display.',
  action = null,
  theme = 'light',
  className = '',
  style = {}
}) {
  const isDark = theme === 'dark';

  return (
    <div
      className={`ys-empty-state ${isDark ? 'theme-dark' : 'theme-light'} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        borderRadius: 'var(--ys-radius-md, 10px)',
        border: `1px dashed ${isDark ? '#334155' : '#CBD5E1'}`,
        backgroundColor: isDark ? 'rgba(17, 28, 56, 0.4)' : '#F8FAFC',
        margin: '1rem 0',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <span style={{ fontSize: '2.2rem', marginBottom: '0.75rem', lineHeight: 1 }}>
        {icon}
      </span>
      <h4
        style={{
          margin: '0 0 0.4rem',
          fontSize: '1rem',
          fontWeight: 700,
          color: isDark ? '#F1F5F9' : '#1E293B'
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: '0 0 1.25rem',
          fontSize: '0.85rem',
          color: isDark ? '#94A3B8' : '#64748B',
          maxWidth: '420px',
          lineHeight: 1.4
        }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
