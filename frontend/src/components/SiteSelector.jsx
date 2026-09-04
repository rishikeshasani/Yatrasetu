import { useState, useMemo } from 'react';

export default function SiteSelector({ sites, selectedSiteId, onSelectSite, densityMap }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

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

  return (
    <section className="site-selector-card">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">
            <span className="title-icon">📍</span> Select Sacred Destination
          </h2>
          <p className="section-subtitle">Real-time crowd monitoring and queue telemetry across Indian pilgrimage hubs</p>
        </div>

        {/* Search Input */}
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search Shrine, City or State..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
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

      {/* Horizontal Carousel / Card Grid */}
      <div className="sites-grid">
        {filteredSites.map((site) => {
          const isSelected = site.id === selectedSiteId;
          const density = densityMap[site.id] || { status: 'NORMAL', occupancy_percentage: 0 };
          const statusClass = `status-${density.status.toLowerCase()}`;

          return (
            <button
              key={site.id}
              type="button"
              className={`site-card-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSite(site.id)}
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
    </section>
  );
}
