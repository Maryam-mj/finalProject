import { useState } from 'react';
import { getInitialsAvatar, api } from "../pages/utils/api";

const BuddiesTab = ({
  buddiesTab,
  setBuddiesTab,
  recommendedBuddies,
  allBuddies,
  buddiesLoading,
  connectedBuddies,
  connectedBuddiesLoading,
  handleOpenChat,
  connectionRequests,
  requestsLoading,
  formatTime,
  onRefreshData
}) => {
  const [connectionError, setConnectionError] = useState(null);
  const [connectingUsers, setConnectingUsers] = useState(new Set());

  // Enhanced connection handler with error feedback
  const handleConnect = async (buddyId) => {
    setConnectingUsers(prev => new Set(prev).add(buddyId));
    setConnectionError(null);
    
    try {
      // FIXED: Removed the extra /api prefix since buddies_bp already has url_prefix="/api/buddies"
      const response = await api.post('/buddies/connect', { buddy_id: buddyId });
      
      if (response.data.success) {
        // Refresh data to update connection status
        if (onRefreshData) {
          onRefreshData();
        }
        console.log('Connection request sent successfully');
      } else {
        setConnectionError(response.data.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(error.response?.data?.message || 'Failed to connect. Please try again.');
    } finally {
      setConnectingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(buddyId);
        return newSet;
      });
    }
  };

  // Handle connection request actions
  const handleAcceptRequest = async (requestId) => {
    try {
      // FIXED: Removed the extra /api prefix
      const response = await api.post(`/buddies/requests/${requestId}/accept`);
      if (response.data.success && onRefreshData) {
        onRefreshData();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      setConnectionError('Failed to accept connection request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      // FIXED: Removed the extra /api prefix
      const response = await api.post(`/buddies/requests/${requestId}/decline`);
      if (response.data.success && onRefreshData) {
        onRefreshData();
      }
    } catch (error) {
      console.error('Error declining request:', error);
      setConnectionError('Failed to decline connection request');
    }
  };

  // ... rest of the component remains the same
  // Enhanced render function for buddies list with connection handling
  const renderEnhancedBuddiesList = (buddies, showMatchPercentage = true) => {
    if (buddiesLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      );
    }
    
    if (!buddies || buddies.length === 0) {
      return (
        <p className="text-gray-400 text-center py-6">
          {buddiesTab === 'recommended' 
            ? 'No recommended buddies at this time' 
            : 'No buddies found'}
        </p>
      );
    }
    
    return (
      <div className="space-y-4">
        {connectionError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <span>{connectionError}</span>
            <button 
              onClick={() => setConnectionError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}
        
        {buddies.map((buddy) => (
          <div key={buddy.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
            <div className="flex items-center space-x-4">
              <img 
                src={buddy.avatar || getInitialsAvatar(buddy.username)} 
                alt={buddy.username} 
                className="w-12 h-12 rounded-full flex-shrink-0"
                onError={(e) => {
                  e.target.src = getInitialsAvatar(buddy.username);
                }}
              />
              <div>
                <p className="font-medium text-white">{buddy.username}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {buddy.specialization || "No specialization"} • {buddy.level}
                </p>
                {buddy.interests && buddy.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {buddy.interests.slice(0, 3).map((interest, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-red-600/20 text-red-400 rounded-full text-xs"
                      >
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
            
            <div className="flex flex-col items-end space-y-2">
              {showMatchPercentage && buddy.compatibility !== undefined && (
                <div className="text-sm text-green-400 font-medium">
                  {buddy.compatibility}% Match
                </div>
              )}
              
              {buddiesTab !== 'connected' ? (
                buddy.connection_status === 'connected' ? (
                  <button 
                    onClick={() => handleOpenChat(buddy)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition text-white"
                  >
                    Message
                  </button>
                ) : buddy.connection_status === 'request_sent' ? (
                  <button 
                    disabled
                    className="px-4 py-2 bg-gray-600 text-gray-400 rounded text-xs font-medium cursor-not-allowed"
                  >
                    Request Sent
                  </button>
                ) : buddy.connection_status === 'request_received' ? (
                  <button 
                    disabled
                    className="px-4 py-2 bg-gray-600 text-gray-400 rounded text-xs font-medium cursor-not-allowed"
                  >
                    Request Received
                  </button>
                ) : (
                  <button 
                    onClick={() => handleConnect(buddy.id)}
                    disabled={connectingUsers.has(buddy.id)}
                    className={`px-4 py-2 rounded text-xs font-medium transition ${
                      connectingUsers.has(buddy.id)
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {connectingUsers.has(buddy.id) ? 'Connecting...' : 'Connect'}
                  </button>
                )
              ) : (
               <button 
  onClick={() => handleOpenChat(buddy)}
  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition text-white"
>
  Message
</button>

              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render connection requests
  const renderConnectionRequests = () => {
    if (requestsLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      );
    }
    
    if (!connectionRequests || connectionRequests.length === 0) {
      return (
        <p className="text-gray-400 text-center py-6">No connection requests</p>
      );
    }
    
    return (
      <div className="space-y-4">
        {connectionError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
            <span>{connectionError}</span>
            <button 
              onClick={() => setConnectionError(null)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}
        
        {connectionRequests.map((request) => (
          <div key={request.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
            <div className="flex items-center space-x-4">
              <img 
                src={request.avatar || getInitialsAvatar(request.username)} 
                alt={request.username} 
                className="w-12 h-12 rounded-full flex-shrink-0"
                onError={(e) => {
                  e.target.src = getInitialsAvatar(request.username);
                }}
              />
              <div>
                <p className="font-medium text-white">{request.username}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {request.specialization || "No specialization"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {request.message}
                </p>
                {request.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime ? formatTime(request.timestamp) : new Date(request.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => handleAcceptRequest(request.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition text-white"
              >
                Accept
              </button>
              <button 
                onClick={() => handleDeclineRequest(request.id)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-xs font-medium transition text-white"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700">
      <div className="flex flex-wrap gap-2 mb-6 bg-gray-800 rounded-xl p-1 w-full md:w-fit">
        {[
          { id: 'recommended', label: 'Recommended' },
          { id: 'all', label: 'All Buddies' },
          { id: 'connected', label: 'Connected' },
          { id: 'requests', label: 'Requests' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setBuddiesTab(tab.id);
              setConnectionError(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm flex-1 md:flex-none ${
              buddiesTab === tab.id
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <h3 className="text-xl font-bold mb-6 text-white">
        {buddiesTab === 'recommended' ? 'Recommended Study Buddies' : 
          buddiesTab === 'all' ? 'All Potential Study Buddies' : 
          buddiesTab === 'connected' ? 'Connected Buddies' : 'Connection Requests'}
      </h3>
      
      {buddiesTab === 'recommended' ? renderEnhancedBuddiesList(recommendedBuddies, true) : 
        buddiesTab === 'all' ? renderEnhancedBuddiesList(allBuddies, false) : 
        buddiesTab === 'connected' ? (
          connectedBuddiesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
            </div>
          ) : connectedBuddies && connectedBuddies.length > 0 ? (
            renderEnhancedBuddiesList(connectedBuddies, false)
          ) : (
            <p className="text-gray-400 text-center py-6">No connected buddies yet</p>
          )
        ) : (
          renderConnectionRequests()
        )}
    </div>
  );
};

export default BuddiesTab;