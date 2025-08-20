import { useContext, useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

// Create a separate axios instance with interceptors
const API_BASE = "http://127.0.0.1:5000";
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const getInitialsAvatar = (username) => {
  if (!username || typeof username !== 'string') {
    return "https://placehold.co/100/ff0000/ffffff?text=US";
  }

  const cleanedUsername = username
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z\s]/g, '');

  const words = cleanedUsername.split(' ');
  
  let initials = '';
  if (words.length === 1) {
    initials = words[0].slice(0, 2).toUpperCase();
  } else {
    initials = words
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase() || '')
      .join('');
  }

  const displayText = initials.length >= 1 ? initials : 'US';
  return `https://placehold.co/100/ff0000/ffffff?text=${encodeURIComponent(displayText)}`;
};

const Dashboard = () => {
  const { user: contextUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    profilePic: null,
    bio: '',
    interests: '',
    specialization: '',
    schedule: ''
  });
  const [recommendedBuddies, setRecommendedBuddies] = useState([]);
  const [buddiesLoading, setBuddiesLoading] = useState(false);
  const [personalizedChallenges, setPersonalizedChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);
  const [allBuddies, setAllBuddies] = useState([]);
  const [buddiesTab, setBuddiesTab] = useState("recommended"); // "recommended" or "all"

  // Get user data from localStorage or context
  const getUserData = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
    return contextUser || {};
  };

  const userData = getUserData();

  // Function to get profile picture URL
  const getProfilePicture = (profileData, userData) => {
    if (profileData && profileData.profile_picture) {
      // If it's already a full URL, return it
      if (profileData.profile_picture.startsWith('http')) {
        return profileData.profile_picture;
      }
      // Otherwise, construct the full URL to the uploaded file
      return `${API_BASE}/uploads/profile_pics/${profileData.profile_picture}`;
    }
    return userData.avatar || getInitialsAvatar(userData.username);
  };

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProfileLoadAttempted(true);
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await api.get('/api/profile', {
        signal: abortControllerRef.current.signal
      });
      
      const profileData = response.data;
      
      // Set the profile state with the response
      setProfile(profileData);
      
      // Initialize the edit form data
      setEditFormData({
        profilePic: null,
        bio: profileData.profile?.bio || '',
        interests: Array.isArray(profileData.profile?.interests) 
          ? profileData.profile.interests.join(', ') 
          : profileData.profile?.interests || '',
        specialization: profileData.profile?.specialization || '',
        schedule: profileData.profile?.schedule || ''
      });
      
      return true; // Success
    } catch (err) {
      if (err.name !== 'AbortError') {
        if (err.response?.status === 401) {
          setError("Session expired. Please login again.");
          await logout();
        } else if (err.response?.status === 404) {
          // Profile doesn't exist yet, but don't treat this as an error
          // We'll handle this case in the UI
          return true;
        } else {
          setError(err.response?.data?.error || err.message || "Failed to load profile");
        }
      }
      return false; // Failure
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [logout, navigate]);

  // Function to fetch recommended buddies
  const fetchRecommendedBuddies = useCallback(async () => {
    try {
      setBuddiesLoading(true);
      const response = await api.get('/api/buddies/recommended');
      setRecommendedBuddies(response.data);
      return true;
    } catch (err) {
      console.error("Failed to fetch recommended buddies:", err);
      // Don't show error to user for this non-critical feature
      return false;
    } finally {
      setBuddiesLoading(false);
    }
  }, []);

  // Function to fetch all potential buddies
  const fetchAllBuddies = useCallback(async () => {
    try {
      setBuddiesLoading(true);
      const response = await api.get('/api/buddies');
      setAllBuddies(response.data);
      return true;
    } catch (err) {
      console.error("Failed to fetch all buddies:", err);
      return false;
    } finally {
      setBuddiesLoading(false);
    }
  }, []);

  // Function to fetch personalized challenges
  const fetchPersonalizedChallenges = useCallback(async () => {
    try {
      setChallengesLoading(true);
      const response = await api.get('/api/challenges/personalized');
      setPersonalizedChallenges(response.data);
      return true;
    } catch (err) {
      console.error("Failed to fetch personalized challenges:", err);
      // Fallback to default challenges
      setPersonalizedChallenges([
        {
          id: "fallback-1",
          title: "Complete 5 coding exercises",
          description: "Practice your programming skills with daily exercises",
          category: "Programming",
          difficulty: "Beginner",
          duration: "5 days",
          xp_reward: 200,
          progress: 40,
          resources: []
        }
      ]);
      return true; // We consider this a success due to fallback
    } finally {
      setChallengesLoading(false);
    }
  }, []);

  // Function to handle buddy connection
  const handleConnectBuddy = async (buddyId) => {
    try {
      await api.post('/api/buddies/connect', { buddy_id: buddyId });
      
      // Update the connection status locally
      setRecommendedBuddies(prevBuddies => 
        prevBuddies.map(buddy => 
          buddy.id === buddyId 
            ? { ...buddy, connection_status: "request_sent" } 
            : buddy
        )
      );
      
      setAllBuddies(prevBuddies => 
        prevBuddies.map(buddy => 
          buddy.id === buddyId 
            ? { ...buddy, connection_status: "request_sent" } 
            : buddy
        )
      );
      
      // Show success message
      alert("Connection request sent successfully!");
    } catch (err) {
      console.error("Failed to connect with buddy:", err);
      alert(err.response?.data?.error || "Failed to send connection request");
    }
  };

  // Load all data with proper error handling
  const loadDashboardData = useCallback(async () => {
    setError(null);
    
    // Try to load profile first (most important)
    const profileSuccess = await fetchProfile();
    
    if (!profileSuccess) {
      // If profile fails, don't try to load the rest
      return;
    }
    
    // Load other data in parallel
    await Promise.allSettled([
      fetchRecommendedBuddies(),
      fetchAllBuddies(),
      fetchPersonalizedChallenges()
    ]);
    
    setInitialLoadComplete(true);
  }, [fetchProfile, fetchRecommendedBuddies, fetchAllBuddies, fetchPersonalizedChallenges]);

  // Fetch data on component mount and when retryCount changes
  useEffect(() => {
    loadDashboardData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadDashboardData, retryCount]);

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      if (editFormData.profilePic) {
        formData.append('profilePic', editFormData.profilePic);
      }
      formData.append('bio', editFormData.bio);
      formData.append('interests', editFormData.interests);
      formData.append('specialization', editFormData.specialization);
      formData.append('schedule', editFormData.schedule);
      
      const response = await api.put('/api/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Refetch the profile to get updated data
      await fetchProfile();
      
      setShowEditModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    navigate("/profile");
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  // Only show error if initial load has completed and there's an error
  if (error && initialLoadComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 p-6 rounded-xl border border-red-600 max-w-md">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner only during initial load
  if (loading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if profile doesn't exist (404 response) but we've attempted to load it
  if (profileLoadAttempted && !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900 p-6 rounded-xl border border-red-600 max-w-md">
          <p className="mb-4">You need to create a profile first</p>
          <button 
            onClick={handleCreateProfile}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  // Extract profile data based on your backend response structure
  const profileData = profile?.profile || {};

  // Get the profile picture URL
  const profilePicture = getProfilePicture(profileData, userData);

  // Function to render buddy list
  const renderBuddiesList = (buddies) => {
    return (
      <div className="space-y-4">
        {buddiesLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : buddies.length > 0 ? (
          buddies.map((buddy) => (
            <div key={buddy.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
              <div className="flex items-center">
                <img 
                  src={buddy.avatar || getInitialsAvatar(buddy.username)} 
                  alt={buddy.username} 
                  className="w-10 h-10 rounded-full mr-3" 
                  onError={(e) => {
                    e.target.src = getInitialsAvatar(buddy.username);
                  }}
                />
                <div>
                  <p className="font-medium">{buddy.username}</p>
                  <p className="text-sm text-gray-400">
                    {buddy.specialization || "No specialization"} • {buddy.level}
                  </p>
                  {buddy.interests && buddy.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {buddy.interests.slice(0, 3).map((interest, index) => (
                        <span key={index} className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded-full text-xs">
                          {interest}
                        </span>
                      ))}
                      {buddy.interests.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{buddy.interests.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                {buddy.compatibility && (
                  <div className="text-sm text-green-400 font-medium">{buddy.compatibility}%</div>
                )}
                {buddy.connection_status === "not_connected" ? (
                  <button 
                    onClick={() => handleConnectBuddy(buddy.id)}
                    className="mt-1 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition"
                  >
                    Connect
                  </button>
                ) : buddy.connection_status === "request_sent" ? (
                  <span className="mt-1 px-3 py-1 text-yellow-400 text-xs font-medium">
                    Request Sent
                  </span>
                ) : buddy.connection_status === "request_received" ? (
                  <span className="mt-1 px-3 py-1 text-blue-400 text-xs font-medium">
                    Request Received
                  </span>
                ) : (
                  <span className="mt-1 px-3 py-1 text-green-400 text-xs font-medium">
                    Connected
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">No buddies found</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-red-600">BuddySystem</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-800 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z" />
                </svg>
              </button>
              <button className="p-2 rounded-full hover:bg-gray-800 transition relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z" />
                </svg>
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-600 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <img 
                  src={profilePicture} 
                  alt={userData.username} 
                  className="w-8 h-8 rounded-full" 
                  onError={(e) => {
                    e.target.src = getInitialsAvatar(userData.username);
                  }}
                />
                <span className="text-sm font-medium">
                  {userData.username || "User"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {userData.username || "User"} 👋
          </h2>
          <p className="text-gray-400">Ready to level up your learning today?</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-900 rounded-xl p-1 w-fit">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'buddies', label: 'Buddies' },
            { id: 'profile', label: 'Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition text-sm ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Activity - Placeholder */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-red-600">
                <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-gray-800 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium">Joined a study group</p>
                      <p className="text-sm text-gray-400">2 hours ago</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-400 font-bold">+50 XP</span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between p-4 bg-gray-800 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium">Completed a challenge</p>
                      <p className="text-sm text-gray-400">1 day ago</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-400 font-bold">+100 XP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personalized Challenges */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-red-600">
                <h3 className="text-xl font-bold mb-6">Personalized Challenges</h3>
                <div className="space-y-6">
                  {challengesLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600"></div>
                    </div>
                  ) : personalizedChallenges.length > 0 ? (
                    personalizedChallenges.slice(0, 3).map((challenge, index) => (
                      <div key={challenge.id || index} className="p-4 bg-gray-800 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{challenge.title}</h4>
                          <span className="text-sm text-yellow-400 font-bold">+{challenge.xp_reward} XP</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{challenge.description}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${challenge.progress || 0}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{challenge.category} • {challenge.difficulty}</span>
                          <span>{challenge.duration}</span>
                        </div>
                        {challenge.resources && challenge.resources.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-400 mb-1">Resources:</p>
                            <div className="flex flex-wrap gap-1">
                              {challenge.resources.map((resource, i) => (
                                <a 
                                  key={i}
                                  href={resource} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:underline"
                                >
                                  Resource {i+1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-4">No challenges available</p>
                  )}
                </div>
                <button 
                  onClick={() => {
                    // You could implement a full challenges view here
                    alert("View all challenges feature coming soon!");
                  }}
                  className="w-full mt-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-medium transition"
                >
                  View All Challenges
                </button>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Buddy Matches - Now with real data */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-red-600">
                <h3 className="text-xl font-bold mb-6">Recommended Buddies</h3>
                {renderBuddiesList(recommendedBuddies.slice(0, 3))}
                <button 
                  onClick={() => setActiveTab('buddies')}
                  className="w-full mt-4 py-3 border border-red-600 hover:bg-red-600/20 rounded-xl font-medium transition"
                >
                  View All Matches
                </button>
              </div>

              {/* Study Groups - Placeholder */}
              <div className="bg-gray-900 rounded-2xl p-6 border border-red-600">
                <h3 className="text-xl font-bold mb-6">Your Study Groups</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                    <div className="flex items-center">
                      <img src={getInitialsAvatar("Python Learners")} alt="Python" className="w-10 h-10 rounded-full mr-3" />
                      <div>
                        <p className="font-medium">Python Learners</p>
                        <p className="text-sm text-gray-400">12 members</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      <span className="text-sm text-green-400">5</span>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-4 py-3 border border-red-600 hover:bg-red-600/20 rounded-xl font-medium transition">
                  Join New Group
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buddies' && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-red-600">
            <div className="flex space-x-1 mb-6 bg-gray-800 rounded-xl p-1 w-fit">
              {[
                { id: 'recommended', label: 'Recommended' },
                { id: 'all', label: 'All Buddies' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBuddiesTab(tab.id)}
                  className={`px-6 py-2 rounded-lg font-medium transition text-sm ${
                    buddiesTab === tab.id
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <h3 className="text-xl font-bold mb-6">
              {buddiesTab === 'recommended' ? 'Recommended Study Buddies' : 'All Potential Study Buddies'}
            </h3>
            
            {buddiesTab === 'recommended' ? renderBuddiesList(recommendedBuddies) : renderBuddiesList(allBuddies)}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-gray-900 rounded-2xl p-8 border border-red-600">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <img 
                  src={profilePicture} 
                  alt={userData.username} 
                  className="w-24 h-24 rounded-full mx-auto mb-4" 
                  onError={(e) => {
                    e.target.src = getInitialsAvatar(userData.username);
                  }}
                />
                <h3 className="text-2xl font-bold">{userData.username || "User"}</h3>
                <p className="text-gray-400">{profileData.specialization || "No specialization"}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-bold mb-4">Personal Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">Email</label>
                      <p className="font-medium">{userData.email || "Not provided"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Interests</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profileData.interests && profileData.interests.length > 0 ? (
                          (Array.isArray(profileData.interests) 
                            ? profileData.interests 
                            : profileData.interests.split(',')
                          ).filter(i => i.trim()).map((interest, index) => (
                            <span key={index} className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-sm">
                              {interest.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">No interests added</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Specialization</label>
                      <p className="font-medium">{profileData.specialization || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Schedule</label>
                      <p className="font-medium">{profileData.schedule || "Not specified"}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Bio</label>
                      <p className="font-medium">
                        {profileData.bio || "No bio provided yet."}
                      </p>
                    </div>
                    <div className="flex justify-center space-x-4 mt-4">
                      <button 
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold mb-4">Activity</h4>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mr-3">
                        <span className="text-yellow-400 font-bold">🔥</span>
                      </div>
                      <div>
                        <p className="font-medium">3-Day Streak</p>
                        <p className="text-sm text-gray-400">Keep it up!</p>
                      </div>
                    </div>
                    <div className="flex items-center p-3 bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-400 font-bold">🏆</span>
                      </div>
                      <div>
                        <p className="font-medium">Level 2</p>
                        <p className="text-sm text-gray-400">1,200 XP earned</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-lg font-bold mt-8 mb-4">Recent Activities</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <p className="font-medium">Updated profile information</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-gray-400">
                          {new Date().toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-red-600">
            <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Profile Picture</label>
                <div className="flex items-center">
                  <img 
                    src={
                      editFormData.profilePic 
                        ? URL.createObjectURL(editFormData.profilePic) 
                        : profilePicture
                    } 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full mr-4"
                    onError={(e) => {
                      e.target.src = getInitialsAvatar(userData.username);
                    }}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditFormData({...editFormData, profilePic: e.target.files[0]})}
                    className="text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Bio</label>
                <textarea
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Interests (comma separated)</label>
                <input
                  type="text"
                  value={editFormData.interests}
                  onChange={(e) => setEditFormData({...editFormData, interests: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Specialization</label>
                <input
                  type="text"
                  value={editFormData.specialization}
                  onChange={(e) => setEditFormData({...editFormData, specialization: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Schedule Availability</label>
                <input
                  type="text"
                  value={editFormData.schedule}
                  onChange={(e) => setEditFormData({...editFormData, schedule: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                  placeholder="e.g. Weekdays 6-9pm, Weekends"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-600 hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;