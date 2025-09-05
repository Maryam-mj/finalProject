import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

const API_URL = "http://127.0.0.1:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Authenticated fetch: includes cookies and Bearer token (if present)
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const defaultOptions = {
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    const res = await fetch(url, { ...defaultOptions, ...options });

    // Try to parse JSON even on errors (server might send HTML on misconfig)
    let data = {};
    try {
      data = await res.clone().json();
    } catch (_) {
      // non-JSON; leave as {}
    }

    if (!res.ok) {
      const message =
        data?.error ||
        data?.msg ||
        data?.message ||
        res.statusText ||
        "Request failed";
      const err = new Error(message);
      // Attach status for callers that care
      // @ts-ignore
      err.status = res.status;
      throw err;
    }

    return data;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("authUser");
        const adminAuthenticated = localStorage.getItem("adminAuthenticated") === "true";
        const hasToken = !!localStorage.getItem("token");

        // hydrate fast to avoid UI flicker
        if (storedUser) setUser(JSON.parse(storedUser));

        // If we have no sign of a session, don't ping /me (prevents loops)
        if (!storedUser && !adminAuthenticated && !hasToken) {
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        if (adminAuthenticated) {
          // Verify admin session
          const adminData = await fetchWithAuth(`${API_URL}/api/admin/me`);
          if (adminData && (adminData.is_admin === true || adminData.role === "admin")) {
            setUser(adminData);
            localStorage.setItem("authUser", JSON.stringify(adminData));
          } else {
            setUser(null);
            localStorage.removeItem("authUser");
            localStorage.removeItem("adminAuthenticated");
            localStorage.removeItem("token");
          }
        } else {
          // Regular session
          const data = await fetchWithAuth(`${API_URL}/api/auth/me`);
          setUser(data);
          localStorage.setItem("authUser", JSON.stringify(data));
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

  // Regular user login
  const login = async (email, password) => {
    try {
      const loginData = await fetchWithAuth(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Store token if backend returns one (supports JWT)
      const t = loginData?.access_token || loginData?.token;
      if (t) localStorage.setItem("token", t);

      // Refresh user
      const userData = await fetchWithAuth(`${API_URL}/api/auth/me`);
      setUser(userData);
      localStorage.setItem("authUser", JSON.stringify(userData));
      localStorage.removeItem("adminAuthenticated");
      return true;
    } catch (e) {
      throw new Error(e.message || "Login failed");
    }
  };

  // Admin login
  const adminLogin = async (email, password) => {
    try {
      const loginData = await fetchWithAuth(`${API_URL}/api/admin/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Save token if provided (most JWT setups return it here)
      const t = loginData?.access_token || loginData?.token;
      if (t) localStorage.setItem("token", t);

      // Some backends return {user: {...}}; others return the user directly
      const adminUser = loginData.user || loginData;

      if (!adminUser || !(adminUser.is_admin === true || adminUser.role === "admin")) {
        throw new Error("Not authorized as admin");
      }

      localStorage.setItem("adminAuthenticated", "true");

      // Verify with /api/admin/me to ensure browser will send credentials to API
      try {
        const verified = await fetchWithAuth(`${API_URL}/api/admin/me`);
        const finalUser = verified?.id ? verified : adminUser;
        setUser(finalUser);
        localStorage.setItem("authUser", JSON.stringify(finalUser));
      } catch {
        // If verification fails now, protected pages will surface it on fetch
        setUser(adminUser);
        localStorage.setItem("authUser", JSON.stringify(adminUser));
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

      const t = data?.access_token || data?.token;
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
      const options = {
        method: "PUT",
        headers: isFormData ? {} : { "Content-Type": "application/json" },
        body: isFormData ? updateData : JSON.stringify(updateData),
      };

      const responseData = await fetchWithAuth(`${API_URL}/api/profile`, options);
      const nextUser = responseData.user || responseData;

      if (nextUser && (nextUser.id || nextUser.email || nextUser.name)) {
        setUser(nextUser);
        localStorage.setItem("authUser", JSON.stringify(nextUser));
      } else {
        const userData = await fetchWithAuth(`${API_URL}/api/auth/me`);
        setUser(userData);
        localStorage.setItem("authUser", JSON.stringify(userData));
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
