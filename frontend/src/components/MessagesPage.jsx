import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, getInitialsAvatar } from "../pages/utils/api";

// Single message bubble
const MessageBubble = ({ message, isOwn }) => (
  <div className={`flex mb-3 px-4 ${isOwn ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-xs lg:max-w-md p-3 break-words rounded-2xl shadow-md ${
        isOwn
          ? "bg-red-600 text-white rounded-br-none rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl"
          : "bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none rounded-tl-2xl rounded-tr-2xl rounded-br-2xl"
      }`}
    >
      <p className="text-sm">{message.content}</p>
      <p
        className={`text-xs mt-1 ${
          isOwn ? "text-red-200 text-right" : "text-gray-400 text-left"
        }`}
      >
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  </div>
);

// Chat modal/interface
const ChatInterface = ({ chat, onClose, userData }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!chat) return;
    try {
      const chatId = chat.userId || chat.id;
      const response = await api.get(`/chat/messages/${chatId}`);
      if (response.data?.messages) {
        const formatted = response.data.messages
          .map((msg) => ({
            ...msg,
            senderUsername:
              msg.senderId === userData.id ? userData.username : chat.username,
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [chat, userData]);

  useEffect(() => {
    if (!chat) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chat, fetchMessages]);

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      const tempMessage = {
        id: Date.now(),
        senderId: userData.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        isTemp: true,
      };
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");

      const chatId = chat.userId || chat.id;
      const response = await api.post(`/chat/send/${chatId}`, {
        content: newMessage,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? response.data : m))
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!chat) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-3xl w-full max-w-2xl h-5/6 flex flex-col border border-gray-800 shadow-xl">
        {/* Header */}
        <div className="p-4 bg-gray-800 text-white rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-full mr-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <img
              src={chat.avatar || getInitialsAvatar(chat.username)}
              alt={chat.username}
              className="w-10 h-10 rounded-full mr-3 object-cover"
            />
            <div>
              <h3 className="font-bold text-white">{chat.username}</h3>
              <p className="text-xs text-gray-400">
                {chat.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length > 0 ? (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === userData.id}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-800 border-t border-gray-700 rounded-b-3xl">
          <div className="flex gap-2 items-center">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 text-white rounded-full py-3 px-4 outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main messages page
const MessagesPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const response = await api.get("/chat/conversations");
        const sorted = response.data.sort(
          (a, b) =>
            new Date(b.last_message_time || 0) -
            new Date(a.last_message_time || 0)
        );
        setChats(sorted);
      } catch (err) {
        console.error("Failed to fetch chats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Messages</h1>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <p className="text-gray-500 text-center mt-10">
            Loading conversations...
          </p>
        ) : chats.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">
            No conversations yet
          </p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className="flex items-center justify-between p-3 mb-3 bg-gray-800 rounded-2xl hover:bg-gray-700 cursor-pointer transition-all"
              onClick={() => setSelectedChat(chat)}
            >
              <div className="flex items-center gap-3">
                <img
                  src={chat.avatar || getInitialsAvatar(chat.username)}
                  alt={chat.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-white">{chat.username}</span>
                  <span className="text-xs text-gray-400 truncate max-w-[180px]">
                    {chat.last_message || "Start a conversation"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                {chat.last_message_time && (
                  <span className="text-xs text-gray-500">
                    {new Date(chat.last_message_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                {chat.unread_count > 0 && (
                  <span className="mt-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                    {chat.unread_count}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedChat && (
        <ChatInterface
          chat={selectedChat}
          userData={{ id: 1, username: "You" }} // Replace with actual logged-in user
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
};

export default MessagesPage;
