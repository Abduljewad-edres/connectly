import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiRegister, apiGetMe } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('connectly_token') || null);
  const [loading, setLoading] = useState(true);

  // Load current user from token on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('connectly_token');
      if (storedToken) {
        try {
          const res = await apiGetMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Auth token verification failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('connectly_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await apiRegister(userData);
    if (res.success && res.token) {
      localStorage.setItem('connectly_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('connectly_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await apiGetMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const updateUser = (updatedUserData) => {
    setUser((prev) => ({
      ...prev,
      ...updatedUserData
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

