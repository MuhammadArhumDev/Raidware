"use client";

import { createContext, useContext } from "react";
import { authAPI } from "@/services/api";
import useAuthStore from "@/store/useAuthStore";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const {
    user,
    login: storeLogin,
    signup: storeSignup,
    logout: storeLogout,
    checkAuth: storeCheckAuth,
    isLoading,
  } = useAuthStore();

  useEffect(() => {
    storeCheckAuth();
  }, []);

  // Derive derived state
  const userRole = user?.role || null;

  // Wrapper functions to match expected interface if signatures differ,
  // but looking at useAuthStore, they match (email, password) etc.

  const login = async (email, password) => {
    return await storeLogin(email, password);
  };

  const signup = async (email, password, name, organizationName) => {
    return await storeSignup({ email, password, name, organizationName });
  };

  const logout = async () => {
    return await storeLogout();
  };

  const resetPassword = async (email) => {
    return await authAPI.resetPassword(email);
  };

  const value = {
    user,
    userRole,
    loading: isLoading,
    login,
    signup,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
