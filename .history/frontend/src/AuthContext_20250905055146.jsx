import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

const API_URL = "http://127.0.0.1:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Helper function to handle API requests
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem("token"); // ✅ support JWT if backend returns it
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    // Try to parse JSON even on errors (and even if the server returned HTML)
    let data = {};
    try {
      data = await response.clone().json();
    } catch (_) {
      // non-JSON; keep data as {}
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.msg ||
        data?.message ||
        response.statusText ||
        "Request failed";
      throw new Error(message);
    }

    return response.json().catch(() => ({}));
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

        // ✅ Avoid calling /api/auth/me when we clearly have no session
        // (prevents 302→/api/auth/login?next=... and 401 spam)
        if (!storedUser && adminAuthenticated !== "true" && !hasToken) {
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        // If adminAuthenticated, verify admin session
        if (adminAuthenticated === "true") {
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
          // Regular user session
          const data = await fetchWithAuth(`${API_URL}/api/auth/me`);
          setUser(data);
          localStorage.setItem("authUser", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Auth check failed:", error);
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

  const login = async (email, password) => {
    try {
      const loginData = await fetchWithAuth(`${API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // ✅ Store token if backend returns one (supports JWT flows)
      const t = loginData?.access_token || loginData?.token;
      if (t) localStorage.setItem("token", t);

      // Fetch fresh user data after login
      const userData = await fetchWithAuth(`${API_URL}/api/auth/me`);
      setUser(userData);
      localStorage.setItem("authUser", JSON.stringify(userData));
      localStorage.removeItem("adminAuthenticated");
      return true;
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  };

  // ADMIN-SPECIFIC LOGIN FUNCTION
  const adminLogin = async (email, password) => {
    try {
      const loginData = await fetchWithAuth(`${API_URL}/api/admin/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // ✅ Token support for admin logins
      const t = loginData?.access_token || loginData?.token;
      if (t) localStorage.setItem("token", t);

      // Verify this is actually an admin user
      const adminUser = loginData.user || loginData; // some backends return the user root-level
      if (!adminUser || !(adminUser.is_admin === true || adminUser.role === "admin")) {
        throw new Error("Not authorized as admin");
      }

      // Store admin authentication
      setUser(adminUser);
      localStorage.setItem("authUser", JSON.stringify(adminUser));
      localStorage.setItem("adminAuthenticated", "true");

      return true;
    } catch (error) {
      throw new Error(error.message || "Admin login failed");
    }
  };

  // ADMIN LOGOUT FUNCTION
  const adminLogout = async () => {
    try {
      await fetchWithAuth(`${API_URL}/api/admin/logout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Admin logout error:", error);
    } finally {
      localStorage.removeItem("adminAuthenticated");
      // If user is admin, clear session fully (mirrors your original intent)
      if (user && (user.is_admin === true || user.role === "admin")) {
        setUser(null);
        localStorage.removeItem("authUser");
        localStorage.removeItem("token"); // ✅ clear token too
      }
    }
  };

  // CHECK ADMIN SESSION FUNCTION
  const checkAdminSession = async () => {
    try {
      const adminData = await fetchWithAuth(`${API_URL}/api/admin/me`);
      return adminData;
    } catch (error) {
      throw new Error("Admin session check failed");
    }
  };

  // CHECK IF USER IS ADMIN
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

      // ✅ If signup returns token, keep it (optional)
      const t = data?.access_token || data?.token;
      if (t) localStorage.setItem("token", t);

      // some backends send {user: {...}}; others send the user directly
      const newUser = data.user || data;
      setUser(newUser);
      localStorage.setItem("authUser", JSON.stringify(newUser));
      localStorage.removeItem("adminAuthenticated");
      return data;
    } catch (error) {
      throw new Error(error.message || "Signup failed");
    }
  };

  const logout = async () => {
    try {
      await fetchWithAuth(`${API_URL}/api/auth/logout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("authUser");
      localStorage.removeItem("adminAuthenticated");
      localStorage.removeItem("token"); // ✅ clear token
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
        // If no user data in response, fetch fresh data
        const userData = await fetchWithAuth(`${API_URL}/api/auth/me`);
        setUser(userData);
        localStorage.setItem("authUser", JSON.stringify(userData));
      }

      return true;
    } catch (error) {
      throw new Error(error.message || "Profile update failed");
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
        isAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
