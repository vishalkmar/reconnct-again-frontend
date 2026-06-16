import { useCallback } from 'react';
import { useUserAuth } from '../context/UserAuthContext.jsx';

/**
 * Returns a `gate(fn)` helper. If the user is signed in it runs `fn()`
 * immediately; otherwise it opens the global login modal and resumes `fn()`
 * the moment auth succeeds. Use this on Book Now / Add-to-wishlist buttons
 * and anywhere else a public CTA must be guarded.
 *
 *   const requireLogin = useRequireLogin();
 *   <button onClick={() => requireLogin(() => navigate('/book/123'))}>Book now</button>
 */
export default function useRequireLogin() {
  const { isAuthenticated, requestLogin } = useUserAuth();

  return useCallback(
    (fn, opts = {}) => {
      if (isAuthenticated) {
        fn?.();
        return;
      }
      requestLogin({
        redirectTo: opts.redirectTo,
        onSuccess: () => fn?.(),
      });
    },
    [isAuthenticated, requestLogin]
  );
}
