import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileCheck2, Mail, MapPin, Phone, User, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

const fmtDate = (value) => (value ? new Date(value).toLocaleString() : '-');

const Detail = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2 rounded-xl bg-surface-alt p-3">
    <Icon size={16} className="mt-0.5 shrink-0 text-ink-muted" />
    <div className="min-w-0">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="truncate text-sm font-medium text-ink">{value || '-'}</p>
    </div>
  </div>
);

export default function SignedPropertiesPage() {
  const [params] = useSearchParams();
  const officerId = params.get('officerId') || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const downloadSigned = async (property) => {
    const res = await api.get(`/pwa/admin/signed-properties/${property.id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: res.headers['content-type'] || 'application/octet-stream',
    });
    const disposition = res.headers['content-disposition'] || '';
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match?.[1] || `signed-contract-${property.propertyCode}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let alive = true;
    api.get('/pwa/admin/signed-properties', { params: officerId ? { officerId } : {} })
      .then((res) => {
        if (alive) setItems(res.data?.data?.items || []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [officerId]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">Signed Property</h1>
          <p className="text-sm text-ink-muted">
            Owner-uploaded signed contracts with property, auditor, and officer details.
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          {items.length} signed
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-ink-muted">Loading signed properties...</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <FileCheck2 className="mx-auto text-ink-muted" size={32} />
          <h2 className="mt-3 font-semibold text-ink">No signed properties yet</h2>
          <p className="mt-1 text-sm text-ink-muted">Owner uploads will appear here after contract signing.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((p) => (
            <article key={p.id} className="card p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{p.propertyCode}</p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{p.name}</h2>
                  <p className="mt-1 text-sm text-ink-muted">Signed {fmtDate(p.contract?.signedAt)}</p>
                </div>
                {p.contract?.signedPdfUrl && (
                  <button
                    type="button"
                    onClick={() => downloadSigned(p)}
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Download signed document
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Detail icon={MapPin} label="Property address" value={p.address} />
                <Detail icon={User} label="Owner" value={p.ownerName} />
                <Detail icon={Mail} label="Owner email" value={p.ownerEmail} />
                <Detail icon={Phone} label="Owner phone" value={p.ownerPhone} />
                <Detail icon={User} label="Auditor" value={p.auditor ? `${p.auditor.name} (${p.auditor.email})` : '-'} />
                <Detail icon={ShieldCheck} label="Centralized officer" value={p.officer ? `${p.officer.name} (${p.officer.email})` : '-'} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
