import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Printer, Loader2, MapPin, Calendar, Users, Clock, CreditCard,
  User as UserIcon, Mail, Phone, CheckCircle2, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import {
  TYPE_LABEL, STATUS_BADGE, fmtMoney, fmtDate, fmtDateTime,
} from '../../components/user/bookingFormatters.js';

/*
  Full-page, contract-style booking voucher — every detail of a booking laid out
  cleanly, with Download PDF + Print. Opened from the admin bookings / supplier
  revenue split, replacing the cramped popup for the "voucher" view.
*/
export default function BookingVoucherPage() {
  const { code } = useParams();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/admin/bookings/${code}`)
      .then((res) => { if (alive) setB(res.data?.data?.booking || null); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load booking'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code]);

  const downloadPdf = async () => {
    setDl(true);
    try {
      const res = await api.get(`/admin/bookings/${code}/voucher.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `voucher-${code}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not download voucher');
    } finally { setDl(false); }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>;
  if (!b) return <div className="max-w-3xl mx-auto p-10 text-center text-ink-muted">Booking not found.</div>;

  const item = b.item || {};
  const exp = b.experience || {};
  const p = b.pricing || {};
  const pay = b.payment || {};
  const paid = !!pay.paidAt;
  const badge = STATUS_BADGE[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-700' };
  const cover = fileUrl(item.image || exp.gallery?.[0]);

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <style>{'@media print { body * { visibility: hidden !important; } #voucher-doc, #voucher-doc * { visibility: visible !important; } #voucher-doc { position: absolute; inset: 0; margin: 0; box-shadow: none; border-radius: 0; } .no-print { display: none !important; } }'}</style>

      {/* Action bar */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3 mb-4">
        <Link to="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"><ArrowLeft size={15} /> Bookings</Link>
        <div className="flex items-center gap-2">
          <button onClick={downloadPdf} disabled={dl} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white shadow-soft text-sm font-semibold hover:text-brand disabled:opacity-60">
            {dl ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90"><Printer size={15} /> Print</button>
        </div>
      </div>

      {/* Document */}
      <div id="voucher-doc" className="bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100">
        {/* Letterhead */}
        <div className="flex items-start justify-between gap-4 px-8 py-6 bg-ink text-white">
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">reconn<span className="text-brand">ct</span></div>
            <div className="text-xs text-white/60 mt-0.5">Booking Voucher</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-white/60">Booking code</div>
            <div className="font-mono font-bold text-lg">{b.bookingCode}</div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${paid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{String(b.status).replace('_', ' ')}</span>
          </div>
        </div>

        {cover && <img src={cover} alt="" className="w-full h-56 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}

        <div className="p-8 space-y-6">
          {/* Experience */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-brand-dark">{TYPE_LABEL[item.type] || 'Experience'}</div>
            <h1 className="text-2xl font-display font-bold text-ink mt-1">{item.name}</h1>
            {(item.location || exp.city) && <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1.5"><MapPin size={13} /> {item.location || exp.city}</div>}
          </div>

          {/* Trip grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-slate-100 py-5">
            <Cell icon={Calendar} label="When" value={fmtDate(b.scheduledFor)} />
            <Cell icon={Users} label="Guests" value={b.guest?.count ?? '—'} />
            <Cell icon={Clock} label="Duration" value={exp.durationLabel || `${b.units || 1} day(s)`} />
            <Cell icon={CreditCard} label="Payment" value={paid ? 'Paid' : (b.status === 'cancelled' ? 'Cancelled' : 'Pending')} />
          </div>

          {b.specialRequests && (
            <Block label="Special requests"><p className="text-sm text-ink whitespace-pre-line">{b.specialRequests}</p></Block>
          )}

          {exp.about && (
            <Block label="About this experience"><p className="text-sm text-ink-muted leading-relaxed">{exp.about}</p></Block>
          )}

          {exp.inclusions?.length > 0 && (
            <Block label="What's included">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {exp.inclusions.map((i, k) => <li key={k} className="flex items-start gap-2 text-sm text-ink"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> {i}</li>)}
              </ul>
            </Block>
          )}

          {/* Two columns: customer + payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Block label="Lead traveller">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink"><UserIcon size={14} className="text-ink-muted" /> {b.guest?.name || b.user?.name || '—'}</div>
              <div className="text-sm text-ink-muted mt-1.5 flex items-center gap-1.5"><Mail size={12} /> {b.guest?.email || b.user?.email || '—'}</div>
              <div className="text-sm text-ink-muted mt-1 flex items-center gap-1.5"><Phone size={12} /> {b.guest?.phone || b.user?.phone || '—'}</div>
              {b.user?.id && (
                <Link to={`/admin/users/${b.user.id}`} className="no-print inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-2">
                  View customer profile <ExternalLink size={12} />
                </Link>
              )}
            </Block>
            <Block label="Payment">
              <Row k="Order ID" v={pay.orderId} mono />
              <Row k="Payment ID" v={pay.paymentId} mono />
              <Row k="Method" v={pay.method} />
              <Row k="Paid at" v={pay.paidAt ? fmtDateTime(pay.paidAt) : '—'} />
            </Block>
          </div>

          {/* Price breakdown */}
          <Block label="Price breakdown">
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  <PriceRow k={`Subtotal${p.unitPrice ? ` (${fmtMoney(p.unitPrice, b.currency)} × ${b.guest?.count || 1})` : ''}`} v={fmtMoney(p.subtotal, b.currency)} />
                  {p.couponDiscount > 0 && <PriceRow k={`Coupon ${p.couponCode || ''}`} v={`− ${fmtMoney(p.couponDiscount, b.currency)}`} green />}
                  {p.walletDiscount > 0 && <PriceRow k="Wallet credit" v={`− ${fmtMoney(p.walletDiscount, b.currency)}`} green />}
                  {p.gst > 0 && <PriceRow k="GST / Taxes" v={fmtMoney(p.tax || p.gst, b.currency)} />}
                </tbody>
                <tfoot>
                  <tr className="bg-ink/[0.03]">
                    <td className="px-4 py-3 font-bold text-ink">{paid ? 'Total paid' : 'Total payable'}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-brand-dark">{fmtMoney(p.total, b.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Block>

          <p className="text-[11px] text-ink-muted text-center pt-2 border-t border-slate-100">Show the booking code at check-in · reconnct — Experiences that connect</p>
        </div>
      </div>
    </div>
  );
}

function Cell({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted inline-flex items-center gap-1"><Icon size={12} /> {label}</div>
      <div className="text-sm font-semibold text-ink mt-0.5">{value}</div>
    </div>
  );
}
function Block({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">{label}</div>
      {children}
    </div>
  );
}
function Row({ k, v, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-ink-muted">{k}</span>
      <span className={`text-ink text-right ${mono ? 'font-mono text-xs' : ''}`}>{v || '—'}</span>
    </div>
  );
}
function PriceRow({ k, v, green }) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-ink-muted">{k}</td>
      <td className={`px-4 py-2.5 text-right font-medium ${green ? 'text-emerald-600' : 'text-ink'}`}>{v}</td>
    </tr>
  );
}
