import { create } from "zustand";
import { persist } from "zustand/middleware";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds, Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // treat malformed token as expired
  }
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false, // true after first checkAuth completes
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            credentials: "include",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Login failed");

          set({
            user: data.data.user,
            token: data.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
          return data.data.user; // Return user object
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      signup: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
            credentials: "include",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Signup failed");

          set({
            user: data.data.user,
            token: data.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
          return data.data.user; // Return user object
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      checkAuth: async () => {
        const state = get();
        const token = state.token;
        const user = state.user;

        // No token — not authenticated, clear and return
        if (!token) {
          set({ isLoading: false, isInitialized: true, isAuthenticated: false });
          return null;
        }

        // Token expired — clear auth and return
        if (isTokenExpired(token)) {
          console.log('[checkAuth] Token expired, logging out');
          get().logout();
          return null;
        }

        // Token valid and user exists in store — restore session without
        // calling the backend. This is the key fix for Docker/VPS reload.
        if (token && user) {
          console.log('[checkAuth] Valid token + user found, restoring session');
          set({ 
            isLoading: false, 
            isInitialized: true, 
            isAuthenticated: true,
            _hasHydrated: true
          });
          return user;
        }

        // Token exists but no user in store — need to fetch from backend
        // This only happens on first login, not on reload
        set({ isLoading: true });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          });
          clearTimeout(timeout);

          if (!response.ok) {
            get().logout();
            return null;
          }

          const data = await response.json();
          set({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            _hasHydrated: true
          });
          return data.data.user;

        } catch (err) {
          clearTimeout(timeout);
          if (err.name === 'AbortError') {
            console.error('[checkAuth] Backend unreachable, using cached session');
            // Backend unreachable but token is valid — restore from token
            // instead of logging out. Better UX than forcing re-login.
            if (token && !isTokenExpired(token)) {
              set({ isLoading: false, isInitialized: true });
              return state.user;
            }
          }
          get().logout();
          return null;
        }
      },

      logout: async () => {
        try {
          await fetch(`${BACKEND_URL}/api/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
        } catch (err) {
          console.error("Failed to clear backend cookies during logout", err);
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          _hasHydrated: true,
        });
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
    }),
    {
      name: "auth-storage",
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
          state.isInitialized = true;
          state.isLoading = false;
        }
      },
    }
  )
);

export default useAuthStore;

