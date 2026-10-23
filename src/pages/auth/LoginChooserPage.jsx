import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRound, Store, ChevronRight, ArrowLeft } from 'lucide-react';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';
import BrandMark from '../../components/landing/BrandMark.jsx';
import useDocumentMeta from '../../hooks/useDocumentMeta';

/*
  /login — the two sign-ins the app allows (same as the Android app):
    Member  → email OTP (global login modal), lands on Home
    Partner → supplier email + password, lands on the supplier dashboard
  Already signed in? Skip straight to the right place.
*/
const ROLE_KEY = 'rc_last_role';
const lastRole = () => { try { return localStorage.getItem(ROLE_KEY); } catch { return null; } };
const saveRole = (r) => { try { localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ } };

export default function LoginChooserPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, requestLogin } = useUserAuth();
  const { supplier, loading: supplierLoading } = useSupplierAuth();
  useDocumentMeta({ title: 'Sign in · Reconnct', description: 'Sign in to Reconnct as a member or partner.' });

  useEffect(() => {
    if (!supplierLoading && supplier) navigate('/supplier/dashboard', { replace: true });
    else if (!loading && isAuthenticated) navigate('/', { replace: true });
  }, [loading, isAuthenticated, supplierLoading, supplier, navigate]);

  return (
    <div className="min-h-screen bg-rc-bg flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="rc-hero-grad rounded-b-[32px] px-6 pt-6 pb-12">
        <Link to="/" aria-label="Back to home" className="inline-grid place-items-center w-10 h-10 rounded-full bg-white/25 text-white"><ArrowLeft size={18} /></Link>
        <div className="mt-6"><BrandMark color="#FFFFFF" className="h-8 w-36" /></div>
        <h1 className="font-sans text-white text-3xl font-black mt-4">Welcome</h1>
        <p className="text-white/90 mt-1">How would you like to sign in?</p>
      </div>

      <div className={`flex-1 px-5 -mt-6 max-w-md w-full mx-auto flex gap-3 ${lastRole() === 'supplier' ? 'flex-col-reverse justify-end' : 'flex-col'}`}>
        <button
          type="button"
          onClick={() => { saveRole('member'); requestLogin({ redirectTo: '/' }); }}
          className="w-full flex items-center gap-4 bg-white rounded-3xl p-5 shadow-card text-left active:scale-[0.99] transition"
        >
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-rc-brand-soft text-rc-brand-text shrink-0"><UserRound size={26} /></span>
          <span className="flex-1">
            <span className="block font-sans text-lg font-extrabold text-rc-ink">I’m a member</span>
            <span className="block text-sm text-rc-ink-muted">Book and manage experiences. We’ll email you a 6-digit code.</span>
          </span>
          <ChevronRight className="text-rc-ink-faint" />
        </button>

        <Link
          to="/supplier/login"
          onClick={() => saveRole('supplier')}
          className="w-full flex items-center gap-4 bg-white rounded-3xl p-5 shadow-card active:scale-[0.99] transition"
        >
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-[#E1EEF4] text-[#305BA4] shrink-0"><Store size={26} /></span>
          <span className="flex-1">
            <span className="block font-sans text-lg font-extrabold text-rc-ink">I’m a partner</span>
            <span className="block text-sm text-rc-ink-muted">Suppliers: manage listings, bookings and payouts.</span>
          </span>
          <ChevronRight className="text-rc-ink-faint" />
        </Link>

      </div>
      <p className="text-xs text-center text-rc-ink-muted px-6 pt-5 pb-6">
        By continuing you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
