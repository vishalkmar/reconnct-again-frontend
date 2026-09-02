import { useState } from 'react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

/*
  Public account-deletion page — /delete-account

  Google Play requires a way to ask for deletion that works WITHOUT installing
  the app, reachable from the store listing. This is that page, and this URL is
  what goes into the Play Console.

  Submitting does NOT delete anything: it raises a request that an admin reviews
  under Users → Deletion requests. Deletion is irreversible, so a person actions
  it rather than an unattended form.
*/

const WHAT_GOES = [
  'Your profile — name, phone, email, address and photo',
  'Your wishlist',
  'Your support conversations',
  'Push notification tokens for your devices',
];

const WHAT_STAYS = [
  'Past bookings, with your name and contact details removed — we are required to keep the transaction record itself',
  'Reviews you wrote, shown as “Deleted user”, because they belong to the listing',
];

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

  const Shell = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/20 via-white to-wellness-light/20 px-4 py-12">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );

  if (sent) {
    return (
      <Shell>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <CheckCircle2 size={44} />
          </div>
          <h1 className="text-2xl font-display font-bold text-ink">Request received</h1>
          <p className="text-sm text-ink-muted mt-3">
            If <strong>{email}</strong> is registered with reconnct, your deletion request has
            been logged and our team will action it shortly. We have emailed you a confirmation.
          </p>
          <p className="text-xs text-ink-muted mt-6">
            Changed your mind? Reply to that email and we will cancel the request — nothing is
            deleted until our team actions it.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 mb-4">
          <Trash2 size={28} />
        </div>
        <h1 className="text-2xl font-display font-bold text-ink">Delete your reconnct account</h1>
        <p className="text-sm text-ink-muted mt-2">
          Enter the email address you use with reconnct and we will delete your account. You do
          not need the app installed.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white/70 p-5 text-sm mb-6">
        <p className="font-semibold text-ink mb-2">What gets deleted</p>
        <ul className="list-disc pl-5 space-y-1 text-ink-muted">
          {WHAT_GOES.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <p className="font-semibold text-ink mt-4 mb-2">What we have to keep</p>
        <ul className="list-disc pl-5 space-y-1 text-ink-muted">
          {WHAT_STAYS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <form onSubmit={submit}>
        <label className="block text-sm font-medium text-ink mb-2" htmlFor="del-email">
          Your email address
        </label>
        <input
          id="del-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input w-full"
          autoComplete="email"
        />

        <label className="block text-sm font-medium text-ink mt-4 mb-2" htmlFor="del-reason">
          Reason <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="del-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Anything you would like us to know"
          className="input w-full resize-none"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full mt-6 h-12 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-40 hover:bg-red-700 transition"
        >
          {busy ? 'Sending…' : 'Request account deletion'}
        </button>
      </form>

      <p className="text-xs text-ink-muted text-center mt-6">
        You can also request this from inside the app (Profile → Edit profile → Delete account)
        or from your account on this site.
      </p>
    </Shell>
  );
}
