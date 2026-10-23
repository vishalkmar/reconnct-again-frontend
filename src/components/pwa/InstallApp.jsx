import { useState } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePwa } from '../../context/PwaContext.jsx';
import BrandMark from '../landing/BrandMark.jsx';
import { PLAY_STORE_URL } from '../../config/appLinks';

/*
  "Install the app" building blocks. The Reconnct app is ANDROID-ONLY, so
  these render on Android phones only — never on iPhone or desktop, and
  never inside the installed app itself:
    InstallAppButton — opens the Reconnct listing on Google Play
    PlayStoreButton  — "Get it on Google Play" pill, shown everywhere but iPhone
    InstallBanner    — dismissible landing banner (7-day snooze)
*/
const SNOOZE_KEY = 'rc_install_banner_snooze';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

// Clarity custom event, if Clarity is running on this page (never on staff pages).
export const track = (name) => { try { window.clarity?.('event', name); } catch { /* ignore */ } };

// The app is installed from Google Play (not the browser's install prompt).
export function InstallAppButton({ className = '', children, source = 'button' }) {
  const { isPwa, isAndroid } = usePwa();
  if (isPwa || !isAndroid) return null;
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => track(`play_store_click_${source}`)} className={className}>
      {children || (<><Smartphone size={16} /> Install app</>)}
    </a>
  );
}

// Google Play's triangle mark, in its four brand colours.
export function PlayMark({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 26" width={size} height={size} aria-hidden="true">
      <path d="M1.2 0.6 13.4 12.9 1.2 25.2C.7 24.9.4 24.4.4 23.7V2.1C.4 1.4.7.9 1.2.6Z" fill="#00D7FE" />
      <path d="M17.5 8.8 13.4 12.9 1.2.6c.4-.3 1-.3 1.6 0l14.7 8.2Z" fill="#00F076" />
      <path d="M17.5 17 2.8 25.2c-.6.3-1.2.3-1.6 0L13.4 12.9l4.1 4.1Z" fill="#FF3A44" />
      <path d="M22.4 11.5c1 .6 1 2.2 0 2.8L17.5 17l-4.1-4.1 4.1-4.1 4.9 2.7Z" fill="#FFD400" />
    </svg>
  );
}

// "Get it on Google Play" — dark pill in the store-badge style.
export function PlayStoreButton({ source = 'button', className = '', light = false }) {
  const { isPwa, isIOS } = usePwa();
  if (isPwa || isIOS) return null;
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(`play_store_click_${source}`)}
      aria-label="Get it on Google Play"
      className={`inline-flex items-center gap-3 h-[52px] pl-4 pr-5 rounded-2xl transition hover:-translate-y-0.5 ${light ? 'bg-white text-rc-navy shadow-[0_10px_24px_-14px_rgba(16,24,40,0.5)]' : 'bg-black text-white border border-white/25 hover:bg-[#111]'} ${className}`}
    >
      <PlayMark size={24} />
      <span className="text-left leading-none">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">Get it on</span>
        <span className="block text-[18px] font-bold mt-0.5">Google Play</span>
      </span>
    </a>
  );
}

export function InstallBanner() {
  const { isPwa, isAndroid } = usePwa();
  const [hidden, setHidden] = useState(() => {
    try { return Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0); } catch { return false; }
  });
  if (isPwa || hidden || !isAndroid) return null;

  const snooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* ignore */ }
    setHidden(true);
    track('pwa_install_banner_dismiss');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
      <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-soft border border-rc-border">
        <span className="grid place-items-center w-12 h-12 rounded-xl rc-hero-grad shrink-0"><BrandMark color="#FFFFFF" className="h-3 w-10" /></span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-rc-ink">Get the Reconnct Android app</div>
          <div className="text-xs text-rc-ink-muted truncate">Faster, works offline, one tap from your home screen.</div>
        </div>
        <InstallAppButton source="banner" className="shrink-0 inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-rc-brand text-white text-xs font-extrabold">
          <Download size={14} /> Install
        </InstallAppButton>
        <button type="button" onClick={snooze} aria-label="Not now" className="grid place-items-center w-8 h-8 rounded-full text-rc-ink-faint hover:bg-rc-bg shrink-0"><X size={16} /></button>
      </div>
    </div>
  );
}
