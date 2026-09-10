import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {
  createYatraGroup,
  fetchMyYatraGroup,
  joinYatraGroup,
  leaveYatraGroup,
  removeGroupMember,
  updateMemberLocation,
  disableLocationSharing,
  fetchGroupLocations,
  triggerGroupAlert,
  resolveGroupAlert
} from '../api/api';
import { CANONICAL_25_SHRINES } from '../utils/shrineImages';

// Fix Leaflet marker icons in Vite / React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper for custom HTML map markers
const createCustomMarkerIcon = (bgColor, label, emoji) => {
  return L.divIcon({
    className: 'yatra-custom-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: #FFFFFF;
        padding: 5px 9px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 11px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        border: 2px solid #FFFFFF;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        cursor: pointer;
        transform: translate(-50%, -50%);
      ">
        <span style="font-size: 13px;">${emoji}</span>
        <span>${label}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Map auto-fit controller
function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function TeamTracker({ currentUser, currentSite, onShowToast }) {
  // Main Data States
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Opt-in Location Sharing States
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const watchIdRef = useRef(null);

  // No-Group Tab & Form States
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [createForm, setCreateForm] = useState({
    groupName: '',
    siteId: 'TS001',
    siteName: 'Kedarnath Temple',
    yatraDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Group Alert Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertType, setAlertType] = useState('EMERGENCY');
  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);

  // Synchronize default destination when currentSite prop changes
  useEffect(() => {
    if (currentSite?.id && !group) {
      setCreateForm((prev) => ({
        ...prev,
        siteId: currentSite.id,
        siteName: currentSite.name || 'Sacred Pilgrimage'
      }));
    }
  }, [currentSite, group]);

  // Load User's Active Group & Members
  const loadGroupData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetchMyYatraGroup();
      if (res?.has_group && res.group) {
        setGroup(res.group);
      } else {
        setGroup(null);
        setLocations([]);
      }
    } catch (err) {
      console.warn("fetchMyYatraGroup error:", err.message);
    } finally {
      if (!isSilent) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load Group Locations
  const loadGroupLocations = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      const locs = await fetchGroupLocations(groupId);
      if (Array.isArray(locs)) {
        setLocations(locs);
      }
    } catch (err) {
      console.warn("fetchGroupLocations error:", err.message);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // Periodic Polling (Every 8 seconds while user has an active group)
  useEffect(() => {
    if (!group?.id) return;
    const interval = setInterval(() => {
      loadGroupData(true);
      loadGroupLocations(group.id);
    }, 8000);
    return () => clearInterval(interval);
  }, [group?.id, loadGroupData, loadGroupLocations]);

  // When group is loaded or changes, immediately fetch locations
  useEffect(() => {
    if (group?.id) {
      loadGroupLocations(group.id);
    }
  }, [group?.id, loadGroupLocations]);

  // Geolocation Cleanup on Unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // Location Sharing Toggle (Strict Opt-in)
  // --------------------------------------------------------------------------
  const handleToggleLocationSharing = async () => {
    if (!group?.id) return;

    if (isSharingLocation) {
      // Turn OFF sharing
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharingLocation(false);
      setMyLocation(null);
      setLocationError('');
      try {
        await disableLocationSharing(group.id);
        if (onShowToast) onShowToast("📍 Location sharing is off.");
        loadGroupLocations(group.id);
      } catch (e) {
        console.warn("disableLocationSharing error:", e.message);
      }
      return;
    }

    // Turn ON sharing: Request permission explicitly
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const consent = window.confirm(
      `Share your live location with members of "${group.group_name}"?\n\n` +
      `• Your device GPS coordinates will be transmitted securely.\n` +
      `• Only verified members of this Yatra group will be able to view your location.\n` +
      `• You can disable location sharing at any time.`
    );
    if (!consent) return;

    setLocationError('');
    setIsSharingLocation(true);

    const onLocationSuccess = async (pos) => {
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy || null
      };
      setMyLocation(coords);
      try {
        await updateMemberLocation(group.id, coords);
        loadGroupLocations(group.id);
      } catch (err) {
        console.warn("updateMemberLocation error:", err.message);
      }
    };

    const onLocationError = (err) => {
      console.warn("Geolocation error:", err.message);
      setIsSharingLocation(false);
      setMyLocation(null);
      if (err.code === 1) {
        setLocationError("Location permission was not granted.");
        if (onShowToast) onShowToast("⚠️ Location permission was not granted.");
      } else {
        setLocationError("Unable to retrieve your current location.");
      }
    };

    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    });

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      onLocationSuccess,
      onLocationError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }
    );

    if (onShowToast) onShowToast("🟢 Live location sharing enabled for your Yatra team.");
  };

  // --------------------------------------------------------------------------
  // Form Handlers: Create Group
  // --------------------------------------------------------------------------
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!createForm.groupName.trim()) {
      setFormError("Please enter a group name.");
      return;
    }

    setFormSubmitting(true);
    try {
      const created = await createYatraGroup({
        group_name: createForm.groupName.trim(),
        site_id: createForm.siteId,
        site_name: createForm.siteName,
        yatra_date: createForm.yatraDate
      });
      setGroup(created);
      if (onShowToast) onShowToast(`🎉 Yatra Group "${created.group_name}" created! Join Code: ${created.join_code}`);
    } catch (err) {
      setFormError(err.message || "Failed to create group. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Form Handlers: Join Group
  // --------------------------------------------------------------------------
  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setFormError('');
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setFormError("Please enter a valid group join code.");
      return;
    }

    setFormSubmitting(true);
    try {
      const joined = await joinYatraGroup(code);
      setGroup(joined);
      if (onShowToast) onShowToast(`✨ Successfully joined "${joined.group_name}"!`);
    } catch (err) {
      setFormError(err.message || "Failed to join group. Please check the join code.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Leave Group
  // --------------------------------------------------------------------------
  const handleLeaveGroup = async () => {
    if (!group?.id) return;
    const confirmLeave = window.confirm(
      `Leave "${group.group_name}"?\n\n` +
      (group.user_role === 'ADMIN'
        ? "You are currently the ADMIN. If other members are present, leadership will automatically transfer to the next member."
        : "You will no longer receive group alerts or share location with this party.")
    );
    if (!confirmLeave) return;

    try {
      // Turn off sharing first
      if (isSharingLocation && watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharingLocation(false);
      setMyLocation(null);

      await leaveYatraGroup(group.id);
      setGroup(null);
      setLocations([]);
      if (onShowToast) onShowToast("You have left the Yatra group.");
    } catch (err) {
      alert("Error leaving group: " + err.message);
    }
  };

  // --------------------------------------------------------------------------
  // Admin Remove Member
  // --------------------------------------------------------------------------
  const handleRemoveMember = async (memberId, memberName) => {
    if (!group?.id) return;
    const confirmRemove = window.confirm(`Remove member "${memberName}" from this Yatra group?`);
    if (!confirmRemove) return;

    try {
      await removeGroupMember(group.id, memberId);
      if (onShowToast) onShowToast(`Member ${memberName} removed.`);
      loadGroupData(true);
      loadGroupLocations(group.id);
    } catch (err) {
      alert("Error removing member: " + err.message);
    }
  };

  // --------------------------------------------------------------------------
  // Trigger Group Distress Alert
  // --------------------------------------------------------------------------
  const handleTriggerAlert = async (e) => {
    e.preventDefault();
    if (!group?.id) return;

    setIsSubmittingAlert(true);
    try {
      await triggerGroupAlert(group.id, {
        alert_type: alertType,
        message: alertMessage.trim() || 'Devotee requires immediate assistance.'
      });
      setIsAlertModalOpen(false);
      setAlertMessage('');
      if (onShowToast) onShowToast("🚨 Emergency SOS signal dispatched to your Yatra team!");
      loadGroupData(true);
    } catch (err) {
      alert("Failed to send group alert: " + err.message);
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  // --------------------------------------------------------------------------
  // Resolve Group Distress Alert
  // --------------------------------------------------------------------------
  const handleResolveAlert = async (alertId) => {
    if (!group?.id || !alertId) return;
    const confirmResolve = window.confirm("Mark this group emergency alert as RESOLVED?");
    if (!confirmResolve) return;

    try {
      await resolveGroupAlert(group.id, alertId);
      if (onShowToast) onShowToast("✓ Emergency alert marked as resolved.");
      loadGroupData(true);
    } catch (err) {
      alert("Error resolving alert: " + err.message);
    }
  };

  // --------------------------------------------------------------------------
  // Copy Join Code to Clipboard
  // --------------------------------------------------------------------------
  const handleCopyCode = () => {
    if (!group?.join_code) return;
    navigator.clipboard.writeText(group.join_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // --------------------------------------------------------------------------
  // Map Center Computation
  // --------------------------------------------------------------------------
  const mapCenter = useMemo(() => {
    // 1. If user has active location, center on user
    if (myLocation?.latitude && myLocation?.longitude) {
      return [myLocation.latitude, myLocation.longitude];
    }
    // 2. If any consenting group member has location, center on first member
    if (locations.length > 0 && locations[0].latitude && locations[0].longitude) {
      return [locations[0].latitude, locations[0].longitude];
    }
    // 3. Fallback: Shrine coordinates or default Kedarnath
    return [30.7352, 79.0669];
  }, [myLocation, locations]);

  // ==========================================================================
  // RENDER: LOADING STATE
  // ==========================================================================
  if (isLoading) {
    return (
      <section className="team-tracker-section" id="my-yatra-team" style={{ margin: '2rem 0' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '1rem',
          border: '1px solid #E2E8F0',
          padding: '2rem',
          textAlign: 'center',
          color: '#64748B'
        }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⏳</div>
          <p style={{ margin: 0, fontWeight: 600 }}>Connecting to Yatra Team Network...</p>
        </div>
      </section>
    );
  }

  // ==========================================================================
  // RENDER: NO GROUP VIEW (CREATE OR JOIN)
  // ==========================================================================
  if (!group) {
    return (
      <section className="team-tracker-section" id="my-yatra-team" style={{ margin: '2rem 0' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '1.15rem',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '0.75rem',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem'
            }}>
              👥
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                My Yatra Team
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: '#64748B' }}>
                You’re not part of a Yatra group yet. Coordinate with your family, pilgrim dal, or tour party.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            background: '#F1F5F9',
            padding: '0.35rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            maxWidth: '380px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setFormError(''); }}
              style={{
                flex: 1,
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '0.55rem',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'create' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'create' ? '#4F46E5' : '#64748B',
                boxShadow: activeTab === 'create' ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              ➕ Create a Yatra Group
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('join'); setFormError(''); }}
              style={{
                flex: 1,
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '0.55rem',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'join' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'join' ? '#4F46E5' : '#64748B',
                boxShadow: activeTab === 'join' ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              🔑 Join a Yatra Group
            </button>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '0.75rem 1rem',
              borderRadius: '0.65rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              ⚠️ {formError}
            </div>
          )}

          {/* TAB 1: CREATE GROUP */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kedarnath Family Yatra 2026"
                  value={createForm.groupName}
                  onChange={(e) => setCreateForm({ ...createForm, groupName: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Destination Pilgrimage Shrine *
                  </label>
                  <select
                    value={createForm.siteId}
                    onChange={(e) => {
                      const sel = CANONICAL_25_SHRINES.find((s) => s.id === e.target.value);
                      setCreateForm({
                        ...createForm,
                        siteId: e.target.value,
                        siteName: sel ? sel.name : 'Sacred Shrine'
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.6rem',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    {CANONICAL_25_SHRINES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}: {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Yatra Planned Date *
                  </label>
                  <input
                    type="date"
                    value={createForm.yatraDate}
                    onChange={(e) => setCreateForm({ ...createForm, yatraDate: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.6rem',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '0.5rem',
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: '#4F46E5',
                  border: 'none',
                  borderRadius: '0.65rem',
                  cursor: formSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                  transition: 'background 0.15s'
                }}
              >
                {formSubmitting ? 'Creating Group...' : 'Create Yatra Group & Get Join Code'}
              </button>
            </form>
          )}

          {/* TAB 2: JOIN GROUP */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: '420px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  6-Digit Group Join Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CY3FZ4"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #CBD5E1',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Ask your party leader or family admin for the 6-character code.
                </p>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '0.25rem',
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: '#059669',
                  border: 'none',
                  borderRadius: '0.65rem',
                  cursor: formSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                  transition: 'background 0.15s'
                }}
              >
                {formSubmitting ? 'Joining...' : 'Join Yatra Group'}
              </button>
            </form>
          )}
        </div>
      </section>
    );
  }

  // ==========================================================================
  // RENDER: ACTIVE GROUP VIEW
  // ==========================================================================
  const isAdmin = group.user_role === 'ADMIN';

  return (
    <section className="team-tracker-section" id="my-yatra-team" style={{ margin: '2rem 0' }}>
      {/* 1. ACTIVE GROUP HEADER CARD */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '1.15rem',
        border: '1px solid #E2E8F0',
        padding: '1.75rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.75rem' }}>👥</span>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0F172A' }}>
                {group.group_name}
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: isAdmin ? '#6D28D9' : '#047857',
                background: isAdmin ? '#F5F3FF' : '#ECFDF5',
                border: `1px solid ${isAdmin ? '#DDD6FE' : '#A7F3D0'}`,
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                {isAdmin ? '👑 ADMIN' : '👤 MEMBER'}
              </span>
            </div>

            <p style={{ margin: '0.4rem 0 0', fontSize: '0.86rem', color: '#475569' }}>
              Destination: <strong>{group.site_name}</strong> • Yatra Date:{' '}
              <strong>{new Date(group.yatra_date).toLocaleDateString()}</strong> • Party Size:{' '}
              <strong>{group.member_count} Devotee{group.member_count > 1 ? 's' : ''}</strong>
            </p>
          </div>

          {/* Right Action: Join Code Badge & Leave Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Join Code Display */}
            <div style={{
              background: '#F8FAFC',
              border: '1px dashed #94A3B8',
              borderRadius: '0.65rem',
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                Join Code:
              </span>
              <strong style={{ fontSize: '1.05rem', letterSpacing: '2px', color: '#0F172A', fontFamily: 'monospace' }}>
                {group.join_code}
              </strong>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy Code to Clipboard"
                style={{
                  background: copiedCode ? '#ECFDF5' : '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: copiedCode ? '#059669' : '#334155',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '0.45rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {copiedCode ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                loadGroupData(true);
                loadGroupLocations(group.id);
              }}
              disabled={isRefreshing}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '0.55rem',
                cursor: 'pointer'
              }}
            >
              🔄 {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* Leave Group Button */}
            <button
              type="button"
              onClick={handleLeaveGroup}
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#991B1B',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '0.55rem',
                cursor: 'pointer'
              }}
            >
              🚪 Leave Group
            </button>
          </div>
        </div>

        {/* 2. ACTIVE DISTRESS ALERT BANNER (If Active) */}
        {group.active_alert && group.active_alert.status === 'ACTIVE' && (
          <div style={{
            marginTop: '1.25rem',
            background: '#FEF2F2',
            border: '2px solid #EF4444',
            borderRadius: '0.85rem',
            padding: '1.1rem 1.35rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span style={{ fontSize: '1.8rem' }}>🚨</span>
              <div>
                <strong style={{ fontSize: '1rem', color: '#991B1B', display: 'block' }}>
                  EMERGENCY DISTRESS BEACON — {group.active_alert.user_name.toUpperCase()}
                </strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#7F1D1D' }}>
                  "{group.active_alert.message || 'Devotee needs urgent assistance.'}" • Triggered{' '}
                  {new Date(group.active_alert.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {(isAdmin || group.active_alert.user_id === currentUser?.id) && (
              <button
                type="button"
                onClick={() => handleResolveAlert(group.active_alert.id)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  background: '#DC2626',
                  border: 'none',
                  borderRadius: '0.55rem',
                  cursor: 'pointer'
                }}
              >
                ✓ Mark as Resolved
              </button>
            )}
          </div>
        )}

        {/* 3. ACTION CONTROLS: ALERT TEAM + OPT-IN LOCATION SHARING */}
        <div style={{
          display: 'flex',
          gap: '0.85rem',
          marginTop: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Alert Team Button */}
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: '#FFFFFF',
              background: '#DC2626',
              border: 'none',
              borderRadius: '0.65rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
            }}
          >
            <span>🚨</span>
            <span>Alert My Yatra Team</span>
          </button>

          {/* Location Sharing Toggle (Strict Opt-in) */}
          <button
            type="button"
            onClick={handleToggleLocationSharing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: 800,
              color: isSharingLocation ? '#065F46' : '#1E293B',
              background: isSharingLocation ? '#ECFDF5' : '#F1F5F9',
              border: `1px solid ${isSharingLocation ? '#A7F3D0' : '#CBD5E1'}`,
              borderRadius: '0.65rem',
              cursor: 'pointer'
            }}
          >
            <span>{isSharingLocation ? '🟢' : '📍'}</span>
            <span>{isSharingLocation ? 'Stop Sharing Location' : 'Share My Live Location'}</span>
          </button>

          {/* Privacy Note / Status */}
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            {isSharingLocation
              ? 'Your live GPS coordinates are visible to your group.'
              : 'Location sharing is off. Strictly private.'}
          </span>
        </div>

        {locationError && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#DC2626', fontWeight: 600 }}>
            ⚠️ {locationError}
          </div>
        )}
      </div>

      {/* 4. LIVE GROUP MAP (LEAFLET) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '1.15rem',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              🗺️ Live Group Locator & Trail Map
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
              Real GPS locations of consenting members on the pilgrimage trail.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#059669' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              You
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#4F46E5' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5' }} />
              Party Members
            </span>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ height: '360px', width: '100%', borderRadius: '0.85rem', overflow: 'hidden', position: 'relative' }}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoCenter center={mapCenter} />

            {/* Destination Shrine Marker */}
            <Marker
              position={[30.7352, 79.0669]}
              icon={createCustomMarkerIcon('#D97706', group.site_name, '🛕')}
            >
              <Popup>
                <strong>{group.site_name}</strong>
                <br />
                Pilgrimage Destination
              </Popup>
            </Marker>

            {/* Current User Marker (If Sharing) */}
            {isSharingLocation && myLocation && (
              <Marker
                position={[myLocation.latitude, myLocation.longitude]}
                icon={createCustomMarkerIcon('#059669', 'You', '📍')}
              >
                <Popup>
                  <strong>You (Live Location)</strong>
                  <br />
                  Accuracy: ±{Math.round(myLocation.accuracy || 10)}m
                  <br />
                  Updated just now
                </Popup>
              </Marker>
            )}

            {/* Other Consenting Members' Markers */}
            {locations
              .filter((loc) => loc.user_id !== currentUser?.id)
              .map((loc) => (
                <Marker
                  key={loc.user_id}
                  position={[loc.latitude, loc.longitude]}
                  icon={createCustomMarkerIcon(
                    loc.is_live ? '#4F46E5' : '#64748B',
                    loc.user_name,
                    '👤'
                  )}
                >
                  <Popup>
                    <strong>{loc.user_name}</strong>
                    <br />
                    {loc.time_ago_str}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          {/* Empty Sharing State Notice Overlay */}
          {!isSharingLocation && locations.filter((l) => l.user_id !== currentUser?.id).length === 0 && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.88)',
              color: '#FFFFFF',
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              zIndex: 1000,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              💡 No party members are currently broadcasting live location. Click "Share My Live Location" to start.
            </div>
          )}
        </div>
      </div>

      {/* 5. MEMBER ROSTER & MANAGEMENT */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '1.15rem',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              Devotee Roster ({group.member_count})
            </h4>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
              Registered pilgrims in this team.
            </p>
          </div>
        </div>

        {group.members.length === 1 && (
          <div style={{
            background: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: '0.65rem',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.82rem',
            color: '#64748B'
          }}>
            ℹ️ You’re currently the only member of this Yatra group. Share join code <strong>{group.join_code}</strong> with your family or friends to join your party.
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.85rem', color: '#475569', fontWeight: 700 }}>Devotee Name</th>
                <th style={{ padding: '0.65rem 0.85rem', color: '#475569', fontWeight: 700 }}>Party Role</th>
                <th style={{ padding: '0.65rem 0.85rem', color: '#475569', fontWeight: 700 }}>Location Status</th>
                <th style={{ padding: '0.65rem 0.85rem', color: '#475569', fontWeight: 700 }}>Joined On</th>
                {isAdmin && (
                  <th style={{ padding: '0.65rem 0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>
                    Admin Controls
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {group.members.map((m) => {
                const isSelf = m.user_id === currentUser?.id;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#0F172A' }}>
                      {m.user_name} {isSelf && <span style={{ color: '#4F46E5', fontWeight: 600 }}>(You)</span>}
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: m.role === 'ADMIN' ? '#6D28D9' : '#334155',
                        background: m.role === 'ADMIN' ? '#F5F3FF' : '#F1F5F9',
                        border: `1px solid ${m.role === 'ADMIN' ? '#DDD6FE' : '#E2E8F0'}`
                      }}>
                        {m.role === 'ADMIN' ? '👑 ADMIN' : 'MEMBER'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        color: m.is_sharing_location || (isSelf && isSharingLocation) ? '#059669' : '#64748B',
                        fontWeight: 600
                      }}>
                        <span>{m.is_sharing_location || (isSelf && isSharingLocation) ? '🟢' : '⚪'}</span>
                        <span>{m.is_sharing_location || (isSelf && isSharingLocation) ? 'Live Location Active' : 'Location Off'}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.85rem', color: '#64748B' }}>
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, m.user_name)}
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#991B1B',
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              borderRadius: '0.45rem',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL: ALERT MY YATRA TEAM */}
      {isAlertModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '1.25rem',
            padding: '1.75rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '2px solid #EF4444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🚨</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#991B1B' }}>
                  Alert My Yatra Team
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  Broadcast an urgent priority signal to all registered group members.
                </p>
              </div>
            </div>

            <form onSubmit={handleTriggerAlert} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Emergency Nature
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="EMERGENCY">🚨 Immediate Emergency</option>
                  <option value="MEDICAL">🏥 Medical Assistance Needed</option>
                  <option value="SEPARATION">👥 Separated on Trail / Lost</option>
                  <option value="ASSISTANCE">🤝 Physical Assistance Required</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Situation Details / Landmarks
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Near Bhairon Temple checkpoint, separated due to crowd surge."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.88rem',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAlertModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#64748B',
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '0.55rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAlert}
                  style={{
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    background: '#DC2626',
                    border: 'none',
                    borderRadius: '0.55rem',
                    cursor: isSubmittingAlert ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)'
                  }}
                >
                  {isSubmittingAlert ? 'Broadcasting...' : '🚨 Broadcast Distress Signal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
