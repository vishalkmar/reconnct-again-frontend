import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { detectPwa, isStandaloneDisplay, platform } from '../utils/pwa';

/*
  App-wide PWA state:
    isPwa       — running as the installed app (rules: member + supplier only)
    isIOS / isAndroid / isMobile
    canInstall  — the browser offered an install prompt (beforeinstallprompt)
    promptInstall() — shows that prompt; resolves 'accepted' | 'dismissed' | 'unavailable'
    installed   — the app was installed during this visit
  Also mirrors isPwa onto <html class="pwa"> for CSS-only tweaks.
*/
const PwaContext = createContext(null);

export function PwaProvider({ children }) {
  const [isPwa, setIsPwa] = useState(detectPwa);
  const [deferred, setDeferred] = useState(() => window.__rcInstallPrompt || null);
  const [installed, setInstalled] = useState(false);
  const plat = useMemo(platform, []);

  // display-mode can flip (e.g. the user installs and the tab hands over).
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setIsPwa(detectPwa() || isStandaloneDisplay());
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('pwa', isPwa);
  }, [isPwa]);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success('Reconnct installed — open it from your home screen', { id: 'pwa-installed' });
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const value = useMemo(() => ({
    isPwa,
    isIOS: plat.iOS,
    isAndroid: plat.android,
    isMobile: plat.mobile,
    canInstall: !!deferred && !isPwa,
    installed,
    promptInstall: async () => {
      if (!deferred) return 'unavailable';
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
      setDeferred(null);
      return choice?.outcome || 'dismissed';
    },
  }), [isPwa, plat, deferred, installed]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export const usePwa = () => {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa must be used within PwaProvider');
  return ctx;
};
