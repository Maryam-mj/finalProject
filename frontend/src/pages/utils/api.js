import axios from "axios";

export const API_BASE = "http://127.0.0.1:5000";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// Add request interceptor to prevent caching
api.interceptors.request.use(
  (config) => {
    // Only add timestamp for GET requests to avoid issues with POST/PUT
    if (config.method === 'get') {
      const separator = config.url.includes("?") ? "&" : "?";
      config.url += `${separator}_t=${new Date().getTime()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login?session_expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export const getInitialsAvatar = (username) => {
  if (!username || typeof username !== "string") {
    return "https://placehold.co/100/ff0000/ffffff?text=US";
  }
  const cleaned = username
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-zA-Z\s]/g, "");
  const words = cleaned.split(" ");
  let initials =
    words.length === 1
      ? words[0].slice(0, 2).toUpperCase()
      : words
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() || "")
          .join("");
  return `https://placehold.co/100/ff0000/ffffff?text=${encodeURIComponent(
    initials || "US"
  )}`;
};

export const getProfilePicture = (profileData, userData) => {
  if (profileData?.profile_picture) {
    return profileData.profile_picture.startsWith("http")
      ? profileData.profile_picture
      : `${API_BASE}${profileData.profile_picture}`;
  }
  return userData?.avatar || getInitialsAvatar(userData?.username);
};

// Profile API functions
export const profileAPI = {
  getProfile: () => api.get("/profile"),
  createProfile: (data) => {
    // For FormData, don't set Content-Type header
    if (data instanceof FormData) {
      return api.post("/profile", data, {
        headers: {
          'Content-Type': undefined // Let browser set the content type with boundary
        }
      });
    }
    return api.post("/profile", data);
  },
  updateProfile: (data) => {
    // For FormData, don't set Content-Type header
    if (data instanceof FormData) {
      return api.put("/profile", data, {
        headers: {
          'Content-Type': undefined // Let browser set the content type with boundary
        }
      });
    }
    return api.put("/profile", data);
  },
};

export default api;