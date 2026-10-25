import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, UserRound, Phone, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';
import { usePwa } from '../../context/PwaContext.jsx';
import BrandMark from '../../components/landing/BrandMark.jsx';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import '../../styles/app-auth.css';

/*
  /app/login — installed app (PWA / TWA) only. The web twin of the Android
  app's auth flow (App/reconnct/src/screens/auth):
    member   : email → OTP → (brand-new account) name + phone → /dashboard
    supplier : "Login as Supplier" → email + password → /supplier/dashboard
               └ "Forgot password?" → emailed reset link
  The website never shows this page; it keeps its login modal.
*/
const OTP_LENGTH = 6;
const RESEND_SECS = 90;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLE_KEY = 'rc_last_role';
const saveRole = (r) => { try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ } };

function Header() {
  return (
    <>
      <div className="app-auth__circle-big" aria-hidden="true" />
      <div className="app-auth__circle-small" aria-hidden="true" />
      <div className="app-auth__brand">
        <BrandMark by color="#F9B402" className="app-auth__logo app-auth__logo--by" bySize="text-[13px]" />
        <span className="app-auth__tagline">
          with your <b>loved ones</b>
          <svg className="app-auth__squiggle" viewBox="0 0 100 8" fill="none" aria-hidden="true">
            <path d="M2 5C10 1 18 1 26 5C34 9 42 9 50 5C58 1 66 1 74 5C82 9 90 9 98 5" stroke="#F9B402" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </>
  );
}

function Note({ children }) {
  return (
    <div className="app-auth__note">
      <span className="app-auth__note-icon"><ShieldCheck size={16} /></span>
      <span>{children}</span>
    </div>
  );
}

function Button({ label, active, loading, type = 'submit', onClick }) {
  return (
    <button type={type} onClick={onClick} disabled={!active || loading} className={`app-auth__btn ${active ? 'is-active' : ''}`}>
      {loading ? <Loader2 size={20} className="animate-spin" /> : <>{label}{active && <ArrowRight size={16} />}</>}
    </button>
  );
}

