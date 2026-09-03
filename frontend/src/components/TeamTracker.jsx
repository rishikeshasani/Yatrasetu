import { useState, useEffect, useRef, useMemo } from 'react';

export default function TeamTracker({ currentSite }) {
  const [teamName] = useState('Kedarnath Yatra Dal #402');
  const [teamCode] = useState('DAL-4029');
  const [myLocation, setMyLocation] = useState({
    lat: currentSite?.latitude || 30.7352,
    lng: currentSite?.longitude || 79.0669,
    accuracy: 8,
    active: false,
    permissionStatus: 'prompt' // 'granted', 'denied', 'prompt'
  });

  // Team members list with phone numbers, roles, coordinates, and telemetry
  const [members, setMembers] = useState([
    {
      id: 'mem_1',
      name: 'Rishikesh (You - Dal Leader)',
      phone: '+91 98201 12345',
      role: 'LEADER',
      isSelf: true,
      latOffset: 0,
      lngOffset: 0,
      distanceKm: 0.0,
      status: 'SAFE',
      direction: 'At Shrine Center',
      heading: 'NORTH',
      battery: 88,
      lastPing: 'Just now'
    },
    {
      id: 'mem_2',
      name: 'Aarav Sharma',
      phone: '+91 98192 34567',
      role: 'MEMBER',
      isSelf: false,
      latOffset: 0.0018, // ~200m
      lngOffset: 0.0012,
      distanceKm: 0.24,
      status: 'SAFE',
      direction: 'Near Temple Cloister Gate',
      heading: 'NORTH',
      battery: 74,
      lastPing: '1 min ago'
    },
    {
      id: 'mem_3',
      name: 'Pooja Sharma',
      phone: '+91 97690 98765',
      role: 'MEMBER',
      isSelf: false,
      latOffset: 0.0035, // ~450m
      lngOffset: -0.0028,
      distanceKm: 0.48,
      status: 'SAFE',
      direction: 'At GMVN Canteen',
      heading: 'NORTH_EAST',
      battery: 62,
      lastPing: '2 mins ago'
    },
    {
      id: 'mem_4',
      name: 'Kailash Nath (Dada ji)',
      phone: '+91 94220 54321',
      role: 'ELDER',
      isSelf: false,
      latOffset: -0.0125, // ~1.4 km away!
      lngOffset: -0.0065,
      distanceKm: 1.42,
      status: 'SEPARATED',
      direction: 'Past Helipad towards Trek Trail',
      heading: 'SOUTH_WEST', // Wrong direction (heading down/away)
      battery: 41,
      lastPing: 'Just now'
    },
    {
      id: 'mem_5',
      name: 'Rohan Sharma',
      phone: '+91 98211 67890',
      role: 'YOUTH',
      isSelf: false,
      latOffset: 0.0055,
      lngOffset: 0.0085, // Heading away towards eastern ridge
      distanceKm: 0.95,
      status: 'WRONG_DIRECTION',
      direction: 'Eastern Ravine / Unpaved Track',
      heading: 'EAST', // Wrong direction away from route
      battery: 55,
      lastPing: '3 mins ago'
    }
  ]);

  // New Member Input state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [inviteSentToast, setInviteSentToast] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef(null);

  // Request Current Device GPS
  const requestMyDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your mobile or browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          active: true,
          permissionStatus: 'granted'
        });
      },
      (error) => {
        console.warn("GPS Permission error:", error);
        setMyLocation((prev) => ({
          ...prev,
          active: false,
          permissionStatus: 'denied'
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Add a new member
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      alert("Please enter member name and 10-digit mobile number.");
      return;
    }

    const formattedPhone = newMemberPhone.startsWith('+') ? newMemberPhone : `+91 ${newMemberPhone.replace(/\D/g, '')}`;
    
    // Simulate random position within 300m
    const randomDist = (Math.random() * 0.4 + 0.1).toFixed(2);
    const newMember = {
      id: `mem_${Date.now()}`,
      name: newMemberName.trim(),
      phone: formattedPhone,
      role: newMemberRole,
      isSelf: false,
      latOffset: (Math.random() - 0.5) * 0.004,
      lngOffset: (Math.random() - 0.5) * 0.004,
      distanceKm: parseFloat(randomDist),
      status: 'SAFE',
      direction: 'Joining Group • GPS Connected',
      heading: 'NORTH',
      battery: Math.floor(Math.random() * 30 + 70),
      lastPing: 'Just now'
    };

    setMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
    setNewMemberPhone('');
    setInviteSentToast(`📲 SMS Location Permission link dispatched to ${formattedPhone}!`);
    setTimeout(() => setInviteSentToast(null), 5000);
  };

  // Remove a member
  const handleRemoveMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Separation & Direction Alerts
  const separationAlerts = useMemo(() => {
    const alerts = [];
    members.forEach((m) => {
      if (m.isSelf) return;

      if (m.distanceKm > 1.0) {
        alerts.push({
          id: `sep_${m.id}`,
          member: m,
          type: 'DISTANCE_HAZARD',
          severity: 'CRITICAL',
          title: `🚨 SEPARATION ALERT: ${m.name} is ${m.distanceKm} km away!`,
          desc: `${m.name} has exceeded the safe group boundary of 1.0 km. Last seen ${m.direction}. Call immediately: ${m.phone}`,
          action: 'CALL'
        });
      } else if (m.status === 'WRONG_DIRECTION' || m.heading === 'EAST' || m.heading === 'SOUTH_WEST') {
        alerts.push({
          id: `dir_${m.id}`,
          member: m,
          type: 'WRONG_DIRECTION',
          severity: 'HIGH',
          title: `⚠️ ROUTE DEVIATION: ${m.name} is moving in the wrong direction!`,
          desc: `Heading away from safe marked path towards ${m.direction}. Proximity: ${Math.round(m.distanceKm * 1000)}m.`,
          action: 'PING'
        });
      }
    });
    return alerts;
  }, [members]);

  // Live Movement Simulation Engine (for hackathon presentations)
  useEffect(() => {
    if (isSimulating) {
      simIntervalRef.current = setInterval(() => {
        setMembers((prev) =>
          prev.map((m) => {
            if (m.isSelf) return m;

            // Random slight jitter in distance & coordinates
            const delta = (Math.random() - 0.48) * 0.04;
            const newDist = Math.max(0.05, parseFloat((m.distanceKm + delta).toFixed(2)));
            let newStatus = 'SAFE';

            if (newDist > 1.0) {
              newStatus = 'SEPARATED';
            } else if (m.id === 'mem_5') {
              newStatus = 'WRONG_DIRECTION';
            }

            return {
              ...m,
              distanceKm: newDist,
              status: newStatus,
              battery: Math.max(15, m.battery - (Math.random() > 0.8 ? 1 : 0)),
              lastPing: 'Just now'
            };
          })
        );
      }, 3000);
    } else {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulating]);

  return (
    <section className="team-tracker-section">
      {/* Header Banner */}
      <div className="section-header-row">
        <div>
          <div className="title-with-badge">
            <h2 className="section-title">
              <span className="title-icon">👥</span> Create Team & Live Pilgrim Geotracker
            </h2>
            <span className="team-live-pill">
              <span className="pulse-dot"></span> GPS Mesh Active
            </span>
          </div>
          <p className="section-subtitle">
            Keep your family, elderly, and yatra group members safe. Input mobile numbers to broadcast location permissions, view collective live positions, and trigger immediate alerts if someone wanders <strong>&gt;1 km away</strong> or takes the wrong trail.
          </p>
        </div>

        {/* Team Code & Share */}
        <div className="team-header-actions">
          <div className="team-id-badge">
            <span className="id-label">{teamName} | PIN:</span>
            <strong className="id-code">{teamCode}</strong>
          </div>
          <button 
            type="button" 
            className="share-invite-btn"
            onClick={() => {
              const url = `https://yatrasetu.gov.in/join?team=${teamCode}`;
              navigator.clipboard?.writeText(url);
              setInviteSentToast(`📋 Team invite link copied: ${url}`);
              setTimeout(() => setInviteSentToast(null), 4000);
            }}
          >
            🔗 Copy Join Link
          </button>
        </div>
      </div>

      {/* Invite Sent Toast */}
      {inviteSentToast && (
        <div className="invite-toast">
          <span>{inviteSentToast}</span>
        </div>
      )}

      {/* Real-time Separation & Direction Hazard Banner */}
      {separationAlerts.length > 0 && (
        <div className="separation-hazards-banner">
          <div className="hazard-banner-header">
            <span className="hazard-siren">🚨</span>
            <span className="hazard-banner-title">
              Active Group Separation Alerts ({separationAlerts.length})
            </span>
          </div>

          <div className="hazards-list">
            {separationAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`hazard-alert-item ${alert.severity === 'CRITICAL' ? 'critical-hazard' : 'warning-hazard'}`}
              >
                <div className="hazard-text-col">
                  <h4 className="hazard-item-title">{alert.title}</h4>
                  <p className="hazard-item-desc">{alert.desc}</p>
                </div>
                <div className="hazard-actions">
                  <a 
                    href={`tel:${alert.member.phone}`} 
                    className="hazard-call-btn"
                    title="Direct Emergency Voice Call"
                  >
                    📞 Call {alert.member.name.split(' ')[0]}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Layout: Left (Form & Member List) | Right (Radar Visualizer) */}
      <div className="team-tracker-grid">
        {/* COLUMN 1: TEAM MANAGEMENT & MEMBERS LIST */}
        <div className="team-members-column">
          {/* Add Member Form */}
          <div className="add-member-card">
            <div className="card-top-header">
              <h3 className="card-header-heading">➕ Add Team Member / Pilgrim Phone</h3>
              <span className="sms-auth-tag">SMS Permission Consent</span>
            </div>

            <form onSubmit={handleAddMember} className="add-member-form">
              <div className="form-inputs-row">
                <input
                  type="text"
                  placeholder="Member Name (e.g. Suman Devi)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="team-input name-input"
                  required
                />
                <input
                  type="tel"
                  placeholder="Mobile Number (e.g. 9820011223)"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="team-input phone-input"
                  required
                />
              </div>

              <div className="form-footer-row">
                <div className="role-selector">
                  <label className="role-label">Member Role:</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="role-select"
                  >
                    <option value="MEMBER">Pilgrim Member</option>
                    <option value="ELDER">Elderly / Senior Citizen</option>
                    <option value="CHILD">Child / Minor</option>
                    <option value="YOUTH">Youth / Hiker</option>
                  </select>
                </div>

                <button type="submit" className="add-member-submit-btn">
                  📲 Send GPS Invite & Track
                </button>
              </div>
            </form>
          </div>

          {/* Current Device GPS Status */}
          <div className="my-device-status-card">
            <div className="device-gps-info">
              <span className="gps-sat-icon">🛰️</span>
              <div className="device-gps-text">
                <strong>Your Mobile GPS: </strong>
                {myLocation.active ? (
                  <span className="gps-active-txt">Transmitting Live Location (±{myLocation.accuracy}m Accuracy)</span>
                ) : (
                  <span className="gps-prompt-txt">Tap below to grant high-accuracy mobile GPS permission</span>
                )}
              </div>
            </div>
            <button 
              type="button" 
              className={`gps-enable-btn ${myLocation.active ? 'active' : ''}`}
              onClick={requestMyDeviceLocation}
            >
              {myLocation.active ? '✓ GPS Linked' : '📡 Request My GPS Location'}
            </button>
          </div>

          {/* Members Card List */}
          <div className="members-list-card">
            <div className="list-header-row">
              <h3 className="card-header-heading">
                Collective Team ({members.length} Members Linked)
              </h3>
              
              {/* Simulation Mode Toggle for Hackathon Demos */}
              <button
                type="button"
                className={`sim-mode-btn ${isSimulating ? 'active' : ''}`}
                onClick={() => setIsSimulating(!isSimulating)}
                title="Toggle live movement simulation for presentation"
              >
                {isSimulating ? '⏹️ Stop Live Sim' : '⚡ Simulate Movement Demo'}
              </button>
            </div>

            <div className="members-scroll-container">
              {members.map((member) => {
                const isOverLimit = member.distanceKm > 1.0;
                const isWrongDir = member.status === 'WRONG_DIRECTION';
                
                return (
                  <div 
                    key={member.id} 
                    className={`member-row-card ${isOverLimit ? 'over-limit' : ''} ${isWrongDir ? 'wrong-dir' : ''}`}
                  >
                    <div className="member-avatar-col">
                      <div className={`member-avatar ${member.isSelf ? 'avatar-leader' : ''}`}>
                        {member.role === 'LEADER' ? '👑' : member.role === 'ELDER' ? '👵' : member.role === 'CHILD' ? '🧒' : '🎒'}
                      </div>
                    </div>

                    <div className="member-info-col">
                      <div className="member-name-line">
                        <span className="member-name">{member.name}</span>
                        <span className={`member-role-badge role-${member.role.toLowerCase()}`}>
                          {member.role}
                        </span>
                      </div>
                      <div className="member-phone-line">
                        <span className="phone-icon">📞</span>
                        <span className="phone-num">{member.phone}</span>
                        <span className="battery-stat">🔋 {member.battery}%</span>
                      </div>
                      <div className="member-loc-line">
                        <span className="loc-marker">📍</span>
                        <span className="direction-txt">{member.direction}</span>
                      </div>
                    </div>

                    <div className="member-telemetry-col">
                      {/* Distance pill */}
                      <div className={`distance-badge ${isOverLimit ? 'dist-danger' : member.distanceKm > 0.6 ? 'dist-warning' : 'dist-safe'}`}>
                        {member.isSelf ? '0 m (Self)' : `${member.distanceKm >= 1 ? member.distanceKm.toFixed(2) + ' km' : Math.round(member.distanceKm * 1000) + ' m'}`}
                      </div>

                      {/* Direction / Warning Pill */}
                      {isOverLimit ? (
                        <span className="status-hazard-pill">⚠️ &gt; 1km Away</span>
                      ) : isWrongDir ? (
                        <span className="status-wrong-pill">⚡ Wrong Route</span>
                      ) : (
                        <span className="status-safe-pill">✓ Within Safe Zone</span>
                      )}

                      {/* Call Action */}
                      {!member.isSelf && (
                        <div className="member-row-actions">
                          <a href={`tel:${member.phone}`} className="call-member-link" title="Call Member">
                            📞 Call
                          </a>
                          <button 
                            type="button" 
                            className="remove-member-btn"
                            onClick={() => handleRemoveMember(member.id)}
                            title="Remove Member"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 2: VISUAL RADAR & COLLECTIVE LOCATION CANVAS */}
        <div className="team-radar-column">
          <div className="radar-card">
            <div className="radar-header">
              <div>
                <h3 className="card-header-heading">🛰️ Collective Group Radar</h3>
                <span className="radar-sub">Live 2D Relative Proximity Matrix around {currentSite?.name || 'Sanctum'}</span>
              </div>
              <div className="radar-legend">
                <span className="legend-item"><span className="dot dot-leader"></span> Leader</span>
                <span className="legend-item"><span className="dot dot-safe"></span> Safe (&lt;1km)</span>
                <span className="legend-item"><span className="dot dot-hazard"></span> Danger (&gt;1km / Deviated)</span>
              </div>
            </div>

            {/* Radar Screen Visualizer */}
            <div className="radar-screen">
              {/* Concentric Safety Rings */}
              <div className="radar-ring ring-outer" title="1.5 km Outer Perimeter"></div>
              <div className="radar-ring ring-safe-boundary" title="1.0 km Safe Maximum Boundary">
                <span className="boundary-label">1.0 KM SAFE LIMIT</span>
              </div>
              <div className="radar-ring ring-mid" title="500m Intermediate Ring"></div>
              <div className="radar-ring ring-inner" title="250m Proximity Ring"></div>

              {/* Center Crosshairs */}
              <div className="radar-crosshair crosshair-v"></div>
              <div className="radar-crosshair crosshair-h"></div>

              {/* Sweeping radar beam animation */}
              <div className="radar-sweep-beam"></div>

              {/* Center Temple Icon */}
              <div className="radar-shrine-marker">
                <span className="shrine-pin">🛕</span>
                <span className="shrine-label">{currentSite?.name || 'Main Shrine'}</span>
              </div>

              {/* Plotted Member Blips */}
              {members.map((m) => {
                // Scale lat/lng offsets to radar % (center is 50%, 50%)
                const xPercent = 50 + (m.lngOffset / 0.015) * 40;
                const yPercent = 50 - (m.latOffset / 0.015) * 40;
                const isHazard = m.distanceKm > 1.0 || m.status === 'WRONG_DIRECTION';

                return (
                  <div
                    key={m.id}
                    className={`radar-blip ${m.isSelf ? 'blip-leader' : isHazard ? 'blip-danger' : 'blip-safe'}`}
                    style={{
                      left: `${Math.max(8, Math.min(92, xPercent))}%`,
                      top: `${Math.max(8, Math.min(92, yPercent))}%`
                    }}
                    title={`${m.name} (${m.distanceKm} km away)`}
                  >
                    <div className="blip-pulse-ring"></div>
                    <div className="blip-core">
                      {m.role === 'LEADER' ? '👑' : m.role === 'ELDER' ? '👵' : m.role === 'CHILD' ? '🧒' : '●'}
                    </div>
                    <div className="blip-tooltip">
                      <span className="tip-name">{m.name.split(' ')[0]}</span>
                      <span className="tip-dist">{m.isSelf ? 'Leader' : `${m.distanceKm} km`}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Radar Quick Stats Footer */}
            <div className="radar-footer-stats">
              <div className="radar-stat-box">
                <span className="stat-label">Total in Group</span>
                <strong className="stat-val">{members.length} Pilgrims</strong>
              </div>
              <div className="radar-stat-box">
                <span className="stat-label">Safe in 1km Perimeter</span>
                <strong className="stat-val text-green">
                  {members.filter((m) => m.distanceKm <= 1.0 && m.status === 'SAFE').length} Safe
                </strong>
              </div>
              <div className="radar-stat-box">
                <span className="stat-label">Hazard Separation</span>
                <strong className={`stat-val ${separationAlerts.length > 0 ? 'text-red' : 'text-green'}`}>
                  {separationAlerts.length} Alerts
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
