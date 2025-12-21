import { create } from "zustand";
import { persist } from "zustand/middleware";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

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
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export default useAuthStore;
