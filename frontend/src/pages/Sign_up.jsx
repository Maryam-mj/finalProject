import { useState, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Sign_up() {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    // Clear field-specific errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (errors.submit) {
      setErrors((prev) => ({ ...prev, submit: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.username.trim()) newErrors.username = "Username is required";
    if (!emailRegex.test(form.email)) newErrors.email = "Email is invalid";
    if (!passwordRegex.test(form.password))
      newErrors.password =
        "Password must have at least 6 characters, 1 uppercase and 1 lowercase letter.";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      await signup(form.username.trim(), form.email.trim(), form.password.trim());
      setSuccessMessage("Account created successfully! Redirecting...");
      setForm({ username: "", email: "", password: "", confirmPassword: "" });
      setTimeout(() => navigate("/profile"), 1500);
    } catch (err) {
      // Handle specific backend error messages
      if (err.message.includes("Username already exists")) {
        setErrors({ username: "Username already exists" });
      } else if (err.message.includes("Email already registered")) {
        setErrors({ email: "Email already registered" });
      } else if (err.message.includes("All fields are required")) {
        setErrors({ submit: "All fields are required" });
      } else {
        setErrors({ submit: err.message || "Signup failed. Try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex w-1/2 bg-gray-100">
        <img
          src="https://media.istockphoto.com/id/148314935/photo/university-students-studying-in-a-circle.jpg?s=2048x2048&w=is&k=20&c=ns2x6h6XIUZ_VeEJLe8jp7C9HSgnWSqU-JRJlLmm_pk="
          alt="Study"
          className="object-cover w-full h-full"
        />
      </div>

      <div className="flex items-center justify-center w-full lg:w-1/2 bg-white dark:bg-black p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center text-red-700">Sign Up</h2>

          {successMessage && (
            <div className="mb-4 text-green-600 text-center font-medium">
              {successMessage}
            </div>
          )}
          {errors.submit && (
            <div className="mb-4 text-red-600 text-center font-medium">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block font-medium text-black dark:text-white">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
              />
              {errors.username && <p className="text-red-600 text-sm">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block font-medium text-black dark:text-white">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
              />
              {errors.email && <p className="text-red-600 text-sm">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block font-medium text-black dark:text-white">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
              />
              {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-medium text-black dark:text-white">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg transition text-white ${
                loading ? "bg-gray-400 cursor-not-allowed" : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {/* Already have account */}
            <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <Link to="/login" className="text-red-700 hover:underline">
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}