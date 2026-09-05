import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useEmergencyBanner() {
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [emergencyTimestamp, setEmergencyTimestamp] = useState(null);

  useEffect(() => {
    // Check for any active emergency on mount
    const checkExisting = async () => {
      try {
        const { data } = await supabase
          .from('platform_events')
          .select('*')
          .in('event_type', ['emergency', 'emergency_lifted'])
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data.length > 0 && data[0].event_type === 'emergency') {
          setIsEmergency(true);
          setEmergencyMessage(data[0].payload?.message || 'Emergency reroute active for Haridwar corridor.');
          setEmergencyTimestamp(new Date(data[0].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.warn('[Emergency] Failed to check existing events:', err);
      }
    };
    checkExisting();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel('platform-events-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'platform_events',
      }, (payload) => {
        const evt = payload.new;
        if (evt.event_type === 'emergency') {
          setIsEmergency(true);
          setEmergencyMessage(evt.payload?.message || 'Emergency reroute active for Haridwar corridor.');
          setEmergencyTimestamp(new Date(evt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        } else if (evt.event_type === 'emergency_lifted') {
          setIsEmergency(false);
          setEmergencyMessage('');
          setEmergencyTimestamp(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isEmergency, emergencyMessage, emergencyTimestamp };
}
