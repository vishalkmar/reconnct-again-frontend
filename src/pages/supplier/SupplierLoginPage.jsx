import LoginBrand from '../../components/auth/LoginBrand.jsx';
import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Mail, Eye, EyeOff, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';
import api from '../../services/api';

export default function SupplierLoginPage() {
  const { supplier, login, loading } = useSupplierAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/supplier/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  if (!loading && supplier) {
    return <Navigate to={from} replace />;
  }

  const sendForgot = async (e) => {
    e.preventDefault();
    setForgotBusy(true);
    try {
      await api.post('/supplier/auth/forgot-password', { email });
      setForgotSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the reset link');
    } finally {
      setForgotBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {mode === 'forgot' ? (
          <>
            <div className="login-header">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
                {forgotSent ? <MailCheck size={28} /> : <Lock size={28} />}
              </div>
              <h1 className="text-2xl font-display font-bold">Reset your password</h1>
              <p className="text-sm text-ink-muted mt-1">{forgotSent ? 'Check your inbox' : 'We\'ll email you a reset link'}</p>
            </div>
            {forgotSent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-ink">If <strong>{email}</strong> is a registered supplier account, a password-reset link is on its way. It expires in 1 hour.</p>
                <button type="button" onClick={() => { setMode('login'); setForgotSent(false); }} className="login-submit">Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={sendForgot} className="login-form">
                <div>
                  <label className="label" htmlFor="login-email">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                    <input id="login-email" autoComplete="username" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@yourcompany.com" />
                  </div>
                </div>
                <button type="submit" disabled={forgotBusy} className="login-submit">{forgotBusy ? 'Sending…' : 'Send reset link'}</button>
                <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-ink-muted hover:text-brand">← Back to sign in</button>
              </form>
            )}
          </>
        ) : (
        <>
        <div className="login-header">
          <LoginBrand />
          <h1 className="text-2xl font-display font-bold">Supplier Portal</h1>
          <p className="text-sm text-ink-muted mt-1">Manage your own experiences on reconnct</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                id="login-email" autoComplete="username" type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="you@yourcompany.com"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="login-password">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                id="login-password" autoComplete="current-password" type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="login-submit">
            {submitting ? <><Loader2 size={20} className="animate-spin" /> Signing in...</> : <>Sign In <ArrowRight size={22} className="login-arrow" /></>}
          </button>

          <button type="button" onClick={() => { setMode('forgot'); setForgotSent(false); }} className="w-full text-center text-sm text-brand hover:underline">
            Forgot password?
          </button>

          <p className="text-xs text-center text-ink-muted">
            Don&apos;t have login access yet? Ask reconnct for your credentials.
          </p>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
