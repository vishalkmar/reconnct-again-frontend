import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fmtMoney, fmtDate } from '../../components/user/bookingFormatters.js';

const rupee = (n) => fmtMoney(n || 0);

/*
  Drill-down from the B2B Payment Tally "By activity" table: shows only the
  paid bookings for one activity, with per-booking B2B / B2C split and a
  downloadable voucher — so every booking can be tracked end-to-end.
*/
export default function B2BActivityBookingsPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const activity = decodeURIComponent(name || '');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(null);

  useEffect(() => {
    let alive = true;
    const params = {};
    ['from', 'to', 'name', 'email', 'supplier'].forEach((k) => { const v = sp.get(k); if (v) params[k] = v; });
    api.get('/admin/b2b/tally', { params })
      .then((res) => {
        if (!alive) return;
        const all = res.data?.data?.rows || [];
        setRows(all.filter((r) => r.experience === activity));
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load bookings'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [activity, sp]);

  const totals = useMemo(() => (rows || []).reduce((a, r) => ({
    b2b: a.b2b + (r.b2b || 0), b2c: a.b2c + (r.b2c || 0), difference: a.difference + (r.difference || 0),
  }), { b2b: 0, b2c: 0, difference: 0 }), [rows]);

  const downloadPdf = async (code) => {
    setDl(code);
    try {
      const res = await api.get(`/admin/bookings/${code}/voucher.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `voucher-${code}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not download voucher');
    } finally { setDl(null); }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;

  return (
    <div>
      <Link to="/admin/b2b" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-4"><ArrowLeft size={15} /> B2B Management</Link>

      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold text-ink">{activity}</h1>
        <p className="text-sm text-ink-muted">{(rows || []).length} paid booking(s) · B2B {rupee(totals.b2b)} · B2C {rupee(totals.b2c)} · Difference <span className={totals.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{totals.difference >= 0 ? '+' : ''}{rupee(totals.difference)}</span></p>
      </div>

      {(rows || []).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-ink-muted text-sm">No paid bookings for this activity.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold text-right">B2B</th>
                  <th className="px-4 py-3 font-semibold text-right">B2C</th>
                  <th className="px-4 py-3 font-semibold text-right">Difference</th>
                  <th className="px-4 py-3 font-semibold text-center">Voucher</th>
                  <th className="px-4 py-3 font-semibold text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{r.code}</div>
                      <div className="text-xs text-ink-muted">{fmtDate(r.bookedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{r.guest || '—'}</div>
                      <div className="text-xs text-ink-muted truncate max-w-[180px]">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-ink whitespace-nowrap">{rupee(r.b2b)}</td>
                    <td className="px-4 py-3 text-right text-ink whitespace-nowrap">{rupee(r.b2c)}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      <span className={r.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{r.difference >= 0 ? '+' : ''}{rupee(r.difference)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => downloadPdf(r.code)}
                        disabled={dl === r.code}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white shadow-soft text-xs font-semibold text-ink hover:text-brand disabled:opacity-60"
                      >
                        {dl === r.code ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/bookings/${r.code}/voucher`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
