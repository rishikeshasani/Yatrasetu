import React from 'react';

/**
 * Standardized YatraSetu StatusBadge Component
 * Semantic status colors: NORMAL (Green), MODERATE (Amber), HIGH (Orange), CRITICAL (Red)
 * Booking states: PENDING (Amber/Yellow), CONFIRMED (Green), DECLINED (Red)
 */
export default function StatusBadge({
  status = 'NORMAL',
  theme = 'light',
  size = 'md',
  pulse = false,
  icon = null,
  label = null,
  className = '',
  style = {}
}) {
  const norm = String(status || 'NORMAL').toUpperCase().trim();

  // Resolve configuration
  let config = {
    key: 'NORMAL',
    label: label || 'NORMAL',
    dotColor: '#22C55E',
    light: {
      color: '#15803D',
      bg: '#F0FDF4',
      border: '#BBF7D0'
    },
    dark: {
      color: '#4ADE80',
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.35)'
    }
  };

  if (norm === 'CRITICAL' || norm === 'DANGER' || norm === 'EMERGENCY' || norm === 'SURGE_ACTIVE') {
    config = {
      key: 'CRITICAL',
      label: label || 'CRITICAL',
      dotColor: '#DC2626',
      light: { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
      dark: { color: '#F87171', bg: 'rgba(220, 38, 38, 0.18)', border: 'rgba(220, 38, 38, 0.45)' }
    };
  } else if (norm === 'HIGH' || norm === 'HIGH_SURGE' || norm === 'ELEVATED' || norm === 'ALERT') {
    config = {
      key: 'HIGH',
      label: label || 'HIGH',
      dotColor: '#EA580C',
      light: { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
      dark: { color: '#FB923C', bg: 'rgba(234, 88, 12, 0.15)', border: 'rgba(234, 88, 12, 0.35)' }
    };
  } else if (norm === 'MODERATE' || norm === 'MEDIUM' || norm === 'WARNING') {
    config = {
      key: 'MODERATE',
      label: label || 'MODERATE',
      dotColor: '#F59E0B',
      light: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
      dark: { color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' }
    };
  } else if (norm === 'PENDING' || norm === 'PENDING_REVIEW' || norm === 'REQUESTED') {
    config = {
      key: 'PENDING',
      label: label || 'PENDING',
      dotColor: '#D97706',
      light: { color: '#92400E', bg: '#FEF3C7', border: '#FCD34D' },
      dark: { color: '#FCD34D', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)' }
    };
  } else if (norm === 'CONFIRMED' || norm === 'ACCEPTED' || norm === 'ACTIVE' || norm === 'COMPLETED') {
    config = {
      key: 'CONFIRMED',
      label: label || (norm === 'ACTIVE' ? 'ACTIVE' : 'CONFIRMED'),
      dotColor: '#16A34A',
      light: { color: '#166534', bg: '#DCFCE7', border: '#86EFAC' },
      dark: { color: '#86EFAC', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.4)' }
    };
  } else if (norm === 'DECLINED' || norm === 'REJECTED' || norm === 'CANCELLED' || norm === 'LIFTED') {
    config = {
      key: 'DECLINED',
      label: label || (norm === 'LIFTED' ? 'LIFTED' : 'DECLINED'),
      dotColor: '#DC2626',
      light: { color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
      dark: { color: '#FCA5A5', bg: 'rgba(220, 38, 38, 0.18)', border: 'rgba(220, 38, 38, 0.4)' }
    };
  }

  const isDark = theme === 'dark';
  const colorSet = isDark ? config.dark : config.light;

  const sizeStyles = {
    sm: { padding: '0.18rem 0.55rem', fontSize: '0.6875rem', gap: '0.35rem' },
    md: { padding: '0.25rem 0.7rem', fontSize: '0.75rem', gap: '0.45rem' },
    lg: { padding: '0.35rem 0.85rem', fontSize: '0.8125rem', gap: '0.5rem' }
  }[size] || { padding: '0.25rem 0.7rem', fontSize: '0.75rem', gap: '0.45rem' };

  return (
    <span
      className={`ys-status-badge ys-status-${config.key.toLowerCase()} ${isDark ? 'theme-dark' : 'theme-light'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9999px',
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        color: colorSet.color,
        backgroundColor: colorSet.bg,
        border: `1px solid ${colorSet.border}`,
        ...sizeStyles,
        ...style
      }}
    >
      {icon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      ) : (
        <span
          style={{
            width: size === 'sm' ? '5px' : '7px',
            height: size === 'sm' ? '5px' : '7px',
            borderRadius: '50%',
            backgroundColor: config.dotColor,
            display: 'inline-block',
            boxShadow: pulse ? `0 0 6px ${config.dotColor}` : 'none',
            animation: pulse ? 'ys-pulse-animation 1.5s infinite ease-in-out' : 'none'
          }}
        />
      )}
      <span>{label || config.label}</span>
    </span>
  );
}
