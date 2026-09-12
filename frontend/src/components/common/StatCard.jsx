import React from 'react';

/**
 * Standardized YatraSetu StatCard Component
 * Identical structure, padding, typography, and layout across all 4 dashboards.
 * Adapts between Light theme (Hotel/Tourist/Travel) and Dark theme (Government).
 */
export default function StatCard({
  label,
  value,
  unit = '',
  sub = null,
  icon = null,
  trend = null,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral' | 'alert'
  progress = null,       // number 0-100
  progressColor = null,
  theme = 'light',
  variant = 'default',   // 'default' | 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo'
  onClick = null,
  id = null,
  className = '',
  style = {}
}) {
  const isDark = theme === 'dark';

  // Variant accent colors
  const variantMap = {
    default: {
      iconBg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      iconColor: isDark ? '#60A5FA' : '#2563EB',
      border: isDark ? '#1E293B' : '#E2E8F0'
    },
    blue: {
      iconBg: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF',
      iconColor: isDark ? '#93C5FD' : '#1D4ED8',
      border: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'
    },
    emerald: {
      iconBg: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5',
      iconColor: isDark ? '#6EE7B7' : '#059669',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0'
    },
    amber: {
      iconBg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FFFBEB',
      iconColor: isDark ? '#FCD34D' : '#D97706',
      border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A'
    },
    rose: {
      iconBg: isDark ? 'rgba(244, 63, 94, 0.18)' : '#FFF1F2',
      iconColor: isDark ? '#FDA4AF' : '#E11D48',
      border: isDark ? 'rgba(244, 63, 94, 0.3)' : '#FECDD3'
    },
    indigo: {
      iconBg: isDark ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
      iconColor: isDark ? '#A5B4FC' : '#4F46E5',
      border: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE'
    }
  };

  const v = variantMap[variant] || variantMap.default;

  const trendColorMap = {
    positive: isDark ? '#4ADE80' : '#16A34A',
    negative: isDark ? '#F87171' : '#DC2626',
    alert: isDark ? '#FBBF24' : '#D97706',
    neutral: isDark ? '#94A3B8' : '#64748B'
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`ys-stat-card ${isDark ? 'theme-dark' : 'theme-light'} ${onClick ? 'clickable' : ''} ${className}`}
      style={{
        backgroundColor: isDark ? 'var(--ys-dark-surface, #111C38)' : 'var(--ys-light-surface, #FFFFFF)',
        border: `1px solid ${isDark ? v.border : 'var(--ys-light-border, #E2E8F0)'}`,
        borderRadius: 'var(--ys-radius-md, 10px)',
        padding: '1.1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.65rem',
        boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Top Header: Icon + Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {icon && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: v.iconBg,
              color: v.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '1rem'
            }}
          >
            {icon}
          </div>
        )}
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isDark ? '#94A3B8' : '#64748B',
            lineHeight: 1.2
          }}
        >
          {label}
        </span>
      </div>

      {/* Main Metric Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: isDark ? '#F8FAFC' : '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: isDark ? '#64748B' : '#64748B'
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Progress Bar (Optional) */}
      {progress !== null && (
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            borderRadius: '9999px',
            overflow: 'hidden',
            margin: '0.1rem 0'
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              backgroundColor: progressColor || (progress >= 90 ? '#DC2626' : progress >= 75 ? '#EA580C' : progress >= 50 ? '#D97706' : '#16A34A'),
              borderRadius: '9999px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      )}

      {/* Footer: Subtitle / Trend */}
      {(sub || trend) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: isDark ? '#64748B' : '#64748B',
            marginTop: '0.1rem'
          }}
        >
          {sub && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
          {trend && (
            <span
              style={{
                fontWeight: 700,
                color: trendColorMap[trendType] || trendColorMap.neutral,
                marginLeft: 'auto'
              }}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
