import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext.jsx';
import { useSupplierAuth } from '../../context/SupplierAuthContext.jsx';

/*
  /login — kept only so old links/bookmarks still work. Sign-in in both the
  website and the app is the global login modal (member email OTP, with a
  "Login as Supplier" link), so this just lands on Home with that modal open.
  Already signed in? Skip straight to the right place.
*/
export default function LoginChooserPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, requestLogin } = useUserAuth();
  const { supplier, loading: supplierLoading } = useSupplierAuth();

  useEffect(() => {
    if (loading || supplierLoading) return;
    if (supplier) navigate('/supplier/dashboard', { replace: true });
    else if (isAuthenticated) navigate('/', { replace: true });
    else {
      navigate('/', { replace: true });
      requestLogin({ redirectTo: '/' });
    }
  }, [loading, isAuthenticated, supplierLoading, supplier, navigate, requestLogin]);

  return null;
}
