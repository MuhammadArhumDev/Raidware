import useAuthStore from "@/store/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/**
 * Authenticated fetch wrapper.
 * Automatically attaches the Bearer token from the auth store
 * and includes credentials for cross-origin cookie support.
 *
 * @param {string} endpoint - API endpoint path (e.g., "/api/admin/organizations")
 * @param {RequestInit} options - Additional fetch options
 * @returns {Promise<Response>}
 */
export async function authFetch(endpoint, options = {}) {
  const token = useAuthStore.getState().token;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http")
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If the backend says we are unauthorized, the token might be expired.
  // Attempt to refresh the token.
  if (response.status === 401) {
    if (!endpoint.includes("/api/auth/me") && !endpoint.includes("/api/auth/login") && !endpoint.includes("/api/auth/refresh-token")) {
      try {
        console.log("[authFetch] 401 Unauthorized. Attempting to refresh token...");
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          // Update the zustand store with the new token
          useAuthStore.setState({ token: refreshData.data.accessToken });
          
          // Retry original request with new token
          headers["Authorization"] = `Bearer ${refreshData.data.accessToken}`;
          response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          });
        } else {
          // Refresh failed, log out
          console.warn("[authFetch] Refresh failed. Session expired. Logging out.");
          useAuthStore.getState().logout();
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }
      } catch (err) {
        console.warn("[authFetch] Refresh error. Session expired. Logging out.");
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }
    } else if (endpoint.includes("/api/auth/me")) {
      // Don't auto-refresh for /auth/me, just let checkAuth handle it or log out
      useAuthStore.getState().logout();
    }
  }

  return response;
}

export default authFetch;
