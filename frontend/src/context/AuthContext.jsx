import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('mcwms_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('mcwms_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/api/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('mcwms_user', JSON.stringify(res.user));
        }
      } catch (err) {
        console.warn('Auth verification failed:', err.message);
      } finally {
        setLoading(false);
      }
    }

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth_expired', handleAuthExpired);
    verifyAuth();

    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('mcwms_token', res.token);
      localStorage.setItem('mcwms_user', JSON.stringify(res.user));
    }
    return res;
  };

  // Easy 1-click Sign-In for Shop Floor Data Entry Operators (no credentials required)
  const loginAsOperator = async (operatorName = '') => {
    try {
      const res = await api.post('/api/auth/operator-login', { name: operatorName });
      if (res.success && res.user) {
        setUser(res.user);
        setToken(res.token);
        localStorage.setItem('mcwms_token', res.token);
        localStorage.setItem('mcwms_user', JSON.stringify(res.user));
        return res;
      }
    } catch (err) {
      console.warn('Backend operator login attempt:', err.message);
    }

    // Direct client session fallback
    const fallbackUser = {
      user_id: 'USR-002',
      name: operatorName.trim() || 'Data Entry Operator',
      email: 'operator@factory.com',
      role: 'Employee'
    };
    const fallbackToken = 'TOKEN_USR-002_Employee_' + Date.now();
    setUser(fallbackUser);
    setToken(fallbackToken);
    localStorage.setItem('mcwms_token', fallbackToken);
    localStorage.setItem('mcwms_user', JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser, token: fallbackToken };
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('mcwms_token');
      localStorage.removeItem('mcwms_user');
    }
  };

  // Director / Admin role check
  const isDirector = user?.role === 'Director' || user?.role === 'Admin';
  const isOperator = !isDirector;

  return (
    <AuthContext.Provider value={{ user, token, isDirector, isOperator, isAdmin: isDirector, login, loginAsOperator, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
