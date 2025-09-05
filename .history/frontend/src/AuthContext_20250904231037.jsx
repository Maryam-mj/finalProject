// File: src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const AuthCtx = createContext(null);

/**
 * Minimal authenticated fetch helper (GET by default).
 * - Adds Bearer token (if present)
 * - Robust to non-JSON and redirect/405/401 cases
 */
async function fetchWithAuth(path, opts = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  // Read text first to avoid JSON parse crashes on HTML (e.g., redirect pages)
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    // Non-JSON (redirect/login HTML). Treat as error below.
  }

  if (!res.ok) {
    const err = new Error(data?.msg || data?.error || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // auth bootstrap state

  // Persist token/role
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (role) localStorage.setItem("role", role);
    else localStorage.removeItem("role");
  }, [role]);

  // Bootstrap auth: ONLY call /api/auth/me if we already have a token
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // No token? Do not ping backend (avoids 302->405 loops)
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await fetchWithAuth("/api/auth/me");
        if (cancelled) return;
        setUser(me || null);
        setRole((me && me.role) || role || "admin");
      } catch (e) {
        // Any failure (401/405/redirect HTML/etc.) => treat as logged out
        if (cancelled) return;
        console.error("Auth check failed:", e);
        setUser(null);
        setToken(null);
        setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [token]); // re-run when token changes

  // Optional: generic authed fetch you can reuse anywhere
  async function authFetch(path, opts) {
    return fetchWithAuth(path, opts);
  }

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      loading,
      isAuthenticated: !!token,
      /**
       * Save token/role/user after a successful login call.
       * Example usage from your Login page:
       *  const data = await fetch(`${API_BASE}/api/auth/login`, { ... });
       *  auth.login({ token: data.access_token, role: data.role, user: data.user });
       */
      login: ({ token: t, role: r, user: u }) => {
        setToken(t || null);
        setRole(r || u?.role || "admin");
        setUser(u || null);
      },
      /** Clear everything and return to logged-out state. */
      logout: () => {
        setToken(null);
        setRole(null);
        setUser(null);
      },
      /** Helpers exposed for convenience */
      fetchWithAuth: (path, opts) => fetchWithAuth(path, opts),
      authFetch,
      API_BASE,
    }),
    [token, role, user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
