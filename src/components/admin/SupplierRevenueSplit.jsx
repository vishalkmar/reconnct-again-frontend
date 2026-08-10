import { useEffect, useState } from 'react';
import { Loader2, IndianRupee, TrendingUp, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/*
  Side-by-side B2B vs B2C breakdown for ONE supplier. Both columns list the same
  PAID bookings — the left values each at the base B2B price we received, the
  right at the final B2C price the customer paid. Reused by the supplier
  revenue page and the Revenue page's supplier filter.
*/
export default function SupplierRevenueSplit({ supplierId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/admin/b2b/supplier-revenue/${supplierId}`)
      .then((res) => { if (alive) setData(res.data?.data || null); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load supplier revenue'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [supplierId]);

  if (loading) return <div className="bg-white rounded-2xl shadow-soft p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!data) return null;

  const t = data.totals || {};
  const rows = data.rows || [];

  return (
    <div className="space-y-5">
      {data.supplier?.companyName && (
        <div className="text-sm text-ink-muted">Supplier: <span className="font-semibold text-ink">{data.supplier.companyName}</span></div>
      )}
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Total icon={IndianRupee} label="B2B revenue" hint="Base we received" value={inr(t.b2b)} />
        <Total icon={TrendingUp} label="B2C revenue" hint="Final — customer paid" value={inr(t.b2c)} />
        <Total icon={ArrowLeftRight} label="Difference (B2C − B2B)" hint={`${t.bookings || 0} paid bookings`} value={inr(t.difference)} accent />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-sm text-ink-muted">No paid bookings for this supplier yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Column title="B2B — what we received" tint="blue" rows={rows} field="b2b" total={t.b2b} />
          <Column title="B2C — what the customer paid" tint="emerald" rows={rows} field="b2c" total={t.b2c} />
        </div>
      )}
    </div>
  );
}

const TONE = {
  blue: { head: 'text-blue-700', bar: 'border-blue-400' },
  emerald: { head: 'text-emerald-700', bar: 'border-emerald-400' },
};

function Column({ title, tint, rows, field, total }) {
  const T = TONE[tint];
  return (
    <div className={`bg-white rounded-2xl shadow-soft overflow-hidden border-t-4 ${T.bar}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h3 className={`font-semibold text-sm ${T.head}`}>{title}</h3>
        <span className="font-bold text-ink">{inr(total)}</span>
      </div>
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted border-b border-slate-100">
              <th className="px-4 py-2.5 font-semibold">Booking</th>
              <th className="px-4 py-2.5 font-semibold">Experience</th>
              <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-ink">{r.code}</div>
                  <div className="text-xs text-ink-muted">{r.guest} · {fmtDate(r.date)}</div>
                </td>
                <td className="px-4 py-2.5 text-ink-muted"><div className="truncate max-w-[160px]">{r.experience}</div></td>
                <td className="px-4 py-2.5 text-right font-semibold text-ink whitespace-nowrap">{inr(r[field])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Total({ icon: Icon, label, hint, value, accent }) {
  return (
    <div className={`rounded-2xl shadow-soft p-5 ${accent ? 'bg-ink text-white' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className={`text-sm ${accent ? 'text-white/70' : 'text-ink-muted'}`}>{label}</div>
        <Icon size={18} className="text-brand" />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</div>
      {hint && <div className={`text-[11px] mt-1 ${accent ? 'text-white/60' : 'text-ink-muted'}`}>{hint}</div>}
    </div>
  );
}
