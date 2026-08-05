import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Landing page for the emailed team-member reset link:
//   /team/reset-password?token=…&email=…
export default function TeamResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const badLink = !token || !email;

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await api.post('/team/auth/reset-password', { email, token, password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/20 via-white to-wellness-light/20 px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <CheckCircle2 size={44} />
          </div>
          <h1 className="text-2xl font-display font-bold text-ink">Password reset successfully</h1>
          <p className="text-sm text-ink-muted mt-2">Your new password is set. Please sign in to continue.</p>
          <button type="button" onClick={() => navigate('/team/login', { replace: true })} className="btn-primary w-full max-w-xs mx-auto mt-8">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light/20 via-white to-wellness-light/20 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/15 text-brand-dark mb-4">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-display font-bold">Choose a new password</h1>
          <p className="text-sm text-ink-muted mt-1">{email ? `for ${email}` : 'Team Portal account'}</p>
        </div>

        {badLink ? (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center space-y-4">
            <p className="text-sm text-ink">This reset link is incomplete or invalid. Please request a new one from the sign-in page.</p>
            <button type="button" onClick={() => navigate('/team/login')} className="btn-primary w-full">Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-card p-8 space-y-5">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                <input type={showPwd ? 'text' : 'password'} required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                <input type={showPwd ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input pl-10" placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Updating…' : 'Update password'}</button>
            <button type="button" onClick={() => navigate('/team/login')} className="w-full text-center text-sm text-ink-muted hover:text-brand">← Back to sign in</button>
          </form>
        )}
      </div>
    </div>
  );
}
