import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/noise';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const storedToken = () => localStorage.getItem('auth_token');

  // Inject token into every axios request
  useEffect(() => {
    const id = axios.interceptors.request.use(cfg => {
      const t = storedToken();
      if (t) cfg.headers['Authorization'] = `Bearer ${t}`;
      return cfg;
    });
    return () => axios.interceptors.request.eject(id);
  }, []);

  // Verify stored token on mount
  useEffect(() => {
    const t = storedToken();
    if (!t) { setLoading(false); return; }
    axios.get(`${API_BASE}/api/auth/me`)
      .then(r => setUser(r.data))
      .catch(() => { localStorage.removeItem('auth_token'); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const r = await axios.post(`${API_BASE}/api/auth/login`, { username, password });
    localStorage.setItem('auth_token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
