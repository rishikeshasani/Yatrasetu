import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DestinationCard from './DestinationCard';
import { getShrineCategory } from '../../utils/shrineImages';

const CIRCUITS = [
  { id: 'ALL', label: 'All Circuits', icon: '🏛️' },
  { id: 'Char Dham & Himalayas', label: 'Char Dham & Himalayas', icon: '🏔️' },
  { id: 'Sacred Jyotirlingas', label: 'Sacred Jyotirlingas', icon: '🔱' },
  { id: 'South Indian Shrines', label: 'South Indian Shrines', icon: '🛕' },
  { id: 'Heritage & Cultural', label: 'Heritage & Cultural', icon: '🏰' }
];

export default function DestinationGrid({
  sites = [],
  densityMap = {},
  selectedSiteId,
  onSelectSite,
  onViewDetails
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  const [sortBy, setSortBy] = useState('NAME'); // 'NAME' | 'LOWEST_CROWD' | 'HIGHEST_CROWD' | 'SHORTEST_WAIT'

  // Filter only canonical TS001 through TS025 shrines
  const canonicalSites = useMemo(() => {
    return sites.filter((site) => site?.id && /^TS\d{3}$/i.test(site.id));
  }, [sites]);

  // Dynamic circuit pill counts
  const circuitCounts = useMemo(() => {
    const counts = {
      ALL: canonicalSites.length,
      'Char Dham & Himalayas': 0,
      'Sacred Jyotirlingas': 0,
      'South Indian Shrines': 0,
      'Heritage & Cultural': 0
    };
    canonicalSites.forEach((site) => {
      const cat = site.category || getShrineCategory(site.id, site.name);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [canonicalSites]);

  // Dynamic crowd status counts matching total canonical sites
  const statusCounts = useMemo(() => {
    const counts = { ALL: canonicalSites.length, NORMAL: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    canonicalSites.forEach((s) => {
      const d = densityMap[s.id];
      let st = d?.status;
      if (!st) {
        const occ = d?.occupancy_percentage ?? 0;
        if (occ >= 90) st = 'CRITICAL';
        else if (occ >= 75) st = 'HIGH';
        else if (occ >= 50) st = 'MODERATE';
        else st = 'NORMAL';
      }
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return counts;
  }, [canonicalSites, densityMap]);

  // Filter and Sort destinations
  const processedSites = useMemo(() => {
    return canonicalSites
      .filter((site) => {
        // Circuit filter
        const category = site.category || getShrineCategory(site.id, site.name);
        if (selectedCircuit !== 'ALL' && category !== selectedCircuit) {
          return false;
        }

        // Search matching with safe string normalization
        const term = searchTerm.toLowerCase().trim();
        if (term) {
          const nameStr = String(site.name ?? '').toLowerCase();
          const cityStr = String(site.city ?? '').toLowerCase();
          const stateStr = String(site.state ?? '').toLowerCase();
          const idStr = String(site.id ?? '').toLowerCase();
          const catStr = String(category ?? '').toLowerCase();

          const matchesSearch =
            nameStr.includes(term) ||
            cityStr.includes(term) ||
            stateStr.includes(term) ||
            idStr.includes(term) ||
            catStr.includes(term);

          if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL') {
          const d = densityMap[site.id];
          let st = d?.status;
          if (!st) {
            const occ = d?.occupancy_percentage ?? 0;
            if (occ >= 90) st = 'CRITICAL';
            else if (occ >= 75) st = 'HIGH';
            else if (occ >= 50) st = 'MODERATE';
            else st = 'NORMAL';
          }
          if (st !== statusFilter) return false;
        }

        return true;
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
        return String(a.name ?? '').localeCompare(String(b.name ?? ''));
      });
  }, [canonicalSites, densityMap, searchTerm, selectedCircuit, statusFilter, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCircuit('ALL');
    setStatusFilter('ALL');
  };

  const isFiltered = searchTerm.trim() !== '' || selectedCircuit !== 'ALL' || statusFilter !== 'ALL';

  return (
    <section className="tourist-destination-grid-section" id="tourist-destinations">
      <div className="grid-section-header">
        <div className="section-title-wrap">
          <div className="section-badge-pill">
            <span>🏛️</span> {t('grid.title')}
          </div>
          <p className="section-subtitle">{t('grid.subtitle')}</p>
        </div>

        {/* Controls: Search, Circuit, Status, Sort */}
        <div className="grid-controls-panel">
          {/* Circuit Filter Tabs */}
          <div className="grid-circuit-tabs-row">
            {CIRCUITS.map((circuit) => (
              <button
                key={circuit.id}
                type="button"
                className={`circuit-tab-btn ${selectedCircuit === circuit.id ? 'active' : ''}`}
                onClick={() => setSelectedCircuit(circuit.id)}
              >
                <span>{circuit.icon}</span>
                <span>{circuit.label}</span>
                <span className="circuit-count">({circuitCounts[circuit.id] ?? 0})</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
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

            {/* Filter Status Pills with Real Dynamic Headcounts */}
            <div className="grid-filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                {t('grid.all')} ({statusCounts.ALL})
              </button>
              <button
                type="button"
                className={`filter-pill pill-normal ${statusFilter === 'NORMAL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('NORMAL')}
              >
                {t('grid.normal')} ({statusCounts.NORMAL})
              </button>
              <button
                type="button"
                className={`filter-pill pill-moderate ${statusFilter === 'MODERATE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('MODERATE')}
              >
                {t('grid.moderate')} ({statusCounts.MODERATE})
              </button>
              <button
                type="button"
                className={`filter-pill pill-high ${statusFilter === 'HIGH' ? 'active' : ''}`}
                onClick={() => setStatusFilter('HIGH')}
              >
                {t('grid.high')} ({statusCounts.HIGH})
              </button>
              <button
                type="button"
                className={`filter-pill pill-critical ${statusFilter === 'CRITICAL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CRITICAL')}
              >
                {t('grid.critical')} ({statusCounts.CRITICAL})
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
        </div>

        {/* Count Bar */}
        <div className="grid-count-bar">
          <span>
            {t('grid.showing')} <strong>{processedSites.length}</strong> {t('grid.ofShrines')}
          </span>
          {isFiltered && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
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
            onClick={handleResetFilters}
          >
            Show All 25 Shrines
          </button>
        </div>
      )}
    </section>
  );
}

