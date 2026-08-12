import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, IndianRupee, TrendingUp, ArrowLeftRight, ChevronRight, X, MapPin, Calendar,
  Users, CreditCard, Mail, Phone, ExternalLink, Download, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../../services/api';
import { fmtMoney, fmtDate, fmtDateTime, STATUS_BADGE, TYPE_LABEL } from '../user/bookingFormatters.js';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/*
  Side-by-side B2B vs B2C breakdown for ONE supplier. Both columns list the same
  PAID bookings — left at the base B2B price we received, right at the final B2C
  price the customer paid. Clicking any row opens a right-side drawer with the
  full booking + experience details.
*/
export default function SupplierRevenueSplit({ supplierId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openCode, setOpenCode] = useState(null);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Total icon={IndianRupee} label="B2B revenue" hint="Base we received" value={inr(t.b2b)} />
        <Total icon={TrendingUp} label="B2C revenue" hint="Final — customer paid" value={inr(t.b2c)} />
        <Total icon={ArrowLeftRight} label="Difference (B2C − B2B)" hint={`${t.bookings || 0} paid bookings`} value={inr(t.difference)} accent />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-10 text-center text-sm text-ink-muted">No paid bookings for this supplier yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Column title="B2B — what we received" tint="blue" rows={rows} field="b2b" total={t.b2b} onOpen={setOpenCode} />
          <Column title="B2C — what the customer paid" tint="emerald" rows={rows} field="b2c" total={t.b2c} onOpen={setOpenCode} />
        </div>
      )}

      {openCode && <BookingDrawer code={openCode} onClose={() => setOpenCode(null)} />}
    </div>
  );
}

const TONE = {
  blue: { head: 'text-blue-700', bar: 'border-blue-400', amt: 'text-blue-700' },
  emerald: { head: 'text-emerald-700', bar: 'border-emerald-400', amt: 'text-emerald-700' },
};

