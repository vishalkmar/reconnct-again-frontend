import { useEffect, useState } from 'react';
import {
  Image as ImageIcon, ChevronLeft, ChevronRight, Building2,
  MapPin, Calendar, User, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../services/api';

/*
  Read-only viewer for the final listing images that auditors upload from the
  PWA after a property is approved. Sits alongside the existing Signed
  Properties / Auditors / Officers admin tools.

  Two-pane:
   - left list of approved properties + image counts
   - right detail with per-section galleries and a lightbox.
*/

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '-');

export default function PropertyListingImagesPage() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get('/pwa/admin/listing-images')
      .then((r) => { if (alive) setItems(r.data?.data?.items || []); })
      .finally(() => { if (alive) setLoadingList(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let alive = true;
    setLoadingDetail(true);
    api.get(`/pwa/admin/listing-images/${selectedId}`)
      .then((r) => {
        if (!alive) return;
        const d = r.data?.data || null;
        setDetail(d);
        // expand the first non-empty section
        const firstNonEmpty = d?.sections?.find((s) => (d.images?.[s.key] || []).length > 0);
        setOpenSections(firstNonEmpty ? { [firstNonEmpty.key]: true } : {});
      })
      .finally(() => { if (alive) setLoadingDetail(false); });
    return () => { alive = false; };
  }, [selectedId]);

  const toggleSection = (key) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Property Listing Images</h1>
          <p className="text-sm text-ink-muted">
            Section-tagged photos uploaded by auditors for approved properties.
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          {items.length} {items.length === 1 ? 'property' : 'properties'}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        {/* Left — property list */}
        <aside className="card max-h-[calc(100vh-12rem)] overflow-y-auto">
          {loadingList ? (
            <div className="p-6 text-sm text-ink-muted">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto text-ink-muted" size={28} />
              <p className="mt-3 text-sm text-ink-muted">No approved properties yet.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((p) => {
                const active = selectedId === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                        active ? 'bg-brand/5 border-l-4 border-brand pl-3' : 'hover:bg-surface-alt'
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                        <ImageIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                        <span className="block truncate text-[11px] text-ink-muted">
                          {p.propertyCode || 'No ID'} · {fmtDate(p.approvedAt)}
                        </span>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {p.imageCount} {p.imageCount === 1 ? 'photo' : 'photos'}
                        </span>
                      </span>
                      <ChevronRight size={16} className="mt-3 text-ink-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right — detail */}
        <main className="card min-h-[300px] overflow-hidden">
          {!selectedId ? (
            <div className="grid place-items-center p-10 text-center">
              <ImageIcon className="text-ink-muted" size={36} />
              <p className="mt-3 text-sm text-ink-muted">
                Select a property on the left to view its section-tagged images.
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="p-8 text-sm text-ink-muted">Loading photos…</div>
          ) : !detail ? (
            <div className="p-8 text-sm text-rose-600">Could not load property.</div>
          ) : (
            <div>
              {/* Property header */}
              <div className="border-b bg-surface-alt p-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden rounded-full p-1.5 text-ink-muted hover:bg-white"
                    aria-label="Back to list"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="font-display text-lg font-bold text-ink">{detail.property.name}</h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {detail.property.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-ink-muted sm:grid-cols-2 lg:grid-cols-3">
                  <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {detail.property.address}</span>
                  {detail.property.propertyCode && (
                    <span className="inline-flex items-center gap-1.5"><Building2 size={12} /> {detail.property.propertyCode}</span>
                  )}
                  {detail.property.approvedAt && (
                    <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> Approved {fmtDate(detail.property.approvedAt)}</span>
                  )}
                  {detail.property.auditor && (
                    <span className="inline-flex items-center gap-1.5"><User size={12} /> {detail.property.auditor.name}</span>
                  )}
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-3 p-5">
                {detail.sections.map((s) => {
                  const arr = detail.images?.[s.key] || [];
                  const open = !!openSections[s.key];
                  return (
                    <div key={s.key} className="overflow-hidden rounded-2xl border border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleSection(s.key)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left ${arr.length === 0 ? 'bg-slate-50' : 'bg-white hover:bg-surface-alt'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`grid h-8 w-8 place-items-center rounded-lg ${arr.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            <ImageIcon size={14} />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-ink">{s.label}</div>
                            <div className="text-[11px] text-ink-muted">
                              {arr.length} {arr.length === 1 ? 'photo' : 'photos'} · {s.required ? 'Required' : 'Optional'}
                            </div>
                          </div>
                        </div>
                        {open ? <ChevronUp size={16} className="text-ink-muted" /> : <ChevronDown size={16} className="text-ink-muted" />}
                      </button>
                      {open && arr.length > 0 && (
                        <div className="border-t bg-white p-3">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {arr.map((img) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setLightboxUrl(img.url)}
                                className="group relative aspect-square overflow-hidden rounded-xl border border-slate-100 bg-slate-100"
                              >
                                <img
                                  src={img.url}
                                  alt=""
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                                <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                  {img.captureMode === 'live' ? 'Live' : 'Upload'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {open && arr.length === 0 && (
                        <div className="border-t bg-white px-4 py-3 text-[12px] italic text-ink-muted">
                          No photos uploaded yet for this section.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink hover:bg-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
