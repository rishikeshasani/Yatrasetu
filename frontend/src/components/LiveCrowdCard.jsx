export default function LiveCrowdCard({ site, density, forecast, prediction }) {
  if (!site) return null;

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

  // Status-dependent styling helpers
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
      {/* Top Banner with Shrine Identity & Telemetry Tag */}
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

      {/* Main Metrics Grid */}
      <div className="metrics-grid">
        {/* Metric Card 1: Live Occupancy Gauge */}
        <div className="metric-card occupancy-gauge-card" style={{ borderColor: theme.border }}>
          <div className="card-top-row">
            <span className="metric-header-title">Real-Time Crowd Density</span>
            <span className={`status-pill-big ${theme.badge}`}>
              {theme.icon} {theme.label}
            </span>
          </div>

          <div className="occupancy-display-box">
            {/* Visual Circular / Progress Meter */}
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

        {/* Metric Card 2: Queue & Wait Time Telemetry */}
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

      {/* Seasonal & Festival Context Banner */}
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
    </section>
  );
}
