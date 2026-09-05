import { useState, useEffect } from 'react';
import { fetchActiveRerouteAlert } from '../api/api';
import { supabase } from '../supabaseClient';

export function useEmergencyBanner() {
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [emergencyTimestamp, setEmergencyTimestamp] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Check authoritative active emergency from FastAPI backend on mount and heartbeat
    const checkActiveReroute = async () => {
      try {
        const res = await fetchActiveRerouteAlert();
        if (!isMounted) return;
        if (res && res.is_active && res.alert) {
          setIsEmergency(true);
          setEmergencyMessage(
            res.alert.notes || res.alert.message || `EMERGENCY REROUTE ACTIVE for ${res.alert.site_name || 'Corridor'}. Inbound traffic diverted.`
          );
          const t = res.alert.activated_at || res.alert.timestamp;
          setEmergencyTimestamp(
            t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          );
        } else {
          setIsEmergency(false);
          setEmergencyMessage('');
          setEmergencyTimestamp(null);
        }
      } catch (err) {
        console.warn('[Emergency] Error checking active reroute:', err);
      }
    };
    checkActiveReroute();

    // Instant local event listener for immediate reactivity across dashboards
    const handleRerouteEvent = (e) => {
      const detail = e.detail;
      if (detail && detail.is_active && detail.alert) {
        setIsEmergency(true);
        setEmergencyMessage(
          detail.alert.notes || detail.alert.message || `EMERGENCY REROUTE ACTIVE for ${detail.alert.site_name || 'Corridor'}.`
        );
        const t = detail.alert.activated_at || detail.alert.timestamp;
        setEmergencyTimestamp(
          t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        );
      } else {
        setIsEmergency(false);
        setEmergencyMessage('');
        setEmergencyTimestamp(null);
      }
    };
    window.addEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);

    // 6-second heartbeat polling for cross-window / cross-device synchronization
    const pollTimer = setInterval(checkActiveReroute, 6000);

    // Also listen to Supabase realtime channel if available
    let channel = null;
    try {
      channel = supabase
        .channel('platform-events-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_events',
        }, (payload) => {
          const evt = payload.new;
          if (evt.event_type === 'emergency') {
            setIsEmergency(true);
            setEmergencyMessage(evt.payload?.message || 'Emergency reroute active.');
            setEmergencyTimestamp(new Date(evt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
          } else if (evt.event_type === 'emergency_lifted') {
            setIsEmergency(false);
            setEmergencyMessage('');
            setEmergencyTimestamp(null);
          }
        })
        .subscribe();
    } catch {}

    return () => {
      isMounted = false;
      window.removeEventListener('yatrasetu:emergency_reroute', handleRerouteEvent);
      clearInterval(pollTimer);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  return { isEmergency, emergencyMessage, emergencyTimestamp };
}
