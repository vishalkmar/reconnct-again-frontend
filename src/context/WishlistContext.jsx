import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useUserAuth } from './UserAuthContext.jsx';

const WishlistContext = createContext(null);

// Build a stable key like "package:42" so the heart UI can do an O(1) lookup
// per card render without scanning an array.
export const wishlistKey = (type, id) => `${type}:${id}`;

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, requestLogin } = useUserAuth();
  const [keys, setKeys] = useState(() => new Set());
  // Track per-item in-flight toggles so rapid double-clicks don't fire two
  // POSTs and leave the UI flickering.
  const inflightRef = useRef(new Set());

  const loadKeys = useCallback(async () => {
    if (!isAuthenticated) {
      setKeys(new Set());
      return;
    }
    try {
      const res = await api.get('/wishlist/keys');
      setKeys(new Set(res.data?.data?.keys || []));
    } catch {
      // Silent — non-fatal, hearts just show empty until next refresh.
    }
  }, [isAuthenticated]);

  // Refresh whenever the auth state flips so a fresh sign-in immediately
  // surfaces the user's saved hearts on every card.
  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const isWished = useCallback(
    (type, id) => keys.has(wishlistKey(type, id)),
    [keys]
  );

  const toggle = useCallback(
    async (type, id, opts = {}) => {
      if (!type || !id) return;

      // Guard: anonymous users get the login modal; we resume the toggle in
      // the onSuccess callback so the click "completes" after sign-in.
      if (!isAuthenticated) {
        requestLogin({
          onSuccess: () => {
            // Defer slightly so the modal's closing animation doesn't fight
            // with the toast that follows.
            setTimeout(() => toggle(type, id, opts), 200);
          },
        });
        return;
      }

      const k = wishlistKey(type, id);
      if (inflightRef.current.has(k)) return;
      inflightRef.current.add(k);

      const wasWished = keys.has(k);
      // Optimistic update — the snappy feedback matters more than perfect
      // consistency; we roll back on error.
      setKeys((prev) => {
        const next = new Set(prev);
        if (wasWished) next.delete(k);
        else next.add(k);
        return next;
      });

      try {
        if (wasWished) {
          await api.delete('/wishlist', { data: { entityType: type, entityId: id }, params: { entityType: type, entityId: id } });
          if (opts.silent !== true) toast.success('Removed from wishlist');
        } else {
          await api.post('/wishlist', { entityType: type, entityId: id });
          if (opts.silent !== true) toast.success('Saved to wishlist');
        }
      } catch (err) {
        // Roll back the optimistic flip so the heart matches reality.
        setKeys((prev) => {
          const next = new Set(prev);
          if (wasWished) next.add(k);
          else next.delete(k);
          return next;
        });
        toast.error(err.response?.data?.message || 'Could not update wishlist');
      } finally {
        inflightRef.current.delete(k);
      }
    },
    [isAuthenticated, keys, requestLogin]
  );

  const value = useMemo(
    () => ({
      keys,
      count: keys.size,
      isWished,
      toggle,
      refresh: loadKeys,
    }),
    [keys, isWished, toggle, loadKeys]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
