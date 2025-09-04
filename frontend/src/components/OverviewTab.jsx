import React from 'react';
import { getInitialsAvatar, api } from "../pages/utils/api";
import ActivityFeed from './ActivityFeed';

const OverviewTab = ({
  connectionRequests,
  requestsLoading,
  acceptConnectionRequest,
  declineConnectionRequest,
  personalizedChallenges,
  challengesLoading,
  recommendedBuddies,
  buddiesLoading,
  connectedBuddies,
  connectedBuddiesLoading,
  handleOpenChat,
  setActiveTab,
  setBuddiesTab,
  formatTime,
  getInitialsAvatar,
  handleConnectBuddy
}) => {
  // Ensure all props are arrays to prevent runtime errors
  const safeConnectionRequests = Array.isArray(connectionRequests) ? connectionRequests : [];
  const safeChallenges = Array.isArray(personalizedChallenges) ? personalizedChallenges : [];
  const safeRecommendedBuddies = Array.isArray(recommendedBuddies) ? recommendedBuddies : [];
  const safeConnectedBuddies = Array.isArray(connectedBuddies) ? connectedBuddies : [];
  
  return (
    <div className="space-y-8">
      {/* Connection Requests Section */}
      {safeConnectionRequests.length > 0 && (
        <div className="bg-gray-900 rounded-2xl p-6 border border-red-600">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Connection Requests</h3>
            <button 
              onClick={() => {
                setActiveTab('buddies');
                setBuddiesTab('requests');
              }}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {safeConnectionRequests.slice(0, 4).map(request => (
              <div key={request.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between border border-gray-700">
                <div className="flex items-center">
                  <img 
                    src={getInitialsAvatar(request.username)}
                    alt={request.username}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-medium">{request.username}</p>
                    <p className="text-sm text-gray-400">{formatTime(request.created_at)}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptConnectionRequest(request.id)}
                    className="px-3 py-1 bg-red-600 rounded-lg text-sm hover:bg-red-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineConnectionRequest(request.id)}
                    className="px-3 py-1 border border-gray-700 rounded-lg text-sm hover:bg-gray-700"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Three-column layout with Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Challenges */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <h3 className="text-xl font-bold mb-4">Personalized Challenges</h3>
            {challengesLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-800 rounded-xl p-6 h-32 border border-gray-700"></div>
                ))}
              </div>
            ) : safeChallenges.length > 0 ? (
              safeChallenges.slice(0, 3).map(challenge => (
                <div key={challenge.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-red-600 transition">
                  <h4 className="font-bold mb-2">{challenge.title}</h4>
                  <p className="text-gray-400 text-sm mb-4">{challenge.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs px-2 py-1 bg-red-600 rounded-full">{challenge.difficulty}</span>
                    <span className="text-xs text-gray-400">{challenge.duration}</span>
                  </div>
                  {challenge.progress !== undefined && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${challenge.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{challenge.progress}% complete</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400 border border-gray-700">
                No challenges available yet
              </div>
            )}
          </div>

          {/* Buddies Section */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recommended Buddies */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Recommended Buddies</h3>
                  <button 
                    onClick={() => {
                      setActiveTab('buddies');
                      setBuddiesTab('recommended');
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    View all
                  </button>
                </div>
                {buddiesLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-gray-800 rounded-xl p-4 h-20 border border-gray-700"></div>
                    ))}
                  </div>
                ) : safeRecommendedBuddies.length > 0 ? (
                  safeRecommendedBuddies.slice(0, 3).map(buddy => (
                    <div key={buddy.id} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between mb-3 border border-gray-700">
                      <div className="flex items-center">
                        <img 
                          src={getInitialsAvatar(buddy.username)}
                          alt={buddy.username}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <p className="font-medium text-sm">{buddy.username}</p>
                          <p className="text-xs text-gray-400">{buddy.specialization || 'No specialization'}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {buddy.connection_status === 'connected' ? (
                          <button
                            onClick={() => handleOpenChat(buddy)}
                            className="px-3 py-1 bg-red-600 rounded-lg text-xs hover:bg-red-700"
                          >
                            Message
                          </button>
                        ) : buddy.connection_status === 'request_sent' ? (
                          <button
                            disabled
                            className="px-3 py-1 border border-gray-700 rounded-lg text-xs opacity-50"
                          >
                            Request Sent
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnectBuddy(buddy.id)}
                            className="px-3 py-1 bg-red-600 rounded-lg text-xs hover:bg-red-700"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-400 border border-gray-700">
                    No recommended buddies available
                  </div>
                )}
              </div>

              {/* Connected Buddies */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Connected Buddies</h3>
                  <button 
                    onClick={() => {
                      setActiveTab('buddies');
                      setBuddiesTab('connected');
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    View all
                  </button>
                </div>
                {connectedBuddiesLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-gray-800 rounded-xl p-4 h-16 border border-gray-700"></div>
                    ))}
                  </div>
                ) : safeConnectedBuddies.length > 0 ? (
                  <div className="space-y-3">
                    {safeConnectedBuddies.slice(0, 4).map(buddy => (
                      <div 
                        key={buddy.id} 
                        className="bg-gray-800 rounded-xl p-4 flex items-center cursor-pointer hover:bg-gray-700 transition border border-gray-700"
                        onClick={() => handleOpenChat(buddy)}
                      >
                        <img 
                          src={getInitialsAvatar(buddy.username)}
                          alt={buddy.username}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        <p className="font-medium text-sm">{buddy.username}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-400 border border-gray-700">
                    No connected buddies yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="space-y-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;