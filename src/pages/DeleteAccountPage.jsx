import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2, CheckCircle2, ShieldCheck, Loader2, ArrowRight, Mail, Send, ClipboardCheck, MailCheck,
  UserX, Heart, MessageSquare, BellOff, Receipt, Star, Smartphone, LifeBuoy, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useUserAuth } from '../context/UserAuthContext.jsx';
import useDocumentMeta from '../hooks/useDocumentMeta';

/*
  Public account-deletion page — /delete-account (inside the public site shell,
  so it carries the same header / footer as the rest of the site).

  Google Play requires a way to ask for deletion that works WITHOUT installing
  the app, reachable from the store listing. This is that page, and this URL is
  what goes into the Play Console.

  Submitting does NOT delete anything: it raises a request an admin reviews under
  Users → Deletion requests. Deletion is irreversible, so a person actions it
  rather than an unattended form.

  NOTE: every sub-component here lives at module scope, never inside the page
  function. A component defined inside the body gets a new identity on each
  render, so React unmounts and remounts its whole subtree — which makes a text
  input lose focus after a single keystroke.
*/

const GOES = [
  { Icon: UserX, label: 'Your profile', detail: 'Name, phone, email, address and photo' },
  { Icon: Heart, label: 'Your wishlist', detail: 'Everything you saved for later' },
  { Icon: MessageSquare, label: 'Support chats', detail: 'Your conversations with our team' },
  { Icon: BellOff, label: 'Notifications', detail: 'Push tokens for all your devices' },
];

const STAYS = [
  { Icon: Receipt, label: 'Booking records', detail: 'Kept for accounting — your name and contact details are removed' },
  { Icon: Star, label: 'Reviews you wrote', detail: 'They belong to the listing, so they stay as “Deleted user”' },
];

const STEPS = [
  { Icon: Send, title: 'You send the request', sub: 'With the email you use on Reconnct' },
  { Icon: ClipboardCheck, title: 'Our team reviews it', sub: 'Nothing is deleted before this' },
  { Icon: MailCheck, title: 'We email you', sub: 'Once it is done — or if we need anything' },
];

function Backdrop({ children }) {
  return (
    <div className="relative isolate overflow-hidden bg-[#FBFAF8]">
      <div className="absolute inset-x-0 top-0 h-[560px] -z-10 bg-gradient-to-b from-[#FFF8EC] via-[#FFFCF7] to-[#FBFAF8]" aria-hidden="true" />
      <div className="absolute -top-24 right-0 w-[60%] h-[480px] -z-10 opacity-60 bg-[conic-gradient(from_200deg_at_85%_0%,transparent_0deg,#FFE7B0_18deg,transparent_36deg,#FFF0CC_58deg,transparent_80deg)] blur-2xl" aria-hidden="true" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-16">{children}</div>
    </div>
  );
}

