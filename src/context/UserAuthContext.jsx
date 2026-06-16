import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const UserAuthContext = createContext(null);

const TOKEN_KEY = 'user_token';

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Global modal trigger — any component can call `requestLogin()` and the
  // header-level <UserLoginModal /> opens. Stores an optional `redirectTo`
  // path and `onSuccess` callback so e.g. Book Now can resume the flow.
  const [loginRequest, setLoginRequest] = useState(null);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/user-auth/me');
      setUser(res.data?.data?.user || null);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // The api client dispatches this when a /user-* call returns 401, so the
  // sidebar/header can immediately reflect the signed-out state instead of
  // waiting for the next refresh.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('user-auth:expired', onExpired);
    return () => window.removeEventListener('user-auth:expired', onExpired);
  }, []);

  const setSession = useCallback(({ token, user: nextUser }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (nextUser) setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const requestLogin = useCallback((opts = {}) => {
    setLoginRequest({ redirectTo: opts.redirectTo, onSuccess: opts.onSuccess });
  }, []);

  const closeLogin = useCallback(() => setLoginRequest(null), []);

  return (
    <UserAuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isProfileComplete: !!user?.isProfileComplete,
        loginRequest,
        requestLogin,
        closeLogin,
        setSession,
        logout,
        refresh: fetchMe,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error('useUserAuth must be used within UserAuthProvider');
  return ctx;
};
