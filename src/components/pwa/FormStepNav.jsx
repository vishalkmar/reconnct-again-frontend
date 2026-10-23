import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/*
  Wizard-style navigation for long forms on phones, without splitting the
  form itself (the listing form is shared with the admin/team portals):
  reads every `[data-form-section]` inside `containerRef`, shows "Step n of N",
  a progress bar and section chips, and Prev / Next jump between sections.
  The current step follows the scroll position.
*/
export default function FormStepNav({ containerRef, top = 0 }) {
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState(0);
  const chipsRef = useRef(null);
  const barRef = useRef(null);
  // Bottom edge of this bar once it is stuck under the app bar (its CSS `top`
  // + height) = where content becomes visible. Using the live rect would be
  // wrong at the top of the page, before the bar has stuck.
  const barBottom = () => {
    const el = barRef.current;
    if (!el) return 0;
    return (parseFloat(getComputedStyle(el).top) || 0) + el.offsetHeight;
  };

  // Collect sections (re-scan when the form grows, e.g. after data loads).
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const scan = () => {
      const els = [...root.querySelectorAll('[data-form-section]')]
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      setSections((prev) => (prev.length === els.length && prev.every((p, i) => p.el === els[i]) ? prev : els.map((el) => ({ el, label: el.dataset.formSection }))));
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [containerRef]);

  // Active = last section whose top has passed under the sticky bars.
  useEffect(() => {
    if (!sections.length) return undefined;
    const onScroll = () => {
      const line = barBottom() + 24;
      let idx = 0;
      sections.forEach((s, i) => { if (s.el.getBoundingClientRect().top <= line) idx = i; });
      setActive(idx);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  // Keep the active chip visible — scroll only the chip strip; scrollIntoView
  // would also touch the window and cancel an in-flight section jump.
  useEffect(() => {
    const strip = chipsRef.current;
    const chip = strip?.children[active];
    if (!strip || !chip) return;
    strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.clientWidth) / 2, behavior: 'smooth' });
  }, [active]);

  if (sections.length < 2) return null;
  const go = (i) => {
    const s = sections[Math.max(0, Math.min(sections.length - 1, i))];
    const y = s.el.getBoundingClientRect().top + window.scrollY - barBottom() - 12;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };
  const pct = Math.round(((active + 1) / sections.length) * 100);

  return (
    <div ref={barRef} className="sticky z-20 -mx-3 px-3 pt-2 pb-2 bg-surface-alt/95 backdrop-blur" style={{ top }}>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Previous section" onClick={() => go(active - 1)} disabled={active === 0} className="grid place-items-center w-9 h-9 rounded-full bg-white shadow-soft disabled:opacity-40"><ChevronLeft size={17} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted">
            <span>Step {active + 1} of {sections.length}</span>
            <span className="text-ink truncate ml-2">{sections[active]?.label}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" aria-label="Next section" onClick={() => go(active + 1)} disabled={active === sections.length - 1} className="grid place-items-center w-9 h-9 rounded-full bg-white shadow-soft disabled:opacity-40"><ChevronRight size={17} /></button>
      </div>
      <div ref={chipsRef} className="mt-2 flex gap-1.5 overflow-x-auto rc-no-scrollbar">
        {sections.map((s, i) => (
          <button
            key={s.label + i}
            type="button"
            onClick={() => go(i)}
            className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold border transition ${i === active ? 'bg-brand border-brand text-ink' : i < active ? 'bg-white border-brand/40 text-ink' : 'bg-white border-slate-200 text-ink-muted'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
