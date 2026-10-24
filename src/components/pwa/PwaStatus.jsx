import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';
import { WifiOff } from 'lucide-react';
import useOnline from '../../hooks/useOnline';

const UPDATE_CHECK_MS = 15 * 60 * 1000; // every 15 min while open
const READY_KEY = 'rc_offline_ready_shown';

// eslint-disable-next-line no-undef
export const APP_BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev';
if (typeof window !== 'undefined') window.__rcBuild = APP_BUILD;

/*
  Service-worker lifecycle + connectivity UI, mounted once at the app root:
    - registers the SW (vite-plugin-pwa, registerType 'prompt')
    - applies a new build as soon as it is downloaded (reloads onto it), so the
      installed app never keeps showing an old deploy
    - checks for a new build on launch, when the app comes back to the
      foreground, and every 15 minutes
    - one-time "Ready to work offline" toast
    - slim offline banner, and `rc:back-online` when the network returns
*/
export default function PwaStatus() {
  const online = useOnline();
  const wasOffline = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, reg) {
      if (!reg) return;
      const check = () => {
        if (!navigator.onLine || reg.installing) return;
        reg.update().catch(() => {});
      };
      check();
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    },
  });

  // New build downloaded → switch to it right away (reloads the page).
  useEffect(() => {
    if (!needRefresh) return;
    setNeedRefresh(false);
    updateServiceWorker(true);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    if (!offlineReady) return;
    let shown = false;
    try { shown = localStorage.getItem(READY_KEY) === '1'; localStorage.setItem(READY_KEY, '1'); } catch { /* ignore */ }
    if (!shown) toast.success('Ready to work offline', { id: 'sw-ready' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!online) { wasOffline.current = true; return; }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success('Back online', { id: 'net' });
      window.dispatchEvent(new Event('rc:back-online'));
    }
  }, [online]);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 bg-rc-navy text-white text-xs font-semibold px-4 py-2 rounded-full shadow-card"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <WifiOff size={14} /> You’re offline — showing saved content
    </div>
  );
}
