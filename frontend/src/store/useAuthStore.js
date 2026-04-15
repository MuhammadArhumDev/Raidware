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

        if (!token || isTokenExpired(token)) {
          get().logout();
          return null;
        }

        // Skip if not hydrated yet or already authenticated
        if (!state._hasHydrated) {
          console.log("[checkAuth] Skipping - not hydrated yet");
          set({ isLoading: false, isInitialized: true });
          return state.user;
        }
        if (state.isAuthenticated && state.user) {
          console.log("[checkAuth] Skipping - already authenticated");
          set({ isLoading: false, isInitialized: true });
          return state.user;
        }

        set({ isLoading: true });
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
            method: "GET",
            signal: controller.signal,
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            credentials: "include",
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
          });
          return data.data.user;
        } catch (err) {
          clearTimeout(timeout);
          if (err.name === 'AbortError') {
            console.error('[checkAuth] Timed out — clearing auth');
          } else {
            console.error('[checkAuth] Error:', err.message);
          }
          get().logout();
          return null;
        }
      },

      logout: async () => {
        try {
          await fetch(`${BACKEND_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch (e) {}

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: false,
        });
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

