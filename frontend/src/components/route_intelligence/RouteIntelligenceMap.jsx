import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issues in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon creator
const createCustomMarker = (color, emoji) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 16px; font-weight: bold; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
      <span>${emoji}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

export default function RouteIntelligenceMap({
  routeInfo,
  deployedBuses,
  activeReroute
}) {
  if (!routeInfo) return null;

  const src = routeInfo.source;
  const dest = routeInfo.destination;
  const stops = routeInfo.intermediate_stops || [];

  // Build coordinate list for highway polyline
  const polylineCoordinates = useMemo(() => {
    return stops.map((s) => [s.lat, s.lng]);
  }, [stops]);

  // Dynamic center
  const center = useMemo(() => {
    return [(src.lat + dest.lat) / 2, (src.lng + dest.lng) / 2];
  }, [src, dest]);

  // Destination safety metadata
  const destMeta = dest.metadata || {};

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      marginBottom: '1.25rem'
    }}>
      {/* Map Header */}
      <div style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🗺️</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>
              Highway Transit Corridor: {src.name} ⇄ {dest.name}
            </h4>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
              Verified National Highway Route · {routeInfo.distance_km} km · {routeInfo.estimated_travel_time} transit
            </span>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            backgroundColor: '#1E293B',
            color: '#38BDF8',
            padding: '0.25rem 0.6rem',
            borderRadius: '0.25rem',
            fontSize: '0.72rem',
            fontWeight: 'bold',
            border: '1px solid #334155'
          }}>
            🚌 {deployedBuses} Buses Assigned
          </span>
          {activeReroute?.is_active && (
            <span style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              padding: '0.25rem 0.6rem',
              borderRadius: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              animation: 'pulse 2s infinite'
            }}>
              🚨 Active Traffic Reroute
            </span>
          )}
        </div>
      </div>

      {/* Real-time Safety / Disruption Notice */}
      {destMeta.high_risk_zone_type && (
        <div style={{
          backgroundColor: '#FEF3C7',
          borderBottom: '1px solid #FDE68A',
          padding: '0.5rem 1.25rem',
          fontSize: '0.76rem',
          color: '#92400E',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>⚠️</span>
          <span>
            <strong>Corridor Safety Alert:</strong> {destMeta.high_risk_zone_type}. Designated Emergency Hospital: {destMeta.nearest_hospital_name}.
          </span>
        </div>
      )}

      {/* Leaflet Map Container */}
      <div style={{ height: '360px', width: '100%', position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route Highway Polyline */}
          <Polyline
            positions={polylineCoordinates}
            color="#D97706"
            weight={5}
            opacity={0.85}
            dashArray="7, 7"
          />

          {/* Intermediate Highway Stops */}
          {stops.map((stop) => {
            let color = '#2563EB';
            let emoji = '📍';

            if (stop.type === 'origin') {
              color = '#3B82F6';
              emoji = '🚌';
            } else if (stop.type === 'destination') {
              color = '#DC2626';
              emoji = '🛕';
            } else if (stop.type === 'police_checkpoint') {
              color = '#7C3AED';
              emoji = '🚔';
            } else if (stop.type === 'refreshment' || stop.type === 'rest_plaza') {
              color = '#D97706';
              emoji = '☕';
            } else if (stop.type === 'satellite_staging') {
              color = '#059669';
              emoji = '🌊';
            }

            return (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                icon={createCustomMarker(color, emoji)}
              >
                <Popup>
                  <div style={{ padding: '2px', minWidth: '160px', fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color, textTransform: 'uppercase' }}>
                      {stop.type.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#0F172A', margin: '2px 0' }}>
                      {stop.name}
                    </div>
                    {stop.km_from_origin !== undefined && (
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Distance: <strong>KM {stop.km_from_origin}</strong> along corridor
                      </div>
                    )}
                    {stop.type === 'destination' && destMeta.official_capacity_daily && (
                      <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '2px', fontWeight: 'bold' }}>
                        Official Daily Capacity: {destMeta.official_capacity_daily.toLocaleString()}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Footer Provenance */}
      <div style={{
        padding: '0.5rem 1.25rem',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.74rem',
        color: '#64748B'
      }}>
        <span>
          ℹ️ OpenStreetMap Verified NH Highway Corridor Routing
        </span>
        <span style={{ color: '#94A3B8' }}>
          Live satellite vehicle GPS telematics unavailable; route waypoints &amp; hub assignments active
        </span>
      </div>
    </div>
  );
}
