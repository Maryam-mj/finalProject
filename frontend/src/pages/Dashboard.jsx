import { useContext, useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import OverviewTab from '../components/OverviewTab';
import BuddiesTab from '../components/BuddiesTab';
import ChatsTab from '../components/ChatsTab';
import ChatInterface from '../components/ChatInterface';
import ProfileTab from '../components/ProfileTab';
import NotificationsPanel from '../components/NotificationsPanel';
import MessagesPage from '../components/MessagesPage'; // Import the MessagesPage component
import { api, getProfilePicture } from "./utils/api";

// Add getInitialsAvatar function if it's missing from api.js
const getInitialsAvatar = (username) => {
  if (!username) return '#';
  const names = username.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  }
  return `https://ui-avatars.com/api/?name=${initials}&background=dc2626&color=fff&size=128`;
};

const Dashboard = () => {
  const { user: contextUser, logout, updateProfile } = useContext(AuthContext);
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
  const [buddiesTab, setBuddiesTab] = useState("recommended");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationIntervalRef = useRef(null);
  const [connectedBuddies, setConnectedBuddies] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [connectedBuddiesLoading, setConnectedBuddiesLoading] = useState(false);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // Get user data from localStorage or context
  const getUserData = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return { ...parsedUser, ...(contextUser || {}) };
      }
    } catch (e) {
      console.error('Error parsing user data from localStorage:', e);
    }
    return contextUser || {};
  }, [contextUser]);
  
  const [userData, setUserData] = useState(getUserData());
  
  // Update user data when context changes
  useEffect(() => {
    setUserData(getUserData());
  }, [contextUser, getUserData]);
  
  // Function to fetch connected buddies
  const fetchConnectedBuddies = useCallback(async () => {
    try {
      setConnectedBuddiesLoading(true);
      const response = await api.get('/buddies/connected');
      setConnectedBuddies(response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch connected buddies:", err);
      return [];
    } finally {
      setConnectedBuddiesLoading(false);
    }
  }, []);
  
  // Function to fetch connection requests
  const fetchConnectionRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const response = await api.get('/buddies/requests');
      setConnectionRequests(response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch connection requests:", err);
      return [];
    } finally {
      setRequestsLoading(false);
    }
  }, []);
  
  // Function to accept a connection request
  const acceptConnectionRequest = useCallback(async (requestId) => {
    try {
      const response = await api.post(`/buddies/requests/${requestId}/accept`);
      await Promise.all([
        fetchConnectedBuddies(),
        fetchConnectionRequests()
      ]);
      const request = connectionRequests.find(req => req.id === requestId);
      if (request) {
        const newNotification = {
          id: Date.now(),
          type: 'connection_accepted',
          title: 'Connection Accepted',
          message: `You are now connected with ${request.username}`,
          timestamp: new Date(),
          read: false,
          data: { userId: request.user_id }
        };
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        alert(`You are now connected with ${request.username}!`);
      }
    } catch (err) {
      console.error("Failed to accept connection request:", err);
      alert(err.response?.data?.error || "Failed to accept connection request");
    }
  }, [connectionRequests, fetchConnectedBuddies, fetchConnectionRequests]);
  
  // Function to decline a connection request
  const declineConnectionRequest = useCallback(async (requestId) => {
    try {
      await api.post(`/buddies/requests/${requestId}/decline`);
      await fetchConnectionRequests();
      alert("Connection request declined");
    } catch (err) {
      console.error("Failed to decline connection request:", err);
      alert(err.response?.data?.error || "Failed to decline connection request");
    }
  }, [fetchConnectionRequests]);
  
  // Function to fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter(n => !n.read).length);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      return [];
    }
  }, []);
  
  // Function to mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => prev - 1);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);
  
  // Function to mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  }, []);
  
  // Function to handle notification click based on type
  const handleNotificationClick = useCallback((notification) => {
    markAsRead(notification.id);
    switch (notification.type) {
      case 'connection_request':
        setActiveTab('buddies');
        setBuddiesTab('requests');
        break;
      case 'admin_update':
        alert('System update: ' + notification.message);
        break;
      case 'new_challenge':
        alert('New challenge: ' + notification.message);
        break;
      case 'message':
        const fromUser = notification.data?.fromUserId;
        const buddy = connectedBuddies.find(b => b.userId === fromUser);
        if (buddy) {
          handleOpenChat(buddy);
        } else {
          alert(`New message from ${notification.message.split(' ')[0]}`);
        }
        break;
      default:
        setShowNotifications(false);
    }
  }, [markAsRead, connectedBuddies]);
  
  // Function to open chat with a buddy
  const handleOpenChat = (buddy) => {
    setCurrentChat(buddy);
    setShowChat(true);
    if (!chatMessages[buddy.id]) {
      setChatMessages(prev => ({
        ...prev,
        [buddy.id]: [
          {
            id: 1,
            senderId: buddy.userId,
            content: `Hi ${userData.username}! I'm interested in collaborating on projects.`,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
          },
          {
            id: 2,
            senderId: userData.id,
            content: "Hey! That sounds great. What kind of projects are you working on?",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1)
          },
          {
            id: 3,
            senderId: buddy.userId,
            content: "Mostly web development with React and Node.js. How about you?",
            timestamp: new Date(Date.now() - 1000 * 60 * 30)
          }
        ]
      }));
    }
  };
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Simulate receiving new notifications
  useEffect(() => {
    notificationIntervalRef.current = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [fetchNotifications]);
  
  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProfileLoadAttempted(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const response = await api.get('/profile', {
        signal: abortControllerRef.current.signal
      });
      const profileData = response.data;
      setProfile(profileData);
      setEditFormData({
        profilePic: null,
        bio: profileData.profile?.bio || '',
        interests: Array.isArray(profileData.profile?.interests) 
          ? profileData.profile.interests.join(', ') 
          : profileData.profile?.interests || '',
        specialization: profileData.profile?.specialization || '',
        schedule: profileData.profile?.schedule || ''
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request was aborted');
        return true;
      }
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        await logout();
        navigate('/login');
      } else if (err.response?.status === 404) {
        setProfile(null);
        return true;
      } else {
        setError(err.response?.data?.error || err.message || "Failed to load profile");
      }
      return false;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [logout, navigate]);
  
  // Function to fetch recommended buddies
  const fetchRecommendedBuddies = useCallback(async () => {
    try {
      setBuddiesLoading(true);
      const response = await api.get('/buddies/recommended');
      // Fix: Check if response.data is an array before filtering
      const buddiesData = Array.isArray(response.data) ? response.data : [];
      const signedUpBuddies = buddiesData.filter(buddy => 
        buddy.specialization || buddy.interests || buddy.schedule
      );
      setRecommendedBuddies(signedUpBuddies);
      return true;
    } catch (err) {
      console.error("Failed to fetch recommended buddies:", err);
      return false;
    } finally {
      setBuddiesLoading(false);
    }
  }, []);
  
  // Function to fetch all buddies - FIXED
  const fetchAllBuddies = useCallback(async () => {
    try {
      setBuddiesLoading(true);
      const response = await api.get('/buddies/all');
      // Fix: Check if response.data is an array before filtering
      const buddiesData = Array.isArray(response.data) ? response.data : [];
      const profiledBuddies = buddiesData.filter(buddy => {
        return buddy.specialization || 
               buddy.interests || 
               buddy.schedule || 
               buddy.bio || 
               (Array.isArray(buddy.interests) && buddy.interests.length > 0);
      });
      setAllBuddies(profiledBuddies);
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
      const response = await api.get('/challenges/personalized');
      setPersonalizedChallenges(response.data);
      return true;
    } catch (err) {
      console.error("Failed to fetch personalized challenges:", err);
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
      return true;
    } finally {
      setChallengesLoading(false);
    }
  }, []);
  
  
 // Function to handle buddy connection
const handleConnectBuddy = async (buddyId) => {
  try {
    const buddy = [...recommendedBuddies, ...allBuddies].find(b => b.id === buddyId);
    const hasProfile = buddy && (buddy.specialization || buddy.interests || buddy.schedule);
    
    if (!hasProfile) {
      if (!window.confirm("This user hasn't completed their profile yet. Would you still like to send a connection request?")) {
        return;
      }
    }
    
    await api.post('/buddies/connect', { buddy_id: buddyId });
    
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
    
    alert(`Connection request sent to ${buddy.username} successfully!`);
  } catch (err) {
    console.error("Failed to connect with buddy:", err);
    
    // More specific error handling
    if (err.response?.status === 500) {
      alert("Server error: Please try again later or contact support if the problem persists");
    } else {
      alert(err.response?.data?.error || "Failed to send connection request");
    }
  }
};
  
  // Load all data with proper error handling
  const loadDashboardData = useCallback(async () => {
    setError(null);
    const profileSuccess = await fetchProfile();
    if (!profileSuccess) {
      return;
    }
    await Promise.allSettled([
      fetchRecommendedBuddies(),
      fetchAllBuddies(),
      fetchPersonalizedChallenges(),
      fetchNotifications(),
      fetchConnectedBuddies(),
      fetchConnectionRequests()
    ]);
    setInitialLoadComplete(true);
  }, [fetchProfile, fetchRecommendedBuddies, fetchAllBuddies, fetchPersonalizedChallenges, fetchNotifications, fetchConnectedBuddies, fetchConnectionRequests]);
  
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
      
      // Check if we have a file to upload
      if (editFormData.profilePic) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('profilePic', editFormData.profilePic);
        formData.append('bio', editFormData.bio);
        formData.append('interests', editFormData.interests);
        formData.append('specialization', editFormData.specialization);
        formData.append('schedule', editFormData.schedule);
        
        // Use the AuthContext updateProfile function which handles FormData
        await updateProfile(formData);
      } else {
        // Use plain JSON for updates without files
        const profileData = {
          bio: editFormData.bio,
          interests: editFormData.interests,
          specialization: editFormData.specialization,
          schedule: editFormData.schedule
        };
        
        // Use the AuthContext updateProfile function which handles JSON
        await updateProfile(profileData);
      }
      
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
  
  // Function to render connection requests
  const renderConnectionRequests = (requests, loading) => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      );
    }
    
    if (!requests || requests.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No connection requests at this time.
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={getProfilePicture(request, request)} 
                  alt={request.username} 
                  className="w-10 h-10 rounded-full"
                  onError={(e) => {
                    e.target.src = getInitialsAvatar(request.username);
                  }}
                />
                <div>
                  <h4 className="font-medium">{request.username}</h4>
                  <p className="text-sm text-gray-400">Sent {formatTime(request.timestamp)}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => acceptConnectionRequest(request.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineConnectionRequest(request.id)}
                  className="px-3 py-1 border border-gray-600 hover:bg-gray-800 rounded-lg text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  

  // Function to render buddies list
  const renderBuddiesList = (buddies, loading, showConnectButton = true) => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      );
    }
    
    if (!buddies || buddies.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No buddies found.
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buddies.map((buddy) => (
          <div key={buddy.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={getProfilePicture(buddy, buddy)} 
                  alt={buddy.username} 
                  className="w-12 h-12 rounded-full"
                  onError={(e) => {
                    e.target.src = getInitialsAvatar(buddy.username);
                  }}
                />
                <div>
                  <h4 className="font-medium">{buddy.username}</h4>
                  <p className="text-sm text-gray-400">{buddy.specialization || 'No specialization'}</p>
                </div>
              </div>
              {showConnectButton && (
                <button
                  onClick={() => handleConnectBuddy(buddy.id)}
                  disabled={buddy.connection_status === "request_sent"}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    buddy.connection_status === "request_sent" 
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {buddy.connection_status === "request_sent" ? "Request Sent" : "Connect"}
                </button>
              )}
            </div>
            {buddy.interests && (
              <div className="mt-3">
                <p className="text-sm text-gray-400">Interests: {Array.isArray(buddy.interests) ? buddy.interests.join(', ') : buddy.interests}</p>
              </div>
            )}
            {buddy.schedule && (
              <div className="mt-1">
                <p className="text-sm text-gray-400">Available: {buddy.schedule}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Function to refresh all buddies data
  const refreshBuddiesData = useCallback(async () => {
    await Promise.all([
      fetchRecommendedBuddies(),
      fetchAllBuddies(),
      fetchConnectedBuddies(),
      fetchConnectionRequests()
    ]);
  }, [fetchRecommendedBuddies, fetchAllBuddies, fetchConnectedBuddies, fetchConnectionRequests]);
  
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
  
  // Notification icon component
  const NotificationIcon = () => (
    <button 
      className="p-2 rounded-full hover:bg-gray-800 transition relative"
      onClick={() => setShowNotifications(prev => !prev)}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7H4l5-5v5z" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 rounded-full text-xs flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
  
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
              {/* Notification icon with dropdown */}
              <div className="relative">
                <NotificationIcon />
                {showNotifications && (
                  <NotificationsPanel 
                    notifications={notifications}
                    unreadCount={unreadCount}
                    markAllAsRead={markAllAsRead}
                    handleNotificationClick={handleNotificationClick}
                    formatTime={formatTime}
                    setShowNotifications={setShowNotifications}
                  />
                )}
              </div>
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
            { id: 'messages', label: 'Chats' }, // Add Messages tab
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
          <OverviewTab
            connectionRequests={connectionRequests}
            requestsLoading={requestsLoading}
            renderConnectionRequests={renderConnectionRequests}
            personalizedChallenges={personalizedChallenges}
            challengesLoading={challengesLoading}
            recommendedBuddies={recommendedBuddies}
            buddiesLoading={buddiesLoading}
            renderBuddiesList={renderBuddiesList}
            setActiveTab={setActiveTab}
            connectedBuddies={connectedBuddies}
            connectedBuddiesLoading={connectedBuddiesLoading}
            handleOpenChat={handleOpenChat}
            formatTime={formatTime}
            getInitialsAvatar={getInitialsAvatar}
            getProfilePicture={getProfilePicture}
          />
        )}
        {activeTab === 'buddies' && (
          <BuddiesTab
            buddiesTab={buddiesTab}
            setBuddiesTab={setBuddiesTab}
            recommendedBuddies={recommendedBuddies}
            allBuddies={allBuddies}
            buddiesLoading={buddiesLoading}
            connectedBuddies={connectedBuddies}
            connectedBuddiesLoading={connectedBuddiesLoading}
            handleOpenChat={handleOpenChat}
            connectionRequests={connectionRequests}
            requestsLoading={requestsLoading}
            formatTime={formatTime}
            onRefreshData={refreshBuddiesData}
          />
        )}
        {activeTab === 'messages' && (
          <MessagesPage 
            userData={userData}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            profilePicture={profilePicture}
            userData={userData}
            profileData={profileData}
            setShowEditModal={setShowEditModal}
            error={error}
            showEditModal={showEditModal}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            handleProfileUpdate={handleProfileUpdate}
            loading={loading}
            getInitialsAvatar={getInitialsAvatar}
          />
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
                    className="w-16 h-16 rounded-full object-cover aspect-square mr-4"
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
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Interface */}
      {showChat && currentChat && (
        <ChatInterface
          currentChat={currentChat}
          onClose={() => setShowChat(false)}
          userData={userData}
        />
      )}
    </div>
  );
};

export default Dashboard;