function Column({ title, tint, rows, field, total, onOpen }) {
  const T = TONE[tint];
  return (
    <div className={`bg-white rounded-2xl shadow-soft overflow-hidden border-t-4 ${T.bar}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h3 className={`font-semibold text-sm ${T.head}`}>{title}</h3>
        <span className="font-bold text-ink">{inr(total)}</span>
      </div>
      <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-50">
        {rows.map((r, i) => (
          <button key={i} type="button" onClick={() => onOpen(r.code)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50/70 transition group">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink text-sm">{r.code}</div>
              <div className="text-xs text-ink-muted truncate">{r.guest} · {r.experience} · {fmtDate(r.date)}</div>
            </div>
            <div className={`font-semibold whitespace-nowrap ${T.amt}`}>{inr(r[field])}</div>
            <ChevronRight size={16} className="text-ink-muted group-hover:text-brand shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Right-side booking drawer ──────────────────────────────────────────── */
function BookingDrawer({ code, onClose }) {
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/admin/bookings/${code}`)
      .then((res) => { if (alive) setB(res.data?.data?.booking || null); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code]);

  const downloadPdf = async () => {
    setDl(true);
    try {
      const res = await api.get(`/admin/bookings/${code}/voucher.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `voucher-${code}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Could not download voucher'); } finally { setDl(false); }
  };

  const item = b?.item || {};
  const exp = b?.experience || {};
  const p = b?.pricing || {};
  const pay = b?.payment || {};
  const badge = b && (STATUS_BADGE[b.status] || { label: b.status, cls: 'bg-slate-100 text-slate-700' });
  const cover = fileUrl(item.image || exp.gallery?.[0]);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-[slideIn_.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <style>{'@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}'}</style>
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between z-10">
          <div className="font-semibold text-ink">Booking details</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-ink-muted"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
        ) : !b ? (
          <div className="p-10 text-center text-sm text-ink-muted">Booking not found.</div>
        ) : (
          <div>
            {cover && <img src={cover} alt="" className="w-full h-40 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
            <div className="p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-ink-muted">{b.bookingCode}</span>
                  {badge && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${badge.cls}`}>{String(b.status).replace('_', ' ')}</span>}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-brand-dark mt-2">{TYPE_LABEL[item.type] || 'Experience'}</div>
                <h3 className="text-lg font-display font-bold text-ink">{item.name}</h3>
                {(item.location || exp.city) && <div className="text-sm text-ink-muted inline-flex items-center gap-1.5 mt-0.5"><MapPin size={13} /> {item.location || exp.city}</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Mini icon={Calendar} label="When" value={fmtDate(b.scheduledFor)} />
                <Mini icon={Users} label="Guests" value={b.guest?.count ?? '—'} />
                <Mini icon={CreditCard} label="Payment" value={pay.paidAt ? 'Paid' : (b.status === 'cancelled' ? 'Cancelled' : 'Pending')} />
                <Mini icon={CreditCard} label="Paid at" value={pay.paidAt ? fmtDateTime(pay.paidAt) : '—'} />
              </div>

              {b.specialRequests && (
                <Sec label="Special requests"><p className="text-sm text-ink whitespace-pre-line">{b.specialRequests}</p></Sec>
              )}

              {exp.about && <Sec label="About"><p className="text-sm text-ink-muted leading-relaxed line-clamp-4">{exp.about}</p></Sec>}
              {exp.inclusions?.length > 0 && (
                <Sec label="Included">
                  <div className="flex flex-wrap gap-1.5">{exp.inclusions.slice(0, 10).map((i, k) => <span key={k} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-ink">{i}</span>)}</div>
                </Sec>
              )}

              <Sec label="Lead traveller">
                <div className="text-sm font-semibold text-ink">{b.guest?.name || b.user?.name || '—'}</div>
                <div className="text-sm text-ink-muted mt-1 inline-flex items-center gap-1.5"><Mail size={12} /> {b.guest?.email || b.user?.email || '—'}</div>
                <div className="text-sm text-ink-muted mt-0.5 inline-flex items-center gap-1.5"><Phone size={12} /> {b.guest?.phone || b.user?.phone || '—'}</div>
                {b.user?.id && (
                  <Link to={`/admin/users/${b.user.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline mt-2">
                    View customer profile <ExternalLink size={12} />
                  </Link>
                )}
              </Sec>

              <Sec label="Price">
                <div className="rounded-xl border border-slate-100 divide-y divide-slate-50 text-sm">
                  <PR k="Subtotal" v={fmtMoney(p.subtotal, b.currency)} />
                  {p.couponDiscount > 0 && <PR k="Coupon" v={`− ${fmtMoney(p.couponDiscount, b.currency)}`} />}
                  {p.gst > 0 && <PR k="GST / Taxes" v={fmtMoney(p.tax || p.gst, b.currency)} />}
                  <div className="flex items-center justify-between px-3 py-2.5 font-bold text-ink"><span>Total</span><span className="text-brand-dark">{fmtMoney(p.total, b.currency)}</span></div>
                </div>
              </Sec>

              <div className="flex gap-2 pt-1">
                <Link to={`/admin/bookings/${b.bookingCode}/voucher`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90">
                  <FileText size={15} /> Full voucher
                </Link>
                <button onClick={downloadPdf} disabled={dl} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-ink text-sm font-semibold hover:bg-surface-alt disabled:opacity-60">
                  {dl ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PDF
                </button>
              </div>
            </div>
          </div>
        )}
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
function Mini({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="text-[11px] text-ink-muted inline-flex items-center gap-1"><Icon size={11} /> {label}</div>
      <div className="text-sm font-semibold text-ink mt-0.5">{value}</div>
    </div>
  );
}
function Sec({ label, children }) {
  return <div><div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1.5">{label}</div>{children}</div>;
}
function PR({ k, v }) {
  return <div className="flex items-center justify-between px-3 py-2"><span className="text-ink-muted">{k}</span><span className="text-ink">{v}</span></div>;
}
