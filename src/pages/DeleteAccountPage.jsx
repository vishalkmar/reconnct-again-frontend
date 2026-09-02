import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, CheckCircle2, ShieldCheck, Loader2, ArrowRight, Mail,
  UserX, Heart, MessageSquare, BellOff, Receipt, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

/*
  Public account-deletion page — /delete-account

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

function Page({ children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      <header className="px-6 sm:px-10 py-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-display text-2xl font-semibold tracking-tight"
        >
          reconn<span className="text-accent">ct</span>
        </button>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-5 pb-16">
        <div className="w-full max-w-xl">{children}</div>
      </main>

      <footer className="px-6 sm:px-10 py-6 text-center text-xs text-ink-muted">
        Need help instead? Reach us from the app under Profile → Support.
      </footer>
    </div>
  );
}

function ItemList({ title, tone, items }) {
  const dot = tone === 'danger' ? 'text-red-500' : 'text-ink-muted';
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted mb-3">{title}</p>
      <ul className="space-y-3">
        {items.map(({ Icon, label, detail }) => (
          <li key={label} className="flex gap-3">
            <Icon size={16} className={`${dot} mt-0.5 shrink-0`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink leading-tight">{label}</p>
              <p className="text-[13px] text-ink-muted leading-snug mt-0.5">{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address');
    setBusy(true);
    try {
      await api.post('/user-auth/account/delete-request', {
        email: email.trim(),
        reason: reason.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send your request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Page>
        <div className="bg-white rounded-3xl border border-ink/10 shadow-sm p-8 sm:p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl leading-tight">Request received</h1>
          <p className="text-ink-muted text-[15px] leading-relaxed mt-4">
            If <span className="font-semibold text-ink break-all">{email}</span> is registered with
            reconnct, your deletion request is logged and our team will action it shortly. We have
            emailed you a confirmation.
          </p>
          <div className="mt-7 rounded-2xl bg-surface-alt/70 px-5 py-4 text-left">
            <p className="text-[13px] text-ink-muted leading-relaxed">
              <span className="font-semibold text-ink">Changed your mind?</span> Reply to that email
              and we will cancel it. Nothing is deleted until our team actions the request.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-red-600 mb-5">
          <Trash2 size={26} />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-accent mb-3">
          Account deletion
        </p>
        <h1 className="font-display text-3xl sm:text-4xl leading-[1.15]">
          Delete your <span className="text-accent italic">reconnct</span> account
        </h1>
        <p className="text-ink-muted text-[15px] leading-relaxed mt-4 max-w-md mx-auto">
          Enter the email you use with reconnct and we will delete your account. You do not need
          the app installed.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-ink/10 shadow-sm overflow-hidden">
        <div className="grid sm:grid-cols-2 gap-8 p-7 sm:p-8 border-b border-ink/10">
          <ItemList title="What gets deleted" tone="danger" items={GOES} />
          <ItemList title="What we have to keep" items={STAYS} />
        </div>

        <form onSubmit={submit} className="p-7 sm:p-8">
          <label className="block text-sm font-semibold text-ink mb-2" htmlFor="del-email">
            Your email address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              id="del-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-ink/15 bg-white text-[15px] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>

          <label className="block text-sm font-semibold text-ink mt-5 mb-2" htmlFor="del-reason">
            Reason <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="del-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Anything you would like us to know"
            className="w-full px-4 py-3 rounded-xl border border-ink/15 bg-white text-[15px] resize-none outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-6 py-3.5 rounded-full bg-red-600 text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2 hover:bg-red-700 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy
              ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
              : <>Request account deletion <ArrowRight size={18} /></>}
          </button>

          <p className="flex items-start gap-2 text-[13px] text-ink-muted leading-relaxed mt-5">
            <ShieldCheck size={15} className="text-emerald-600 mt-0.5 shrink-0" />
            Nothing is deleted the moment you submit. Our team reviews the request first, and we
            email you either way.
          </p>
        </form>
      </div>

      <p className="text-[13px] text-ink-muted text-center mt-6 leading-relaxed">
        You can also request this in the app — <span className="text-ink font-medium">Profile → Edit profile → Delete account</span>
        {' '}— or from your account on this site.
      </p>
    </Page>
  );
}
