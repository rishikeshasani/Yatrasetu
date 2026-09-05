import React, { useEffect, useState } from 'react';
import { fetchSiteScheduleInsights, fetchSiteMLForecast } from '../api/api';
import { getShrineImage } from '../utils/shrineImages';

export default function LiveCrowdCard({ site, density, forecast, prediction }) {
  if (!site) return null;

  const [scheduleInsights, setScheduleInsights] = useState(null);
  const [mlForecast, setMlForecast] = useState(null);
  const [simulatedSurge, setSimulatedSurge] = useState(false);

  useEffect(() => {
    if (site?.id) {
      fetchSiteScheduleInsights(site.id).then((res) => {
        if (res) setScheduleInsights(res);
      });
      fetchSiteMLForecast(site.id).then((res) => {
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
  const queueSys = forecast?.queue_forecast?.queue_management_system || 'Automated Queue Corridors';
  const fastTrack = forecast?.queue_forecast?.fast_track_details || 'Priority counters available for seniors and families';

  const seasonalContext = forecast?.seasonal_context;
  const predictedCount = prediction?.predicted_next_count;
  const relativeSurge = density?.relative_surge_alert;
  const isSurgeActive = Boolean(relativeSurge?.is_relative_surge || simulatedSurge);

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
      {/* 1. DESTINATION HERO HEADER */}
      <div className="destination-hero-header" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div className="destination-hero-media" style={{ position: 'relative', width: '160px', height: '115px', borderRadius: '0.85rem', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          <img
            src={getShrineImage(site.id)}
            alt={site.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
          <span style={{ position: 'absolute', bottom: '0.35rem', left: '0.35rem', background: 'rgba(15, 23, 42, 0.85)', color: '#10B981', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <span className="blink-dot"></span> VERIFIED SHRINE
          </span>
        </div>

        <div className="destination-meta" style={{ flex: 1, minWidth: '260px' }}>
          <div className="telemetry-badge-row">
            <span className="live-telemetry-tag">
              <span className="blink-dot"></span> OFFICIAL PILGRIM ADVISORY
            </span>
            <span className="live-poll-badge">
              <span className="poll-dot"></span> Live Crowd Advisory
            </span>
          </div>
          <h1 className="destination-heading">{site.name}</h1>
          <p className="destination-sub">
            {[site.city, site.state].filter(Boolean).join(', ') || 'Sacred Destination'}
            {site.description ? ` • ${site.description}` : ''}
          </p>
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
              <span className="fact-label">Darshan Hours</span>
              <span className="fact-val">{site.darshan_timings}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. AI BEST TIME TO VISIT BANNER */}
      {scheduleInsights && (
        <div className="schedule-insights-banner">
          <div className="schedule-insights-left">
            <span className="insights-icon">🕒</span>
            <div className="insights-text">
              <div className="insights-title">
                AI Best Time to Visit ({scheduleInsights.today_day_name || 'Today'}):
              </div>
              <div className="insights-desc">
                {scheduleInsights.quietest_window_summary}
              </div>
            </div>
          </div>
          {scheduleInsights.peak_hours && scheduleInsights.peak_hours.length > 0 && (
            <div className="insights-peak-pill">
              ⚠️ Peak Congestion: {scheduleInsights.peak_hours.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 3. DYNAMIC CROWD CONDITION ADVISORY */}
      <div className={`surge-monitor-banner ${isSurgeActive ? 'surge-active' : 'surge-normal'}`}>
        <div className="surge-banner-left">
          <span className="surge-icon">{isSurgeActive ? '⚠️' : '✨'}</span>
          <div className="surge-text">
            <div className="surge-title">
              {isSurgeActive
                ? 'High Visitor Congestion Advisory'
                : 'Darshan Queue Flow: Smooth & Manageable'}
            </div>
            <div className="surge-sub">
              {isSurgeActive
                ? (relativeSurge?.message || 'Heavy pilgrim influx detected at sanctum gates. Consider visiting during off-peak hours or exploring an alternate sister shrine.')
                : 'Queues are moving at steady pace. Ideal window for peaceful darshan and rituals.'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. DUAL HERO METRICS: CROWD STATUS & WAIT TIME */}
      <div className="metrics-grid">
        {/* Metric 1: Current Crowd Status */}
        <div className="metric-card occupancy-gauge-card" style={{ borderColor: theme.border }}>
          <div className="card-top-row">
            <div className="card-title-wrap">
              <span className="metric-header-title">Current Crowd</span>
              <span className="metric-sub-label">Live sanctum condition</span>
            </div>
            <span className={`status-pill-big ${theme.badge}`}>
              {theme.icon} {theme.label}
            </span>
          </div>

          <div className="occupancy-display-box">
            {/* Visual Crowd Flow Meter */}
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
                  strokeDashoffset={314 - (314 * Math.min(Math.max(occupancy, 0), 100)) / 100}
                />
              </svg>
              <div className="radial-meter-text">
                <span className="occupancy-pct-number" style={{ color: theme.color }}>
                  {status === 'NORMAL' ? 'LOW' : status === 'MODERATE' ? 'MOD' : status === 'HIGH' ? 'HIGH' : 'MAX'}
                </span>
                <span className="occupancy-pct-sub">{status}</span>
              </div>
            </div>

            {/* Clear, Sanitized Pilgrim Advice */}
            <div className="headcount-details">
              <div className="stat-box-highlight">
                <span className="stat-highlight-num" style={{ color: theme.color }}>
                  {theme.icon} {status === 'NORMAL' ? 'Optimal Flow' : status === 'MODERATE' ? 'Moderate Rush' : status === 'HIGH' ? 'Heavy Rush' : 'Peak Congestion'}
                </span>
                <span className="stat-highlight-label">Sanctum Footfall Condition</span>
              </div>

              <div className="stat-line">
                <span className="stat-muted">Advice:</span>
                <strong className="stat-bold">
                  {status === 'NORMAL' && 'Good time for peaceful darshan'}
                  {status === 'MODERATE' && 'Steady queues — moving normally'}
                  {status === 'HIGH' && 'Heavy crowd — consider an alternate destination'}
                  {status === 'CRITICAL' && 'Extreme rush — rerouting strongly advised'}
                </strong>
              </div>
              <div className="stat-line">
                <span className="stat-muted">Recommendation:</span>
                <span className="stat-desc">{theme.desc}</span>
              </div>

              {scheduleInsights?.quietest_window_summary && (
                <div className="ai-prediction-pill">
                  <span className="ai-spark">✨</span> Best Window: <strong>{scheduleInsights.quietest_window_summary}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metric 2: Queue & Darshan Wait Time */}
        <div className="metric-card queue-telemetry-card">
          <div className="card-top-row">
            <div className="card-title-wrap">
              <span className="metric-header-title">Estimated Darshan Wait Time</span>
              <span className="metric-sub-label">From queue entrance to sanctum</span>
            </div>
            <span className="wait-time-tag">
              ⏱️ AI Queue Estimation
            </span>
          </div>

          <div className="wait-time-hero">
            <div className="wait-time-clock">
              <span className="clock-icon">⏳</span>
              <div className="wait-time-numbers">
                <div className="wait-time-primary-row">
                  <span className="wait-time-value">~{waitMins}</span>
                  <span className="wait-time-mins-label">Minutes</span>
                </div>
                <span className="wait-time-unit">Estimated current queue wait</span>
              </div>
            </div>

            <div className="wait-time-comparison-bar">
              <div className="comparison-point">
                <span className="pt-label">Normal Flow</span>
                <span className="pt-val">{normalWait} min</span>
              </div>
              <div className="comparison-slider">
                <div
                  className="comparison-fill"
                  style={{
                    width: `${Math.min(100, Math.max(12, Math.round((waitMins / Math.max(peakWait, 120)) * 100)))}%`,
                    backgroundColor: theme.color
                  }}
                ></div>
              </div>
              <div className="comparison-point">
                <span className="pt-label">Peak Surge</span>
                <span className="pt-val">{peakWait} min</span>
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

      {/* 5. VISUAL DECISION BRIDGE TO AI PILGRIM ADVISORY */}
      <div className={`advisory-bridge-strip ${occupancy >= 75 || isSurgeActive ? 'bridge-surge' : 'bridge-optimal'}`}>
        <div className="bridge-icon-col">
          <span className="bridge-om-icon">{occupancy >= 75 || isSurgeActive ? '⚠️' : '🕉️'}</span>
        </div>
        <div className="bridge-text-col">
          <div className="bridge-title">
            {occupancy >= 75 || isSurgeActive
              ? `Heavy Rush Detected at ${site.name}`
              : `Smooth Darshan Flow at ${site.name}`}
          </div>
          <p className="bridge-sub">
            {occupancy >= 75 || isSurgeActive
              ? `Current waiting time is ~${waitMins} mins. YatraSetu AI has generated peaceful alternative routes with up to 70%+ shorter queues and +25 Punya Points on arrival.`
              : `Current waiting time is ~${waitMins} mins. If you prefer quieter, off-beat spiritual sites, browse our AI-recommended alternatives below.`}
          </p>
        </div>
        <button
          type="button"
          className="bridge-action-btn"
          onClick={() => {
            const el = document.getElementById('ai-pilgrim-advisory');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          title="Scroll down to AI Pilgrim Advisory & Alternative Routes"
        >
          <span>Explore Alternative Routes</span>
          <span className="bridge-arrow">↓</span>
        </button>
      </div>

      {/* 6. TEMPLE RITUAL & SEASONAL GUIDELINES */}
      {seasonalContext && (
        <div className="seasonal-context-box">
          <div className="seasonal-header">
            <span className="temple-bell">🔔</span>
            <h4 className="seasonal-title">Temple Ritual & Seasonal Guidelines</h4>
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

      {/* 7. EXPECTED DAILY CROWD TREND */}
      {mlForecast && mlForecast.length > 0 && (
        <div className="ml-forecast-card">
          <div className="ml-forecast-header">
            <div className="ml-forecast-title-row">
              <span style={{ fontSize: '1.25rem' }}>📈</span>
              <h3 className="ml-forecast-title">
                Expected Daily Crowd Trend
              </h3>
            </div>
            <span className="ml-badge-tag">
              📊 Today's Pattern
            </span>
          </div>

          <div className="ml-forecast-track">
            {mlForecast.slice(0, 12).map((item, idx) => {
              const itemColor =
                item.status === 'CRITICAL'
                  ? '#DC2626'
                  : item.status === 'HIGH'
                  ? '#EA580C'
                  : item.status === 'MODERATE'
                  ? '#D97706'
                  : '#059669';
              const itemBg =
                item.status === 'CRITICAL'
                  ? '#FEF2F2'
                  : item.status === 'HIGH'
                  ? '#FFF7ED'
                  : item.status === 'MODERATE'
                  ? '#FFFBEB'
                  : '#ECFDF5';
              return (
                <div
                  key={idx}
                  className="ml-forecast-item"
                  style={{
                    backgroundColor: itemBg,
                    border: `1px solid ${itemColor}33`
                  }}
                >
                  <span className="ml-time-label">
                    {item.time_label}
                  </span>
                  <div className="ml-bar-track">
                    <div
                      className="ml-bar-fill"
                      style={{
                        height: `${Math.min(100, item.occupancy_percentage)}%`,
                        backgroundColor: itemColor
                      }}
                    ></div>
                  </div>
                  <strong className="ml-pct-label" style={{ color: itemColor }}>
                    {item.occupancy_percentage}%
                  </strong>
                  <span className="ml-count-label" style={{ fontWeight: 600, color: itemColor }}>
                    {item.status}
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
