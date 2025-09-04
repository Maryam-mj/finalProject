const NotificationsPanel = ({
  notifications,
  unreadCount,
  markAllAsRead,
  handleNotificationClick,
  formatTime,
  setShowNotifications
}) => {
  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-gray-900 rounded-xl border border-red-600 shadow-lg z-20">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-bold">Notifications</h3>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div 
              key={notification.id}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition ${
                !notification.read ? 'bg-gray-800/50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatTime(notification.timestamp)}</p>
                </div>
                {!notification.read && (
                  <span className="w-2 h-2 bg-red-500 rounded-full ml-2 mt-1"></span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-400">
            No notifications
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-800 text-center">
        <button 
          onClick={() => {
            setShowNotifications(false);
            alert('View all notifications feature coming soon!');
          }}
          className="text-sm text-red-400 hover:text-red-300"
        >
          View All Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationsPanel;