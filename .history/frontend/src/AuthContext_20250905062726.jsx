// File: src/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

const API_URL = "http://127.0.0.1:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  /**
   * Authenticated fetch:
   * - Always includes cookies (credentials: "include")
   * - Adds Authorization: Bearer <token> if we have one
   * - Parses JSON safely even on errors (server might send HTML in some misconfigs)
   */
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = {};
    try {
      data = await res.clone().json();
    } catch {
      // Non-JSON response (e.g., HTML) — leave as {}
    }

    if (!res.ok) {
      const message =
        data?.error ||
        data?.msg ||
        data?.message ||
        res.statusText ||
        "Request failed";
      const err = new Error(message);
      // @ts-ignore (handy for callers)
      err.status = res.status;
      throw err;
    }

    // Return parsed JSON (or {} if no body)
    return data;
  };

  /**
   * Bootstrap auth on first mount.
   * If there’s no sign of a session (no cached user, no admin flag, no token),
   * skip calling /me to avoid needless 401s.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("authUser");
        const adminAuthenticated = localStorage.getItem("adminAuthenticated") === "true";
        const hasToken = !!localStorage.getItem("token");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // No sign of session? Don’t ping /me.
        if (!storedUser && !adminAuthenticated && !hasToken) {
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        if (adminAuthenticated) {
          // Verify admin session
          const me = await fetchWithAuth(`${API_URL}/api/admin/me`);
          if (me && (me.is_admin === true || me.role === "admin")) {
            setUser(me);
            localStorage.setItem("authUser", JSON.stringify(me));
          } else {
            setUser(null);
            localStorage.removeItem("authUser");
            localStorage.removeItem("adminAuthenticated");
            localStorage.removeItem("token");
          }
        } else {
          // Verify regular session
          const me = await fetchWithAuth(`${API_URL}/api/auth/me`);
          setUser(me);
          localStorage.setItem("authUser", JSON.stringify(me));
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        setUser(null);
        localStorage.removeItem("authUser");
        localStorage.removeItem("adminAuthenticated");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Regular login
   * Stores any token and then fetches /api/auth/me to hydrate the user state.
   */
  const login = async (email, password) => {
    try {
      const data = await fetchWithAuth(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Store token if provided
      const t =
        data?.access_token ||
        data?.token ||
        data?.access ||
        data?.data?.access_token ||
        data?.data?.token;
      if (t) localStorage.setItem("token", t);

      const me = await fetchWithAuth(`${API_URL}/api/auth/me`);
      setUser(me);
      localStorage.setItem("authUser", JSON.stringify(me));
      localStorage.removeItem("adminAuthenticated");
      return true;
    } catch (e) {
      throw new Error(e.message || "Login failed");
    }
  };

  /**
   * Admin login
   * Saves token when provided, verifies with /api/admin/me, and persists user.
   */
  const adminLogin = async (email, password) => {
    try {
      const data = await fetchWithAuth(`${API_URL}/api/admin/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Save token if provided (JWT flows)
      const t =
        data?.access_token ||
        data?.token ||
        data?.access ||
        data?.data?.access_token ||
        data?.data?.token;
      if (t) localStorage.setItem("token", t);

      // Some backends return {user: {...}}, others return the user directly
      const rawUser = data.user || data;

      // Client-side admin assertion supports both is_admin bool and role string
      if (!rawUser || !(rawUser.is_admin === true || rawUser.role === "admin")) {
        throw new Error("Not authorized as admin");
      }

      localStorage.setItem("adminAuthenticated", "true");

      // Verify with backend to ensure credentials are actually accepted by API
      try {
        const verified = await fetchWithAuth(`${API_URL}/api/admin/me`);
        const finalUser = verified?.id ? verified : rawUser;
        setUser(finalUser);
        localStorage.setItem("authUser", JSON.stringify(finalUser));
      } catch {
        // If verify fails here, protected pages will surface it later
        setUser(rawUser);
        localStorage.setItem("authUser", JSON.stringify(rawUser));
      }

      return true;
    } catch (e) {
      throw new Error(e.message || "Admin login failed");
    }
  };

  const adminLogout = async () => {
    try {
      await fetchWithAuth(`${API_URL}/api/admin/logout`, { method: "POST" });
    } catch (e) {
      console.error("Admin logout error:", e);
    } finally {
      localStorage.removeItem("adminAuthenticated");
      setUser(null);
      localStorage.removeItem("authUser");
      localStorage.removeItem("token");
    }
  };

  const checkAdminSession = async () => {
    try {
      return await fetchWithAuth(`${API_URL}/api/admin/me`);
    } catch {
      throw new Error("Admin session check failed");
    }
  };

  const isAdmin = () => {
    const flag = localStorage.getItem("adminAuthenticated") === "true";
    return flag && user && (user.is_admin === true || user.role === "admin");
  };

  const signup = async (username, email, password) => {
    try {
      const data = await fetchWithAuth(`${API_URL}/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });

      const t =
        data?.access_token ||
        data?.token ||
        data?.access ||
        data?.data?.access_token ||
        data?.data?.token;
      if (t) localStorage.setItem("token", t);

      const newUser = data.user || data;
      setUser(newUser);
      localStorage.setItem("authUser", JSON.stringify(newUser));
      localStorage.removeItem("adminAuthenticated");
      return data;
    } catch (e) {
      throw new Error(e.message || "Signup failed");
    }
  };

  const logout = async () => {
    try {
      await fetchWithAuth(`${API_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setUser(null);
      localStorage.removeItem("authUser");
      localStorage.removeItem("adminAuthenticated");
      localStorage.removeItem("token");
    }
  };

  const updateProfile = async (updateData) => {
    try {
      const isFormData = updateData instanceof FormData;
      const res = await fetchWithAuth(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: isFormData ? {} : { "Content-Type": "application/json" },
        body: isFormData ? updateData : JSON.stringify(updateData),
      });

      const nextUser = res.user || res;
      if (nextUser && (nextUser.id || nextUser.email || nextUser.name)) {
        setUser(nextUser);
        localStorage.setItem("authUser", JSON.stringify(nextUser));
      } else {
        const me = await fetchWithAuth(`${API_URL}/api/auth/me`);
        setUser(me);
        localStorage.setItem("authUser", JSON.stringify(me));
      }

      return true;
    } catch (e) {
      throw new Error(e.message || "Profile update failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signup,
        login,
        logout,
        setUser,
        updateProfile,
        loading,
        authChecked,
        adminLogin,
        adminLogout,
        checkAdminSession,
        isAdmin,
        fetchWithAuth,
        API_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