function ItemCard({ title, tone, items }) {
  const danger = tone === 'danger';
  return (
    <div className="bg-white rounded-[22px] border border-[#F1ECE3] shadow-[0_10px_30px_-22px_rgba(16,24,40,0.45)] p-5 sm:p-6">
      <p className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] ${danger ? 'text-[#C2261B]' : 'text-rc-navy/70'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${danger ? 'bg-[#E5484D]' : 'bg-rc-brand'}`} />{title}
      </p>
      <ul className="mt-4 space-y-3.5">
        {items.map(({ Icon, label, detail }) => (
          <li key={label} className="flex gap-3.5">
            <span className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 ${danger ? 'bg-[#FFEDEC] text-[#D93025]' : 'bg-[#FFF3D6] text-[#9A6400]'}`}>
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-rc-navy leading-tight">{label}</p>
              <p className="text-[13px] text-rc-ink-muted leading-snug mt-1">{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Steps() {
  return (
    <ol className="grid sm:grid-cols-3 gap-3">
      {STEPS.map(({ Icon, title, sub }, i) => (
        <li key={title} className="relative flex sm:flex-col gap-3 bg-white/80 backdrop-blur rounded-[18px] border border-[#F3E6CC] px-4 py-4">
          <span className="relative grid place-items-center w-10 h-10 rounded-full bg-rc-brand text-rc-navy shrink-0 shadow-[0_8px_18px_-10px_rgba(255,185,0,0.95)]">
            <Icon size={18} />
            <span className="absolute -top-1 -right-1 grid place-items-center w-5 h-5 rounded-full bg-rc-navy text-white text-[10px] font-bold">{i + 1}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-rc-navy leading-tight">{title}</span>
            <span className="block text-[12.5px] text-rc-ink-muted leading-snug mt-1">{sub}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function DeleteAccountPage() {
  const { user } = useUserAuth();
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useDocumentMeta({ title: 'Delete your account · Reconnct', description: 'Request deletion of your Reconnct account and personal data — no app needed.' });

  // Signed-in visitors get their own email filled in (still editable).
  useEffect(() => { if (user?.email) setEmail((v) => v || user.email); }, [user?.email]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address');
    if (!confirm) return toast.error('Please tick the box to confirm');
    setBusy(true);
    try {
      await api.post('/user-auth/account/delete-request', {
        email: email.trim(),
        reason: reason.trim() || undefined,
      });
      setSent(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Backdrop>
        <div className="max-w-xl mx-auto bg-white rounded-[28px] border border-[#F1ECE3] shadow-[0_24px_60px_-30px_rgba(16,24,40,0.45)] p-7 sm:p-10 text-center">
          <div className="inline-grid place-items-center w-[72px] h-[72px] rounded-full bg-[#E9F8EF] text-[#15803D] ring-8 ring-[#E9F8EF]/50">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="font-display font-bold text-[28px] sm:text-[34px] leading-tight text-rc-navy mt-6">
            Request <span className="text-rc-brand">received</span>
          </h1>
          <p className="text-rc-ink-muted text-[15px] leading-relaxed mt-3">
            If <span className="font-semibold text-rc-navy break-all">{email}</span> is registered with
            Reconnct, your deletion request is logged and our team will action it shortly. We have
            emailed you a confirmation.
          </p>
          <div className="mt-6 rounded-2xl bg-[#FFF8E8] border border-[#F6E3B5] px-5 py-4 text-left">
            <p className="text-[13.5px] text-rc-navy/80 leading-relaxed">
              <span className="font-bold text-rc-navy">Changed your mind?</span> Reply to that email
              and we will cancel it. Nothing is deleted until our team actions the request.
            </p>
          </div>
          <Link to="/" className="mt-7 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-rc-brand text-rc-navy font-bold hover:brightness-105 shadow-[0_10px_24px_-12px_rgba(255,185,0,0.9)] transition">
            <ArrowLeft size={18} /> Back to Reconnct
          </Link>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      {/* Heading */}
      <div className="max-w-3xl">
        <div className="flex items-center gap-2.5 text-[11px] sm:text-[13px] font-bold tracking-[0.24em] uppercase text-rc-navy/85">
          <ShieldCheck size={16} className="text-rc-brand" /> Account &amp; privacy
        </div>
        <h1 className="font-display font-bold text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.05] mt-2.5 text-rc-navy">
          Delete your <span className="text-rc-brand">Reconnct account</span>
        </h1>
        <p className="text-[14px] sm:text-[17px] text-rc-navy/80 mt-2 sm:mt-3">
          Enter the email you use with Reconnct and we will delete your account. You do not need the app installed.
        </p>
      </div>

      <div className="mt-7 sm:mt-9 grid lg:grid-cols-[1fr_440px] gap-6 lg:gap-8 items-start">
        {/* What happens */}
        <div className="space-y-5 order-2 lg:order-1">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            <ItemCard title="What gets deleted" tone="danger" items={GOES} />
            <ItemCard title="What we have to keep" items={STAYS} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rc-navy/70 mb-3">How it works</p>
            <Steps />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-start gap-3 rounded-[18px] bg-white/80 border border-[#F3E6CC] px-4 py-4">
              <Smartphone size={20} className="text-rc-brand-dark shrink-0 mt-0.5" />
              <p className="text-[13px] text-rc-ink-muted leading-relaxed">
                Also in the app — <span className="text-rc-navy font-semibold">Profile → Edit profile → Delete account</span>.
              </p>
            </div>
            <Link to="/dashboard/support" className="flex-1 flex items-start gap-3 rounded-[18px] bg-white/80 border border-[#F3E6CC] px-4 py-4 hover:border-rc-brand transition">
              <LifeBuoy size={20} className="text-rc-brand-dark shrink-0 mt-0.5" />
              <p className="text-[13px] text-rc-ink-muted leading-relaxed">
                Just need help instead? <span className="text-rc-navy font-semibold">Talk to support</span>
              </p>
            </Link>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="order-1 lg:order-2 lg:sticky lg:top-28 bg-white rounded-[26px] border border-[#F1ECE3] shadow-[0_24px_60px_-30px_rgba(16,24,40,0.45)] overflow-hidden">
          <div className="flex items-center gap-3.5 px-6 sm:px-7 pt-6 sm:pt-7">
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-[#FFEDEC] text-[#D93025] shrink-0"><Trash2 size={22} /></span>
            <div>
              <p className="font-sans text-lg font-extrabold text-rc-navy leading-tight">Request deletion</p>
              <p className="text-[13px] text-rc-ink-muted mt-0.5">Takes less than a minute</p>
            </div>
          </div>

          <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5">
            <label className="block text-sm font-bold text-rc-navy mb-2" htmlFor="del-email">Your email address</label>
            <div className="flex items-center h-[52px] rounded-full bg-[#FBFAF8] border border-[#ECE6DA] pl-5 pr-4 focus-within:border-rc-brand focus-within:ring-4 focus-within:ring-rc-brand/20 transition">
              <Mail size={18} className="text-rc-ink-muted shrink-0" />
              <input
                id="del-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="flex-1 min-w-0 bg-transparent px-3 text-[15px] text-rc-navy outline-none"
              />
            </div>

            <label className="block text-sm font-bold text-rc-navy mt-5 mb-2" htmlFor="del-reason">
              Reason <span className="font-normal text-rc-ink-muted">(optional)</span>
            </label>
            <textarea
              id="del-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Anything you would like us to know"
              className="w-full px-5 py-3.5 rounded-[20px] bg-[#FBFAF8] border border-[#ECE6DA] text-[15px] text-rc-navy resize-none outline-none transition focus:border-rc-brand focus:ring-4 focus:ring-rc-brand/20"
            />
            <p className="text-right text-[11px] text-rc-ink-faint mt-1">{reason.length}/500</p>

            <label className="mt-2 flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 w-[18px] h-[18px] rounded accent-[#D93025] shrink-0" />
              <span className="text-[13px] text-rc-navy/80 leading-snug">I understand this permanently removes my profile, wishlist and chats once actioned.</span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-5 h-[52px] rounded-full bg-[#D93025] text-white font-bold text-[15px] inline-flex items-center justify-center gap-2 hover:bg-[#B9271E] active:scale-[0.99] shadow-[0_12px_26px_-14px_rgba(217,48,37,0.9)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
                : <>Request account deletion <ArrowRight size={18} /></>}
            </button>

            <p className="flex items-start gap-2 text-[12.5px] text-rc-ink-muted leading-relaxed mt-4">
              <ShieldCheck size={15} className="text-[#15803D] mt-0.5 shrink-0" />
              Nothing is deleted the moment you submit. Our team reviews the request first, and we email you either way.
            </p>
          </div>
        </form>
      </div>
    </Backdrop>
  );
}
