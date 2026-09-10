import React, { useState } from 'react';

export default function DemandForecastChart({
  demandForecast,
  deployedBuses,
  routeInfo,
  dateSelection
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!demandForecast || !demandForecast.hourly_distribution) return null;

  const data = demandForecast.hourly_distribution;
  const maxBuses = Math.max(...data.map((d) => d.confidenceMax), deployedBuses, 10);
  const chartHeight = 220;
  const chartWidth = 720;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  // Coordinate mappers
  const getX = (index) => padding.left + (index / (data.length - 1)) * usableWidth;
  const getY = (val) => padding.top + usableHeight - (val / (maxBuses * 1.15)) * usableHeight;

  // Build SVG Path for Demand curve
  const points = data.map((d, i) => `${getX(i)},${getY(d.busesNeeded)}`).join(' ');

  // Confidence area path
  const upperPoints = data.map((d, i) => `${getX(i)},${getY(d.confidenceMax)}`);
  const lowerPoints = data.map((d, i) => `${getX(i)},${getY(d.confidenceMin)}`).reverse();
  const confidenceArea = `M ${upperPoints[0]} L ${upperPoints.slice(1).join(' L ')} L ${lowerPoints.join(' L ')} Z`;

  // Capacity Line Y position
  const capacityY = getY(deployedBuses);

  // Y-axis ticks
  const yTicks = [0, Math.round(maxBuses * 0.33), Math.round(maxBuses * 0.66), maxBuses];

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      marginBottom: '1.25rem'
    }}>
      {/* Chart Header & Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📈</span>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0F172A' }}>
              Hourly Corridor Demand vs. Deployed Capacity
            </h4>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
            {routeInfo.source.name} ⇄ {routeInfo.destination.name} · {dateSelection.dateString}
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.75rem', fontWeight: '600' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#FDE68A', borderRadius: '2px', border: '1px solid #F59E0B' }} />
            <span style={{ color: '#92400E' }}>Peak Snan / Aarti</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '14px', height: '3px', backgroundColor: '#D97706' }} />
            <span style={{ color: '#0F172A' }}>Predicted Demand</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #2563EB' }} />
            <span style={{ color: '#1E40AF' }}>Deployed Capacity ({deployedBuses})</span>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div style={{ width: '100%', position: 'relative', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Background Grid Lines */}
          {yTicks.map((tickVal, idx) => {
            const yPos = getY(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={chartWidth - padding.right}
                  y2={yPos}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                  fontWeight="600"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Shaded Peak Periods (e.g. 5:00-9:00 and 16:00-20:00) */}
          <rect
            x={getX(5)}
            y={padding.top}
            width={getX(9) - getX(5)}
            height={usableHeight}
            fill="#FEF3C7"
            opacity="0.45"
          />
          <rect
            x={getX(16)}
            y={padding.top}
            width={getX(20) - getX(16)}
            height={usableHeight}
            fill="#FEF3C7"
            opacity="0.45"
          />

          {/* Peak Period Labels */}
          <text x={getX(7)} y={padding.top + 14} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#B45309">
            MORNING SURGE
          </text>
          <text x={getX(18)} y={padding.top + 14} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#B45309">
            EVENING EXIT SPIKE
          </text>

          {/* Confidence Band */}
          <path
            d={confidenceArea}
            fill="#FDE68A"
            opacity="0.35"
          />

          {/* Deployed Capacity Threshold Line */}
          <line
            x1={padding.left}
            y1={capacityY}
            x2={chartWidth - padding.right}
            y2={capacityY}
            stroke="#2563EB"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text
            x={chartWidth - padding.right}
            y={capacityY - 5}
            textAnchor="end"
            fontSize="10"
            fontWeight="bold"
            fill="#1E40AF"
          >
            Capacity: {deployedBuses} Buses
          </text>

          {/* Demand Polyline Curve */}
          <polyline
            fill="none"
            stroke="#D97706"
            strokeWidth="3"
            strokeLinejoin="round"
            points={points}
          />

          {/* Interactive Data Points & Hover Scrubber */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.busesNeeded);
            const isHovered = hoveredIndex === i;
            const isOverCapacity = d.busesNeeded > deployedBuses;

            return (
              <g key={i} onMouseEnter={() => setHoveredIndex(i)} style={{ cursor: 'pointer' }}>
                {/* Hit target area */}
                <rect
                  x={cx - (usableWidth / data.length) / 2}
                  y={padding.top}
                  width={usableWidth / data.length}
                  height={usableHeight}
                  fill="transparent"
                />

                {/* Scrubber line */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + usableHeight}
                    stroke="#D97706"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : isOverCapacity ? 4 : 2.5}
                  fill={isOverCapacity ? '#DC2626' : '#D97706'}
                  stroke="#FFFFFF"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
              </g>
            );
          })}

          {/* X Axis Time Labels */}
          {data.map((d, i) => {
            if (i % 3 === 0 || i === data.length - 1) {
              const xPos = getX(i);
              return (
                <text
                  key={i}
                  x={xPos}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748B"
                  fontWeight="600"
                >
                  {d.timeLabel.replace(':00', '')}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredData && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: `${Math.min(chartWidth - 180, Math.max(50, getX(hoveredIndex)))}px`,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '0.6rem 0.85rem',
            borderRadius: '0.5rem',
            fontSize: '0.78rem',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: '170px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#FDE68A', marginBottom: '0.2rem' }}>
              🕒 {hoveredData.timeLabel}
            </div>
            <div>Predicted Demand: <strong>{hoveredData.busesNeeded} buses</strong></div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              ({hoveredData.passengers.toLocaleString()} passengers)
            </div>
            <div style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid #334155' }}>
              {hoveredData.busesNeeded > deployedBuses ? (
                <span style={{ color: '#F87171', fontWeight: 'bold' }}>
                  ⚠️ Shortage: {hoveredData.busesNeeded - deployedBuses} buses below demand
                </span>
              ) : (
                <span style={{ color: '#4ADE80', fontWeight: 'bold' }}>
                  ✅ Covered (+{deployedBuses - hoveredData.busesNeeded} buses buffer)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Insight */}
      <div style={{
        marginTop: '0.75rem',
        padding: '0.55rem 0.85rem',
        backgroundColor: '#F8FAFC',
        borderRadius: '0.5rem',
        border: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.76rem',
        color: '#475569'
      }}>
        <span>
          💡 <strong>Peak Pattern:</strong> Maximum travel load congregates between {demandForecast.peak_hours_summary}.
        </span>
        <span style={{ color: '#64748B' }}>
          Corridor Distance: <strong>{routeInfo.distance_km} km</strong> · Travel Time: <strong>{routeInfo.estimated_travel_time}</strong>
        </span>
      </div>
    </div>
  );
}
