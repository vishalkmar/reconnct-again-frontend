import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePwa } from '../../context/PwaContext.jsx';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';

const SEEN_KEY = 'rc_intro_seen';
// Same three illustrations as the Android app's IntroScreen (public/intro/).
const SLIDES = [
  { img: '/intro/intro1.png', title: 'Experiences for every moment', text: 'Adventure, food, wellness, culture — curated near you.' },
  { img: '/intro/intro2.png', title: 'Reconnect with your people', text: 'Plans made for friends, family, your partner, kids — or just you.' },
  { img: '/intro/intro3.png', title: 'Book in a few taps', text: 'Pick a date and slot, pay securely, and get your voucher instantly.' },
];

/*
  Skippable 3-slide intro shown once, the first time the installed app opens
  (never in a normal browser tab, never to someone already signed in, never
  on deep links into the partner area).
*/
export default function IntroSlides() {
  const { isPwa } = usePwa();
  const { isAuthenticated } = useUserAuth();
  const { supplier } = useSupplierAuth();
  const { pathname } = useLocation();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(() => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } });
  const touchX = useRef(null);

  if (!isPwa || done || isAuthenticated || supplier || pathname !== '/') return null;

  const finish = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    setDone(true);
  };
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : finish());
  const s = SLIDES[i];

  return (
    <div
      className="fixed inset-0 z-[96] bg-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Reconnct"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -50) next();
        if (dx > 50 && i > 0) setI(i - 1);
        touchX.current = null;
      }}
    >
      <div className="flex justify-end p-4">
        <button type="button" onClick={finish} className="text-sm font-bold text-rc-ink-muted px-3 py-2">Skip</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <img key={s.img} src={s.img} alt="" className="w-72 h-72 max-w-full object-contain animate-[fadeIn_300ms_ease-out]" />
        <h2 className="font-sans text-2xl font-black text-rc-navy mt-7">{s.title}</h2>
        <p className="text-rc-ink-muted mt-2 max-w-xs">{s.text}</p>
      </div>
      <div className="px-6 pb-8">
        <div className="flex justify-center gap-1.5 mb-6" aria-hidden="true">
          {SLIDES.map((x, k) => <span key={x.img} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-rc-brand' : 'w-1.5 bg-rc-border'}`} />)}
        </div>
        <button type="button" onClick={next} className="w-full h-14 rounded-2xl bg-rc-brand text-white text-base font-extrabold">
          {i < SLIDES.length - 1 ? 'Next' : 'Get started'}
        </button>
      </div>
    </div>
  );
}
