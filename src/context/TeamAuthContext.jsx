import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const TeamAuthContext = createContext();

// Mirrors AuthContext (admin) exactly, but for internal staff (BD/COPS/
// Account Manager/CSM/QCOPS/Marketing) — separate token key so a team
// member and an admin can even be signed in on two tabs of the same browser
// without clobbering each other.
export const TeamAuthProvider = ({ children }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('team_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/team/auth/me');
      setMember(res.data.data.member);
    } catch {
      localStorage.removeItem('team_token');
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post('/team/auth/login', { email, password });
    const { token, member: m } = res.data.data;
    localStorage.setItem('team_token', token);
    setMember(m);
    return m;
  };

  const logout = () => {
    localStorage.removeItem('team_token');
    setMember(null);
  };

  return (
    <TeamAuthContext.Provider value={{ member, loading, login, logout, refresh: fetchMe }}>
      {children}
    </TeamAuthContext.Provider>
  );
};

export const useTeamAuth = () => {
  const ctx = useContext(TeamAuthContext);
  if (!ctx) throw new Error('useTeamAuth must be used within TeamAuthProvider');
  return ctx;
};
