import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Loader2, FileText, Download, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const TABS = [
  { key: 'config', label: 'Listing & Configuration' },
  { key: 'process', label: 'Property on Process' },
  { key: 'contracts', label: 'Signed Contracts' },
];

export default function PwaListingPage() {
  const [tab, setTab] = useState('config');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Globe size={22} className="text-brand" /> Website Listing
        </h1>
        <p className="text-ink-muted text-sm">
          Configure onboarded properties and publish them to the website.
        </p>
      </div>

      <div className="flex gap-1 border-b mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigTab />}
      {tab === 'process' && <ProcessTab />}
      {tab === 'contracts' && <ContractsTab />}
    </div>
  );
}

/* ─────────────────────────── Tab 1: Listing & Config ─────────────────── */

function ConfigTab() {
  const navigate = useNavigate();
  const [sub, setSub] = useState('queue'); // queue | listed
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/pwa/admin/listings/${sub}`);
      setItems(res.data.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [sub]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="inline-flex bg-surface-alt rounded-lg p-1 text-sm mb-4">
        <button
          onClick={() => setSub('queue')}
          className={`px-3 py-1.5 rounded-md ${sub === 'queue' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted'}`}
        >
          New from PWA
        </button>
        <button
          onClick={() => setSub('listed')}
          className={`px-3 py-1.5 rounded-md ${sub === 'listed' ? 'bg-white shadow-soft text-brand' : 'text-ink-muted'}`}
        >
          Listed on website
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty label={sub === 'queue' ? 'No properties waiting to be configured.' : 'No properties listed yet.'} />
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <PropertyRow key={p.id} p={p} onConfigure={() => navigate(`/admin/pwa/listings/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyRow({ p, onConfigure }) {
  const cfg = p.listingConfig;
  const listed = cfg?.listingStatus === 'listed';
  return (
    <div className="card p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold truncate">{p.name}</div>
        <div className="text-xs text-ink-muted truncate">
          {p.propertyCode || `#${p.id}`} · {p.ownerName || p.owner?.name || '—'} · {p.address}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          {cfg?.propertyType && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold capitalize">{cfg.propertyType}</span>
          )}
          <span className={`px-2 py-0.5 rounded-full font-semibold ${listed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {listed ? 'LISTED' : (cfg?.listingStatus === 'unlisted' ? 'UNLISTED' : 'DRAFT')}
          </span>
        </div>
      </div>
      <button onClick={onConfigure} className="btn-primary text-sm whitespace-nowrap">
        {listed ? 'Edit listing' : 'Configure'}
      </button>
    </div>
  );
}

/* ─────────────────────────── Tab 2: On Process ───────────────────────── */

function ProcessTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api.get('/pwa/admin/listings-process')
      .then((r) => setItems(r.data.data.items || []))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!items.length) return <Empty label="No properties in process." />;

  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <div key={p.id} className="card overflow-hidden">
          <button onClick={() => setOpenId((o) => (o === p.id ? null : p.id))} className="w-full flex items-center justify-between gap-3 p-4 text-left">
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-ink-muted truncate">{p.propertyCode || `#${p.id}`} · {p.ownerName || p.owner?.name || '—'}</div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold whitespace-nowrap">{p.status}</span>
          </button>
          {openId === p.id && (
            <div className="px-4 pb-4 border-t pt-3">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field label="Owner" value={p.ownerName || p.owner?.name} />
                <Field label="Owner email" value={p.ownerEmail || p.owner?.email} />
                <Field label="Owner phone" value={p.ownerPhone || p.owner?.phone} />
                <Field label="Auditor" value={p.auditor?.name} />
                <Field label="Officer" value={p.officer?.name} />
                <Field label="Rooms" value={p.numberOfRooms} />
                <Field label="Source" value={p.source} />
                <Field label="Listed" value={p.listingConfig?.listingStatus || '—'} />
                <div className="col-span-2"><Field label="Address" value={p.address} /></div>
              </dl>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Tab 3: Signed Contracts ─────────────────── */

function ContractsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    api.get('/pwa/admin/signed-properties')
      .then((r) => setItems(r.data.data.items || []))
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const download = async (p) => {
    setDownloadingId(p.id);
    try {
      const res = await api.get(`/pwa/admin/signed-properties/${p.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${p.propertyCode || p.name || 'contract'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <Spinner />;
  if (!items.length) return <Empty label="No signed contracts yet." />;

  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate flex items-center gap-2">
              <FileText size={16} className="text-brand shrink-0" /> {p.name}
            </div>
            <div className="text-xs text-ink-muted truncate">
              {p.propertyCode || `#${p.id}`} · {p.ownerName || p.owner?.name || '—'} ·{' '}
              <span className="text-green-700 font-semibold capitalize">{p.status}</span>
            </div>
          </div>
          <button onClick={() => download(p)} disabled={downloadingId === p.id} className="btn-primary text-sm whitespace-nowrap">
            <Download size={15} /> {downloadingId === p.id ? 'Downloading…' : 'Signed PDF'}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── shared bits ────────────────────────────── */

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink break-words">{value == null || value === '' ? '—' : String(value)}</dd>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={28} className="animate-spin text-brand" />
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="card p-12 text-center text-ink-muted">
      <Eye size={36} className="mx-auto mb-3 opacity-60" />
      <p>{label}</p>
    </div>
  );
}
