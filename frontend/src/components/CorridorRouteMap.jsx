import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issues in Leaflet with Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon creator
const createCustomIcon = (color, emoji) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; color: white; padding: 6px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
      <span>${emoji}</span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const STOPS = [
  {
    id: 'delhi',
    name: 'Delhi ISBT Kashmiri Gate',
    type: 'Origin Hub',
    lat: 28.6670,
    lng: 77.2284,
    color: '#3B82F6',
    emoji: '🚌',
    desc: 'Primary departure terminal for outbound pilgrimage buses.',
  },
  {
    id: 'murthal',
    name: 'Amrik Sukhdev Dhaba (Murthal)',
    type: 'Highway Refreshment Stop',
    lat: 29.0343,
    lng: 77.0709,
    color: '#F59E0B',
    emoji: '🍽️',
    desc: 'Famous 24/7 highway dining & rest hub @ KM 50 on NH44.',
  },
  {
    id: 'muzaffarnagar',
    name: 'Namaste June 75 (Muzaffarnagar Bypass)',
    type: 'Midpoint Rest Plaza',
    lat: 29.4727,
    lng: 77.7085,
    color: '#F59E0B',
    emoji: '⛽',
    desc: 'Food court, EV charging & emergency medical assistance station.',
  },
  {
    id: 'roorkee',
    name: 'Roorkee Highway Junction (IIT Gate)',
    type: 'Transit Checkpoint',
    lat: 29.8649,
    lng: 77.8965,
    color: '#8B5CF6',
    emoji: '🚔',
    desc: 'Traffic diversion checkpoint before Haridwar entrance.',
  },
  {
    id: 'haridwar',
    name: 'Haridwar — Har Ki Pauri',
    type: 'Primary Pilgrimage Destination',
    lat: 29.9457,
    lng: 78.1642,
    color: '#DC2626',
    emoji: '🛕',
    desc: 'Main Somvati Amavasya bathing ghat (High Crowd Density).',
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh — Triveni Ghat',
    type: 'Secondary Destination Hub',
    lat: 30.1087,
    lng: 78.2936,
    color: '#10B981',
    emoji: '🌊',
    desc: 'Alternative spiritual corridor & satellite parking staging area.',
  },
];

const ROUTE_COORDINATES = STOPS.map((s) => [s.lat, s.lng]);

export default function CorridorRouteMap({ height = '450px' }) {
  const center = [29.4000, 77.7000]; // Center around UP/UK highway corridor

  return (
    <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#1E293B', color: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 'bold' }}>📍 Live Highway Corridor Map: Delhi ⇄ Haridwar / Rishikesh</h4>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Verified stops on NH44 / NH334 Pilgrimage Route</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ backgroundColor: '#334155', color: '#38BDF8', padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
            Distance: 220 km
          </span>
          <span style={{ backgroundColor: '#334155', color: '#FBBF24', padding: '0.25rem 0.6rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
            Est. Time: 4h 45m
          </span>
        </div>
      </div>
      <div style={{ height, width: '100%', position: 'relative' }}>
        <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline positions={ROUTE_COORDINATES} color="#D97706" weight={5} opacity={0.8} dashArray="8, 8" />
          {STOPS.map((stop) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createCustomIcon(stop.color, stop.emoji)}>
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: stop.color, textTransform: 'uppercase' }}>{stop.type}</div>
                  <h4 style={{ margin: '2px 0 4px', fontSize: '0.95rem' }}>{stop.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#4B5563' }}>{stop.desc}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
