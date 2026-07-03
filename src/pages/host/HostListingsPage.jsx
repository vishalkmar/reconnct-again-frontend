import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, PlusCircle, Pencil, Trash2, MapPin, Clock, ImageOff, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
};

export default function HostListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/host/listings')
      .then(({ data }) => setListings((data.data || data).listings || []))
      .catch(() => toast.error('Could not load your listings'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setRemoving(id);
    try {
      await api.delete(`/host/listings/${id}`);
      setListings((prev) => prev.filter((l) => l.id !== id));
      toast.success('Listing deleted');
    } catch {
      toast.error('Could not delete');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">My Listings</h1>
          <p className="text-sm text-ink-muted mt-1">Your experiences — drafts, pending review and published.</p>
        </div>
        <Link to="/host/listings/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 transition">
          <PlusCircle size={18} /> Create Listing
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" size={24} /></div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-alt mx-auto flex items-center justify-center mb-3">
            <PlusCircle size={26} className="text-brand" />
          </div>
          <h3 className="font-semibold text-ink">No listings yet</h3>
          <p className="text-sm text-ink-muted mt-1 mb-4">Create your first experience to start hosting.</p>
          <Link to="/host/listings/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-ink font-semibold hover:brightness-105 transition">
            <PlusCircle size={18} /> Create Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => {
            const badge = l.isPublished ? { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' } : (STATUS_BADGE[l.status] || STATUS_BADGE.draft);
            return (
              <div key={l.id} className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col">
                <div className="relative h-40 bg-surface-alt">
                  {l.image ? (
                    <img src={fileUrl(l.image)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageOff size={28} /></div>
                  )}
                  <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-ink line-clamp-1">{l.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-ink-muted mt-1.5">
                    {l.city && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {l.city}</span>}
                    {l.durationLabel && <span className="inline-flex items-center gap-1"><Clock size={12} /> {l.durationLabel}</span>}
                  </div>
                  <div className="mt-2 text-brand-dark font-bold">
                    {l.price ? `₹${Number(l.price).toLocaleString('en-IN')}` : '—'}<span className="text-xs font-normal text-ink-muted"> / {l.priceUnit}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                    <Link to={`/host/listings/${l.id}/bookings`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-surface-alt transition" title="Bookings">
                      <CalendarCheck size={14} />
                    </Link>
                    <Link to={`/host/listings/${l.id}/edit`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-surface-alt transition">
                      <Pencil size={14} /> Edit
                    </Link>
                    <button onClick={() => remove(l.id)} disabled={removing === l.id} className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50" title="Delete">
                      {removing === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
