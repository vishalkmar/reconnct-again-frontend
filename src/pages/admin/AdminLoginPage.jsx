import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext.jsx';
import useSiteLogo from '../../hooks/useSiteLogo.js';

export default function AdminLoginPage() {
  const {
    admin, login, verify2fa, resend2faEmail, loading,
  } = useAuth();
  const { logoSrc, companyName } = useSiteLogo();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 2FA step state — set when the password step returns a challenge.
  const [challenge, setChallenge] = useState(null); // { challengeToken, factors, emailHint }
  const [emailCode, setEmailCode] = useState('');
  const [totpCode, setTotpCode] = useState('');

  if (!loading && admin) {
    return <Navigate to={from} replace />;
  }

  const finish = () => { toast.success('Welcome back!'); navigate(from, { replace: true }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res && res.requires2fa) {
        setChallenge(res); // move to the verification step
        toast('Enter your verification code', { icon: '🔐' });
      } else {
        finish();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await verify2fa({ challengeToken: challenge.challengeToken, emailCode, totpCode });
      finish();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try { await resend2faEmail(challenge.challengeToken); toast.success('A new code was emailed to you'); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not resend'); }
  };

  const needEmail = challenge?.factors?.includes('email');
  const needTotp = challenge?.factors?.includes('totp');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/20 via-white to-wellness-light/20 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src={logoSrc}
              alt={companyName}
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">{challenge ? 'Verify it\'s you' : 'Admin Login'}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {challenge ? 'Extra security is on for this account' : 'Sign in to manage your site'}
          </p>
        </div>

        {challenge ? (
          <form onSubmit={handleVerify} className="bg-white rounded-2xl shadow-card p-8 space-y-5">
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
              <ShieldCheck size={18} /> Password verified
            </div>

            {needEmail && (
              <div>
                <label className="label">Email code</label>
                <p className="text-[11px] text-ink-muted mb-1">Sent to {challenge.emailHint || 'your email'}</p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                  <input inputMode="numeric" autoFocus value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input pl-10 tracking-[0.4em] font-semibold" placeholder="123456" />
                </div>
                <button type="button" onClick={resend} className="text-xs text-brand font-semibold mt-1 hover:underline">
                  Resend code
                </button>
              </div>
            )}

            {needTotp && (
              <div>
                <label className="label">Authenticator code</label>
                <p className="text-[11px] text-ink-muted mb-1">From your authenticator app</p>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                  <input inputMode="numeric" autoFocus={!needEmail} value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input pl-10 tracking-[0.4em] font-semibold" placeholder="123456" />
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button type="button" onClick={() => { setChallenge(null); setEmailCode(''); setTotpCode(''); }}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink">
              <ArrowLeft size={13} /> Back to password
            </button>
          </form>
        ) : (
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
                placeholder="admin@traveon.com"
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

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-xs text-center text-ink-muted">
            Credentials are seeded from <code className="bg-surface-alt px-1 rounded">.env</code>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
