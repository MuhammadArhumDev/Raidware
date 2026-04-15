import useAuthStore from "@/store/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    return payload.exp * 1000 < Date.now();
  } catch {
    return true; 
  }
};

export async function authFetch(endpoint, options = {}) {
  const token = useAuthStore.getState().token;

  if (token && isTokenExpired(token)) {
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : API_BASE_URL + endpoint;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('[authFetch] Request timed out:', endpoint);
      return { ok: false, status: 408, json: async () => ({ message: 'Request timeout' }) };
    }
    throw err;
  }

  if (response.status === 401) {

    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return response;
  }

  return response;
}

export default authFetch;
