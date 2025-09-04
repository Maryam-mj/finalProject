import { useState, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (errors.submit) setErrors((prev) => ({ ...prev, submit: "" }));
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

      setSuccessMessage("Account created successfully! Check your email for a welcome message.");
      setForm({ username: "", email: "", password: "", confirmPassword: "" });

      setTimeout(() => navigate("/profile"), 2500);
    } catch (err) {
      if (err.message.includes("Username already")) {
        setErrors({ username: "Username already exists" });
      } else if (err.message.includes("Email already")) {
        setErrors({ email: "Email already registered" });
      } else if (err.message.includes("required")) {
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
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-red-700 z-50">
          <div className="h-full bg-red-800 animate-pulse"></div>
        </div>
      )}

      {/* Image Section - Now visible on all screens */}
      <div className="w-full lg:w-1/2 bg-gray-100 h-64 lg:h-auto">
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
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-center dark:bg-green-900 dark:text-green-200">
              {successMessage}
            </div>
          )}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center dark:bg-red-900 dark:text-red-200">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block font-medium mb-2 text-black dark:text-white">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
              {errors.username && <p className="text-red-600 text-sm mt-1 dark:text-red-400">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block font-medium mb-2 text-black dark:text-white">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1 dark:text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block font-medium mb-2 text-black dark:text-white">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg pr-12 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-sm mt-1 dark:text-red-400">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-medium mb-2 text-black dark:text-white">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg pr-12 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg text-white ${
                loading ? "bg-gray-400" : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p className="mt-2 text-sm text-center text-black dark:text-white">
              Already have an account?{" "}
              <Link to="/login" className="text-red-700 hover:underline dark:text-red-700">
                Login here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}