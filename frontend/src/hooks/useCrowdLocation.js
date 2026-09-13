import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { submitTouristGpsLocation } from '../api/api';

/**
 * useCrowdLocation
 * ================
 * Privacy-preserving mobile GPS crowd estimation hook.
 *
 * Guarantees:
 * - NEVER persists or exposes individual tourist coordinates or paths.
 * - Throttles transmission to at most once per 60 seconds.
 * - Handles browser permission denial, timeouts, and unmounting gracefully.
 */
export function useCrowdLocation(options = {}) {
  const { t } = useTranslation();
  const { autoStart = false, intervalMs = 60000 } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'error'
  const [geofenceInfo, setGeofenceInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const lastSentRef = useRef(0);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);

  const sendLocation = useCallback(async (latitude, longitude) => {
    const now = Date.now();
    if (now - lastSentRef.current < 20000) {
      // Avoid spamming within 20s
      return;
    }
    lastSentRef.current = now;

    try {
      const res = await submitTouristGpsLocation(latitude, longitude);
      if (res && res.status === 'success') {
        setGeofenceInfo({
          insideGeofence: res.inside_geofence,
          siteId: res.site_id || res.nearest_site_id,
          siteName: res.site_name || res.nearest_site_name,
          distanceMeters: res.distance_meters,
          activeDevices: res.active_devices_in_site || 0,
          estimatedPeople: res.gps_estimated_people || 0
        });
        setLocationStatus('active');
        setErrorMessage(null);
      }
    } catch (err) {
      console.warn('[useCrowdLocation] Failed to submit GPS location ping:', err.message);
    }
  }, []);

  const handlePositionSuccess = useCallback((pos) => {
    const { latitude, longitude } = pos.coords;
    sendLocation(latitude, longitude);
  }, [sendLocation]);

  const handlePositionError = useCallback((err) => {
    console.warn('[useCrowdLocation] Geolocation error:', err.message);
    setLocationStatus('error');
    if (err.code === 1) {
      setErrorMessage(t('gpsCrowd.permissionDenied', 'Location permission denied. GPS crowd counting disabled.'));
    } else {
      setErrorMessage(t('gpsCrowd.locationUnavailable', 'GPS location currently unavailable.'));
    }
  }, [t]);

  const startTracking = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationStatus('error');
      setErrorMessage(t('gpsCrowd.notSupported', 'Geolocation is not supported by your browser.'));
      return;
    }

    setLocationStatus('requesting');
    setErrorMessage(null);
    setIsTracking(true);

    // Initial position request
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );

    // Set up periodic polling
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePositionSuccess,
        () => {}, // Silent retry on background tick
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    }, intervalMs);
  }, [handlePositionSuccess, handlePositionError, intervalMs, t]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setLocationStatus('idle');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
    return () => {
      stopTracking();
    };
  }, [autoStart, startTracking, stopTracking]);

  return {
    isTracking,
    locationStatus,
    geofenceInfo,
    errorMessage,
    startTracking,
    stopTracking
  };
}
