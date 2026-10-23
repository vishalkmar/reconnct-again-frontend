import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';

const THRESHOLD = 70;

/*
  Touch pull-to-refresh for app screens (the installed app turns off the
  browser's own overscroll reload). Pull down from the very top past 70px and
  release to run `onRefresh` (may return a promise). Returns an indicator
  element to render once near the top of the page.
*/
export default function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef(null);
  const fn = useRef(onRefresh);
  fn.current = onRefresh;

  useEffect(() => {
    if (!enabled) return undefined;
    const pullRef = { current: 0 };
    const set = (v) => { pullRef.current = v; setPull(v); };
    const onStart = (e) => { start.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null; };
    const onMove = (e) => {
      if (start.current == null) return;
      const d = e.touches[0].clientY - start.current;
      set(d > 0 && window.scrollY <= 0 ? Math.min(110, d * 0.5) : 0);
    };
    const onEnd = () => {
      if (start.current == null) return;
      start.current = null;
      // Displayed pull is half the finger travel → THRESHOLD px of real drag.
      if (pullRef.current >= THRESHOLD / 2) {
        setBusy(true);
        Promise.resolve(fn.current && fn.current()).finally(() => setBusy(false));
      }
      set(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [enabled]);

  const show = busy || pull > 8;
  const indicator = show ? (
    <div className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none" style={{ top: `calc(env(safe-area-inset-top) + ${busy ? 72 : 20 + pull}px)` }} aria-hidden="true">
      <span className="grid place-items-center w-10 h-10 rounded-full bg-white shadow-card">
        <RotateCw size={18} className={`text-rc-brand-dark ${busy ? 'animate-spin' : ''}`} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
      </span>
    </div>
  ) : null;
  return indicator;
}
