import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, updateProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    bio: "",
    interests: "",
    specialization: "",
    schedule: "",
    level: "Beginner",
    profilePic: null,
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch profile data
  useEffect(() => {
    if (!user) return;

    fetch("http://127.0.0.1:5000/api/profile", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.profile) {
          setProfile({
            bio: data.profile.bio || "",
            interests: Array.isArray(data.profile.interests) 
              ? data.profile.interests.join(", ") 
              : data.profile.interests || "",
            specialization: data.profile.specialization || "",
            schedule: data.profile.schedule || "",
            level: data.profile.level || "Beginner",
            profilePic: null,
          });
          setPreviewUrl(data.profile.profile_picture);
        }
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
        // Don't set error for 404 as backend now returns empty profile
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Handle file upload
  const handleFileChange = (e) => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const file = e.target.files[0];
    setProfile((prev) => ({ ...prev, profilePic: file }));
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("bio", profile.bio);
    formData.append("interests", profile.interests);
    formData.append("specialization", profile.specialization);
    formData.append("schedule", profile.schedule);
    formData.append("level", profile.level);
    
    if (profile.profilePic) {
      formData.append("profilePic", profile.profilePic);
    }

    try {
      // Check if profile exists by making a GET request
      const checkResponse = await fetch("http://127.0.0.1:5000/api/profile", {
        credentials: "include",
      });

      let method = "POST"; // Default to create
      if (checkResponse.ok) {
        const data = await checkResponse.json();
        // If profile already has data, use PUT to update
        if (data.profile && (
            data.profile.bio || 
            data.profile.specialization || 
            (data.profile.interests && data.profile.interests.length > 0)
        )) {
          method = "PUT";
        }
      }

      // Send the request with proper headers for FormData
      const response = await fetch(`http://127.0.0.1:5000/api/profile`, {
        method: method,
        credentials: "include",
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with boundary
      });

      if (response.ok) {
        setSuccess("Profile saved successfully!");
        
        // Update profile context if needed
        if (updateProfile) {
          updateProfile();
        }
        
        // Redirect to dashboard after a brief delay to show success message
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || "Failed to save profile");
        } catch {
          setError("Failed to save profile. Please try again.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving profile");
    }
  };

  if (!user) {
    return <p className="text-center py-8">Please login to edit profile.</p>;
  }

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl rounded-xl p-8 m-5">
        <h2 className="text-3xl font-bold mb-6 text-center text-red-700">
          Complete Your Profile
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-6">
          <label className="w-32 h-32 rounded-full overflow-hidden border-4 border-red-700 cursor-pointer shadow-md hover:shadow-lg transition">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium">
                Upload
              </div>
            )}
          </label>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <ul className="space-y-5">
            <li>
              <label className="block text-black dark:text-white font-medium mb-1">
                Username
              </label>
              <input
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-gray-200 dark:bg-gray-700 text-black dark:text-white cursor-not-allowed"
                value={user.username}
                readOnly
              />
            </li>

            <li>
              <label className="block text-black dark:text-white font-medium mb-1">
                Specialization
              </label>
              <input
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                value={profile.specialization}
                onChange={(e) =>
                  setProfile({ ...profile, specialization: e.target.value })
                }
                placeholder="e.g., Frontend Developer, Data Scientist"
              />
            </li>

            <li>
              <label className="block text-black dark:text-white font-medium mb-1">
                Schedule
              </label>
              <input
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                value={profile.schedule}
                onChange={(e) =>
                  setProfile({ ...profile, schedule: e.target.value })
                }
                placeholder="e.g., 9am-5pm, Weekends only"
              />
            </li>

            <li>
              <label className="block text-black dark:text-white font-medium mb-1">
                About
              </label>
              <textarea
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows="3"
                placeholder="Tell us about yourself..."
              />
            </li>

            <li>
              <label className="block text-black dark:text-white font-medium mb-1">
                Interests (comma-separated)
              </label>
              <input
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                value={profile.interests}
                onChange={(e) =>
                  setProfile({ ...profile, interests: e.target.value })
                }
                placeholder="e.g., programming, design, machine learning"
              />
            </li>
            
            <li>
              <label className="block text-black dark:text-white font-medium mb-1">
                Level
              </label>
              <select
                className="border border-gray-300 dark:border-gray-700 p-2 w-full rounded bg-white dark:bg-gray-800 text-black dark:text-white"
                value={profile.level}
                onChange={(e) => setProfile({ ...profile, level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </li>

            <li className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                Save
              </button>
            </li>
          </ul>
        </form>
      </div>
    </div>
  );
}