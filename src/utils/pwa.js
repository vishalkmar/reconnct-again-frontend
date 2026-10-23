/*
  "Are we running as the installed app?" — one answer for the whole frontend.

  PWA mode is ON when any of these is true:
    - display-mode is standalone / fullscreen / minimal-ui (installed PWA, Chrome/Edge)
    - navigator.standalone (iOS "Add to Home Screen")
    - document.referrer is android-app://… (launched by the Play Store TWA)
    - the URL carries ?source=pwa (manifest start_url + shortcuts)
    - dev/testing override ?pwa=1 (?pwa=0 turns the override off)
  Once detected it is remembered for the tab (sessionStorage), because in-app
  navigation drops ?source=pwa and an in-app reload keeps the referrer empty.
*/
const KEY = 'rc_pwa_mode';
const OVERRIDE_KEY = 'rc_pwa_override';

const ss = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};

export const isStandaloneDisplay = () => {
  if (typeof window === 'undefined') return false;
  const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
  return mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)')
    || window.navigator.standalone === true;
};

export const isTwa = () => typeof document !== 'undefined' && (document.referrer || '').startsWith('android-app://');

export function detectPwa() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);

  // Dev override for testing the PWA rules in a normal browser tab.
  if (params.get('pwa') === '1') ss.set(OVERRIDE_KEY, '1');
  if (params.get('pwa') === '0') { ss.del(OVERRIDE_KEY); ss.del(KEY); }
  if (ss.get(OVERRIDE_KEY) === '1') return true;

  const hit = isStandaloneDisplay() || isTwa() || params.get('source') === 'pwa';
  if (hit) ss.set(KEY, '1');
  return hit || ss.get(KEY) === '1';
}

export const platform = () => {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  return { iOS, android, mobile: iOS || android || /Mobi/i.test(ua) };
};
