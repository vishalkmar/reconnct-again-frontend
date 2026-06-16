import { useEffect, useRef } from 'react';

/**
 * A soft, smooth "bulb" of light that trails the cursor — a large blurred glow
 * plus a small glass orb core. Purely decorative (pointer-events: none), sits
 * behind the header/modals, and auto-disables on touch devices or when the user
 * prefers reduced motion.
 */
export default function CursorGlow() {
  const glowRef = useRef(null);
  const orbRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return undefined; // no mouse / reduced motion → skip

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const glow = { ...target };
    const orb = { ...target };
    let raf;
    let visible = false;

    const show = (on) => {
      visible = on;
      const o = on ? '1' : '0';
      if (glowRef.current) glowRef.current.style.opacity = o;
      if (orbRef.current) orbRef.current.style.opacity = o;
    };

    const onMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) show(true);
    };
    const onLeave = () => show(false);

    const tick = () => {
      // Different easing per layer → a little depth/parallax.
      glow.x += (target.x - glow.x) * 0.10;
      glow.y += (target.y - glow.y) * 0.10;
      orb.x += (target.x - orb.x) * 0.22;
      orb.y += (target.y - orb.y) * 0.22;
      if (glowRef.current) glowRef.current.style.transform = `translate3d(${glow.x}px, ${glow.y}px, 0) translate(-50%, -50%)`;
      if (orbRef.current) orbRef.current.style.transform = `translate3d(${orb.x}px, ${orb.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    tick();

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={glowRef} aria-hidden style={GLOW} />
      <div ref={orbRef} aria-hidden style={ORB} />
    </>
  );
}

const BASE = {
  position: 'fixed',
  top: 0,
  left: 0,
  pointerEvents: 'none',
  zIndex: 35, // under header (40) & modals (100), over page content
  opacity: 0,
  transition: 'opacity .45s ease',
  willChange: 'transform',
};

// Large soft ambient glow.
const GLOW = {
  ...BASE,
  width: 460,
  height: 460,
  borderRadius: '9999px',
  background:
    'radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(45,212,191,0.13) 35%, rgba(16,185,129,0) 70%)',
  filter: 'blur(42px)',
};

// Small glass orb core — glassmorphism.
const ORB = {
  ...BASE,
  width: 30,
  height: 30,
  borderRadius: '9999px',
  background: 'rgba(255,255,255,0.10)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow:
    '0 0 20px 5px rgba(16,185,129,0.35), inset 0 0 8px rgba(255,255,255,0.45)',
};