export default function AppAuthPage() {
  const { isPwa } = usePwa();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const { user, loading: userLoading, setSession, refresh } = useUserAuth();
  const { supplier, loading: supplierLoading, login: supplierLogin } = useSupplierAuth();
  useDocumentMeta({ title: 'Sign in · Reconnct', description: 'Sign in to the Reconnct app.' });

  const [step, setStep] = useState(params.get('as') === 'supplier' ? 'supplier' : 'email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [secs, setSecs] = useState(0);
  const [forgotSent, setForgotSent] = useState(false);
  const checked = useRef(false);

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = EMAIL_RE.test(cleanEmail);
  const go = (s) => { setError(''); setStep(s); };

  // Opened while already signed in (e.g. relaunch) → straight to the dashboard.
  useEffect(() => {
    if (checked.current || userLoading || supplierLoading) return;
    checked.current = true;
    if (step === 'supplier' && supplier) navigate('/supplier/dashboard', { replace: true });
    else if (step !== 'supplier' && user?.isProfileComplete) navigate(state?.from || '/dashboard', { replace: true });
  }, [userLoading, supplierLoading, user, supplier, step, state, navigate]);

  useEffect(() => {
    if (secs <= 0) return undefined;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs]);

  if (!isPwa) return <Navigate to="/" replace />;

  const fail = (err, fallback) => {
    const msg = err?.response?.data?.message || fallback;
    setError(msg);
    toast.error(msg);
  };

  const enterMember = (nextUser) => {
    saveRole('member');
    refresh();
    toast.success(`Welcome${nextUser?.name ? `, ${nextUser.name.split(' ')[0]}` : ''}!`);
    navigate(state?.from && !state.from.startsWith('/supplier') ? state.from : '/dashboard', { replace: true });
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (!emailOk || busy) return;
    setBusy(true); setError('');
    try {
      const res = await api.post('/user-auth/request-otp', { email: cleanEmail });
      toast.success(res.data?.message || 'OTP sent to your email');
      setCode(''); setSecs(RESEND_SECS); go('otp');
    } catch (err) { fail(err, 'Could not send OTP'); } finally { setBusy(false); }
  };

  const verify = async (value = code) => {
    if (value.length !== OTP_LENGTH || busy) return;
    setBusy(true); setError('');
    try {
      const res = await api.post('/user-auth/verify-otp', { email: cleanEmail, code: value });
      const { token, user: nextUser, needsProfile } = res.data.data;
      setSession({ token, user: nextUser });
      if (needsProfile) { setName(nextUser?.name || ''); go('profile'); } else enterMember(nextUser);
    } catch (err) { fail(err, 'Verification failed'); setCode(''); } finally { setBusy(false); }
  };

  const onCode = (v) => {
    const clean = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(clean); setError('');
    if (clean.length === OTP_LENGTH) verify(clean);
  };

  const resend = async () => {
    if (secs > 0 || busy) return;
    try {
      await api.post('/user-auth/resend-otp', { email: cleanEmail });
      setSecs(RESEND_SECS); setCode('');
      toast.success('A new code has been sent');
    } catch (err) { fail(err, 'Could not resend the code'); }
  };

  const profileOk = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10;
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profileOk || busy) return;
    setBusy(true); setError('');
    let referralCode;
    try { referralCode = (sessionStorage.getItem('user_referral_code') || '').trim() || undefined; } catch { /* ignore */ }
    try {
      const res = await api.post('/user-auth/complete-profile', { name: name.trim(), phone: phone.trim(), referralCode });
      const nextUser = res.data.data.user;
      setSession({ user: nextUser });
      try { sessionStorage.removeItem('user_referral_code'); } catch { /* ignore */ }
      enterMember(nextUser);
    } catch (err) { fail(err, 'Could not save your details'); } finally { setBusy(false); }
  };

  const supplierOk = emailOk && password.length > 0;
  const loginSupplier = async (e) => {
    e.preventDefault();
    if (!supplierOk || busy) return;
    setBusy(true); setError('');
    try {
      await supplierLogin(cleanEmail, password);
      saveRole('supplier');
      toast.success('Welcome back!');
      navigate('/supplier/dashboard', { replace: true });
    } catch (err) { fail(err, 'Could not sign in'); } finally { setBusy(false); }
  };

  const sendReset = async (e) => {
    e.preventDefault();
    if (!emailOk || busy) return;
    setBusy(true);
    try {
      await api.post('/supplier/auth/forgot-password', { email: cleanEmail });
      setForgotSent(true);
    } catch (err) { fail(err, 'Could not send the reset link'); } finally { setBusy(false); }
  };

  const emailField = (props = {}) => (
    <label className="app-auth__field">
      <Mail size={15} />
      <input
        type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="Email"
        value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} {...props}
      />
    </label>
  );

  return (
    <div className="app-auth" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="app-auth__art" aria-hidden="true"><img src="/app/login-illustration.png" alt="" /></div>

      {(step === 'supplier' || step === 'forgot') && (
        <button type="button" className="app-auth__back" onClick={() => go(step === 'forgot' ? 'supplier' : 'email')}>‹ Back</button>
      )}

      <Header />

      <div className="app-auth__body">
        {step === 'email' && (
          <form key="email" className="app-auth__step" onSubmit={sendOtp}>
            <div className="app-auth__card">
              {emailField({ autoFocus: true, enterKeyHint: 'send' })}
              <Note>A one time password will be sent to this email address.</Note>
              {error && <p className="app-auth__error">{error}</p>}
            </div>
            <Button label="Send OTP" active={emailOk} loading={busy} />
            <button type="button" className="app-auth__link is-underline" onClick={() => go('supplier')}>Login as Supplier</button>
            <p className="app-auth__legal">By continuing you agree to our <Link to="/terms">Terms</Link> &amp; <Link to="/privacy">Privacy Policy</Link>.</p>
          </form>
        )}

        {step === 'otp' && (
          <form key="otp" className="app-auth__step" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <div className="app-auth__card">
              {emailField({ disabled: true })}
              <label className="app-auth__field app-auth__field-gap">
                <Lock size={15} />
                <input
                  className={code ? 'is-code' : ''}
                  type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" placeholder="OTP"
                  maxLength={OTP_LENGTH} value={code} onChange={(e) => onCode(e.target.value)} autoFocus disabled={busy}
                />
              </label>
              <p className="app-auth__helper">
                A one time password has been sent to the email address.{' '}
                <button type="button" className="app-auth__resend" disabled={secs > 0} onClick={resend}>
                  {secs > 0 ? `Resend (${secs}s)` : 'Resend'}
                </button>
              </p>
              {error && <p className="app-auth__error">{error}</p>}
            </div>
            <Button label="Verify" active={code.length === OTP_LENGTH} loading={busy} />
            <button type="button" className="app-auth__link" onClick={() => go('email')}>‹ Change email</button>
          </form>
        )}

        {step === 'profile' && (
          <form key="profile" className="app-auth__step" onSubmit={saveProfile}>
            <h1 className="app-auth__title">Create your profile</h1>
            <p className="app-auth__subtitle">Signing in as {cleanEmail}</p>
            <div className="app-auth__card" style={{ marginTop: 20 }}>
              <span className="app-auth__label">Full name</span>
              <label className="app-auth__field">
                <UserRound size={15} />
                <input type="text" autoComplete="name" autoCapitalize="words" placeholder="e.g. Priya Sharma" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} autoFocus />
              </label>
              <span className="app-auth__label" style={{ marginTop: 16 }}>Phone number</span>
              <label className="app-auth__field">
                <Phone size={15} />
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number" maxLength={15} value={phone} onChange={(e) => { setPhone(e.target.value); setError(''); }} />
              </label>
              {error && <p className="app-auth__error">{error}</p>}
            </div>
            <Button label="Get Started" active={profileOk} loading={busy} />
          </form>
        )}

        {step === 'supplier' && (
          <form key="supplier" className="app-auth__step" onSubmit={loginSupplier}>
            <div className="app-auth__card">
              {emailField({ autoFocus: true, enterKeyHint: 'next' })}
              <label className="app-auth__field app-auth__field-gap">
                <Lock size={15} />
                <input
                  type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="Password"
                  value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} enterKeyHint="go"
                />
                <button type="button" className="app-auth__eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>
              {error && <p className="app-auth__error">{error}</p>}
            </div>
            <Button label="Login as Supplier" active={supplierOk} loading={busy} />
            <button type="button" className="app-auth__link is-brand" onClick={() => { setForgotSent(false); go('forgot'); }}>Forgot password?</button>
          </form>
        )}

        {step === 'forgot' && (
          <form key="forgot" className="app-auth__step" onSubmit={sendReset}>
            <div className="app-auth__card">
              {forgotSent ? (
                <p className="text-sm text-center leading-relaxed text-[#6B7280] py-1.5">
                  If that email is a registered supplier account, a password-reset link is on its way. Open it on any browser to set a new password. The link expires in 1 hour.
                </p>
              ) : (
                <>
                  <Note>Enter your email — we&apos;ll send you a password-reset link.</Note>
                  <div style={{ marginTop: 12 }}>{emailField({ autoFocus: true, enterKeyHint: 'go' })}</div>
                  {error && <p className="app-auth__error">{error}</p>}
                </>
              )}
            </div>
            {!forgotSent && <Button label="Send reset link" active={emailOk} loading={busy} />}
            <button type="button" className="app-auth__link is-brand" onClick={() => { setForgotSent(false); go('supplier'); }}>‹ Back to sign in</button>
          </form>
        )}
      </div>
    </div>
  );
}
