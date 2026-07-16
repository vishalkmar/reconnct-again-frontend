import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const SupplierAuthContext = createContext();

// A Supplier's own login (Phase 4) — mirrors AuthContext/TeamAuthContext,
// own `supplier_token` localStorage key so it never collides with an admin/
// user/team-member session in the same browser.
export const SupplierAuthProvider = ({ children }) => {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('supplier_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/supplier/auth/me');
      setSupplier(res.data.data.supplier);
    } catch {
      localStorage.removeItem('supplier_token');
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post('/supplier/auth/login', { email, password });
    const { token, supplier: s } = res.data.data;
    localStorage.setItem('supplier_token', token);
    setSupplier(s);
    return s;
  };

  const logout = () => {
    localStorage.removeItem('supplier_token');
    setSupplier(null);
  };

  return (
    <SupplierAuthContext.Provider value={{ supplier, loading, login, logout, refresh: fetchMe }}>
      {children}
    </SupplierAuthContext.Provider>
  );
};

export const useSupplierAuth = () => {
  const ctx = useContext(SupplierAuthContext);
  if (!ctx) throw new Error('useSupplierAuth must be used within SupplierAuthProvider');
  return ctx;
};
