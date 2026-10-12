import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      const { data } = await API.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const signup = async (formData) => {
    const { data } = await API.post('/auth/signup', formData);
    // No tokens yet — user must verify email first
    return data; // { message, email }
  };

  const verifyEmail = async (email, otp) => {
    const { data } = await API.post('/auth/verify-email', { email, otp });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const resendVerificationOtp = async (email) => {
    const { data } = await API.post('/auth/resend-verification-otp', { email });
    return data;
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    localStorage.clear();
    setUser(null);
  };

  // Session timeout: 15 min inactivity
  useEffect(() => {
    if (!user) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { logout(); }, 15 * 60 * 1000);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifyEmail, resendVerificationOtp, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
