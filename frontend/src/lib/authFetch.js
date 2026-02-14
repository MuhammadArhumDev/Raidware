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
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

export default authFetch;
