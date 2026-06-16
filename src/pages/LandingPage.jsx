import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext.jsx';

/**
 * Minimal branded entry point. This build ships only the member + admin
 * dashboards (no public marketing site), so `/` is a clean sign-in surface:
 *   - "Member sign in" opens the global OTP login modal and, on success,
 *     redirects to the user dashboard.
 *   - Already-signed-in members are bounced straight to /dashboard.
 *   - A discreet link routes staff to the admin login.
 */
export default function LandingPage() {
  const { isAuthenticated, loading, requestLogin } = useUserAuth();
  const navigate = useNavigate();

  // Returning, already-authenticated members skip the landing entirely.
  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [loading, isAuthenticated, navigate]);

  const openLogin = () =>
    requestLogin({ redirectTo: '/dashboard' });

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <span className="font-display text-2xl font-semibold tracking-tight">
          reconn<span className="text-accent">ct</span>
        </span>
        <button
          onClick={() => navigate('/admin/login')}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-brand transition"
        >
          <ShieldCheck size={16} /> Admin
        </button>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 grid md:grid-cols-2 gap-12 items-center w-full">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent mb-4">
              Members area
            </p>
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] mb-5">
              Life is better when you{' '}
              <span className="text-accent italic">truly connect</span>
            </h1>
            <p className="text-ink-muted text-base leading-relaxed mb-8 max-w-md">
              Sign in to track your bookings, transactions and rewards — all in
              one place. We’ll email you a 6-digit code; no password to remember.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openLogin}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-accent text-white font-medium px-6 py-3 rounded-full hover:brightness-110 transition disabled:opacity-60"
              >
                Member sign in <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 border border-brand/30 text-brand font-medium px-6 py-3 rounded-full hover:bg-brand hover:text-white transition"
              >
                <LayoutDashboard size={18} /> Go to dashboard
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-brand to-brand-dark shadow-card" />
          </div>
        </div>
      </main>

      <footer className="px-6 sm:px-10 py-6 text-sm text-ink-muted">
        © {new Date().getFullYear()} Reconnct. Experiences that connect.
      </footer>
    </div>
  );
}
