import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Building2, MailCheck } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/20 via-white to-wellness-light/20 px-4">
      <div className="w-full max-w-md">
        {mode === 'forgot' ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
                {forgotSent ? <MailCheck size={28} /> : <Lock size={28} />}
              </div>
              <h1 className="text-2xl font-display font-bold">Reset your password</h1>
              <p className="text-sm text-ink-muted mt-1">{forgotSent ? 'Check your inbox' : 'We\'ll email you a reset link'}</p>
            </div>
            {forgotSent ? (
              <div className="bg-white rounded-2xl shadow-card p-8 text-center space-y-4">
                <p className="text-sm text-ink">If <strong>{email}</strong> is a registered supplier account, a password-reset link is on its way. It expires in 1 hour.</p>
                <button type="button" onClick={() => { setMode('login'); setForgotSent(false); }} className="btn-primary w-full">Back to sign in</button>
              </div>
            ) : (
              <form onSubmit={sendForgot} className="bg-white rounded-2xl shadow-card p-8 space-y-5">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                    <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@yourcompany.com" />
                  </div>
                </div>
                <button type="submit" disabled={forgotBusy} className="btn-primary w-full">{forgotBusy ? 'Sending…' : 'Send reset link'}</button>
                <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-ink-muted hover:text-brand">← Back to sign in</button>
              </form>
            )}
          </>
        ) : (
        <>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
            <Building2 size={28} />
          </div>
          <h1 className="text-2xl font-display font-bold">Supplier Portal</h1>
          <p className="text-sm text-ink-muted mt-1">Manage your own experiences on reconnct</p>
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
                placeholder="you@yourcompany.com"
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
            Don&apos;t have login access yet? Ask reconnct for your credentials.
          </p>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
