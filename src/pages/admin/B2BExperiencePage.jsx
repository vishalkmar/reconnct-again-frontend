import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Building2, UserCog, Info, Tags, CalendarCheck, IndianRupee,
  Mail, Phone, MapPin, Clock, Users, TrendingUp, ArrowLeftRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { StatusPill } from './B2BManagementPage.jsx';

const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const TABS = [
  ['details', 'Details', Info],
  ['supplier', 'Supplier', Building2],
  ['kam', 'KAM', UserCog],
  ['pricing', 'Pricing', Tags],
  ['bookings', 'Bookings', CalendarCheck],
  ['revenue', 'Revenue', IndianRupee],
];

export default function B2BExperiencePage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('details');
  const [openBk, setOpenBk] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/admin/b2b/experiences/${id}`);
        setD(res.data?.data || null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load experience');
      }
    })();
  }, [id]);

  if (!d) return <div className="max-w-6xl mx-auto p-16 text-center"><Loader2 className="animate-spin text-brand mx-auto" /></div>;

  const exp = d.experience || {};
  const rev = d.revenue || {};

  return (
    <div className="max-w-6xl mx-auto">
      <Link to="/admin/b2b" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand mb-4"><ArrowLeft size={15} /> B2B Management</Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-5 flex flex-wrap items-start gap-4">
        <img src={exp.mainImage || '/placeholder.png'} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0" onError={(e) => { e.target.style.visibility = 'hidden'; }} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-display font-bold text-ink">{exp.name}</h1>
          <div className="text-sm text-ink-muted flex items-center gap-1.5 mt-0.5"><MapPin size={13} /> {exp.city || exp.location || '—'}</div>
          <div className="text-xs text-ink-muted mt-1">Listed {fmtDateTime(d.meta?.listedAt)}</div>
        </div>
        <div className="flex gap-6 text-right">
          <Stat label="Bookings" value={`${rev.paidBookings || 0}/${rev.bookings || 0}`} />
          <Stat label="B2B" value={rupee(rev.b2b)} />
          <Stat label="B2C" value={rupee(rev.b2c)} />
          <Stat label="Difference" value={rupee(rev.difference)} accent />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200 overflow-x-auto">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${tab === k ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'details' && <DetailsTab exp={exp} />}
      {tab === 'supplier' && <SupplierTab s={d.supplier} />}
      {tab === 'kam' && <KamTab kam={d.kam} />}
      {tab === 'pricing' && <PricingTab p={d.pricing} />}
      {tab === 'bookings' && <BookingsTab bookings={d.bookings || []} openBk={openBk} setOpenBk={setOpenBk} />}
      {tab === 'revenue' && <RevenueTab rev={rev} />}
    </div>
  );
}

/* ── Details ───────────────────────────────────────────────────────────── */
function DetailsTab({ exp }) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return (
    <Card>
      <Row label="Name" value={exp.name} />
      <Row label="City" value={exp.city} />
      <Row label="Location" value={exp.location} />
      <Row label="Pincode" value={exp.pincode} />
      <Row label="Nearby" value={exp.nearbyLocation} />
      <Row label="Duration" value={exp.durationLabel || exp.duration} />
      <Row label="Capacity" value={exp.capacity} />
      <Row label="Source" value={exp.sourceName} />
      <div className="py-3 border-t border-slate-50">
        <div className="text-xs text-ink-muted mb-1">About</div>
        <p className="text-sm text-ink whitespace-pre-line">{exp.about || '—'}</p>
      </div>
      {arr(exp.inclusions).length > 0 && <Chips label="Inclusions" items={exp.inclusions} />}
      {arr(exp.facilities).length > 0 && <Chips label="Facilities" items={exp.facilities} />}
      {arr(exp.nearbyPlaces).length > 0 && <Chips label="Nearby places" items={exp.nearbyPlaces} />}
    </Card>
  );
}

/* ── Supplier ──────────────────────────────────────────────────────────── */
function SupplierTab({ s }) {
  if (!s) return <Card><Empty>No supplier attached (host listing).</Empty></Card>;
  return (
    <Card>
      <Row label="Company" value={s.companyName} />
      <Row label="Supplier name" value={s.supplierName} />
      <Row label="Email" value={s.email} icon={Mail} />
      <Row label="Phone" value={s.phone} icon={Phone} />
      <Row label="City" value={s.city} />
      <Row label="Address" value={s.address} />
      <Row label="GST" value={s.gstNumber} />
      <Row label="PAN" value={s.panNumber} />
      <Row label="Status" value={s.status} />
    </Card>
  );
}

/* ── KAM ───────────────────────────────────────────────────────────────── */
function KamTab({ kam }) {
  if (!kam) return <Card><Empty>No KAM assigned yet.</Empty></Card>;
  return (
    <Card>
      <Row label="Name" value={kam.name} />
      <Row label="Role" value={kam.roleType} />
      <Row label="Employee code" value={kam.employeeCode} />
      <Row label="Email" value={kam.email} icon={Mail} />
      <Row label="Phone" value={kam.phone} icon={Phone} />
    </Card>
  );
}

/* ── Pricing ───────────────────────────────────────────────────────────── */
function PricingTab({ p }) {
  if (!p) return <Card><Empty>No pricing.</Empty></Card>;
  const b2b = p.pricing || {};
  const bands = Array.isArray(b2b.childBands) ? b2b.childBands : [];
  const disc = p.discount;
  const cf = p.convenienceFee;
  const discLabel = disc && disc.value ? (disc.type === 'percentage' ? `${disc.value}%` : rupee(disc.value)) : '—';
  const cfLabel = cf && cf.type && cf.type !== 'free' ? (cf.type === 'percentage' ? `${cf.value}%` : rupee(cf.value)) : (cf && cf.type === 'free' ? 'Free' : '—');
  return (
    <div className="space-y-5">
      <Card title="B2B base price (received from supplier)">
        <Row label="Method" value={p.priceMethod} />
        <Row label="Adult" value={b2b.adultPrice != null ? rupee(b2b.adultPrice) : '—'} />
        {bands.map((band, i) => (
          <Row key={i} label={`Child (${band.startAge}–${band.endAge} yrs)`} value={band.charge ? rupee(band.price) : 'Free'} />
        ))}
      </Card>

      <Card title="Go-live extras applied (by COPS)">
        <Row label="Discount" value={discLabel} />
        <Row label="GST" value={p.gstRate ? `${p.gstRate}%` : '—'} />
        <Row label="Convenience fee" value={cfLabel} />
      </Card>

      <div className="bg-ink text-white rounded-2xl shadow-soft p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-white/70">Final price per adult (what a customer pays)</div>
          <div className="text-xs text-white/50 mt-0.5">B2B base + GST + convenience, less discount</div>
        </div>
        <div className="text-3xl font-bold">{rupee(p.finalAdultPrice)}</div>
      </div>

      {p.b2cPricing && p.b2cPricing.adultPrice != null && (
        <Card title="B2C reference (entered at add time)">
          <Row label="Method" value={p.b2cPriceMethod} />
          <Row label="Adult" value={rupee(p.b2cPricing.adultPrice)} />
        </Card>
      )}
    </div>
  );
}

/* ── Bookings ──────────────────────────────────────────────────────────── */
function BookingsTab({ bookings, openBk, setOpenBk }) {
  if (bookings.length === 0) return <Card><Empty>No bookings yet.</Empty></Card>;
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-muted border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold text-center">Guests</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold text-right">Paid (B2C)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.map((b) => (
              <Fragment key={b.id}>
                <tr className="hover:bg-slate-50/70 cursor-pointer" onClick={() => setOpenBk(openBk === b.id ? null : b.id)}>
                  <td className="px-4 py-3 font-medium text-ink">{b.code}</td>
                  <td className="px-4 py-3"><div className="text-ink">{b.guest || '—'}</div><div className="text-xs text-ink-muted">{b.email}</div></td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fmtDate(b.date)}</td>
                  <td className="px-4 py-3 text-center text-ink-muted">{b.guestCount}</td>
                  <td className="px-4 py-3"><StatusPill s={b.paymentStatus} /></td>
                  <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">{rupee(b.b2c)}</td>
                </tr>
                {openBk === b.id && (
                  <tr key={`${b.id}-d`} className="bg-slate-50/60">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <MiniStat label="Phone" value={b.phone || '—'} />
                        <MiniStat label="Booked on" value={fmtDateTime(b.bookedAt)} />
                        <MiniStat label="Paid on" value={b.paidAt ? fmtDateTime(b.paidAt) : '—'} />
                        <MiniStat label="Status" value={b.status} />
                        <MiniStat label="B2B (base)" value={rupee(b.b2b)} />
                        <MiniStat label="B2C (paid)" value={rupee(b.b2c)} />
                        <MiniStat label="Difference" value={rupee(b.difference)} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Revenue ───────────────────────────────────────────────────────────── */
function RevenueTab({ rev }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BigStat icon={IndianRupee} label="B2B revenue" hint="Base, before extras" value={rupee(rev.b2b)} />
      <BigStat icon={TrendingUp} label="B2C revenue" hint="Final, customer paid" value={rupee(rev.b2c)} />
      <BigStat icon={ArrowLeftRight} label="Difference in B2B & B2C" hint="B2C − B2B" value={rupee(rev.difference)} accent />
      <BigStat icon={Users} label="Paid bookings" hint={`${rev.bookings || 0} total`} value={rev.paidBookings || 0} />
    </div>
  );
}

/* ── shared bits ───────────────────────────────────────────────────────── */
function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      {title && <h2 className="font-semibold text-ink mb-3">{title}</h2>}
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}
function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
      <span className="text-sm text-ink-muted shrink-0">{label}</span>
      <span className="text-sm text-ink text-right flex items-center gap-1.5 min-w-0">
        {Icon && value ? <Icon size={13} className="text-ink-muted shrink-0" /> : null}
        <span className="truncate">{value || '—'}</span>
      </span>
    </div>
  );
}
function Chips({ label, items }) {
  return (
    <div className="py-3 border-t border-slate-50">
      <div className="text-xs text-ink-muted mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-ink">{typeof it === 'string' ? it : (it.name || it.label)}</span>)}
      </div>
    </div>
  );
}
function Empty({ children }) { return <div className="py-8 text-center text-sm text-ink-muted">{children}</div>; }
function Stat({ label, value, accent }) {
  return <div><div className="text-xs text-ink-muted">{label}</div><div className={`text-base font-bold ${accent ? 'text-brand' : 'text-ink'}`}>{value}</div></div>;
}
function MiniStat({ label, value }) {
  return <div><div className="text-xs text-ink-muted">{label}</div><div className="text-sm font-medium text-ink capitalize">{value}</div></div>;
}
function BigStat({ icon: Icon, label, hint, value, accent }) {
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
