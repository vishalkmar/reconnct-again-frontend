import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, Mail, ArrowRight, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import api from '../../services/api';
import { useUserAuth } from '../../context/UserAuthContext.jsx';

const OTP_LENGTH = 6;

const isValidEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s).trim());

export default function UserLoginModal() {
  const { loginRequest, closeLogin, setSession, refresh } = useUserAuth();
  const navigate = useNavigate();
  const open = !!loginRequest;

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendSecs, setResendSecs] = useState(0);
  const otpRefs = useRef([]);

  // Reset when the modal is opened fresh (a new login request). Also prefill
  // the referral code from `?ref=XYZ` so a referee who clicked an invite link
  // doesn't have to type the code themselves.
  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail('');
      setOtp(Array(OTP_LENGTH).fill(''));
      setIsNewUser(false);
      setName('');
      setPhone('');
      // Pull ?ref= from the current URL. We persist via sessionStorage so the
      // code survives the auth flow even if the user navigates away and back.
      let refFromUrl = '';
      try {
        const params = new URLSearchParams(window.location.search);
        refFromUrl = (params.get('ref') || '').trim().toUpperCase();
        if (refFromUrl) sessionStorage.setItem('user_referral_code', refFromUrl);
      } catch { /* ignore */ }
      const stashed = (sessionStorage.getItem('user_referral_code') || '').trim().toUpperCase();
      setReferralCode(refFromUrl || stashed || '');
      setSubmitting(false);
      setResendSecs(0);
    }
  }, [open]);

  // Resend cooldown ticker — purely cosmetic; backend has its own limiter.
  useEffect(() => {
    if (resendSecs <= 0) return undefined;
    const t = setInterval(() => setResendSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSecs]);

  useEffect(() => {
    if (step === 'otp') {
      // Focus first empty box when entering this step.
      const idx = otp.findIndex((d) => !d);
      otpRefs.current[idx === -1 ? OTP_LENGTH - 1 : idx]?.focus();
    }
  }, [step, otp]);

  // ESC to close (only when not actively submitting so we don't strand a request).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) closeLogin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, closeLogin]);

  if (!open) return null;

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/user-auth/request-otp', { email: email.trim() });
      const data = res.data?.data || {};
      setIsNewUser(!!data.isNewUser);
      setStep('otp');
      setResendSecs(30);
      toast.success(res.data?.message || 'OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (idx, value) => {
    const ch = value.replace(/\D/g, '').slice(0, 1);
    setOtp((prev) => {
      const next = [...prev];
      next[idx] = ch;
      return next;
    });
    if (ch && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      otpRefs.current[idx + 1]?.focus();
    } else if (e.key === 'Enter') {
      const code = otp.join('');
      if (code.length === OTP_LENGTH) handleOtpSubmit();
    }
  };

  const handleOtpPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const chars = text.split('');
    const next = Array(OTP_LENGTH).fill('');
    chars.forEach((ch, i) => { if (i < OTP_LENGTH) next[i] = ch; });
    setOtp(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleOtpSubmit = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/user-auth/verify-otp', { email: email.trim(), code });
      const { token, user: nextUser, needsProfile } = res.data.data;
      setSession({ token, user: nextUser });
      if (needsProfile) {
        toast.success('Email verified — just one quick step');
        setStep('profile');
      } else {
        toast.success(res.data?.message || 'Signed in');
        finish(nextUser);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!phone.trim()) { toast.error('Phone is required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/user-auth/complete-profile', {
        name: name.trim(),
        phone: phone.trim(),
        referralCode: referralCode.trim() || undefined,
      });
      const nextUser = res.data.data.user;
      setSession({ user: nextUser });
      // We sent the code (if any) — no need to keep it stashed anymore.
      try { sessionStorage.removeItem('user_referral_code'); } catch { /* ignore */ }
      toast.success('Profile saved — welcome aboard!');
      finish(nextUser);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile');
    } finally {
      setSubmitting(false);
    }
  };

  const finish = (signedInUser) => {
    const { redirectTo, onSuccess } = loginRequest || {};
    refresh();
    closeLogin();
    if (onSuccess) onSuccess(signedInUser);
    if (redirectTo) navigate(redirectTo);
  };

  const handleResend = async () => {
    if (resendSecs > 0) return;
    setSubmitting(true);
    try {
      await api.post('/user-auth/resend-otp', { email: email.trim() });
      toast.success('A new code is on its way');
      setResendSecs(30);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={closeLogin}
          disabled={submitting}
          className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
          aria-label="Close login"
        >
          <X size={20} />
        </button>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="p-7 sm:p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand mb-4">
              <Mail size={22} />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-1">Sign in or create your account</h2>
            <p className="text-sm text-gray-500 mb-5">We’ll email you a 6-digit code — no password to remember.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-brand hover:brightness-110 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <div className="p-7 sm:p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand mb-4">
              <ShieldCheck size={22} />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-1">Enter the 6-digit code</h2>
            <p className="text-sm text-gray-500 mb-5">
              We sent it to <span className="font-medium text-gray-700">{email}</span>.{' '}
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-brand hover:underline font-medium"
                disabled={submitting}
              >Change</button>
            </p>
            <div className="flex justify-between gap-2 mb-5" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 sm:w-12 h-12 text-center text-xl font-semibold rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
                  disabled={submitting}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleOtpSubmit}
              disabled={submitting || otp.join('').length !== OTP_LENGTH}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand hover:brightness-110 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Verify & continue'}
            </button>
            <div className="mt-4 text-center text-sm text-gray-500">
              Didn’t get a code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendSecs > 0 || submitting}
                className="font-medium text-brand hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resendSecs > 0 ? `Resend in ${resendSecs}s` : 'Resend'}
              </button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="p-7 sm:p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 text-brand mb-4">
              <UserIcon size={22} />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-ink mb-1">Tell us about you</h2>
            <p className="text-sm text-gray-500 mb-5">Just two quick details so we can personalise your bookings.</p>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none mb-4"
              disabled={submitting}
            />

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none mb-4"
              disabled={submitting}
            />

            <details className="mb-2">
              <summary className="text-sm text-brand cursor-pointer hover:underline select-none">Have a referral code? (optional)</summary>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="REF-CODE"
                className="mt-2 w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none uppercase tracking-wider"
                disabled={submitting}
              />
            </details>

            <button
              type="submit"
              disabled={submitting}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-brand hover:brightness-110 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Finish & go to dashboard'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
