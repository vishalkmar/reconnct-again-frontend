import { useEffect, useState } from 'react';
import { Loader2, UserCog, Mail, BadgeCheck, CircleSlash } from 'lucide-react';
import api from '../../services/api';

const initials = (name) => String(name || '?')
  .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function SupplierAccountManagerPage() {
  const [manager, setManager] = useState(null);
  const [since, setSince] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    api.get('/supplier/account-manager')
      .then(({ data }) => {
        if (off) return;
        const d = data?.data || {};
        setManager(d.manager || null);
        setSince(d.since || null);
      })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  if (loading) return <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1">Key Account Manager</h1>
        <p className="text-sm text-ink-muted">Your dedicated point of contact at reconnct — reach out for anything about your listings, bookings or payouts.</p>
      </div>

      {!manager ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-surface-alt text-ink-muted items-center justify-center mb-4"><UserCog size={26} /></div>
          <h2 className="font-semibold text-lg">No account manager assigned yet</h2>
          <p className="text-sm text-ink-muted mt-1 max-w-md mx-auto">
            One is assigned automatically once your first listing goes into the system. You’ll see their details here as soon as that happens.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="flex items-center gap-4 px-5 sm:px-6 py-5 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-brand/15 text-brand-dark flex items-center justify-center font-display font-bold text-lg shrink-0">
              {initials(manager.name)}
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-lg truncate">{manager.name}</div>
              <div className="text-sm text-ink-muted">{manager.roleLabel}</div>
            </div>
            <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${manager.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {manager.isActive ? <><BadgeCheck size={12} /> Active</> : <><CircleSlash size={12} /> Inactive</>}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <Row label="Name" value={manager.name} />
                <Row label="Employee code" value={<span className="font-mono text-xs">{manager.employeeCode}</span>} />
                <Row label="Role" value={manager.roleLabel} />
                <Row
                  label="Email"
                  value={(
                    <a href={`mailto:${manager.email}`} className="inline-flex items-center gap-1.5 text-brand-dark font-medium hover:underline">
                      <Mail size={14} /> {manager.email}
                    </a>
                  )}
                />
                <Row label="Managing you since" value={fmtDate(since)} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <th scope="row" className="text-left align-top font-medium text-ink-muted px-5 sm:px-6 py-3.5 w-48 whitespace-nowrap">{label}</th>
      <td className="px-5 sm:px-6 py-3.5 text-ink break-words">{value}</td>
    </tr>
  );
}
