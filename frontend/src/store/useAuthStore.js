import { create } from "zustand";
import { persist } from "zustand/middleware";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

function setAuthCookie(role, token) {
  if (typeof document === "undefined") return;
  const name = role === "admin" ? "admin_token" : "organization_token";
  const maxAge = 7 * 24 * 60 * 60; 
  document.cookie = `${name}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "admin_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "organization_token=; path=/; max-age=0; SameSite=Lax";
}

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
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

          const user = data.data.user;
          const token = data.data.accessToken;

          setAuthCookie(user.role, token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            _hasHydrated: true,
          });
          return user;
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

          const user = data.data.user;
          const token = data.data.accessToken;

          setAuthCookie(user.role, token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            _hasHydrated: true,
          });
          return user;
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      checkAuth: async () => {
        const state = get();
        const token = state.token;
        const user = state.user;

        if (!token) {
          set({ isLoading: false, isInitialized: true, isAuthenticated: false });
          return null;
        }

        if (isTokenExpired(token)) {
          console.log("[checkAuth] Token expired, logging out");
          get().logout();
          return null;
        }

        if (token && user) {
          console.log("[checkAuth] Valid token + user — restoring session");

          setAuthCookie(user.role, token);
          set({
            isLoading: false,
            isInitialized: true,
            isAuthenticated: true,
            _hasHydrated: true,
          });
          return user;
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
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          });
          clearTimeout(timeout);

          if (!response.ok) {
            get().logout();
            return null;
          }

          const data = await response.json();
          const fetchedUser = data.data.user;

          setAuthCookie(fetchedUser.role, token);

          set({
            user: fetchedUser,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            _hasHydrated: true,
          });
          return fetchedUser;
        } catch (err) {
          clearTimeout(timeout);
          if (err.name === "AbortError") {
            console.error("[checkAuth] Backend unreachable, using cached session");
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

        clearAuthCookies();

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          _hasHydrated: true,
        });

        if (typeof window !== "undefined") {
          window.location.href = "/login";
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

          if (state.token && state.user && !isTokenExpired(state.token)) {
            setAuthCookie(state.user.role, state.token);
          } else if (state.token && isTokenExpired(state.token)) {

            clearAuthCookies();
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
          }
        }
      },
    }
  )
);

export default useAuthStore;
