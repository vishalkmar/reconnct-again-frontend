import { useEffect, useState } from 'react';
import {
  ShieldCheck, BadgeCheck, ClipboardCheck, Utensils, Sparkles,
  ClipboardList, Siren, MessageSquare, CreditCard, RefreshCcw,
  Accessibility, Leaf, Lock, CalendarX, Star, Umbrella, Award,
  Building2, Globe, GraduationCap, MessageCircle, Check,
} from 'lucide-react';
import api, { fileUrl } from '../../services/api';

const ICON_MAP = {
  ShieldCheck, BadgeCheck, ClipboardCheck, Utensils, Sparkles,
  ClipboardList, Siren, MessageSquare, CreditCard, RefreshCcw,
  Accessibility, Leaf, Lock, CalendarX, Star, Umbrella, Award,
  Building2, Globe, GraduationCap, MessageCircle,
};
const resolveIcon = (name) => ICON_MAP[name] || ShieldCheck;

const MAX_ITEMS = 5;

export default function AuditChecklistSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/checklist')
      .then((res) => { if (!cancelled) setItems(res.data?.data?.items || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || items.length === 0) return null;

  const visible = items.slice(0, MAX_ITEMS);
  const total = visible.length;

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-emerald-50/60 via-white to-white">
      <div className="container-app">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold text-emerald-700 mb-3">
            <ShieldCheck size={13} />
            Trust &amp; safety
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink">
            Every retreat clears a <span className="text-emerald-600">{total}-step check</span>
          </h2>
          <p className="mt-3 text-ink-muted">Hover any step to see what we check.</p>
        </div>

        {/* ── Desktop: connected step rail with hover tooltips ── */}
        <div className="hidden md:block relative">
          {/* connecting line between the first and last node centres */}
          <span
            className="absolute top-9 h-0.5 bg-emerald-200 rounded-full"
            style={{ left: `${100 / (total * 2)}%`, right: `${100 / (total * 2)}%` }}
            aria-hidden
          />
          <ol className="grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
            {visible.map((item, i) => (
              <li key={item.id} className="group relative flex flex-col items-center px-3">
                {/* node */}
                <div className="relative z-10 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white border-2 border-emerald-500 text-emerald-600 shadow-sm transition group-hover:bg-emerald-600 group-hover:text-white">
                  <NodeIcon item={item} />
                  <span className="absolute -top-1.5 -right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold ring-2 ring-white">
                    {i + 1}
                  </span>
                </div>
                {/* label */}
                <span className="mt-3 text-sm font-semibold text-ink text-center leading-snug max-w-[10rem]">
                  {item.label}
                </span>

                {/* hover tooltip */}
                {item.description && (
                  <div className="pointer-events-none absolute top-[104px] z-20 w-56 rounded-xl bg-ink p-3 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-ink" />
                    {item.description}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* ── Mobile: compact vertical timeline ── */}
        <ol className="md:hidden relative pl-10 space-y-6">
          <span className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-emerald-200" aria-hidden />
          {visible.map((item, i) => (
            <li key={item.id} className="relative">
              <div className="absolute -left-10 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white border-2 border-emerald-500 text-emerald-600">
                <NodeIcon item={item} small />
                <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-bold ring-2 ring-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold text-ink leading-snug">{item.label}</h3>
              {item.description && <p className="mt-1 text-sm text-ink-muted">{item.description}</p>}
            </li>
          ))}
        </ol>

        {/* Footer note */}
        <div className="mt-14 md:mt-16 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-emerald-600" /> Independently audited</span>
          <span className="inline-flex items-center gap-1.5"><RefreshCcw size={15} className="text-emerald-600" /> Re-checked annually</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck size={15} className="text-emerald-600" /> Verified before listing</span>
        </div>
      </div>
    </section>
  );
}

function NodeIcon({ item, small }) {
  const Icon = resolveIcon(item.iconName);
  const sz = small ? 16 : 26;
  if (item.iconUrl) {
    return <img src={fileUrl(item.iconUrl)} alt="" style={{ width: sz, height: sz }} className="object-contain" />;
  }
  return <Icon size={sz} strokeWidth={1.9} />;
}
