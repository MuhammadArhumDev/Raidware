'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for stored session - only on client
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // Determine role: admin or organization
          let role = userData.role;
          if (!role) {
            if (userData.email?.includes('@raidware') || userData.email?.includes('admin@') || userData.email?.toLowerCase().includes('admin')) {
              role = 'admin';
            } else {
              role = 'organization';
            }
          }
          setUserRole(role);
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const result = await authAPI.login(email, password);
    if (result.success) {
      // Determine role based on email or explicit role
      let role = result.user.role;
      if (!role) {
        // Auto-detect role: admin emails contain 'admin' or '@raidware'
        if (email.includes('@raidware') || email.includes('admin@') || email.toLowerCase().includes('admin')) {
          role = 'admin';
        } else {
          role = 'organization';
        }
      }
      
      const userData = {
        email: result.user.email,
        uid: result.user.uid,
        role: role,
        organizationId: result.user.organizationId || null,
        organizationName: result.user.organizationName || null,
      };
      setUser(userData);
      setUserRole(role);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
      }
    }
    return result;
  };

  const signup = async (email, password, name, organizationName) => {
    const result = await authAPI.signup(email, password, name, organizationName);
    if (result.success) {
      const userData = {
        email: result.user.email,
        uid: result.user.uid,
        role: result.user.role,
        organizationId: result.user.organizationId,
        name: result.user.name,
        organizationName: result.user.organizationName,
      };
      setUser(userData);
      setUserRole(userData.role);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(userData));
      }
    }
    return result;
  };

  const logout = async () => {
    const result = await authAPI.logout();
    if (result.success) {
      setUser(null);
      setUserRole(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
    }
    return result;
  };

  const resetPassword = async (email) => {
    return await authAPI.resetPassword(email);
  };

  const value = {
    user,
    userRole,
    loading,
    login,
    signup,
    logout,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

