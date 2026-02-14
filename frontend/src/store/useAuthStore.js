import { create } from "zustand";
import { persist } from "zustand/middleware";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

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
        // Skip if not hydrated yet or already authenticated
        const state = get();
        if (!state._hasHydrated) {
          console.log("[checkAuth] Skipping - not hydrated yet");
          return state.user;
        }
        if (state.isAuthenticated && state.user) {
          console.log("[checkAuth] Skipping - already authenticated");
          return state.user;
        }

        set({ isLoading: true });
        try {
          let res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          
          if (res.status === 401) {
             console.log("[checkAuth] 401 received. Attempting to refresh token...");
             const refreshRes = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
               method: "POST",
               credentials: "include",
             });
             
             if (refreshRes.ok) {
               const refreshData = await refreshRes.json();
               set({ token: refreshData.data.accessToken });
               // Retry the /me endpoint
               res = await fetch(`${BACKEND_URL}/api/auth/me`, {
                 method: "GET",
                 headers: { 
                   "Content-Type": "application/json",
                   "Authorization": `Bearer ${refreshData.data.accessToken}`
                 },
                 credentials: "include",
               });
             }
          }

          const data = await res.json();
          if (!res.ok) throw new Error("Session invalid");

          set({
            user: data.data.user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
          return data.data.user;
        } catch (err) {
          // If all fails, logout to clear cookies so we don't get stuck
          try {
            await fetch(`${BACKEND_URL}/api/auth/logout`, {
              method: "POST",
              credentials: "include",
            });
          } catch(e) {}
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
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
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Guarantee checkAuth runs on first mount by clearing transient state
        if (state) {
          state.isInitialized = false;
          state.isLoading = false;
          state.setHasHydrated(true);
        }
      },
    }
  )
);

export default useAuthStore;
