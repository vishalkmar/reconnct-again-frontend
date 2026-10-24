import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePwa } from '../../context/PwaContext.jsx';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';

/*
  Installed app (PWA / TWA) only — the app opens on its sign-in screen, not
  the website's Home page:
    - signed out → every page goes to /app/login (legal + reset pages stay open)
    - app launch while signed in → straight to that account's dashboard
    - the website's login modal / /login / /supplier/login → /app/login
  Once signed in everything is the normal responsive website, untouched.
  In a browser tab this is a transparent pass-through.
*/
const OPEN_WHEN_SIGNED_OUT = /^\/(app\/login|privacy|terms|delete-account|unsubscribe|supplier\/reset-password)(\/|$)/;
const lastRole = () => { try { return localStorage.getItem('rc_last_role'); } catch { return null; } };

export default function AppGate({ children }) {
  const { isPwa } = usePwa();
  const { user, loading, loginRequest, closeLogin } = useUserAuth();
  const { supplier, loading: supplierLoading } = useSupplierAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  // Anything that asks for the login modal (Book now, session expiry…) uses
  // the app's sign-in screen instead.
  useEffect(() => {
    if (!isPwa || !loginRequest) return;
    const from = loginRequest.redirectTo;
    closeLogin();
    navigate('/app/login', { state: from ? { from } : undefined });
  }, [isPwa, loginRequest, closeLogin, navigate]);

  if (!isPwa || pathname.startsWith('/app/login')) return children;
  if (loading || supplierLoading) return <div className="min-h-[100dvh] bg-[#FEFEFE]" />;

  const member = user?.isProfileComplete ? user : null;
  if (pathname === '/login') return <Navigate to="/app/login" replace />;
  if (pathname === '/supplier/login') {
    return <Navigate to={supplier ? '/supplier/dashboard' : '/app/login?as=supplier'} replace />;
  }

  if (!member && !supplier) {
    if (OPEN_WHEN_SIGNED_OUT.test(pathname)) return children;
    const to = pathname.startsWith('/supplier') ? '/app/login?as=supplier' : '/app/login';
    return <Navigate to={to} replace state={{ from: pathname + search }} />;
  }

  // App launch (start_url "/?source=pwa") → the signed-in account's dashboard.
  if (pathname === '/' && new URLSearchParams(search).get('source') === 'pwa') {
    const toSupplier = supplier && (!member || lastRole() === 'supplier');
    return <Navigate to={toSupplier ? '/supplier/dashboard' : '/dashboard'} replace />;
  }
  return children;
}
