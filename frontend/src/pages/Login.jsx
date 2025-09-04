import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getInitialsAvatar, api } from "../pages/utils/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const res = await fetch("http://127.0.0.1:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // keep session cookies
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Store only the user object
    localStorage.setItem("user", JSON.stringify(data.user));

    console.log("Login successful, user data:", data.user);

    // Redirect to dashboard
    navigate("/dashboard");
  } catch (err) {
    setError(err.message || "Login failed. Please try again.");
    console.error("Login error:", err);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-black">
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center text-red-700 dark:text-red-600">Login</h2>

        {error && (
          <p className="mb-4 text-red-600 text-center font-medium">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-black dark:text-white mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-black dark:text-white mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-700 hover:bg-red-800"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-center text-gray-600 dark:text-gray-300">
            <Link to="/forgotresetpassword" className="text-red-700 dark:text-red-600 hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-sm text-center text-gray-600 dark:text-gray-300">
            Don't have an account?{" "}
            <Link to="/signup" className="text-red-700 dark:text-red-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}