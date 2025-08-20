import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./pages/Navbar";
import Home from "./pages/Home";
import Features from "./pages/Features";
import Footer from "./pages/Footer";
import Sign_up from "./pages/Sign_up";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import ForgotResetPassword from "./pages/ForgotResetPassword";
import Profile from "./pages/Profile";
import { AuthProvider } from "./AuthContext";

function App() {
  const location = useLocation();

  // Paths where Navbar and Footer should NOT be shown
  const hideLayout = ["/signup", "/login", "/profile", "/dashboard" ,"/forgotresetpassword"].includes(
    location.pathname.toLowerCase()
  );

  return (
    <AuthProvider>
      {!hideLayout && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/signup" element={<Sign_up />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgotresetpassword" element={<ForgotResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>

      {!hideLayout && <Footer />}
    </AuthProvider>
  );
}

export default App;
