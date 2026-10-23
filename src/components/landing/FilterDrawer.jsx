import { useEffect, useState } from 'react';
import { X, Heart, Layers, IndianRupee, Check, Users } from 'lucide-react';
import publicApi from '../../services/publicApi';
import { categoryAudiences } from '../../data/categoryAudiences';
import { audienceMeta, svgUri } from '../../constants/audienceMeta';
import { PRICE_BANDS, draftToParams, normalizeDraft, toggleId } from '../../utils/expFilters';

/*
  Experience filters — port of the app's FilterSheet:
    Reconnect with (audiences) → Category (narrowed by audience) → Type of
    activity (from the chosen categories) → Price per person, with a live
    "Show N experiences" count. Right-side drawer on desktop, bottom sheet on
    mobile.
*/
export default function FilterDrawer({ open, taxonomy, initial, onApply, onClose }) {
  const [draft, setDraft] = useState(() => normalizeDraft(initial));
  const [types, setTypes] = useState([]);
  const [count, setCount] = useState(null);

  useEffect(() => { if (open) setDraft(normalizeDraft(initial)); }, [open, initial]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  // Live "Show N experiences" preview.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setCount(null);
    publicApi.listExperiences(draftToParams(draft))
      .then((d) => { if (!cancelled) setCount(d?.count ?? (d?.items || []).length); })
      .catch(() => { if (!cancelled) setCount(null); });
    return () => { cancelled = true; };
  }, [draft, open]);

  const audiences = taxonomy?.audiences || [];
  const allCategories = taxonomy?.categories || [];
  const selAudSlugs = audiences.filter((a) => draft.audienceIds.includes(a.id)).map((a) => a.slug);
  const categories = selAudSlugs.length
    ? allCategories.filter((c) => categoryAudiences(c).some((slug) => selAudSlugs.includes(slug)))
    : allCategories;

  const catKey = draft.categoryIds.join(',');
  useEffect(() => {
    if (!open || !catKey) { setTypes([]); return undefined; }
    let cancelled = false;
    publicApi.types(catKey)
      .then((d) => { if (!cancelled) setTypes(d?.types || []); })
      .catch(() => { if (!cancelled) setTypes([]); });
    return () => { cancelled = true; };
  }, [open, catKey]);

  const toggleMulti = (key, id) => setDraft((d) => {
    const next = { ...d, [key]: toggleId(d[key] || [], id) };
    if (key === 'audienceIds' && next.categoryIds.length) {
      const slugs = audiences.filter((a) => next.audienceIds.includes(a.id)).map((a) => a.slug);
      if (slugs.length) {
        next.categoryIds = next.categoryIds.filter((cid) => {
          const cat = allCategories.find((c) => c.id === cid);
          return !cat || categoryAudiences(cat).some((slug) => slugs.includes(slug));
        });
      }
    }
    if (next.categoryIds !== d.categoryIds && next.typeIds.length) {
      next.typeIds = next.typeIds.filter((tid) => {
        const t = types.find((x) => x.id === tid);
        return t ? next.categoryIds.includes(t.categoryId) : false;
      });
    }
    return next;
  });

  if (!open) return null;

  const chip = (sel) => `px-3.5 h-9 rounded-full text-sm font-semibold border transition ${
    sel ? 'bg-rc-brand border-rc-brand text-white' : 'bg-white border-rc-border text-rc-ink hover:border-rc-brand'
  }`;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filters">
      <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 max-h-[88vh] rounded-t-3xl sm:rounded-none sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] bg-white flex flex-col shadow-card">
        <div className="flex items-center justify-between px-5 h-16 border-b border-rc-border shrink-0">
          <span className="w-10 h-1 rounded-full bg-rc-border absolute left-1/2 -translate-x-1/2 top-2 sm:hidden" />
          <h2 className="font-sans text-lg font-extrabold text-rc-ink">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid place-items-center w-9 h-9 rounded-full hover:bg-rc-bg"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {audiences.length > 0 && (
            <section>
              <Label icon={Heart}>Reconnect with</Label>
              <div className="grid grid-cols-4 gap-2.5">
                <AudChip label="All" selected={!draft.audienceIds.length} onClick={() => setDraft((d) => ({ ...d, audienceIds: [] }))} />
                {audiences.map((a) => (
                  <AudChip key={a.id} aud={a} label={a.name} selected={draft.audienceIds.includes(a.id)} onClick={() => toggleMulti('audienceIds', a.id)} />
                ))}
              </div>
            </section>
          )}

          {categories.length > 0 && (
            <section>
              <Label icon={Layers}>Category</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c.id} type="button" className={chip(draft.categoryIds.includes(c.id))} onClick={() => toggleMulti('categoryIds', c.id)}>{c.name}</button>
                ))}
              </div>
            </section>
          )}

          {types.length > 0 && (
            <section>
              <Label icon={Layers}>Type of activity</Label>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <button key={t.id} type="button" className={chip(draft.typeIds.includes(t.id))} onClick={() => toggleMulti('typeIds', t.id)}>{t.name}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <Label icon={IndianRupee}>Price per person</Label>
            <div className="grid gap-2">
              {PRICE_BANDS.map((b) => {
                const sel = draft.priceBand === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, priceBand: d.priceBand === b.key ? null : b.key }))}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition ${sel ? 'border-rc-brand bg-rc-brand-soft' : 'border-rc-border hover:border-rc-brand'}`}
                  >
                    <span>
                      <span className="block text-sm font-bold text-rc-ink">{b.label}</span>
                      <span className="block text-xs text-rc-ink-muted">{b.sub}</span>
                    </span>
                    {sel && <Check size={18} className="text-rc-brand-dark" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-rc-border px-5 py-4 flex items-center gap-3" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={() => setDraft(normalizeDraft({}))} className="h-12 px-5 rounded-full text-sm font-bold text-rc-ink hover:bg-rc-bg">
            Clear all
          </button>
          <button type="button" onClick={() => onApply(draft)} className="flex-1 h-12 rounded-full bg-rc-brand text-white font-extrabold hover:bg-rc-brand-dark transition">
            Show {count == null ? '…' : count} experience{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-rc-brand-dark" />
      <h3 className="font-sans text-[15px] font-extrabold text-rc-ink">{children}</h3>
    </div>
  );
}

function AudChip({ aud, label, selected, onClick }) {
  const meta = aud ? audienceMeta(aud.slug) : { tint: '#FDEFD3', svg: null };
  const src = svgUri(meta.svg);
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className="flex flex-col items-center text-center">
      <span
        className={`grid place-items-center w-full aspect-square rounded-2xl border-2 transition ${selected ? 'border-rc-brand' : 'border-transparent'}`}
        style={{ background: meta.tint }}
      >
        {src ? <img src={src} alt="" className="w-8 h-8" /> : <Users size={24} className="text-rc-brand-text" />}
      </span>
      <span className={`text-[11px] mt-1.5 leading-tight line-clamp-2 ${selected ? 'font-extrabold text-rc-ink' : 'font-semibold text-rc-ink-muted'}`}>{label}</span>
    </button>
  );
}
