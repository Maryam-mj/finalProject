// components/ProfileTab.js
import React from 'react';

const ProfileTab = ({
  profilePicture,
  userData,
  profileData,
  setShowEditModal,
  error,
  showEditModal,
  editFormData,
  setEditFormData,
  handleProfileUpdate,
  loading,
  getInitialsAvatar
}) => {
  return (
    <div className="bg-gray-900 rounded-2xl p-8 border border-red-600">
      <div className="max-w-3xl mx-auto">
        {/* Header with profile image */}
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

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Personal Information */}
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

              {/* Account Stats */}
              <div className="pt-4">
                <h4 className="text-lg font-bold mb-4">Account Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-red-500">
                      {profileData.connections_count || 0}
                    </p>
                    <p className="text-xs text-gray-400">Connections</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <p className="text-xl font-bold text-red-500">
                      {profileData.completed_challenges || 0}
                    </p>
                    <p className="text-xs text-gray-400">Challenges Completed</p>
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <div className="flex justify-center space-x-4 mt-4">
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Activity */}
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
  );
};

export default ProfileTab;