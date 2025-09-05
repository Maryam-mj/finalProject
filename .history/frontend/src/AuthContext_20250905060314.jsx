import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

const API_URL = "http://127.0.0.1:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Authenticated fetch: sends cookies and Bearer token (if present)
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    const res = await fetch(url, { ...defaultOptions, ...options });

    let data = {};
    try {
      data = await res.clone().json();
    } catch (_) {
      // non-JSON (e.g., HTML) — leave data as {}
    }

    if (!res.ok) {
      const message =
        data?.error ||
        data?.msg ||
        data?.message ||
        res.statusText ||
        "Request failed";
      throw new Error(message);
    }

    return data;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("authUser");
        const adminAuthenticated = localStorage.getItem("adminAuthenticated");
        const hasToken = !!localStorage.getItem("token");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // If we have no sign of a session, don't ping /me (prevents loops)
        if (!storedUser && adminAuthenticated !== "true" && !hasToken) {
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        if (adminAuthenticated === "true") {
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
          // Verify regular session
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

      // Store token if backend returns one
      const t = loginData?.access_token || loginData?.token;
      if (t) localStorage.setItem("token", t);

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

      // Save token when provided (supports JWT-based admin APIs)
      const t = loginData?.access_token || loginData?.token;
      if (t) localStorage.setItem("token", t);

      // Some backends return { user: {...} }, others return the user directly
      const adminUser = loginData.user || loginData;

      // Double-check admin flag (support is_admin boolean or role string)
      if (!adminUser || !(adminUser.is_admin === true || adminUser.role === "admin")) {
        throw new Error("Not authorized as admin");
      }

      // Persist admin session
      setUser(adminUser);
      localStorage.setItem("authUser", JSON.stringify(adminUser));
      localStorage.setItem("adminAuthenticated", "true");

      // Optional: immediately verify with /api/admin/me (ensures cookie/JWT is valid)
      try {
        const verified = await fetchWithAuth(`${API_URL}/api/admin/me`);
        if (verified && (verified.is_admin === true || verified.role === "admin")) {
          setUser(verified);
          localStorage.setItem("authUser", JSON.stringify(verified));
        }
      } catch (_) {
        // If verification fails here, the dashboard fetch will surface it
      }

      return true;
    } catch (e) {
      throw new Error(e.message || "Admin login failed");
    }
  };

  // Admin logout
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
    } catch (_) {
      throw new Error("Admin session check failed");
    }
  };

  const isAdmin = () => {
    const adminAuthenticated = localStorage.getItem("adminAuthenticated");
    return user && (user.is_admin === true || user.role === "admin") && adminAuthenticated === "true";
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
        fetchWithAuth, // expose for pages (e.g., AdminDashboard -> /api/admin/stats)
        API_URL
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
