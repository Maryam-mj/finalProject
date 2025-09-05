import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

const API_URL = "http://127.0.0.1:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Helper function to handle API requests
  const fetchWithAuth = async (url, options = {}) => {
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Request failed");
    }
    
    return response.json();
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const data = await fetchWithAuth(`${API_URL}/api/auth/me`);
        setUser(data);
        localStorage.setItem("authUser", JSON.stringify(data));
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        localStorage.removeItem("authUser");
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

      // Fetch fresh user data after login
      const userData = await fetchWithAuth(`${API_URL}/api/auth/me`);
      setUser(userData);
      localStorage.setItem("authUser", JSON.stringify(userData));
      
      return true;
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  };

  // ADMIN-SPECIFIC LOGIN FUNCTION - FIXED URL
  const adminLogin = async (email, password) => {
    try {
      const loginData = await fetchWithAuth(`${API_URL}/api/admin/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Verify this is actually an admin user
      if (!loginData.user || !loginData.user.is_admin) {
        throw new Error("Not authorized as admin");
      }

      // Store admin authentication
      setUser(loginData.user);
      localStorage.setItem("authUser", JSON.stringify(loginData.user));
      localStorage.setItem("adminAuthenticated", "true");

      return true;
    } catch (error) {
      throw new Error(error.message || "Admin login failed");
    }
  };

  // ADMIN LOGOUT FUNCTION - FIXED URL
  const adminLogout = async () => {
    try {
      await fetchWithAuth(`${API_URL}/api/admin/logout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Admin logout error:", error);
    } finally {
      localStorage.removeItem("adminAuthenticated");
      
      // If user was only logged in as admin, clear completely
      if (user && user.is_admin) {
        const regularAuth = localStorage.getItem("authUser");
        if (!regularAuth) {
          setUser(null);
          localStorage.removeItem("authUser");
        }
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
    return user && user.is_admin === true;
  };

  const signup = async (username, email, password) => {
    try {
      const data = await fetchWithAuth(`${API_URL}/api/auth/signup`, {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });

      setUser(data.user);
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
      
      if (responseData.user) {
        setUser(responseData.user);
        localStorage.setItem("authUser", JSON.stringify(responseData.user));
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