import { useEffect, useState, useCallback } from 'react';
import { Plus, Check, X, Loader2, Tag, Layers, ListTree } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * The Reconnct experience cascade (Task 1):
 *   1. Audiences  — multi-select chips  ("Experiences for every you")
 *   2. Category   — multi-select chips  (broad "Experience Categories")
 *   3. Type       — dependent multi-select, filled from the UNION of types
 *                   across every selected category
 *
 * Every level supports inline "+ Add custom" which POSTs to the taxonomy API
 * and immediately becomes selectable — so the admin never leaves the form.
 *
 * Controlled via `value = { audiences:number[], categoryIds:number[], typeIds:number[] }`
 * and `onChange(patch)`.
 */
export default function ExperienceTaxonomyPicker({ value, onChange, hideAudiences = false, hideCategoryType = false }) {
  const audiences = value?.audiences || [];
  const categoryIds = value?.categoryIds || [];
  const typeIds = value?.typeIds || [];

  const [audienceList, setAudienceList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [typeList, setTypeList] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const loadAudiences = useCallback(async () => {
    try {
      const res = await api.get('/experience-taxonomy/audiences');
      setAudienceList(res.data?.data?.items || []);
    } catch { /* ignore */ }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/experience-taxonomy/categories');
      setCategoryList(res.data?.data?.items || []);
    } catch { /* ignore */ }
  }, []);

  // Union of types across every selected category.
  const loadTypes = useCallback(async (catIds) => {
    if (!catIds.length) { setTypeList([]); return; }
    setLoadingTypes(true);
    try {
      const res = await api.get('/experience-taxonomy/types', { params: { categoryIds: catIds.join(',') } });
      setTypeList(res.data?.data?.items || []);
    } catch { /* ignore */ } finally { setLoadingTypes(false); }
  }, []);

  useEffect(() => { loadAudiences(); loadCategories(); }, [loadAudiences, loadCategories]);
  useEffect(() => { loadTypes(categoryIds); }, [categoryIds.join(','), loadTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAudience = (id) => {
    const next = audiences.includes(id) ? audiences.filter((x) => x !== id) : [...audiences, id];
    onChange({ audiences: next });
  };

  // "All" (no specific audience) shows every category. Picking audience(s)
  // filters to categories TAGGED with the selected audience(s). A tagged
  // category that doesn't match is hidden (so e.g. "Wellness & Healing" never
  // shows under "Kids & Teens").
  const isTagged = (c) => Array.isArray(c.audiences) && c.audiences.length > 0;
  const selectedSlugs = audienceList.filter((a) => audiences.includes(a.id)).map((a) => a.slug);
  let filteredCategories = audiences.length === 0
    ? categoryList
    : categoryList.filter((c) => isTagged(c) && c.audiences.some((s) => selectedSlugs.includes(s)));
  // Keep chosen LEGACY (untagged) categories visible so editing older data
  // doesn't silently lose them. Tagged-but-mismatched ones are dropped by the
  // effect below instead.
  if (audiences.length > 0 && categoryIds.length) {
    const missing = categoryList.filter((c) => categoryIds.includes(c.id) && !isTagged(c) && !filteredCategories.some((f) => f.id === c.id));
    if (missing.length) filteredCategories = [...filteredCategories, ...missing];
  }

  // Drop any TAGGED selected category that no longer matches the selected audience(s).
  useEffect(() => {
    if (hideCategoryType || !categoryIds.length || !categoryList.length || !audienceList.length || audiences.length === 0) return;
    const slugs = audienceList.filter((a) => audiences.includes(a.id)).map((a) => a.slug);
    const stillValid = categoryIds.filter((id) => {
      const sel = categoryList.find((c) => c.id === id);
      if (!sel) return true;
      const tagged = Array.isArray(sel.audiences) && sel.audiences.length > 0;
      return !tagged || sel.audiences.some((s) => slugs.includes(s));
    });
    if (stillValid.length !== categoryIds.length) {
      const validTypeCategoryIds = new Set(stillValid);
      const nextTypeIds = typeIds.filter((tid) => {
        const t = typeList.find((x) => x.id === tid);
        return t ? validTypeCategoryIds.has(t.categoryId) : true;
      });
      onChange({ categoryIds: stillValid, typeIds: nextTypeIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audiences.join(','), categoryList.length, audienceList.length]);

  const toggleCategory = (id) => {
    const next = categoryIds.includes(id) ? categoryIds.filter((x) => x !== id) : [...categoryIds, id];
    // Dropping a category also drops any selected type that belonged only to it.
    const nextTypeIds = categoryIds.includes(id)
      ? typeIds.filter((tid) => {
        const t = typeList.find((x) => x.id === tid);
        return t ? next.includes(t.categoryId) : true;
      })
      : typeIds;
    onChange({ categoryIds: next, typeIds: nextTypeIds });
  };

  const toggleType = (id) => {
    const next = typeIds.includes(id) ? typeIds.filter((x) => x !== id) : [...typeIds, id];
    onChange({ typeIds: next });
  };

  return (
    <div className="space-y-6">
      {/* 1) Audiences — multi */}
      {!hideAudiences && (
      <Section icon={Tag} title="Who is this for?" hint="Pick “All”, or one or more groups — the broad categories below filter to match.">
        <ChipRow>
          <Chip active={audiences.length === 0} onClick={() => onChange({ audiences: [] })}>
            All
            {audiences.length === 0 && <Check size={13} className="ml-1" />}
          </Chip>
          {audienceList.map((a) => (
            <Chip key={a.id} active={audiences.includes(a.id)} onClick={() => toggleAudience(a.id)}>
              {a.name}
              {audiences.includes(a.id) && <Check size={13} className="ml-1" />}
            </Chip>
          ))}
          <InlineAdd
            label="Add audience"
            onCreate={async (name) => {
              const res = await api.post('/experience-taxonomy/audiences', { name });
              const item = res.data?.data?.item;
              await loadAudiences();
              if (item) onChange({ audiences: [...audiences, item.id] });
            }}
          />
        </ChipRow>
      </Section>
      )}

      {!hideCategoryType && (<>
      {/* 2) Broad category — multi */}
      <Section icon={Layers} title="Broad category" hint={audiences.length === 0 ? 'Pick one or more — the type list below fills from all of them.' : 'Showing categories for the selected audience(s).'}>
        <ChipRow>
          {filteredCategories.length === 0 && (
            <span className="text-sm text-ink-muted italic">No categories for this audience yet — add one below.</span>
          )}
          {filteredCategories.map((c) => (
            <Chip key={c.id} active={categoryIds.includes(c.id)} onClick={() => toggleCategory(c.id)}>
              {c.icon ? `${c.icon} ` : ''}{c.name}
              {categoryIds.includes(c.id) && <Check size={13} className="ml-1" />}
            </Chip>
          ))}
          <InlineAdd
            label="Add category"
            onCreate={async (name) => {
              // Tag the new category with the current audience selection so it
              // immediately shows under that audience's filter.
              const res = await api.post('/experience-taxonomy/categories', { name, audiences: selectedSlugs });
              const item = res.data?.data?.item;
              await loadCategories();
              if (item) onChange({ categoryIds: [...categoryIds, item.id] });
            }}
          />
        </ChipRow>
      </Section>

      {/* 3) Type — dependent multi, union across every selected category */}
      <Section
        icon={ListTree}
        title="Type of activity / event"
        hint={categoryIds.length ? 'Pick one or more specific types, or add a custom one.' : 'Select a broad category first.'}
      >
        {!categoryIds.length ? (
          <div className="text-sm text-ink-muted italic">Choose a broad category above to see its types.</div>
        ) : loadingTypes ? (
          <div className="text-sm text-ink-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading types…</div>
        ) : (
          <ChipRow>
            {typeList.map((t) => (
              <Chip key={t.id} active={typeIds.includes(t.id)} onClick={() => toggleType(t.id)}>
                {t.name}
                {typeIds.includes(t.id) && <Check size={13} className="ml-1" />}
              </Chip>
            ))}
            <InlineAdd
              label="Add type"
              onCreate={async (name) => {
                // New custom types need exactly one parent category — the most
                // recently selected one.
                const targetCategoryId = categoryIds[categoryIds.length - 1];
                const res = await api.post('/experience-taxonomy/types', { name, categoryId: targetCategoryId });
                const item = res.data?.data?.item;
                await loadTypes(categoryIds);
                if (item) onChange({ typeIds: [...typeIds, item.id] });
              }}
            />
          </ChipRow>
        )}
      </Section>
      </>)}
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={16} className="text-brand" />
        <h3 className="font-semibold text-ink">{title}</h3>
      </div>
      {hint && <p className="text-xs text-ink-muted mb-3">{hint}</p>}
      {children}
    </div>
  );
}

function ChipRow({ children }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
        active
          ? 'bg-brand text-ink border-brand shadow-soft'
          : 'bg-white text-ink border-gray-200 hover:border-brand/50 hover:text-brand'
      }`}
    >
      {children}
    </button>
  );
}

function InlineAdd({ label, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onCreate(trimmed);
      toast.success('Added');
      setName(''); setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add');
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-brand/50 text-brand hover:bg-brand/10 transition"
      >
        <Plus size={14} /> {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand bg-white pl-3 pr-1 py-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') setOpen(false); }}
        placeholder={label}
        className="text-sm outline-none w-32"
        disabled={saving}
      />
      <button type="button" onClick={submit} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
      </button>
      <button type="button" onClick={() => { setOpen(false); setName(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full">
        <X size={15} />
      </button>
    </span>
  );
}
