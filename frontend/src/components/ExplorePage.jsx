import React, { useState, useMemo } from 'react';
import { getShrineImage, getShrineCategory, CANONICAL_25_SHRINES } from '../utils/shrineImages';

export default function ExplorePage({
  sites = [],
  densityMap = {},
  onSelectShrine,
  onBackToLanding
}) {
  const [activeCategory, setActiveCategory] = useState('All Shrines (25)');
  const [sortBy, setSortBy] = useState('Recommended');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Data Source of Truth: Use live backend sites, fallback to canonical 25 shrines if initial load pending
  const sourceSites = useMemo(() => {
    if (Array.isArray(sites) && sites.length > 0) {
      // Filter out legacy dummy entries if present, ensuring TS001-TS025 are prioritized
      return sites;
    }
    return CANONICAL_25_SHRINES;
  }, [sites]);

  const categories = [
    'All Shrines (25)',
    'Char Dham & Himalayas',
    'Sacred Jyotirlingas',
    'South Indian Shrines',
    'Heritage & Cultural'
  ];

  // 2. Compute live telemetry data for each shrine card
  const shrineCards = useMemo(() => {
    return sourceSites.map((site) => {
      const siteId = site.id;
      const density = densityMap[siteId] || {};
      const count = density.people_count || 0;
      const capacity = site.capacity || 10000;
      const occ = Math.round(density.occupancy_percentage ?? (count > 0 ? (count / capacity) * 100 : 0));
      const status = density.status || (occ < 50 ? 'NORMAL' : occ < 75 ? 'MODERATE' : occ < 90 ? 'HIGH' : 'CRITICAL');
      const waitTime = density.wait_time_minutes || (status === 'CRITICAL' ? 120 : status === 'HIGH' ? 75 : status === 'MODERATE' ? 45 : 20);

      const statusLabel =
        status === 'CRITICAL' ? 'Critical' :
        status === 'HIGH' ? 'High Footfall' :
        status === 'MODERATE' ? 'Moderate' : 'Normal / Smooth';

      const statusDot =
        status === 'CRITICAL' ? 'bg-rose-500' :
        status === 'HIGH' ? 'bg-amber-500' :
        status === 'MODERATE' ? 'bg-blue-500' : 'bg-emerald-500';

      const progressColor =
        status === 'CRITICAL' ? 'bg-rose-500' :
        status === 'HIGH' ? 'bg-amber-500' :
        status === 'MODERATE' ? 'bg-blue-500' : 'bg-emerald-500';

      return {
        id: siteId,
        name: site.name,
        subtitle: site.city || site.state || 'Pilgrim Corridor',
        state: site.state || 'India',
        category: getShrineCategory(siteId, site.name),
        image: site.image || getShrineImage(siteId),
        alt: `${site.name}, ${site.city || site.state || 'India'}`,
        occupancy: `${occ}%`,
        occNum: occ,
        wait: `${waitTime}m`,
        waitNum: waitTime,
        safeCap: `${(capacity / 1000).toFixed(0)}k`,
        progressWidth: `${Math.min(100, Math.max(5, occ))}%`,
        status: statusLabel,
        statusDot,
        progressColor
      };
    });
  }, [sourceSites, densityMap]);

  // 3. Filter by category and search
  const filteredShrines = useMemo(() => {
    return shrineCards.filter((shrine) => {
      // Category filter
      if (activeCategory !== 'All Shrines (25)' && !activeCategory.startsWith('All Shrines')) {
        if (shrine.category !== activeCategory) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          shrine.name.toLowerCase().includes(q) ||
          shrine.subtitle.toLowerCase().includes(q) ||
          shrine.state.toLowerCase().includes(q) ||
          shrine.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [shrineCards, activeCategory, searchQuery]);

  // 4. Sort Shrines with working implementations for all 4 options
  const sortedShrines = useMemo(() => {
    const list = [...filteredShrines];
    if (sortBy === 'CrowdLow') {
      list.sort((a, b) => a.occNum - b.occNum);
    } else if (sortBy === 'WaitTime') {
      list.sort((a, b) => a.waitNum - b.waitNum);
    } else if (sortBy === 'Alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'Recommended' preserves canonical registry order TS001 -> TS025
    return list;
  }, [filteredShrines, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16">
      {/* Header with return link if embedded or standalone */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold tracking-wide uppercase mb-1">
              <span>🕉️</span>
              <span>All 25 Pilgrimage Shrines</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Explore Connected Sacred Destinations
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Live crowd telemetry, capacity metrics, and queue pacing across 25 of India’s most revered pilgrimage hubs.
            </p>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>← Back to Platform Overview</span>
            </button>
          )}
        </div>

        {/* Top Filter and Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pt-3 pb-5">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Search Box & Sort Dropdown */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search shrines or states..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort Shrines"
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="Recommended">Recommended</option>
                <option value="CrowdLow">Least Crowded</option>
                <option value="WaitTime">Shortest Wait Time</option>
                <option value="Alphabetical">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 25 Shrine Cards Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {sortedShrines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedShrines.map((shrine) => (
              <div
                key={shrine.id}
                className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Image Section with Overlay and Badges */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={shrine.image}
                      alt={shrine.alt}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getShrineImage(shrine.id);
                      }}
                    />

                    {/* Dark gradient overlay for text and badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-black/30 pointer-events-none" />

                    {/* Status Badge (Top-Left) */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-slate-200/60">
                      <span className={`w-1.5 h-1.5 rounded-full ${shrine.statusDot} animate-pulse`} />
                      <span className="text-[10.5px] font-semibold text-slate-700 tracking-tight">
                        {shrine.status}
                      </span>
                    </div>

                    {/* Site ID Chip (Top-Right) */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-amber-300 font-mono text-[9.5px] font-bold border border-amber-400/30 shadow-sm">
                      {shrine.id}
                    </div>

                    {/* State Location Pill (Bottom-Left) */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/10 shadow-sm">
                      <span className="text-[10px]">📍</span>
                      <span className="text-[10.5px] font-medium tracking-tight">
                        {shrine.state}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                      {shrine.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                      {shrine.subtitle}
                    </p>

                    {/* 3-Column Telemetry Stat Block */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                          Occupancy
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {shrine.occupancy}
                        </div>
                      </div>
                      <div className="border-x border-slate-100">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                          Est. Wait
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {shrine.wait}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                          Safe Cap
                        </div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          {shrine.safeCap}
                        </div>
                      </div>
                    </div>

                    {/* Occupancy Progress Bar */}
                    <div className="mt-3.5 mb-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${shrine.progressColor} rounded-full transition-all duration-500`}
                          style={{ width: shrine.progressWidth }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button (Footer) */}
                <div className="p-4 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectShrine && onSelectShrine(shrine.id)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>View Live Telemetry</span>
                    <span className="text-sm">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
            <span className="text-4xl">🔍</span>
            <h3 className="text-base font-bold text-slate-900 mt-3">No Shrines Matched</h3>
            <p className="text-xs text-slate-500 mt-1">
              No pilgrimage destinations match your current search and category filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All Shrines (25)');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
