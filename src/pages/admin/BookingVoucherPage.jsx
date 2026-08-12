import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Printer, Loader2, MapPin, Calendar, Users, Clock, CreditCard,
  User as UserIcon, Mail, Phone, CheckCircle2, ExternalLink, Ticket, Hash, Wallet, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { TYPE_LABEL, fmtMoney, fmtDate } from '../../components/user/bookingFormatters.js';

const RECONNCT_LOGO = '/reconnct-logo-white.png';
const fmtFull = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/*
  Full-page, contract-style booking voucher — premium layout matching the PDF:
  reconnct logo, hero + gallery, experience + about, detail cells, full payment,
  clean price breakdown and a CTA footer. Download PDF + Print.
*/
export default function BookingVoucherPage() {
  const { code } = useParams();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = () => api.get(`/admin/bookings/${code}`).then((res) => setB(res.data?.data?.booking || null));

  useEffect(() => {
    let alive = true;
    api.get(`/admin/bookings/${code}`)
      .then((res) => { if (alive) setB(res.data?.data?.booking || null); })
      .catch((e) => toast.error(e.response?.data?.message || 'Could not load booking'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code]);

  const markCompleted = async () => {
    setMarking(true);
    try {
      await api.post(`/admin/bookings/${code}/mark-completed`);
      toast.success('Marked as completed');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not mark completed');
    } finally { setMarking(false); }
  };

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
  const cover = fileUrl(item.image || exp.gallery?.[0]);
  const gallery = (exp.gallery || []).map(fileUrl).filter((g) => g && g !== cover).slice(0, 4);
  const slotMatch = String(b.specialRequests || '').match(/Preferred time:\s*(.+)/i);
  const slot = slotMatch ? slotMatch[1].trim() : '—';

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <style>{'@media print { body * { visibility: hidden !important; } #voucher-doc, #voucher-doc * { visibility: visible !important; } #voucher-doc { position: absolute; inset: 0; margin: 0; box-shadow: none; border-radius: 0; } .no-print { display: none !important; } }'}</style>

      {/* Action bar */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3 mb-4">
        <Link to="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"><ArrowLeft size={15} /> Bookings</Link>
        <div className="flex items-center gap-2">
          {b.status === 'confirmed' && (
            <button onClick={markCompleted} disabled={marking} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {marking ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Mark completed
            </button>
          )}
          <button onClick={downloadPdf} disabled={dl} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white shadow-soft text-sm font-semibold hover:text-brand disabled:opacity-60">
            {dl ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Download PDF
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90"><Printer size={15} /> Print</button>
        </div>
      </div>

      {/* Document */}
      <div id="voucher-doc" className="bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100">
        {/* Letterhead */}
        <div className="flex items-center justify-between gap-4 px-8 py-6" style={{ background: 'linear-gradient(90deg,#F9B402,#f0a800)' }}>
          <div>
            <img src={RECONNCT_LOGO} alt="reconnct" className="h-7 w-auto" onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('span'), { className: 'font-display text-2xl font-bold text-white', textContent: 'reconnct' })); }} />
            <div className="text-xs text-white/80 mt-1">Booking Voucher</div>
          </div>
          <div className="text-right text-white">
            <div className="font-mono font-bold text-lg">{b.bookingCode}</div>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold capitalize bg-white/25">{String(b.status).replace('_', ' ')}</span>
          </div>
        </div>

        {/* Hero + gallery (2-col) */}
        {cover && (
          gallery.length ? (
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50">
              <img src={cover} alt="" className="w-full object-cover rounded-xl" style={{ height: 232 }} onError={(e) => { e.target.style.visibility = 'hidden'; }} />
              <div className="grid grid-cols-2 gap-2">
                {gallery.map((g, i) => <img key={i} src={g} alt="" className="w-full object-cover rounded-lg" style={{ height: 112 }} onError={(e) => { e.target.style.visibility = 'hidden'; }} />)}
              </div>
            </div>
          ) : (
            <img src={cover} alt="" className="w-full object-cover" style={{ height: 240 }} onError={(e) => { e.target.style.display = 'none'; }} />
          )
        )}

        <div className="p-8 space-y-6">
          {/* Experience card */}
          <div className="rounded-xl bg-slate-50 border-l-4 border-brand p-5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-brand-dark">{TYPE_LABEL[item.type] || 'Experience'}</div>
            <h1 className="text-2xl font-display font-bold text-ink mt-1">{item.name}</h1>
            {(item.location || exp.city) && <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1.5"><MapPin size={13} /> {item.location || exp.city}</div>}
            {exp.about && <p className="text-sm text-ink-muted leading-relaxed mt-3">{exp.about}</p>}
          </div>

          {/* Detail cells */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 border-y border-slate-100 py-5">
            <Cell icon={Calendar} label="When" value={fmtDate(b.scheduledFor)} />
            <Cell icon={Clock} label="Time slot" value={slot} />
            <Cell icon={Users} label="Guests" value={b.guest?.count ?? '—'} />
            <Cell icon={Ticket} label="Duration" value={exp.durationLabel || `${b.units || 1} day(s)`} />
            <Cell icon={CreditCard} label="Payment" value={paid ? 'Paid' : (b.status === 'cancelled' ? 'Cancelled' : 'Pending')} />
          </div>

          {exp.inclusions?.length > 0 && (
            <Block icon={CheckCircle2} label="What's included">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {exp.inclusions.map((i, k) => <li key={k} className="flex items-start gap-2 text-sm text-ink"><CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> {i}</li>)}
              </ul>
            </Block>
          )}

          {/* Lead traveller + Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Block icon={UserIcon} label="Lead traveller">
              <div className="text-sm font-semibold text-ink">{b.guest?.name || b.user?.name || '—'}</div>
              <div className="text-sm text-ink-muted mt-1.5 flex items-center gap-1.5"><Mail size={12} /> {b.guest?.email || b.user?.email || '—'}</div>
              <div className="text-sm text-ink-muted mt-1 flex items-center gap-1.5"><Phone size={12} /> {b.guest?.phone || b.user?.phone || '—'}</div>
              {b.specialRequests && <div className="text-xs text-ink-muted mt-2">Note: {b.specialRequests}</div>}
              {b.user?.id && (
                <Link to={`/admin/users/${b.user.id}`} className="no-print inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-2">
                  View customer profile <ExternalLink size={12} />
                </Link>
              )}
            </Block>
            <Block icon={Receipt} label="Payment details">
              <PRow icon={Hash} k="Order ID" v={pay.orderId} mono />
              <PRow icon={Hash} k="Payment ID" v={pay.paymentId} mono />
              <PRow icon={CreditCard} k="Method" v={pay.method} />
              <PRow icon={Wallet} k="Currency" v={b.currency} />
              <PRow icon={Clock} k="Paid at" v={pay.paidAt ? fmtFull(pay.paidAt) : '—'} />
              <PRow icon={Clock} k="Booked at" v={fmtFull(b.createdAt)} />
            </Block>
          </div>

          {/* Price breakdown */}
          <Block icon={Receipt} label="Price breakdown">
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  <PriceRow k={`Subtotal${p.unitPrice ? ` (${fmtMoney(p.unitPrice, b.currency)} × ${b.guest?.count || 1})` : ''}`} v={fmtMoney(p.subtotal, b.currency)} />
                  {p.couponDiscount > 0 && <PriceRow k={`Coupon ${p.couponCode || ''}`} v={`− ${fmtMoney(p.couponDiscount, b.currency)}`} green />}
                  {p.walletDiscount > 0 && <PriceRow k="Wallet credit" v={`− ${fmtMoney(p.walletDiscount, b.currency)}`} green />}
                  {(p.tax > 0 || p.gst > 0) && <PriceRow k="Taxes (GST)" v={fmtMoney(p.tax || p.gst, b.currency)} />}
                </tbody>
                <tfoot>
                  <tr className="bg-ink/[0.03]">
                    <td className="px-4 py-3 font-bold text-ink">{paid ? 'Total paid' : 'Total payable'}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-emerald-700">{fmtMoney(p.total, b.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Block>
        </div>

        {/* Footer CTA band */}
        <div className="flex items-center justify-between gap-4 px-8 py-5 bg-ink">
          <img src={RECONNCT_LOGO} alt="reconnct" className="h-6 w-auto" onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('span'), { className: 'font-display text-lg font-bold text-white', textContent: 'reconnct' })); }} />
          <div className="text-right">
            <div className="text-sm font-bold text-brand">Experiences that connect</div>
            <div className="text-[11px] text-white/60">Show this booking code at check-in — keep this voucher handy.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted inline-flex items-center gap-1"><Icon size={12} className="text-slate-400" /> {label}</div>
      <div className="text-sm font-semibold text-ink mt-0.5">{value}</div>
    </div>
  );
}
function Block({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2 inline-flex items-center gap-1.5">{Icon && <Icon size={12} className="text-slate-400" />} {label}</div>
      {children}
    </div>
  );
}
function PRow({ icon: Icon, k, v, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-ink-muted inline-flex items-center gap-1.5">{Icon && <Icon size={12} className="text-slate-400" />} {k}</span>
      <span className={`text-ink text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{v || '—'}</span>
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
