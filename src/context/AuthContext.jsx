import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setAdmin(res.data.data.admin);
    } catch {
      localStorage.removeItem('admin_token');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Password step. If the admin has 2FA on, the server returns a challenge
  // instead of a token — we surface that so the login page shows the code step.
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const d = res.data.data;
    if (d.requires2fa) {
      return { requires2fa: true, factors: d.factors, challengeToken: d.challengeToken, emailHint: d.emailHint };
    }
    localStorage.setItem('admin_token', d.token);
    setAdmin(d.admin);
    return d.admin;
  };

  // Second step — submit the code(s) for every enabled factor.
  const verify2fa = async ({ challengeToken, emailCode, totpCode }) => {
    const res = await api.post('/auth/login/2fa', { challengeToken, emailCode, totpCode });
    const { token, admin: a } = res.data.data;
    localStorage.setItem('admin_token', token);
    setAdmin(a);
    return a;
  };

  const resend2faEmail = (challengeToken) => api.post('/auth/login/2fa/resend-email', { challengeToken });

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{
      admin, loading, login, verify2fa, resend2faEmail, logout, refresh: fetchMe,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
