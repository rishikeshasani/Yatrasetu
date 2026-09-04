import { useState, useMemo } from 'react';

export default function SiteSelector({ sites, selectedSiteId, onSelectSite, densityMap }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isExpanded, setIsExpanded] = useState(false);

  // Active Shrine details for compact hero strip
  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0] || null;
  const selectedDensity = (selectedSite && densityMap[selectedSite.id]) || { status: 'NORMAL', occupancy_percentage: 0 };
  const selectedStatusClass = `status-${(selectedDensity.status || 'NORMAL').toLowerCase()}`;

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.city && site.city.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'CHARDHAM') {
        return site.name.includes('Kedarnath') || site.name.includes('Badrinath') || site.name.includes('Gangotri') || site.name.includes('Yamunotri');
      }
      if (activeFilter === 'HIGH_DENSITY') {
        const d = densityMap[site.id];
        return d && (d.status === 'HIGH' || d.status === 'CRITICAL');
      }
      if (activeFilter === 'SAFE') {
        const d = densityMap[site.id];
        return d && (d.status === 'NORMAL' || d.status === 'MODERATE');
      }
      return true;
    });
  }, [sites, searchTerm, activeFilter, densityMap]);

  const handleCardSelect = (siteId) => {
    onSelectSite(siteId);
    setIsExpanded(false);
  };

  return (
    <section className={`site-selector-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      {/* 1. COMPACT "CURRENTLY MONITORING" HERO STRIP (Default Visible State) */}
      <div className="selector-compact-strip">
        {/* Left Side: Active Destination Telemetry Meta */}
        <div className="active-shrine-meta-wrap">
          <div className="active-shrine-icon-box">
            <span className="active-shrine-om">🕉️</span>
            <span className="live-radar-dot" title="Live Surveillance Telemetry Active"></span>
          </div>

          <div className="active-shrine-text">
            <div className="active-label-row">
              <span className="active-monitoring-tag">CURRENTLY MONITORING</span>
              <span className={`status-badge-chip ${selectedStatusClass}`}>
                <span className="badge-bullet"></span>
                {selectedDensity.status || 'NORMAL'}
              </span>
              <span className="occupancy-mini-pill active-occupancy-pill">
                {selectedDensity.occupancy_percentage}% Full
              </span>
              {selectedSite?.capacity && (
                <span className="active-capacity-pill desktop-only">
                  Safe Cap: <strong>{selectedSite.capacity.toLocaleString()}</strong>
                </span>
              )}
            </div>

            <div className="active-title-row">
              <h2 className="active-shrine-heading">{selectedSite?.name || 'Select a Destination'}</h2>
              <span className="active-shrine-loc">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {selectedSite?.city || selectedSite?.state || 'Sacred Destination'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Search & Expand Toggle Button */}
        <div className="selector-compact-controls">
          <div className="search-box compact-search-box">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search 27 shrines..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isExpanded && e.target.value) setIsExpanded(true);
              }}
              onFocus={() => {
                if (searchTerm && !isExpanded) setIsExpanded(true);
              }}
              className="search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className={`browse-shrines-btn ${isExpanded ? 'active-expanded' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Destination Drawer' : 'Browse All Pilgrimage Shrines'}
          >
            <span className="browse-btn-icon">🏛️</span>
            <span className="browse-btn-text">
              {isExpanded ? 'Collapse' : `Browse All Shrines (${sites.length})`}
            </span>
            <span className={`chevron-arrow ${isExpanded ? 'rotated' : ''}`}>▼</span>
          </button>
        </div>
      </div>

      {/* 2. EXPANDABLE DRAWER: FILTERS & FULL DESTINATION GRID */}
      <div className={`selector-drawer ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="selector-drawer-inner">
          <div className="drawer-divider"></div>

          {/* Filter Chips & Count Header */}
          <div className="drawer-header-row">
            <div className="filter-chips-row">
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveFilter('ALL')}
              >
                All Holy Shrines ({sites.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'CHARDHAM' ? 'active' : ''}`}
                onClick={() => setActiveFilter('CHARDHAM')}
              >
                🏔️ Char Dham Route
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'HIGH_DENSITY' ? 'active' : ''}`}
                onClick={() => setActiveFilter('HIGH_DENSITY')}
              >
                ⚠️ High Rush Alert
              </button>
              <button
                type="button"
                className={`filter-chip ${activeFilter === 'SAFE' ? 'active' : ''}`}
                onClick={() => setActiveFilter('SAFE')}
              >
                ✨ Peaceful / Low Wait
              </button>
            </div>

            <span className="drawer-count-info">
              Showing <strong>{filteredSites.length}</strong> of {sites.length} pilgrimage spots
            </span>
          </div>

          {/* Destination Cards Grid */}
          <div className="sites-grid">
            {filteredSites.map((site) => {
              const isSelected = site.id === selectedSiteId;
              const density = densityMap[site.id] || { status: 'NORMAL', occupancy_percentage: 0 };
              const statusClass = `status-${(density.status || 'NORMAL').toLowerCase()}`;

              return (
                <button
                  key={site.id}
                  type="button"
                  className={`site-card-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleCardSelect(site.id)}
                >
                  <div className="site-card-top">
                    <span className={`status-badge-chip ${statusClass}`}>
                      <span className="badge-bullet"></span>
                      {density.status}
                    </span>
                    <span className="occupancy-mini-pill">
                      {density.occupancy_percentage}% Full
                    </span>
                  </div>

                  <div className="site-card-body">
                    <h3 className="site-card-name">{site.name}</h3>
                    <p className="site-card-location">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {site.city || site.state || 'India'}
                    </p>
                  </div>

                  <div className="site-card-footer">
                    <span className="capacity-stat">
                      Safe Cap: <strong>{site.capacity ? site.capacity.toLocaleString() : 'N/A'}</strong>
                    </span>
                    <span className="view-details-arrow">
                      {isSelected ? 'Selected ✓' : 'Monitor →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Collapse Drawer Footer */}
          <div className="drawer-footer-row">
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setIsExpanded(false)}
            >
              ▲ Collapse Shrines Drawer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
