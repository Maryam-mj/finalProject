import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ✅ Password validation function (outside component)
const validatePassword = (password) => {
  const minLength = 6;
  const upper = /[A-Z]/;
  const lower = /[a-z]/;
  const number = /[0-9]/;

  if (password.length < minLength)
    return "Password must be at least 6 characters long.";
  if (!upper.test(password))
    return "Password must contain at least one uppercase letter.";
  if (!lower.test(password))
    return "Password must contain at least one lowercase letter.";
  if (!number.test(password))
    return "Password must contain at least one number.";

  return ""; // ✅ valid
};

export default function ForgotResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("forgot"); // forgot | verify | newpass
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // ✅ Cooldown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // ✅ Send reset code
  const sendResetCode = async () => {
    const res = await fetch("http://127.0.0.1:5000/api/auth/forgotpassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error sending reset code");
    return data;
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await sendResetCode();
      setMessage("A 6-digit reset code was sent to your email.");
      setStep("verify");
      setResendTimer(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email, 
          code: code.trim() // This should work as the backend accepts both "code" and "resetCode"
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid or expired code");
      } else {
        setMessage("Code verified! Enter your new password.");
        setStep("newpass");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await sendResetCode();
      setMessage("A new reset code has been sent to your email.");
      setResendTimer(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // ✅ Validate password
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email, 
          code: code, // ✅ Send the code again for verification
          newPassword: newPassword 
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error resetting password");
      } else {
        setMessage("✅ Password reset successfully! Redirecting...");
        setTimeout(() => {
          navigate("/login"); // Redirect to login instead of dashboard
        }, 1000);
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-red-700">
          {step === "forgot"
            ? "Forgot Password"
            : step === "verify"
            ? "Enter Reset Code"
            : "Set New Password"}
        </h2>

        {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {/* Step 1: Forgot */}
        {step === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {/* Step 2: Verify */}
        {step === "verify" && (
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              maxLength="6"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-2 border rounded-lg text-center tracking-widest dark:bg-gray-700 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading || resendTimer > 0}
              className="w-full py-2 bg-gray-200 dark:bg-gray-600 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition"
            >
              {resendTimer > 0
                ? `Resend Code in ${resendTimer}s`
                : "Resend Code"}
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === "newpass" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}