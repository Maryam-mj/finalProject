import React from "react";
import { getInitialsAvatar } from "../pages/utils/api";

const ChatsTab = ({ chats = [], onChatSelect }) => {
  return (
    <div className="bg-gray-900 rounded-2xl w-full h-full flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats && chats.length > 0 ? (
          chats.map((chat) => (
            <div
              key={chat.id}
              className="p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
              onClick={() => onChatSelect(chat)}
            >
              <div className="flex items-center">
                <img
                  src={chat.avatar || getInitialsAvatar(chat.username)}
                  alt={chat.username}
                  className="w-12 h-12 rounded-full mr-3"
                  onError={(e) => {
                    e.target.src = getInitialsAvatar(chat.username);
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-bold">{chat.username}</h3>
                  <p className="text-sm text-gray-400">
                    {chat.specialization || "No specialization"}
                  </p>
                </div>
                {chat.unreadCount > 0 && (
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            No chats yet. Connect with other users to start chatting!
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsTab;