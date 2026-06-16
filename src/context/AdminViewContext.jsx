import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AdminViewContext = createContext(null);

const STORAGE_KEY = 'admin_dashboard_view';
const VALID = new Set(['main', 'configure']);

const readInitial = () => {
  try {
    const stashed = localStorage.getItem(STORAGE_KEY);
    return VALID.has(stashed) ? stashed : 'main';
  } catch {
    return 'main';
  }
};

/**
 * Persists which slice of the admin sidebar is currently active. We default
 * to `main` (Bookings/Transactions) because that's what an active operator
 * looks at every day — the configure mode is a periodic chore.
 */
export const AdminViewProvider = ({ children }) => {
  const [view, setViewState] = useState(readInitial);

  const setView = useCallback((next) => {
    if (!VALID.has(next)) return;
    setViewState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  // Keep tabs/windows in sync — if the operator flips the toggle in one tab,
  // a sister tab's sidebar updates without a refresh.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && VALID.has(e.newValue)) setViewState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AdminViewContext.Provider value={{ view, setView }}>
      {children}
    </AdminViewContext.Provider>
  );
};

export const useAdminView = () => {
  const ctx = useContext(AdminViewContext);
  if (!ctx) throw new Error('useAdminView must be used within AdminViewProvider');
  return ctx;
};
