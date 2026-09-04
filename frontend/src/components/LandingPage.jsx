import { useState, useMemo } from 'react';
import { getShrineImage } from '../utils/shrineImages';

export default function LandingPage({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  onOpenDashboard,
  onOpenSOS,
  onOpenAuth,
  currentUser
}) {
  // Hero interactive preview site toggle
  const [heroSiteId, setHeroSiteId] = useState(selectedSiteId || 'site_kedarnath');
  
  // Destination grid search, filter, and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');

  // Featured shrines for Hero quick switcher
  const heroShuffledSites = useMemo(() => {
    const heroKeys = ['site_kedarnath', 'site_kashi', 'site_ayodhya', 'site_tirupati', 'site_vaishnodevi'];
    return sites.filter((s) => heroKeys.includes(s.id));
  }, [sites]);

  const activeHeroSite = sites.find((s) => s.id === heroSiteId) || sites[0] || {
    id: 'site_kedarnath',
    name: 'Kedarnath Temple',
    city: 'Rudraprayag, Uttarakhand',
    capacity: 13000,
    image: getShrineImage('TS001')
  };

  const heroDensity = densityMap[activeHeroSite.id] || {
    people_count: 6240,
    occupancy_percentage: 48.0,
    status: 'NORMAL',
    wait_time_minutes: 35
  };

  const heroOccupancy = Math.round(
    heroDensity.occupancy_percentage ??
    ((heroDensity.people_count || 0) / (activeHeroSite.capacity || 10000)) * 100
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL': return { bg: '#FEF2F2', text: '#DC2626', border: '#F87171', label: 'Critical Congestion', dot: '#DC2626' };
      case 'HIGH': return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74', label: 'High Footfall', dot: '#EA580C' };
      case 'MODERATE': return { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD', label: 'Moderate Flow', dot: '#2563EB' };
      case 'NORMAL':
      default: return { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7', label: 'Normal / Smooth', dot: '#10B981' };
    }
  };

  const heroStatusTheme = getStatusColor(heroDensity.status || 'NORMAL');

  // Filtered & Sorted Destinations
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        site.name.toLowerCase().includes(q) ||
        (site.city && site.city.toLowerCase().includes(q)) ||
        (site.state && site.state.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeCategory === 'ALL') return true;
      if (activeCategory === 'CHARDHAM') {
        return (
          site.name.includes('Kedarnath') ||
          site.name.includes('Badrinath') ||
          site.name.includes('Gangotri') ||
          site.name.includes('Yamunotri') ||
          site.name.includes('Hemkund') ||
          site.name.includes('Amarnath') ||
          site.name.includes('Vaishno')
        );
      }
      if (activeCategory === 'JYOTIRLINGA') {
        const jyotirlingas = [
          'Somnath', 'Mallikarjuna', 'Mahakaleshwar', 'Omkareshwar', 'Kedarnath',
          'Bhimashankar', 'Kashi Vishwanath', 'Trimbakeshwar', 'Baidyanath',
          'Nageshwar', 'Rameshwaram', 'Grishneshwar'
        ];
        return jyotirlingas.some((j) => site.name.toLowerCase().includes(j.toLowerCase()));
      }
      if (activeCategory === 'SOUTH') {
        const southStates = ['Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Karnataka', 'Telangana'];
        return southStates.some((st) => (site.state || '').includes(st)) ||
          site.name.includes('Tirupati') || site.name.includes('Meenakshi') || site.name.includes('Sabarimala');
      }
      if (activeCategory === 'HERITAGE') {
        return (
          site.name.includes('Ayodhya') ||
          site.name.includes('Golden Temple') ||
          site.name.includes('Puri') ||
          site.name.includes('Jagannath') ||
          site.name.includes('Shirdi') ||
          site.name.includes('Kamakhya')
        );
      }
      return true;
    }).sort((a, b) => {
      const dA = densityMap[a.id]?.occupancy_percentage || 0;
      const dB = densityMap[b.id]?.occupancy_percentage || 0;
      if (sortBy === 'OCCUPANCY_ASC') return dA - dB;
      if (sortBy === 'OCCUPANCY_DESC') return dB - dA;
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [sites, searchQuery, activeCategory, sortBy, densityMap]);

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectAndNavigate = (siteId) => {
    onSelectSite(siteId);
    onOpenDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="landing-page-root">
      {/* =========================================================================
          SECTION 1: HERO SECTION
          ========================================================================= */}
      <section className="landing-hero-section">
        <div className="hero-backdrop-gradient"></div>
        <div className="hero-pattern-overlay"></div>

        <div className="landing-container hero-grid">
          {/* Left: Hero Copy & CTAs */}
          <div className="hero-content">
            <div className="hero-pill-badge">
              <span className="hero-pulse-dot"></span>
              <span className="hero-pill-text">AI CROWD GOVERNANCE • SMART INDIA HACKATHON</span>
            </div>

            <h1 className="hero-title">
              Smarter Journeys. <br />
              <span className="hero-title-highlight">Safer Destinations.</span>
            </h1>

            <p className="hero-subtitle">
              YatraSetu empowers millions of pilgrims and tourists across India’s most sacred shrines
              with real-time computer vision crowd telemetry, predictive queue forecasts, gamified
              route redistribution, and instant emergency SOS response.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-primary-hero"
                onClick={onOpenDashboard}
                title="Launch Live Pilgrim Console"
              >
                <span className="btn-icon">⚡</span>
                <span>Open Live Pilgrim Console</span>
              </button>

              <button
                type="button"
                className="btn-secondary-hero"
                onClick={() => scrollToSection('smart-destinations')}
                title="Explore All 25 Connected Shrines"
              >
                <span>Explore 25+ Shrines</span>
                <span className="btn-arrow">↓</span>
              </button>
            </div>

            {/* Quick Hero Features Ticker */}
            <div className="hero-trust-chips">
              <div className="trust-chip">
                <span className="chip-icon">👁️</span>
                <span>Vision AI Headcount</span>
              </div>
              <div className="trust-chip">
                <span className="chip-icon">⏳</span>
                <span>3-Hr Surge Prediction</span>
              </div>
              <div className="trust-chip">
                <span className="chip-icon">🪙</span>
                <span>Green Punya Rewards</span>
              </div>
              <div className="trust-chip">
                <span className="chip-icon">🚨</span>
                <span>1-Click Distress SOS</span>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Crowd Telemetry Widget */}
          <div className="hero-visual-col">
            <div className="hero-telemetry-card">
              {/* Card Header with Live Badge */}
              <div className="telemetry-card-header">
                <div className="telemetry-live-tag">
                  <span className="radar-ping"></span>
                  <span className="live-text">LIVE VISION TELEMETRY</span>
                </div>
                <div className="cctv-code-tag">CAM-HD-04</div>
              </div>

              {/* Quick Shrine Selector Tabs */}
              <div className="hero-shrine-selector-tabs">
                {(heroShuffledSites.length > 0 ? heroShuffledSites : sites.slice(0, 5)).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`hero-tab-btn ${s.id === activeHeroSite.id ? 'active' : ''}`}
                    onClick={() => {
                      setHeroSiteId(s.id);
                      onSelectSite(s.id);
                    }}
                  >
                    {s.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Shrine Meta & Imagery */}
              <div className="hero-shrine-preview">
                <div className="shrine-thumb-wrapper">
                  <img
                    src={activeHeroSite.image || getShrineImage(activeHeroSite.id)}
                    alt={activeHeroSite.name}
                    className="shrine-thumb-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getShrineImage(activeHeroSite.id);
                    }}
                  />
                  <div className="shrine-thumb-gradient"></div>
                  <div className="shrine-thumb-details">
                    <h3 className="preview-shrine-name">{activeHeroSite.name}</h3>
                    <p className="preview-shrine-city">📍 {activeHeroSite.city || activeHeroSite.state}</p>
                  </div>
                </div>
              </div>

              {/* Real-time Telemetry Metrics Grid */}
              <div className="hero-metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">CURRENT HEADCOUNT</span>
                  <span className="metric-value">
                    {(heroDensity.people_count || 4820).toLocaleString()}
                  </span>
                  <span className="metric-sub">People in Sanctum</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">OCCUPANCY LEVEL</span>
                  <div className="metric-occupancy-row">
                    <span className="metric-value-pct">{heroOccupancy}%</span>
                    <span
                      className="status-pill-chip"
                      style={{
                        backgroundColor: heroStatusTheme.bg,
                        color: heroStatusTheme.text,
                        borderColor: heroStatusTheme.border
                      }}
                    >
                      <span className="chip-dot" style={{ backgroundColor: heroStatusTheme.dot }}></span>
                      {heroStatusTheme.label}
                    </span>
                  </div>
                  {/* Gauge Bar */}
                  <div className="hero-gauge-track">
                    <div
                      className="hero-gauge-fill"
                      style={{
                        width: `${Math.min(100, Math.max(5, heroOccupancy))}%`,
                        backgroundColor: heroStatusTheme.dot
                      }}
                    ></div>
                  </div>
                </div>

                <div className="metric-box">
                  <span className="metric-label">ESTIMATED WAIT</span>
                  <span className="metric-value highlight-wait">
                    {heroDensity.wait_time_minutes || 35} mins
                  </span>
                  <span className="metric-sub">Fast-Track Queues Active</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">SAFE MAX CAPACITY</span>
                  <span className="metric-value">
                    {(activeHeroSite.capacity || 13000).toLocaleString()}
                  </span>
                  <span className="metric-sub">Threshold Monitored</span>
                </div>
              </div>

              {/* Action Button: Jump to Live Dashboard */}
              <button
                type="button"
                className="btn-card-telemetry-launch"
                onClick={() => handleSelectAndNavigate(activeHeroSite.id)}
              >
                <span>Inspect in Live Pilgrim Console</span>
                <span className="arrow-launch">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Trust & High-Impact Metric Counters */}
        <div className="landing-container">
          <div className="hero-stats-banner">
            <div className="stat-card">
              <div className="stat-number">25+</div>
              <div className="stat-title">Pilgrimage Shrines</div>
              <div className="stat-desc">Full telemetry & capacity mapping across 14 Indian states</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <div className="stat-number">&lt; 3 sec</div>
              <div className="stat-title">Real-Time Refresh</div>
              <div className="stat-desc">Low-latency queue polling & computer vision vector updates</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <div className="stat-number">30–35%</div>
              <div className="stat-title">Target Load Redistribution</div>
              <div className="stat-desc">Designed to target up to 30–35% peak load redistribution</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <div className="stat-number">1-Click</div>
              <div className="stat-title">Instant SOS Broadcast</div>
              <div className="stat-desc">One-Tap 112/108 Emergency Helpline Linkage</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: LIVE CROWD INTELLIGENCE (4 Core Modules)
          ========================================================================= */}
      <section id="crowd-intelligence" className="landing-section bg-subtle">
        <div className="landing-container">
          <div className="section-header-center">
            <div className="section-eyebrow">AI SURVEILLANCE & TELEMETRY</div>
            <h2 className="section-title">Know the Crowd Before You Arrive</h2>
            <p className="section-description">
              YatraSetu blends computer vision models, queue-theory analytics, and dynamic
              pilgrim advisories to transform chaotic temple rushes into safe, serene spiritual experiences.
            </p>
          </div>

          <div className="intel-grid-4">
            {/* Card 1: Real-time Crowd Density */}
            <div className="intel-card">
              <div className="intel-icon-bubble saffron">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="intel-title">Real-Time Crowd Density</h3>
              <p className="intel-text">
                Continuous edge-vision headcount estimates total sanctum population against strict safe structural
                capacities, warning of sudden compression risks.
              </p>
              <ul className="intel-feature-list">
                <li>✓ Sub-second YOLO headcount inference</li>
                <li>✓ Percentage safe capacity calculation</li>
                <li>✓ 4-tier risk categorization (Normal to Critical)</li>
              </ul>
            </div>

            {/* Card 2: AI Queue & Wait Forecast */}
            <div className="intel-card">
              <div className="intel-icon-bubble indigo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 className="intel-title">Predictive Queue Forecast</h3>
              <p className="intel-text">
                Multi-factor machine learning models predict waiting times across the next 3 hours based on historical
                aarti rushes, weather conditions, and darshan flow rates.
              </p>
              <ul className="intel-feature-list">
                <li>✓ 3-Hour advance rush curve prediction</li>
                <li>✓ Normal vs. current waiting delta metrics</li>
                <li>✓ Recommended off-peak darshan windows</li>
              </ul>
            </div>

            {/* Card 3: Dynamic Safety Alerts */}
            <div className="intel-card">
              <div className="intel-icon-bubble crimson">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 className="intel-title">Dynamic Safety & Hazard Alerts</h3>
              <p className="intel-text">
                Instant hazard detection flags bottlenecks, severe mountain weather, landslide advisories, and sudden
                chokepoints before dangerous stampedes occur.
              </p>
              <ul className="intel-feature-list">
                <li>✓ Stampede risk telemetry & pacing triggers</li>
                <li>✓ Integrated mountain meteorological advisories</li>
                <li>✓ Direct evacuation corridor broadcasts</li>
              </ul>
            </div>

            {/* Card 4: Alternate Route Redistribution */}
            <div className="intel-card">
              <div className="intel-icon-bubble emerald">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16 8l-8 8"></path>
                  <path d="M8 8v8h8"></path>
                </svg>
              </div>
              <h3 className="intel-title">Gamified Flow Redistribution</h3>
              <p className="intel-text">
                Pilgrims are gently guided toward peaceful sister temples and off-peak routes with rewarded Green
                Pilgrim Punya Points redeemable at local vetted bazaars.
              </p>
              <ul className="intel-feature-list">
                <li>✓ Smart nearby shrine recommendations</li>
                <li>✓ +25 Punya Points on arrival verification</li>
                <li>✓ Boosts local temple town economies</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: HOW YATRASETU WORKS (5-Stage Architecture Pipeline)
          ========================================================================= */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-container">
          <div className="section-header-center">
            <div className="section-eyebrow">HIGH-TECH ARCHITECTURE</div>
            <h2 className="section-title">How YatraSetu Works</h2>
            <p className="section-description">
              An end-to-end edge-to-cloud intelligence pipeline engineered for high-concurrency,
              fail-safe reliability, and rapid emergency intervention.
            </p>
          </div>

          <div className="pipeline-flow-wrapper">
            <div className="pipeline-steps-grid">
              {/* Step 1 */}
              <div className="pipeline-step-card">
                <div className="step-badge">STAGE 01</div>
                <div className="step-icon-box">📹</div>
                <h4 className="step-title">Vision & IoT Ingestion</h4>
                <p className="step-desc">
                  RTSP camera feeds, entry turnstiles, and drone surveys capture real-time footage from key shrine corridors.
                </p>
                <div className="step-tech-tag">RTSP • IP-CCTV • BLE</div>
              </div>

              {/* Arrow Connector */}
              <div className="step-connector-arrow">➔</div>

              {/* Step 2 */}
              <div className="pipeline-step-card">
                <div className="step-badge">STAGE 02</div>
                <div className="step-icon-box">🧠</div>
                <h4 className="step-title">Edge AI Inference</h4>
                <p className="step-desc">
                  Optimized Ultralytics YOLO Vision AI models process frames locally at the temple edge to count visitors and measure flow velocity.
                </p>
                <div className="step-tech-tag">YOLOv8 • Edge TPU</div>
              </div>

              {/* Arrow Connector */}
              <div className="step-connector-arrow">➔</div>

              {/* Step 3 */}
              <div className="pipeline-step-card">
                <div className="step-badge">STAGE 03</div>
                <div className="step-icon-box">⚡</div>
                <h4 className="step-title">FastAPI Analytics Core</h4>
                <p className="step-desc">
                  High-throughput REST engine calculates safe capacity percentages, queue wait estimates, and bottleneck probabilities.
                </p>
                <div className="step-tech-tag">FastAPI • Python • Uvicorn</div>
              </div>

              {/* Arrow Connector */}
              <div className="step-connector-arrow">➔</div>

              {/* Step 4 */}
              <div className="pipeline-step-card">
                <div className="step-badge">STAGE 04</div>
                <div className="step-icon-box">🔮</div>
                <h4 className="step-title">Predictive Surge Engine</h4>
                <p className="step-desc">
                  Machine learning models generate 3-hour crowd forecasts, evaluating weather and darshan schedules to prevent surges.
                </p>
                <div className="step-tech-tag">ML Time-Series • Queuing</div>
              </div>

              {/* Arrow Connector */}
              <div className="step-connector-arrow">➔</div>

              {/* Step 5 */}
              <div className="pipeline-step-card highlight-step">
                <div className="step-badge">STAGE 05</div>
                <div className="step-icon-box">📱</div>
                <h4 className="step-title">Multi-Stakeholder Action</h4>
                <p className="step-desc">
                  Pilgrims get alternate routes & SOS; District Police get command heatmaps; Local Vendors receive footfall demand forecasts.
                </p>
                <div className="step-tech-tag">React • REST Telemetry • Auto-Polling</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: SMART DESTINATIONS (Real 25 Shrines Showcase)
          ========================================================================= */}
      <section id="smart-destinations" className="landing-section bg-subtle">
        <div className="landing-container">
          <div className="section-header-center">
            <div className="section-eyebrow">SACRED NETWORK</div>
            <h2 className="section-title">Connected Smart Destinations</h2>
            <p className="section-description">
              Live crowd telemetry, capacity metrics, and queue pacing across 25 of India’s most revered pilgrimage hubs.
            </p>
          </div>

          {/* Search, Category Filters, and Sort Controls */}
          <div className="destinations-toolbar">
            <div className="search-box-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search shrine, city, or state (e.g. Kedarnath, Varanasi, Tirupati)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-tabs-wrapper">
              <button
                type="button"
                className={`filter-tab ${activeCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveCategory('ALL')}
              >
                All Shrines ({sites.length})
              </button>
              <button
                type="button"
                className={`filter-tab ${activeCategory === 'CHARDHAM' ? 'active' : ''}`}
                onClick={() => setActiveCategory('CHARDHAM')}
              >
                Char Dham & Himalayas
              </button>
              <button
                type="button"
                className={`filter-tab ${activeCategory === 'JYOTIRLINGA' ? 'active' : ''}`}
                onClick={() => setActiveCategory('JYOTIRLINGA')}
              >
                Sacred Jyotirlingas
              </button>
              <button
                type="button"
                className={`filter-tab ${activeCategory === 'SOUTH' ? 'active' : ''}`}
                onClick={() => setActiveCategory('SOUTH')}
              >
                South Indian Shrines
              </button>
              <button
                type="button"
                className={`filter-tab ${activeCategory === 'HERITAGE' ? 'active' : ''}`}
                onClick={() => setActiveCategory('HERITAGE')}
              >
                Heritage & Cultural
              </button>
            </div>

            <div className="sort-dropdown-wrapper">
              <label htmlFor="sort-select" className="sort-label">Sort:</label>
              <select
                id="sort-select"
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="DEFAULT">Recommended</option>
                <option value="OCCUPANCY_ASC">Least Crowded First</option>
                <option value="OCCUPANCY_DESC">Most Crowded First</option>
                <option value="NAME_ASC">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Destinations Grid */}
          <div className="destinations-grid">
            {filteredSites.length > 0 ? (
              filteredSites.map((site) => {
                const density = densityMap[site.id] || {};
                const count = density.people_count || 0;
                const capacity = site.capacity || 10000;
                const occ = Math.round(density.occupancy_percentage ?? (count / capacity) * 100);
                const status = density.status || (occ < 50 ? 'NORMAL' : occ < 75 ? 'MODERATE' : occ < 90 ? 'HIGH' : 'CRITICAL');
                const theme = getStatusColor(status);
                const waitTime = density.wait_time_minutes || (status === 'CRITICAL' ? 120 : status === 'HIGH' ? 75 : status === 'MODERATE' ? 45 : 20);

                return (
                  <div key={site.id} className="shrine-card">
                    {/* Card Image Banner */}
                    <div className="shrine-card-image-wrap">
                      <img
                        src={site.image || getShrineImage(site.id)}
                        alt={site.name}
                        className="shrine-card-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getShrineImage(site.id);
                        }}
                      />
                      <div className="shrine-card-gradient"></div>

                      <div
                        className="shrine-card-status-badge"
                        style={{
                          backgroundColor: theme.bg,
                          color: theme.text,
                          borderColor: theme.border
                        }}
                      >
                        <span className="badge-pulse-dot" style={{ backgroundColor: theme.dot }}></span>
                        <span>{theme.label}</span>
                      </div>

                      <div className="shrine-card-state-chip">
                        📍 {site.state || 'India'}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="shrine-card-body">
                      <h3 className="shrine-card-title">{site.name}</h3>
                      <p className="shrine-card-city">{site.city || site.state}</p>

                      {/* Live Telemetry Mini Grid */}
                      <div className="shrine-card-metrics">
                        <div className="shrine-metric-item">
                          <span className="s-metric-label">Occupancy</span>
                          <span className="s-metric-val">{occ}%</span>
                        </div>
                        <div className="shrine-metric-item">
                          <span className="s-metric-label">Est. Wait</span>
                          <span className="s-metric-val">{waitTime}m</span>
                        </div>
                        <div className="shrine-metric-item">
                          <span className="s-metric-label">Safe Cap</span>
                          <span className="s-metric-val">{(capacity / 1000).toFixed(0)}k</span>
                        </div>
                      </div>

                      {/* Occupancy Progress Bar */}
                      <div className="shrine-card-progress-track">
                        <div
                          className="shrine-card-progress-bar"
                          style={{
                            width: `${Math.min(100, Math.max(5, occ))}%`,
                            backgroundColor: theme.dot
                          }}
                        ></div>
                      </div>

                      {/* Card Action Button */}
                      <button
                        type="button"
                        className="btn-shrine-inspect"
                        onClick={() => handleSelectAndNavigate(site.id)}
                        title={`Open live telemetry and safety advisory for ${site.name}`}
                      >
                        <span>View Live Telemetry</span>
                        <span className="btn-arrow">→</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-destinations-fallback">
                <p className="no-dest-title">No pilgrimage destinations matched your search.</p>
                <p className="no-dest-sub">Try searching with a different temple name, or clear the category filters.</p>
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('ALL');
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: ROLE-BASED PLATFORM (Who is YatraSetu for?)
          ========================================================================= */}
      <section id="roles" className="landing-section">
        <div className="landing-container">
          <div className="section-header-center">
            <div className="section-eyebrow">UNIFIED ECOSYSTEM</div>
            <h2 className="section-title">Engineered for Every Stakeholder</h2>
            <p className="section-description">
              Bridging the gap between individual spiritual seekers, municipal governance,
              temple administrations, and the local hospitality economy.
            </p>
          </div>

          <div className="roles-grid-4">
            {/* Role 1: Tourists & Pilgrims */}
            <div className="role-card">
              <div className="role-icon-box saffron">🕉️</div>
              <h3 className="role-title">Pilgrims & Tourists</h3>
              <p className="role-description">
                Experience serene darshan with stress-free queue insights, digital identity protection, and rewards for eco-friendly choices.
              </p>
              <ul className="role-benefit-list">
                <li>• Real-time crowd heatmaps & queue wait estimates</li>
                <li>• Aadhaar-linked Digital Yatri Suraksha Card</li>
                <li>• Green Pilgrim Punya Wallet & local coupons</li>
                <li>• 1-Click Instant Distress SOS broadcast</li>
              </ul>
              <button
                type="button"
                className="role-action-link"
                onClick={onOpenDashboard}
              >
                Open Pilgrim Experience →
              </button>
            </div>

            {/* Role 2: Temple Admin & Police */}
            <div className="role-card">
              <div className="role-icon-box indigo">🏛️</div>
              <h3 className="role-title">Temple Administration & Police</h3>
              <p className="role-description">
                Automated computer vision surveillance giving district magistrates and security forces real-time crowd control command.
              </p>
              <ul className="role-benefit-list">
                <li>• Computer vision headcount & surge prediction</li>
                <li>• Automated bottleneck & stampede hazard triggers</li>
                <li>• Barricade pacing & queue corridor balancing</li>
                <li>• Live incident locator & One-Tap 112/108 Emergency Helpline Linkage</li>
              </ul>
              <button
                type="button"
                className="role-action-link"
                onClick={onOpenDashboard}
              >
                Inspect Command Telemetry →
              </button>
            </div>

            {/* Role 3: Local Hoteliers & Vendors */}
            <div className="role-card">
              <div className="role-icon-box emerald">🏪</div>
              <h3 className="role-title">Local Hoteliers & Vendors</h3>
              <p className="role-description">
                Redistributing tourist footfall into sister towns and empowering local artisans, dhabas, and dharmashalas with predictable demand.
              </p>
              <ul className="role-benefit-list">
                <li>• Surge demand forecasting for inventory planning</li>
                <li>• Vocal for Local temple bazaar promotion</li>
                <li>• Punya Point voucher redemption system</li>
                <li>• Equitable business distribution across town</li>
              </ul>
              <button
                type="button"
                className="role-action-link"
                onClick={onOpenAuth}
              >
                Register Local Business →
              </button>
            </div>

            {/* Role 4: Tour Operators & Yatra Dals */}
            <div className="role-card">
              <div className="role-icon-box gold">🚍</div>
              <h3 className="role-title">Travel & Tour Operators</h3>
              <p className="role-description">
                Coordinated fleet scheduling, group member accountability, and optimized travel itineraries that bypass regional traffic chokeholds.
              </p>
              <ul className="role-benefit-list">
                <li>• Real-time Yatra Dal group tracking & geofencing</li>
                <li>• Missing family member alert broadcasts</li>
                <li>• Smart off-peak arrival slot coordination</li>
                <li>• Integrated mountain weather & road closures</li>
              </ul>
              <button
                type="button"
                className="role-action-link"
                onClick={onOpenDashboard}
              >
                View Yatra Dal Tracker →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: SAFETY, EMERGENCY & DISASTER PREPAREDNESS
          ========================================================================= */}
      <section id="safety" className="landing-section bg-safety-accent">
        <div className="landing-container">
          <div className="safety-section-grid">
            {/* Left Column: Safety Information */}
            <div className="safety-info-col">
              <div className="safety-pill-tag">CIVIC SAFETY PROTOCOLS</div>
              <h2 className="safety-main-title">
                1-Click Instant SOS Response When Seconds Count
              </h2>
              <p className="safety-main-desc">
                High-altitude treks, sacred river ghats, and congested sanctums demand fail-safe security.
                YatraSetu integrates One-Tap 112/108 Emergency Helpline Linkage with GPS coordinate broadcasts.
              </p>

              <div className="safety-features-list">
                <div className="safety-feat-item">
                  <div className="s-feat-icon">🔴</div>
                  <div className="s-feat-body">
                    <h4 className="s-feat-title">1-Click Instant Distress SOS</h4>
                    <p className="s-feat-desc">
                      No nested menus or delay countdowns. Choose emergency type (Medical, Stampede, Landslide, Missing Person) and broadcast immediately.
                    </p>
                  </div>
                </div>

                <div className="safety-feat-item">
                  <div className="s-feat-icon">📍</div>
                  <div className="s-feat-body">
                    <h4 className="s-feat-title">Automated GPS Geofencing</h4>
                    <p className="s-feat-desc">
                      Pinpoint coordinates sent instantaneously to the nearest temple safety outpost, mountain patrol, and medical triage station.
                    </p>
                  </div>
                </div>

                <div className="safety-feat-item">
                  <div className="s-feat-icon">📞</div>
                  <div className="s-feat-body">
                    <h4 className="s-feat-title">Unified Emergency Network</h4>
                    <p className="s-feat-desc">
                      One-Tap 112/108 Emergency Helpline Linkage with Disaster Management (1070).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive SOS Trigger Card */}
            <div className="safety-card-col">
              <div className="sos-banner-card">
                <div className="sos-card-header">
                  <div className="sos-signal-dot"></div>
                  <span className="sos-live-label">EMERGENCY NETWORK STANDBY</span>
                </div>

                <h3 className="sos-card-title">Need Immediate Help at a Shrine?</h3>
                <p className="sos-card-text">
                  If you or someone around you faces medical distress, crowd crush, or a terrain hazard,
                  trigger the high-priority beacon immediately.
                </p>

                <div className="sos-action-wrapper">
                  <button
                    type="button"
                    className="sos-big-trigger-btn"
                    onClick={onOpenSOS}
                    title="Open Instant Distress SOS Modal"
                  >
                    <span className="sos-glow-ring"></span>
                    <span className="sos-pulse-waves"></span>
                    <span className="sos-inner-label">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      TRIGGER DISTRESS SOS
                    </span>
                  </button>
                </div>

                <div className="emergency-quick-contacts">
                  <div className="contact-chip">
                    <span className="contact-label">Police</span>
                    <span className="contact-num">112</span>
                  </div>
                  <div className="contact-chip">
                    <span className="contact-label">Ambulance</span>
                    <span className="contact-num">108</span>
                  </div>
                  <div className="contact-chip">
                    <span className="contact-label">Disaster / SDRF</span>
                    <span className="contact-num">1070</span>
                  </div>
                  <div className="contact-chip">
                    <span className="contact-label">Women Helpline</span>
                    <span className="contact-num">1090</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: ECONOMIC & SMART-CITY IMPACT (6 Pillars)
          ========================================================================= */}
      <section id="impact" className="landing-section">
        <div className="landing-container">
          <div className="section-header-center">
            <div className="section-eyebrow">NATION BUILDING & SMART TOURISM</div>
            <h2 className="section-title">Economic & Civic Impact</h2>
            <p className="section-description">
              How YatraSetu transforms municipal crowd bottlenecks into distributed economic vitality and sustainable tourism.
            </p>
          </div>

          <div className="impact-grid-6">
            <div className="impact-card">
              <div className="impact-num">01</div>
              <h4 className="impact-title">Footfall Redistribution</h4>
              <p className="impact-desc">
                Designed to target up to 30–35% peak load redistribution away from fragile sanctums like Kedarnath to nearby sacred sister shrines.
              </p>
            </div>

            <div className="impact-card">
              <div className="impact-num">02</div>
              <h4 className="impact-title">Transit Load Smoothing</h4>
              <p className="impact-desc">
                Balances public bus, ropeway, and shuttle schedules against real-time queue demand, preventing highway gridlocks.
              </p>
            </div>

            <div className="impact-card">
              <div className="impact-num">03</div>
              <h4 className="impact-title">Vocal for Local Bazaars</h4>
              <p className="impact-desc">
                Channels pilgrim expenditure to verified local handicraft makers, prasad vendors, and family-run dhabas through digital coupons.
              </p>
            </div>

            <div className="impact-card">
              <div className="impact-num">04</div>
              <h4 className="impact-title">Dignified Darshan Flow</h4>
              <p className="impact-desc">
                Reduces exhausting 6-hour wait times in harsh weather down to structured, dignified darshan slots with live queue transparency.
              </p>
            </div>

            <div className="impact-card">
              <div className="impact-num">05</div>
              <h4 className="impact-title">Hospitality Capacity Balance</h4>
              <p className="impact-desc">
                Prevents extortionate room surges in core shrine hubs by promoting vetted dharmashalas and homestays in satellite valley towns.
              </p>
            </div>

            <div className="impact-card">
              <div className="impact-num">06</div>
              <h4 className="impact-title">Eco-Friendly Pilgrimage</h4>
              <p className="impact-desc">
                Incentivizes plastic-free travel, walking routes, and clean yatra practices with redeemable Green Pilgrim Punya Points.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: FINAL CALL TO ACTION (CTA BANNER)
          ========================================================================= */}
      <section className="landing-cta-banner-section">
        <div className="landing-container">
          <div className="cta-banner-card">
            <div className="cta-bg-glow"></div>
            <div className="cta-content">
              <div className="cta-sparkle-pill">✨ READY FOR YOUR PILGRIMAGE</div>
              <h2 className="cta-headline">Experience Tourism, Smarter. Safer. Serene.</h2>
              <p className="cta-subtext">
                Explore real-time crowd heatmaps, verify your Digital Yatri Card, or monitor India’s 25
                sacred pilgrimage hubs right now.
              </p>

              <div className="cta-buttons-row">
                <button
                  type="button"
                  className="btn-cta-launch-dashboard"
                  onClick={onOpenDashboard}
                >
                  <span className="cta-icon">⚡</span>
                  <span>Launch Live Pilgrim Console</span>
                </button>

                <button
                  type="button"
                  className="btn-cta-auth"
                  onClick={onOpenAuth}
                >
                  <span>🪪 {currentUser ? 'Manage Digital Yatri Card' : 'Sign In / Link Aadhaar'}</span>
                </button>
              </div>

              <div className="cta-guarantee-row">
                <span>🛡️ Ministry of Tourism Ready</span>
                <span>•</span>
                <span>🔒 Privacy-Preserving Computer Vision</span>
                <span>•</span>
                <span>🇮🇳 Made for Smart India Hackathon</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
