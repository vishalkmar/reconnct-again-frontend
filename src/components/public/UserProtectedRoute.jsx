import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext.jsx';

// Wraps any route that requires a signed-in user. Behaviour:
//   1. While the initial /me call is in flight, render `fallback` (a centered
//      spinner by default) so we never flash the public site at an already-
//      signed-in returning visitor.
//   2. If unauthenticated, open the global login modal with a redirect back to
//      the route the user originally asked for, then bounce to `/` so the URL
//      isn't stuck behind the modal.
export default function UserProtectedRoute({ children, fallback }) {
  const { isAuthenticated, loading, requestLogin } = useUserAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      requestLogin({ redirectTo: location.pathname + location.search });
    }
  }, [loading, isAuthenticated, requestLogin, location.pathname, location.search]);

  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}
