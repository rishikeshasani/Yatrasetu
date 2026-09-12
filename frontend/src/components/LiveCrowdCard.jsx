import React, { useEffect, useState } from 'react';
import { fetchSiteScheduleInsights, fetchSite24hForecast } from '../api/api';
import { getShrineImage } from '../utils/shrineImages';
import StatusBadge from './common/StatusBadge';

export default function LiveCrowdCard({ site, density, forecast, prediction, current24hForecast, queueForecast }) {
  if (!site) return null;

  const [scheduleInsights, setScheduleInsights] = useState(null);
  const [internal24hForecast, setInternal24hForecast] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (site?.id) {
      fetchSiteScheduleInsights(site.id).then((res) => {
        if (isMounted && res) setScheduleInsights(res);
      }).catch(() => {});

      if (!current24hForecast) {
        fetchSite24hForecast(site.id).then((res) => {
          if (isMounted && res?.forecasts) setInternal24hForecast(res.forecasts);
        }).catch(() => {});
      }
    }
    return () => {
      isMounted = false;
    };
  }, [site?.id, current24hForecast]);

  const activeForecasts = current24hForecast?.forecasts || internal24hForecast || [];

  const peopleCount = density?.people_count ?? 0;
  const capacity = density?.capacity || site?.capacity || 2500;
  const rawOccupancy = density?.occupancy_percentage ?? (capacity > 0 ? Math.round((peopleCount / capacity) * 100) : 0);
  const occupancy = Math.min(Math.max(rawOccupancy, 0), 100);

  // Authoritative status from backend (<50% NORMAL, 50-<75% MODERATE, 75-<90% HIGH, >=90% CRITICAL)
  const status = density?.status || (occupancy < 50 ? 'NORMAL' : occupancy < 75 ? 'MODERATE' : occupancy < 90 ? 'HIGH' : 'CRITICAL');
  const lastUpdated = density?.last_updated || 'Live Synchronized';

  // Queue forecast from GET /sites/{site_id}/crowd-forecast or canonical resolver
  const queueData = queueForecast?.queue_forecast || forecast?.queue_forecast;
  const waitMins = density?.wait_time_minutes != null ? density.wait_time_minutes : (queueData?.estimated_current_wait_mins ?? Math.max(15, Math.round((occupancy / 100) * 90)));
  const normalWait = density?.normal_wait != null ? density.normal_wait : (queueData?.normal_wait_mins ?? 25);
  const peakWait = density?.peak_wait != null ? density.peak_wait : (queueData?.peak_wait_mins ?? 120);
  const queueSys = queueData?.queue_management_system || 'Automated Token Corridors';
  const fastTrack = queueData?.fast_track_details || 'Priority counters available for seniors and families';

  const seasonalContext = forecast?.seasonal_context || queueForecast?.seasonal_context;
  const relativeSurge = density?.relative_surge_alert;
  const isSurgeActive = Boolean(relativeSurge?.is_relative_surge);

  const getQualitativeTheme = (occ, s) => {
    if (occ >= 90 || s === 'CRITICAL') {
      return {
        level: 'Very High',
        label: 'VERY HIGH',
        gaugePercentage: Math.max(90, Math.min(100, occ || 95)),
        stageIndex: 3,
        badge: 'status-critical',
        color: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        icon: '🚨',
        influxText: 'Very High Congestion / Surge',
        desc: 'High bottleneck risk. Temple gate pacing and alternate routes active.'
      };
    }
    if (occ >= 70 || s === 'HIGH') {
      return {
        level: 'High',
        label: 'HIGH',
        gaugePercentage: Math.max(70, Math.min(89, occ || 78)),
        stageIndex: 2,
        badge: 'status-high',
        color: '#EA580C',
        bg: '#FFF7ED',
        border: '#FFEDD5',
        icon: '⚠️',
        influxText: 'High Density Influx',
        desc: 'Queue moving with delays. Consider recommended off-peak alternative spots.'
      };
    }
    if (occ >= 40 || s === 'MODERATE') {
      return {
        level: 'Medium',
        label: 'MEDIUM',
        gaugePercentage: Math.max(40, Math.min(69, occ || 55)),
        stageIndex: 1,
        badge: 'status-moderate',
        color: '#D97706',
        bg: '#FFFBEB',
        border: '#FEF3C7',
        icon: '⚡',
        influxText: 'Moderate Darshan Rush',
        desc: 'Steady darshan flow with moderate waiting lines.'
      };
    }
    return {
      level: 'Low',
      label: 'LOW',
      gaugePercentage: Math.max(15, Math.min(39, occ || 25)),
      stageIndex: 0,
      badge: 'status-normal',
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      icon: '✅',
      influxText: 'Low Influx / Optimal Flow',
      desc: 'Smooth queue flow. Excellent time for peaceful darshan and rituals.'
    };
  };

  const theme = getQualitativeTheme(occupancy, status);

  const SOURCE_CONFIG = {
    yolo_video: { label: 'YOLO Video Feed', icon: '📹', badgeClass: 'source-yolo' },
    live_telemetry: { label: 'Live Telemetry', icon: '⚡', badgeClass: 'source-live' },
    demo_simulation: { label: 'Demo Simulation', icon: '📊', badgeClass: 'source-demo' },
    historical_baseline: { label: 'Historical Baseline', icon: '📈', badgeClass: 'source-hist' },
    historical: { label: 'Historical Baseline', icon: '📈', badgeClass: 'source-hist' },
  };

  const rawSource = density?.source || 'demo_simulation';
  const sourceInfo = SOURCE_CONFIG[rawSource] || SOURCE_CONFIG.demo_simulation;

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
            <span
              className={`source-badge-pill ${sourceInfo.badgeClass}`}
              style={{ fontSize: '0.74rem', padding: '0.2rem 0.65rem' }}
              title={`Authoritative Data Source: ${sourceInfo.label}`}
            >
              {sourceInfo.icon} {sourceInfo.label}
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
      <div className={`surge-monitor-banner ${isSurgeActive ? 'surge-active' : 'surge-normal'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="surge-banner-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <span className="surge-icon">{isSurgeActive ? '🚨' : '🛡️'}</span>
          <div className="surge-text">
            <div className="surge-title">
              {isSurgeActive
                ? 'Dynamic Surge Anomaly: UNEXPECTED RUSH DETECTED'
                : 'Darshan Queue Flow: Smooth & Orderly'}
            </div>
            <div className="surge-sub">
              {isSurgeActive
                ? (relativeSurge?.message || 'High visitor influx above historical baseline for this hour.')
                : 'Queues are moving at an orderly pace. Ideal window for peaceful darshan and sacred rituals.'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: isSurgeActive ? '#991B1B' : '#047857', fontWeight: 700, background: isSurgeActive ? '#FEE2E2' : '#D1FAE5', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
          Z-Score Baseline: {relativeSurge?.z_score != null ? `${relativeSurge.z_score.toFixed(2)}σ` : 'Normal'}
        </div>
      </div>

      {/* 4. DUAL HERO METRICS: CROWD STATUS & WAIT TIME */}
      <div className="metrics-grid">
        {/* Metric 1: Current Crowd Status (Qualitative: Low, Medium, High, Very High) */}
        <div className="metric-card occupancy-gauge-card" style={{ borderColor: theme.border }}>
          <div className="card-top-row">
            <div className="card-title-wrap">
              <span className="metric-header-title">CURRENT CROWD STATUS</span>
              <span className="metric-sub-label">Live sanctum crowd level</span>
            </div>
            <StatusBadge
              status={status}
              size="lg"
              pulse={status === 'CRITICAL'}
              label={`${theme.icon} ${theme.label || theme.level}`}
            />
          </div>

          <div className="occupancy-display-box">
            {/* Visual Qualitative Crowd Flow Meter */}
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
                  strokeDashoffset={314 - (314 * theme.gaugePercentage) / 100}
                />
              </svg>
              <div className="radial-meter-text">
                <span
                  className="occupancy-pct-number"
                  style={{
                    color: theme.color,
                    fontSize: theme.level === 'Very High' ? '1.05rem' : '1.35rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    lineHeight: 1.1
                  }}
                >
                  {theme.level}
                </span>
                <span className="occupancy-pct-sub" style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginTop: '3px' }}>
                  Crowd Status
                </span>
              </div>
            </div>

            {/* Qualitative Capacity & Dynamic Stepper Indicator */}
            <div className="headcount-details">
              <div
                className="stat-box-highlight"
                style={{
                  background: theme.bg,
                  border: `1.5px solid ${theme.border}`,
                  borderRadius: '0.75rem',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sanctum Capacity Level
                  </span>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      color: theme.color,
                      background: '#FFFFFF',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${theme.border}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}
                  >
                    {theme.icon} {theme.level}
                  </span>
                </div>

                {/* Dynamic 4-Tier Qualitative Level Bar */}
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '5px',
                      height: '10px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#E2E8F0',
                      padding: '2px'
                    }}
                  >
                    {['Low', 'Medium', 'High', 'Very High'].map((lvl, idx) => {
                      const isActive = idx <= theme.stageIndex;
                      const isCurrent = idx === theme.stageIndex;
                      const lvlColor =
                        idx === 0 ? '#059669' : idx === 1 ? '#D97706' : idx === 2 ? '#EA580C' : '#DC2626';
                      return (
                        <div
                          key={lvl}
                          title={`Level: ${lvl}`}
                          style={{
                            height: '100%',
                            borderRadius: '3px',
                            backgroundColor: isActive ? lvlColor : '#CBD5E1',
                            opacity: isActive ? 1 : 0.4,
                            transition: 'all 0.5s ease',
                            boxShadow: isCurrent ? `0 0 6px ${lvlColor}99` : 'none'
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      marginTop: '0.3rem',
                      textAlign: 'center',
                      fontSize: '0.68rem',
                      fontWeight: 700
                    }}
                  >
                    <span style={{ color: theme.stageIndex === 0 ? '#059669' : '#94A3B8' }}>Low</span>
                    <span style={{ color: theme.stageIndex === 1 ? '#D97706' : '#94A3B8' }}>Medium</span>
                    <span style={{ color: theme.stageIndex === 2 ? '#EA580C' : '#94A3B8' }}>High</span>
                    <span style={{ color: theme.stageIndex === 3 ? '#DC2626' : '#94A3B8' }}>Very High</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Sanctum Influx:</span>
                  <strong style={{ color: theme.color }}>{theme.influxText}</strong>
                </div>
              </div>

              <div className="stat-line">
                <span className="stat-muted">Condition:</span>
                <strong className="stat-bold" style={{ color: theme.color }}>
                  {theme.icon} {theme.level}
                </strong>
              </div>
              <div className="stat-line">
                <span className="stat-muted">Data Source:</span>
                <span className={`source-badge-pill ${sourceInfo.badgeClass}`} style={{ fontSize: '0.72rem', padding: '0.12rem 0.5rem' }}>
                  {sourceInfo.icon} {sourceInfo.label}
                </span>
              </div>
              <div className="stat-line">
                <span className="stat-muted">Last Updated:</span>
                <span className="stat-desc" style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  🕒 {lastUpdated}
                </span>
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
              <span className="metric-header-title">QUEUE / WAIT ESTIMATE</span>
              <span className="metric-sub-label">From queue entrance to sanctum</span>
            </div>
            <span className="wait-time-tag">
              ⏱️ Queue Forecast
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

      {/* 7. AI-POWERED 24-HOUR CROWD MONITORING */}
      <div className="ml-forecast-card">
        <div className="ml-forecast-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="ml-forecast-title-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📈</span>
            <div>
              <h3 className="ml-forecast-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                AI-Powered Crowd Intelligence
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Combines crowd observations, historical crowd patterns and forecasting logic to estimate future congestion.
              </p>
            </div>
          </div>
          <span className="ml-badge-tag" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
            📊 24-Hour Crowd Monitoring
          </span>
        </div>

        {activeForecasts && activeForecasts.length > 0 ? (
          <div className="ml-forecast-track">
            {activeForecasts.slice(0, 12).map((item, idx) => {
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
                  <strong className="ml-pct-label" style={{ color: itemColor, fontSize: '0.75rem', fontWeight: 800 }}>
                    {item.status === 'CRITICAL' ? 'Very High' : item.status === 'HIGH' ? 'High' : item.status === 'MODERATE' ? 'Medium' : 'Low'}
                  </strong>
                  <span className="ml-count-label" style={{ fontWeight: 600, color: '#64748B', fontSize: '0.68rem' }}>
                    {item.occupancy_percentage}% Influx
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '1.75rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
            ⏳ 24-hour crowd forecast is compiling for {site.name}. Check back shortly.
          </div>
        )}
      </div>
    </section>
  );
}
