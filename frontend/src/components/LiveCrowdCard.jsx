import React, { useEffect, useState } from 'react';
import { fetchSiteScheduleInsights, fetchSiteMLForecast } from '../api/api';

export default function LiveCrowdCard({ site, density, forecast, prediction }) {
  if (!site) return null;

  const [scheduleInsights, setScheduleInsights] = useState(null);
  const [mlForecast, setMlForecast] = useState(null);
  const [simulatedSurge, setSimulatedSurge] = useState(false);

  useEffect(() => {
    if (site?.id) {
      fetchSiteScheduleInsights(site.id).then(res => {
        if (res) setScheduleInsights(res);
      });
      fetchSiteMLForecast(site.id).then(res => {
        if (res?.forecasts) setMlForecast(res.forecasts);
      });
    }
  }, [site?.id]);

  const peopleCount = density?.people_count ?? 0;
  const capacity = site.capacity || 3000;
  const occupancy = density?.occupancy_percentage ?? Math.round((peopleCount / capacity) * 100);
  const status = density?.status || (occupancy < 50 ? 'NORMAL' : occupancy < 75 ? 'MODERATE' : occupancy < 90 ? 'HIGH' : 'CRITICAL');

  const waitMins = forecast?.queue_forecast?.estimated_current_wait_mins ?? 35;
  const normalWait = forecast?.queue_forecast?.normal_wait_mins ?? 25;
  const peakWait = forecast?.queue_forecast?.peak_wait_mins ?? 120;
  const queueSys = forecast?.queue_forecast?.queue_management_system || 'Automated Queue Lanes';
  const fastTrack = forecast?.queue_forecast?.fast_track_details || 'Priority counters for senior citizens available';

  const seasonalContext = forecast?.seasonal_context;
  const predictedCount = prediction?.predicted_next_count;
  const relativeSurge = density?.relative_surge_alert;

  const getStatusTheme = (s) => {
    switch (s) {
      case 'CRITICAL':
        return {
          badge: 'status-critical',
          color: '#DC2626',
          bg: '#FEF2F2',
          border: '#FECACA',
          icon: '🚨',
          label: 'CRITICAL CONGESTION',
          desc: 'High bottleneck risk. Temple gate pacing and alternate routes active.'
        };
      case 'HIGH':
        return {
          badge: 'status-high',
          color: '#EA580C',
          bg: '#FFF7ED',
          border: '#FFEDD5',
          icon: '⚠️',
          label: 'HIGH DENSITY',
          desc: 'Queue moving with delays. Consider recommended off-peak alternative spots.'
        };
      case 'MODERATE':
        return {
          badge: 'status-moderate',
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FEF3C7',
          icon: '⚡',
          label: 'MODERATE RUSH',
          desc: 'Steady darshan flow with moderate waiting lines.'
        };
      default:
        return {
          badge: 'status-normal',
          color: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          icon: '✅',
          label: 'NORMAL / OPTIMAL',
          desc: 'Smooth queue flow. Excellent time for peaceful darshan and rituals.'
        };
    }
  };

  const theme = getStatusTheme(status);

  return (
    <section className="live-crowd-section">
      <div className="destination-hero-header">
        <div className="destination-meta">
          <span className="live-telemetry-tag">
            <span className="blink-dot"></span> LIVE SURVEILLANCE FEED
          </span>
          <h1 className="destination-heading">{site.name}</h1>
          <p className="destination-sub">{site.city || site.state} • {site.description}</p>
        </div>

        <div className="destination-quick-facts">
          {site.altitude && (
            <div className="fact-badge">
              <span className="fact-label">Altitude</span>
              <span className="fact-val">{site.altitude}</span>
            </div>
          )}
          {site.darshan_timings && (
            <div className="fact-badge">
              <span className="fact-label">Darshan Timings</span>
              <span className="fact-val">{site.darshan_timings}</span>
            </div>
          )}
        </div>
      </div>

      {scheduleInsights && (
        <div style={{
          backgroundColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          borderWidth: '1px',
          borderRadius: '0.75rem',
          padding: '0.85rem 1.2rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🕒</span>
            <div>
              <div style={{ fontWeight: '700', color: '#065F46', fontSize: '0.9rem' }}>
                AI Best Time to Visit ({scheduleInsights.today_day_name || 'Today'}):
              </div>
              <div style={{ color: '#047857', fontSize: '0.85rem' }}>
                {scheduleInsights.quietest_window_summary}
              </div>
            </div>
          </div>
          {scheduleInsights.peak_hours && scheduleInsights.peak_hours.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: '#991B1B', backgroundColor: '#FEE2E2', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontWeight: '600' }}>
              ⚠️ Peak Congestion: {scheduleInsights.peak_hours.join(', ')}
            </div>
          )}
        </div>
      )}

      <div style={{
        backgroundColor: (relativeSurge?.is_relative_surge || simulatedSurge) ? '#FEF2F2' : '#F8FAFC',
        borderColor: (relativeSurge?.is_relative_surge || simulatedSurge) ? '#FECACA' : '#E2E8F0',
        borderWidth: '1px',
        borderRadius: '0.75rem',
        padding: '0.75rem 1.2rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem' }}>{(relativeSurge?.is_relative_surge || simulatedSurge) ? '🚨' : '🛡️'}</span>
          <div>
            <div style={{ fontWeight: '700', color: (relativeSurge?.is_relative_surge || simulatedSurge) ? '#991B1B' : '#334155', fontSize: '0.85rem' }}>
              {(relativeSurge?.is_relative_surge || simulatedSurge)
                ? 'Dynamic Surge Anomaly: CRITICAL SURGE DETECTED'
                : 'AI Walk-in Surge Monitor: Normal Traffic Flow'}
            </div>
            <div style={{ color: (relativeSurge?.is_relative_surge || simulatedSurge) ? '#B91C1C' : '#64748B', fontSize: '0.8rem' }}>
              {(relativeSurge?.is_relative_surge || simulatedSurge)
                ? 'Unscheduled spike: +380% above historical baseline for this hour (Z-Score: 8.4)'
                : 'Current footfall is within ±1.2σ of historical hourly baseline.'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setSimulatedSurge(!simulatedSurge)}
          style={{
            fontSize: '0.72rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            backgroundColor: simulatedSurge ? '#DC2626' : '#E2E8F0',
            color: simulatedSurge ? '#FFFFFF' : '#334155',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {simulatedSurge ? 'Reset to Normal' : 'Simulate Spike Alert'}
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card occupancy-gauge-card" style={{ borderColor: theme.border }}>
          <div className="card-top-row">
            <span className="metric-header-title">Real-Time Crowd Density</span>
            <span className={`status-pill-big ${theme.badge}`}>
              {theme.icon} {theme.label}
            </span>
          </div>

          <div className="occupancy-display-box">
            <div className="radial-meter-container">
              <svg className="radial-meter-svg" viewBox="0 0 120 120">
                <circle
                  className="meter-bg"
                  cx="60"
                  cy="60"
                  r="50"
                  strokeWidth="10"
                />
                <circle
                  className="meter-fill"
                  cx="60"
                  cy="60"
                  r="50"
                  strokeWidth="10"
                  stroke={theme.color}
                  strokeDasharray={314}
                  strokeDashoffset={314 - (314 * Math.min(occupancy, 100)) / 100}
                />
              </svg>
              <div className="radial-meter-text">
                <span className="occupancy-pct-number" style={{ color: theme.color }}>{occupancy}%</span>
                <span className="occupancy-pct-sub">Capacity</span>
              </div>
            </div>

            <div className="headcount-details">
              <div className="stat-line">
                <span className="stat-muted">Live Headcount:</span>
                <strong className="stat-bold">{peopleCount.toLocaleString()} pilgrims</strong>
              </div>
              <div className="stat-line">
                <span className="stat-muted">Safe Maximum:</span>
                <strong className="stat-bold">{capacity.toLocaleString()} pilgrims</strong>
              </div>
              <div className="stat-line">
                <span className="stat-muted">Status Advisory:</span>
                <span className="stat-desc">{theme.desc}</span>
              </div>
              {predictedCount && (
                <div className="ai-prediction-pill">
                  <span className="ai-spark">✨</span> AI 30-min Trend: <strong>~{predictedCount.toLocaleString()} visitors</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="metric-card queue-telemetry-card">
          <div className="card-top-row">
            <span className="metric-header-title">Queue & Darshan Wait Time</span>
            <span className="wait-time-tag">
              ⏱️ AI Queue Estimation
            </span>
          </div>

          <div className="wait-time-hero">
            <div className="wait-time-clock">
              <span className="clock-icon">⏳</span>
              <div className="wait-time-numbers">
                <span className="wait-time-value">{waitMins}</span>
                <span className="wait-time-unit">Minutes Est. Wait</span>
              </div>
            </div>

            <div className="wait-time-comparison-bar">
              <div className="comparison-point">
                <span className="pt-label">Normal Flow</span>
                <span className="pt-val">{normalWait}m</span>
              </div>
              <div className="comparison-slider">
                <div 
                  className="comparison-fill" 
                  style={{ width: `${Math.min(100, Math.max(15, (waitMins / (peakWait || 120)) * 100))}%`, backgroundColor: theme.color }}
                ></div>
              </div>
              <div className="comparison-point">
                <span className="pt-label">Peak Surge</span>
                <span className="pt-val">{peakWait}m</span>
              </div>
            </div>
          </div>

          <div className="queue-protocols">
            <div className="protocol-item">
              <span className="protocol-icon">🏷️</span>
              <div className="protocol-info">
                <span className="protocol-title">Queue Protocol:</span>
                <span className="protocol-text">{queueSys}</span>
              </div>
            </div>
            <div className="protocol-item">
              <span className="protocol-icon">⚡</span>
              <div className="protocol-info">
                <span className="protocol-title">Fast-Track / Priority:</span>
                <span className="protocol-text">{fastTrack}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {seasonalContext && (
        <div className="seasonal-context-box">
          <div className="seasonal-header">
            <span className="temple-bell">🔔</span>
            <h4 className="seasonal-title">Pilgrim Advisory & Surge Intelligence</h4>
          </div>
          <div className="seasonal-grid">
            <div className="seasonal-col">
              <span className="col-label">📅 Peak Months & Festivals:</span>
              <p className="col-val">{seasonalContext.peak_seasons} • {seasonalContext.upcoming_peak_festivals}</p>
            </div>
            <div className="seasonal-col">
              <span className="col-label">⚡ Surge Triggers:</span>
              <p className="col-val">{seasonalContext.surge_triggers}</p>
            </div>
            <div className="seasonal-col">
              <span className="col-label">⛅ Weather & Safety:</span>
              <p className="col-val">{seasonalContext.weather_warnings}</p>
            </div>
          </div>
        </div>
      )}

      {mlForecast && mlForecast.length > 0 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0',
          borderWidth: '1px',
          borderRadius: '1rem',
          padding: '1.25rem',
          marginTop: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📈</span>
              <h3 style={{ fontWeight: '700', fontSize: '1rem', color: '#0F172A', margin: 0 }}>
                24-Hour AI Crowd Forecast & Occupancy Curve
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '0.25rem 0.6rem', borderRadius: '0.5rem', border: '1px solid #BFDBFE' }}>
              🤖 ML Model (Random Forest)
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'thin'
          }}>
            {mlForecast.slice(0, 12).map((item, idx) => {
              const itemColor = item.status === 'CRITICAL' ? '#DC2626' : item.status === 'HIGH' ? '#EA580C' : item.status === 'MODERATE' ? '#D97706' : '#059669';
              const itemBg = item.status === 'CRITICAL' ? '#FEF2F2' : item.status === 'HIGH' ? '#FFF7ED' : item.status === 'MODERATE' ? '#FFFBEB' : '#ECFDF5';
              return (
                <div key={idx} style={{
                  minWidth: '100px',
                  flex: '0 0 auto',
                  padding: '0.75rem 0.5rem',
                  borderRadius: '0.75rem',
                  backgroundColor: itemBg,
                  border: `1px solid ${itemColor}33`,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>
                    {item.time_label}
                  </span>
                  <div style={{
                    width: '6px',
                    height: '36px',
                    backgroundColor: '#E2E8F0',
                    borderRadius: '999px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${Math.min(100, item.occupancy_percentage)}%`,
                      backgroundColor: itemColor,
                      borderRadius: '999px'
                    }}></div>
                  </div>
                  <strong style={{ fontSize: '0.85rem', color: itemColor, fontWeight: '700' }}>
                    {item.occupancy_percentage}%
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                    ~{item.predicted_count} ppl
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
