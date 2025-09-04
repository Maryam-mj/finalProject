import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./pages/Navbar";
import Home from "./pages/Home";
import Features from "./pages/Features";
import Footer from "./pages/Footer";
import Sign_up from "./pages/Sign_up";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./components/AdminLogin";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import ForgotResetPassword from "./pages/ForgotResetPassword";
import Profile from "./pages/Profile";
import { AuthProvider } from "./AuthContext";
import "./App.css";

function App() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Paths where Navbar and Footer should NOT be shown
  const hideLayout = [
    "/signup", 
    "/login", 
    "/adminlogin",
    "/profile", 
    "/dashboard",
    "/admindashboard",
    "/forgotresetpassword"
  ].includes(location.pathname.toLowerCase());

  // Simulate loading between route changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <AuthProvider>
      <div className="app">
        {!hideLayout && <Navbar />}
        
        {isLoading && (
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        )}
        
        <main className={hideLayout ? "full-width-layout" : "content-layout"}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/signup" element={<Sign_up />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/forgotresetpassword" element={<ForgotResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
  path="/admindashboard"
  element={
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  }
/>
          </Routes>
        </main>

        {!hideLayout && <Footer />}
      </div>
    </AuthProvider>
  );
}

export default App;