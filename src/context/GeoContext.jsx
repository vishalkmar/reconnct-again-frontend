import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import publicApi from '../services/publicApi';

/*
  Web twin of the app's LocationContext (App/reconnct/src/store/LocationContext.jsx):
    - asks the browser for the exact position (permission prompt, like the app)
    - resolves it server-side via /public/geo/locate → city, area, pincode,
      full address and lat/lon. Without a fix the backend falls back to an
      IP-based city, exactly as for the app — so "Near you" still has coords.
    - the visitor can override the city manually (persisted per browser).
*/
const GeoContext = createContext(null);
const CITY_KEY = 'rc_selected_city';

const readCity = () => { try { return localStorage.getItem(CITY_KEY) || null; } catch { return null; } };

const getBrowserCoords = () => new Promise((resolve) => {
  if (!('geolocation' in navigator)) { resolve({ coords: null, denied: false }); return; }
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ coords: { lat: p.coords.latitude, lon: p.coords.longitude }, denied: false }),
    (err) => resolve({ coords: null, denied: err && err.code === 1 }),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
});

export function GeoProvider({ children }) {
  const [detected, setDetected] = useState(null);
  const [selectedCity, setSelectedCityState] = useState(readCity);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(null); // 'granted' | 'denied' | 'prompt' | null
  // Permission granted but no fix, or permission denied → exact "near you"
  // can't work; Home shows the amber "Location is off" strip (app parity).
  const [servicesOff, setServicesOff] = useState(false);

  // `ask`: allowed to show the browser's permission prompt. On page load we
  // only use GPS if permission was already granted (no unprompted pop-up —
  // a browser best practice); otherwise the city comes from the IP and the
  // "Location is off → Turn on" strip asks on a tap.
  const detect = useCallback(async (ask = false) => {
    setLoading(true);
    try {
      let state = 'prompt';
      try { state = (await navigator.permissions?.query({ name: 'geolocation' }))?.state || 'prompt'; } catch { /* Safari < 16 */ }
      if (!ask && state !== 'granted') setServicesOff(true);
      const { coords, denied } = (ask || state === 'granted')
        ? await getBrowserCoords()
        : { coords: null, denied: state === 'denied' };
      setPermission(coords ? 'granted' : (denied ? 'denied' : 'prompt'));
      setServicesOff(!coords);
      const d = await publicApi.geoLocate(coords && coords.lat, coords && coords.lon);
      setDetected(d && (d.city || d.fullAddress) ? d : null);
    } catch {
      /* geo endpoint unreachable → stay silent, the feed still loads */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { detect(false); }, [detect]);

  // Coming back to the tab re-checks, like the app's AppState 'active' hook —
  // only when permission is already granted so we never re-prompt.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((s) => { if (s.state === 'granted' && servicesOff) detect(false); })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [detect, servicesOff]);

  const setSelectedCity = useCallback((name) => {
    setSelectedCityState(name || null);
    try {
      if (name) localStorage.setItem(CITY_KEY, name);
      else localStorage.removeItem(CITY_KEY);
    } catch { /* storage blocked — keep it in memory only */ }
  }, []);

  const value = useMemo(() => ({
    detected,
    loading,
    permission,
    servicesOff,
    coords: detected && detected.lat != null ? { lat: detected.lat, lon: detected.lon } : null,
    city: selectedCity || (detected && detected.city) || null,
    detectedCity: detected && detected.city,
    area: detected && detected.area,
    pincode: detected && (detected.pincode || detected.postcode),
    fullAddress: (detected && detected.fullAddress) || null,
    selectedCity,
    setSelectedCity,
    promptEnableLocation: () => detect(true),
    refresh: () => detect(true),
  }), [detected, loading, permission, servicesOff, selectedCity, setSelectedCity, detect]);

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}

export const useGeo = () => {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error('useGeo must be used within GeoProvider');
  return ctx;
};
