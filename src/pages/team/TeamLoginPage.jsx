import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ClipboardCheck, MapPinCheck, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeamAuth } from '../../context/TeamAuthContext.jsx';
import api from '../../services/api';

export default function TeamLoginPage() {
  const { member, login, selectRole, loading } = useTeamAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/team/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set when a dual-role member (COPS + QCOPS) logs in: the dashboards they may
  // enter. The picker below then lets them choose one for this session.
  const [pickRoles, setPickRoles] = useState(null);
  const [picking, setPicking] = useState(false);
  // Forgot-password: 'login' shows the sign-in form; 'forgot' shows the email
  // form; once sent we show a "check your email" confirmation.
  const [mode, setMode] = useState('login');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const sendForgot = async (e) => {
    e.preventDefault();
    setForgotBusy(true);
    try {
      await api.post('/team/auth/forgot-password', { email });
      setForgotSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the reset link');
    } finally {
      setForgotBusy(false);
    }
  };

  if (!loading && member) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { roles } = await login(email, password);
      if (roles.length > 1) {
        // Two dashboards available — don't navigate yet, let them pick.
        setPickRoles(roles);
        return;
      }
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const ROLE_META = {
    cops: { label: 'Center Operations', sub: 'Content review queue', Icon: ClipboardCheck },
    qcops: { label: 'Quality Check Operations', sub: 'On-site visit queue', Icon: MapPinCheck },
  };

  const choose = async (role) => {
    setPicking(true);
    try {
      await selectRole(role);
      toast.success('Welcome back!');
      const landing = role === 'qcops' ? '/team/qc-visits' : role === 'cops' ? '/team/review-queue' : from;
      navigate(landing, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open that dashboard');
      setPicking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/20 via-white to-wellness-light/20 px-4">
      {pickRoles ? (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-display font-bold">Choose your dashboard</h1>
            <p className="text-sm text-ink-muted mt-1">You have access to more than one — pick where to work now.</p>
          </div>
          <div className="space-y-3">
            {pickRoles.map((r) => {
              const meta = ROLE_META[r] || { label: r, sub: '', Icon: ShieldCheck };
              const Icon = meta.Icon;
              return (
                <button key={r} type="button" disabled={picking} onClick={() => choose(r)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-card p-5 text-left hover:ring-2 hover:ring-brand/40 transition disabled:opacity-60">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand/15 text-brand-dark shrink-0"><Icon size={22} /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{meta.label}</span>
                    <span className="block text-xs text-ink-muted">{meta.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setPickRoles(null)} className="mt-5 w-full text-center text-sm text-ink-muted hover:text-brand">
            ← Back to sign in
          </button>
        </div>
      ) : mode === 'forgot' ? (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
              {forgotSent ? <MailCheck size={28} /> : <Lock size={28} />}
            </div>
            <h1 className="text-2xl font-display font-bold">Reset your password</h1>
            <p className="text-sm text-ink-muted mt-1">{forgotSent ? 'Check your inbox' : 'We\'ll email you a reset link'}</p>
          </div>
          {forgotSent ? (
            <div className="bg-white rounded-2xl shadow-card p-8 text-center space-y-4">
              <p className="text-sm text-ink">If <strong>{email}</strong> is a registered staff account, a password-reset link is on its way. It expires in 1 hour.</p>
              <button type="button" onClick={() => { setMode('login'); setForgotSent(false); }} className="btn-primary w-full">Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={sendForgot} className="bg-white rounded-2xl shadow-card p-8 space-y-5">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                  <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@reconnct.com" />
                </div>
              </div>
              <button type="submit" disabled={forgotBusy} className="btn-primary w-full">{forgotBusy ? 'Sending…' : 'Send reset link'}</button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-ink-muted hover:text-brand">← Back to sign in</button>
            </form>
          )}
        </div>
      ) : (
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-display font-bold">Team Portal</h1>
          <p className="text-sm text-ink-muted mt-1">Sign in with your staff account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-8 space-y-5">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="you@reconnct.com"
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <button type="button" onClick={() => { setMode('forgot'); setForgotSent(false); }} className="w-full text-center text-sm text-brand hover:underline">
            Forgot password?
          </button>

          <p className="text-xs text-center text-ink-muted">
            Don&apos;t have an account? Ask your admin to create one for you.
          </p>
        </form>
      </div>
      )}
    </div>
  );
}
