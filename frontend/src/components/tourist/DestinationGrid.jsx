import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DestinationCard from './DestinationCard';

export default function DestinationGrid({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  onViewDetails
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  const [sortBy, setSortBy] = useState('NAME'); // 'NAME' | 'LOWEST_CROWD' | 'HIGHEST_CROWD' | 'SHORTEST_WAIT'

  // Filter and Sort destinations
  const processedSites = useMemo(() => {
    return sites
      .filter((site) => {
        // Search matching
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          site.name?.toLowerCase().includes(term) ||
          site.city?.toLowerCase().includes(term) ||
          site.state?.toLowerCase().includes(term) ||
          site.id?.toLowerCase().includes(term);

        if (!matchesSearch) return false;

        // Status filter
        if (statusFilter === 'ALL') return true;
        const d = densityMap[site.id];
        const occ = d?.occupancy_percentage ?? 0;
        let st = d?.status || 'NORMAL';
        if (occ >= 90) st = 'CRITICAL';
        else if (occ >= 75) st = 'HIGH';
        else if (occ >= 50) st = 'MODERATE';
        else st = 'NORMAL';

        return st === statusFilter;
      })
      .sort((a, b) => {
        const da = densityMap[a.id];
        const db = densityMap[b.id];
        const occA = da?.occupancy_percentage ?? 0;
        const occB = db?.occupancy_percentage ?? 0;
        const waitA = da?.wait_time_minutes || Math.round((occA / 100) * 120);
        const waitB = db?.wait_time_minutes || Math.round((occB / 100) * 120);

        if (sortBy === 'LOWEST_CROWD') return occA - occB;
        if (sortBy === 'HIGHEST_CROWD') return occB - occA;
        if (sortBy === 'SHORTEST_WAIT') return waitA - waitB;
        // Default: NAME
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [sites, densityMap, searchTerm, statusFilter, sortBy]);

  return (
    <section className="tourist-destination-grid-section" id="tourist-destinations">
      <div className="grid-section-header">
        <div className="section-title-wrap">
          <div className="section-badge-pill">
            <span>🏛️</span> {t('grid.title')}
          </div>
          <p className="section-subtitle">{t('grid.subtitle')}</p>
        </div>

        {/* Controls: Search, Filter, Sort */}
        <div className="grid-controls-panel">
          {/* Search Box */}
          <div className="grid-search-box">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={t('grid.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="grid-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Status Pills */}
          <div className="grid-filter-pills-row">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              {t('grid.all')} ({sites.length})
            </button>
            <button
              type="button"
              className={`filter-pill pill-normal ${statusFilter === 'NORMAL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('NORMAL')}
            >
              {t('grid.normal')}
            </button>
            <button
              type="button"
              className={`filter-pill pill-moderate ${statusFilter === 'MODERATE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('MODERATE')}
            >
              {t('grid.moderate')}
            </button>
            <button
              type="button"
              className={`filter-pill pill-high ${statusFilter === 'HIGH' ? 'active' : ''}`}
              onClick={() => setStatusFilter('HIGH')}
            >
              {t('grid.high')}
            </button>
            <button
              type="button"
              className={`filter-pill pill-critical ${statusFilter === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CRITICAL')}
            >
              {t('grid.critical')}
            </button>
          </div>

          {/* Sort Selector */}
          <div className="grid-sort-wrap">
            <label htmlFor="grid-sort-select" className="sort-label">{t('grid.sortBy')}:</label>
            <select
              id="grid-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-dropdown"
            >
              <option value="NAME">{t('grid.sortName')}</option>
              <option value="LOWEST_CROWD">{t('grid.sortLowest')}</option>
              <option value="HIGHEST_CROWD">{t('grid.sortHighest')}</option>
              <option value="SHORTEST_WAIT">{t('grid.sortWait')}</option>
            </select>
          </div>
        </div>

        {/* Count Bar */}
        <div className="grid-count-bar">
          <span>
            {t('grid.showing')} <strong>{processedSites.length}</strong> {t('grid.ofShrines')}
          </span>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {processedSites.length > 0 ? (
        <div className="destinations-responsive-grid">
          {processedSites.map((site) => (
            <DestinationCard
              key={site.id}
              site={site}
              density={densityMap[site.id]}
              isSelected={site.id === selectedSiteId}
              onSelect={onSelectSite}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="grid-empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No destinations match your filters</h3>
          <p>Try searching with another keyword or resetting the crowd status filter.</p>
          <button
            type="button"
            className="btn-reset-filters"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
          >
            Show All 25 Shrines
          </button>
        </div>
      )}
    </section>
  );
}
