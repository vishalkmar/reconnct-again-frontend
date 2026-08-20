import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Mail, KeyRound, Loader2, Check, X, Smartphone, Copy, AlertTriangle, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/*
  Admin → Security → Two-Factor Authentication.

  The signed-in admin turns extra login factors on/off for their OWN account:
    • Email verification — a code is emailed at each sign-in.
    • Authenticator app (TOTP) — a code from Google Authenticator etc.
  With any factor on, the password alone no longer opens the panel — the code
  step must also pass (see AdminLoginPage).
*/

export default function SecurityTwoFactorPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiMissing, setApiMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/security/2fa/status');
      setStatus(data?.data || null);
      setApiMissing(false);
    } catch (err) {
      if (err.response?.status === 404) setApiMissing(true);
      else toast.error(err.response?.data?.message || 'Could not load');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold mb-1 inline-flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" size={24} /> Two-Factor Authentication
        </h1>
        <p className="text-sm text-ink-muted">
          Add a second step after your password. Once turned on, signing in needs the code too —
          so a stolen password alone can’t open the admin panel.
        </p>
      </div>

      {apiMissing && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>The 2FA API isn’t live on this server yet (<code>/api/admin/security/2fa/*</code> 404). Deploy the backend carrying this feature.</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></div>
      ) : status ? (
        <div className="space-y-4">
          <EmailFactor status={status} onChanged={load} />
          <TotpFactor status={status} onChanged={load} />
        </div>
      ) : null}
    </div>
  );
}

function Card({ icon: Icon, title, sub, enabled, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5">
      <div className="flex items-start gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'text-emerald-600 bg-emerald-50' : 'text-ink-muted bg-slate-100'}`}>
          <Icon size={18} />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-ink">{title}</h2>
            {enabled
              ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ON</span>
              : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">OFF</span>}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{sub}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Email verification ──────────────────────────────────────────────────────
function EmailFactor({ status, onChanged }) {
  const [step, setStep] = useState('idle'); // idle | confirming | disabling
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    try { await api.post('/admin/security/2fa/email/enable'); setStep('confirming'); toast.success('Code emailed to you'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try { await api.post('/admin/security/2fa/email/confirm', { code }); toast.success('Email verification is on'); setStep('idle'); setCode(''); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Wrong code'); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { await api.post('/admin/security/2fa/email/disable', { password }); toast.success('Turned off'); setStep('idle'); setPassword(''); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <Card icon={Mail} title="Email verification" sub={`A code is emailed to ${status.email} each time you sign in.`} enabled={status.emailEnabled}>
      {status.emailEnabled ? (
        step === 'disabling' ? (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label inline-flex items-center gap-1"><Lock size={12} /> Your password</label>
              <input type="password" className="input w-56" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button onClick={disable} disabled={busy} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : 'Turn off'}
            </button>
            <button onClick={() => { setStep('idle'); setPassword(''); }} className="px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-surface-alt">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setStep('disabling')} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-ink-muted hover:text-rose-600">Turn off</button>
        )
      ) : step === 'confirming' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">Enter the emailed code</label>
            <input inputMode="numeric" className="input w-40 tracking-[0.3em] font-semibold" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
          </div>
          <button onClick={confirm} disabled={busy || code.length < 6} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
          </button>
          <button onClick={() => { setStep('idle'); setCode(''); }} className="px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-surface-alt">Cancel</button>
        </div>
      ) : (
        <button onClick={enable} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Turn on
        </button>
      )}
    </Card>
  );
}

// ─── Authenticator app (TOTP) ────────────────────────────────────────────────
function TotpFactor({ status, onChanged }) {
  const [setup, setSetup] = useState(null); // { qrDataUrl, manualKey }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('idle'); // idle | setup | disabling
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try { const { data } = await api.post('/admin/security/2fa/totp/setup'); setSetup(data?.data); setStep('setup'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try { await api.post('/admin/security/2fa/totp/confirm', { code }); toast.success('Authenticator is on'); setStep('idle'); setSetup(null); setCode(''); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Wrong code'); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { await api.post('/admin/security/2fa/totp/disable', { password }); toast.success('Turned off'); setStep('idle'); setPassword(''); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <Card icon={KeyRound} title="Authenticator app (MFA)" sub="Use Google Authenticator, Authy, or any TOTP app for a 6-digit code." enabled={status.totpEnabled}>
      {status.totpEnabled ? (
        step === 'disabling' ? (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label inline-flex items-center gap-1"><Lock size={12} /> Your password</label>
              <input type="password" className="input w-56" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button onClick={disable} disabled={busy} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : 'Turn off'}
            </button>
            <button onClick={() => { setStep('idle'); setPassword(''); }} className="px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-surface-alt">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setStep('disabling')} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-ink-muted hover:text-rose-600">Turn off</button>
        )
      ) : step === 'setup' && setup ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 items-start">
            <img src={setup.qrDataUrl} alt="Scan in your authenticator app" className="w-40 h-40 rounded-xl border border-gray-200" />
            <div className="text-xs text-ink-muted max-w-xs">
              <div className="inline-flex items-center gap-1.5 font-semibold text-ink mb-1"><Smartphone size={13} /> Scan this QR</div>
              <p>Open your authenticator app → add account → scan. Can’t scan? Enter this key manually:</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="bg-surface-alt px-2 py-1 rounded text-[11px] break-all">{setup.manualKey}</code>
                <button onClick={() => { navigator.clipboard?.writeText(setup.manualKey); toast.success('Key copied'); }}
                  className="p-1.5 rounded hover:bg-surface-alt text-ink-muted"><Copy size={13} /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label">Enter the 6-digit code from the app</label>
              <input inputMode="numeric" className="input w-40 tracking-[0.3em] font-semibold" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
            </div>
            <button onClick={confirm} disabled={busy || code.length < 6} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm & turn on
            </button>
            <button onClick={() => { setStep('idle'); setSetup(null); setCode(''); }} className="px-3 py-2 rounded-lg text-sm text-ink-muted hover:bg-surface-alt">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={start} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-ink text-sm font-bold disabled:opacity-60">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Set up
        </button>
      )}
    </Card>
  );
}
