import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/noise';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  // showLanding: true until the user picks a dashboard type (even after logout)
  const [showLanding, setShowLanding] = useState(false);

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

  // On mount: if no stored token show the landing page, otherwise verify token
  useEffect(() => {
    const t = storedToken();
    if (!t) {
      setShowLanding(true);
      setLoading(false);
      return;
    }
    axios.get(`${API_BASE}/api/auth/me`)
      .then(r => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('auth_token');
        setShowLanding(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const r = await axios.post(`${API_BASE}/api/auth/login`, { username, password });
    localStorage.setItem('auth_token', r.data.token);
    setUser(r.data.user);
    setShowLanding(false);
    return r.data.user;
  };

  const loginAsGuest = async () => {
    const r = await axios.post(`${API_BASE}/api/auth/guest`);
    localStorage.setItem('auth_token', r.data.token);
    setUser(r.data.user);
    setShowLanding(false);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setShowLanding(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading, showLanding, setShowLanding, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
