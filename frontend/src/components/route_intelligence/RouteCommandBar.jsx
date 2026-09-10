import React, { useState } from 'react';
import { TRANSPORT_HUBS, SACRED_DESTINATIONS } from '../../data/route_intelligence/routeDataRegistry';

export default function RouteCommandBar({
  source,
  setSource,
  destination,
  setDestination,
  dateInput,
  setDateInput,
  onAnalyze,
  isAnalyzing
}) {
  const [dateMode, setDateMode] = useState('quick'); // 'quick' | 'single' | 'range'
  const [customStart, setCustomStart] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );

  // Popular corridors for instant one-click switching
  const POPULAR_CORRIDORS = [
    { label: 'Delhi ⇄ Haridwar', from: 'HUB_DELHI_ISBT', to: 'TS015' },
    { label: 'Delhi ⇄ Ayodhya', from: 'HUB_DELHI_ISBT', to: 'TS004' },
    { label: 'Varanasi ⇄ Prayagraj', from: 'HUB_VARANASI', to: 'TS016' },
    { label: 'Katra ⇄ Vaishno Devi', from: 'HUB_KATRA', to: 'TS005' },
    { label: 'Madurai ⇄ Rameswaram', from: 'HUB_MADURAI', to: 'TS011' }
  ];

  const handleApplySingleDate = (val) => {
    setCustomStart(val);
    setDateInput({ startDate: val, endDate: val });
  };

  const handleApplyRange = (start, end) => {
    setCustomStart(start);
    setCustomEnd(end);
    setDateInput({ startDate: start, endDate: end });
  };

  return (
    <div style={{
      backgroundColor: '#0F172A',
      color: '#F8FAFC',
      borderRadius: '0.75rem',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
      border: '1px solid #1E293B',
      marginBottom: '1.25rem'
    }}>
      {/* Top Header & Popular Corridors */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem',
        borderBottom: '1px solid #1E293B',
        paddingBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🧭</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Transport Route Command Bar
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              Select real origins, sacred destinations &amp; flexible operational dates
            </span>
          </div>
        </div>

        {/* Quick Corridor Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Quick Corridors:
          </span>
          {POPULAR_CORRIDORS.map((c, i) => {
            const isMatch = (source === c.from || source?.id === c.from) &&
                            (destination === c.to || destination?.id === c.to);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSource(c.from);
                  setDestination(c.to);
                }}
                style={{
                  backgroundColor: isMatch ? '#D97706' : '#1E293B',
                  color: isMatch ? '#FFFFFF' : '#CBD5E1',
                  border: isMatch ? '1px solid #F59E0B' : '1px solid #334155',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: isMatch ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Input Form */}
      <div className="ri-command-grid">
        {/* FROM: Origin */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>
            📍 FROM (Source Hub)
          </label>
          <select
            value={typeof source === 'object' ? source.id : source}
            onChange={(e) => setSource(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              padding: '0.65rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.88rem',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <optgroup label="Major Interstate Hubs">
              {TRANSPORT_HUBS.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name} ({hub.state})
                </option>
              ))}
            </optgroup>
            <optgroup label="All Sacred Shrine Hubs">
              {SACRED_DESTINATIONS.map((dest) => (
                <option key={dest.spot_id} value={dest.spot_id}>
                  {dest.name} ({dest.district}, {dest.state})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* TO: Destination */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>
            🛕 TO (Destination Shrine)
          </label>
          <select
            value={typeof destination === 'object' ? destination.id : destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              padding: '0.65rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.88rem',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <optgroup label="25 Official Sacred Destinations">
              {SACRED_DESTINATIONS.map((dest) => (
                <option key={dest.spot_id} value={dest.spot_id}>
                  {dest.name} — {dest.city_town} ({dest.state})
                </option>
              ))}
            </optgroup>
            <optgroup label="Intermediate Transit Centers">
              {TRANSPORT_HUBS.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name} ({hub.city})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* DATE SELECTION SYSTEM */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📅 Operational Date / Window
            </label>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={() => setDateMode('quick')}
                style={{
                  background: dateMode === 'quick' ? '#D97706' : 'transparent',
                  color: dateMode === 'quick' ? '#FFF' : '#94A3B8',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  cursor: 'pointer'
                }}
              >
                Quick
              </button>
              <button
                type="button"
                onClick={() => setDateMode('single')}
                style={{
                  background: dateMode === 'single' ? '#D97706' : 'transparent',
                  color: dateMode === 'single' ? '#FFF' : '#94A3B8',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  cursor: 'pointer'
                }}
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setDateMode('range')}
                style={{
                  background: dateMode === 'range' ? '#D97706' : 'transparent',
                  color: dateMode === 'range' ? '#FFF' : '#94A3B8',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  cursor: 'pointer'
                }}
              >
                Multi-Day
              </button>
            </div>
          </div>

          {/* Quick Date Presets */}
          {dateMode === 'quick' && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[
                { id: 'tomorrow', label: 'Tomorrow' },
                { id: 'weekend', label: 'This Weekend' },
                { id: 'next7', label: 'Next 7 Days' },
                { id: 'next30', label: 'Next 30 Days' }
              ].map((p) => {
                const isActive = dateInput === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDateInput(p.id)}
                    style={{
                      flex: 1,
                      backgroundColor: isActive ? '#D97706' : '#1E293B',
                      color: isActive ? '#FFFFFF' : '#CBD5E1',
                      border: isActive ? '1.5px solid #F59E0B' : '1px solid #334155',
                      padding: '0.62rem 0.4rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 'bold' : '500',
                      cursor: 'pointer',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Single Date Calendar Picker */}
          {dateMode === 'single' && (
            <div>
              <input
                type="date"
                value={customStart}
                onChange={(e) => handleApplySingleDate(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '0.58rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>
          )}

          {/* Multi-Day Trip Range Picker */}
          {dateMode === 'range' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => handleApplyRange(e.target.value, customEnd)}
                style={{
                  flex: 1,
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '0.58rem 0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
              <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>to</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => handleApplyRange(customStart, e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '0.58rem 0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              />
            </div>
          )}
        </div>

        {/* PRIMARY ACTION: ANALYZE ROUTE */}
        <div>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            style={{
              backgroundColor: isAnalyzing ? '#94A3B8' : '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.65rem 1.4rem',
              fontSize: '0.92rem',
              fontWeight: '800',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
              transition: 'all 0.15s ease',
              height: '42px',
              whiteSpace: 'nowrap'
            }}
          >
            {isAnalyzing ? (
              <>⏳ Analyzing...</>
            ) : (
              <>⚡ Analyze Route</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
