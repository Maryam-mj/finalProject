import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

const API_URL = "http://127.0.0.1:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include", // CRITICAL: Include cookies
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            // User is not authenticated (no valid session)
            setUser(null);
          } else {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
        } else {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const signup = async (username, email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // After successful signup, fetch user data
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }
      
      return data;
    } catch (error) {
      throw new Error(error.message || "Signup failed");
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Login failed");
      }

      // After successful login, fetch user data
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }
      
      return true;
    } catch (error) {
      throw new Error(error.message || "Login failed");
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // Include cookies
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear user state regardless of API call success
      setUser(null);
    }
  };

  const updateProfile = async (formData) => {
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        credentials: "include", // Include cookies
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Profile update failed");
      }

      // Refresh user data after update
      const userRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
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
        loading 
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