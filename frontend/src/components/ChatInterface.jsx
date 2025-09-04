import { useEffect, useState } from 'react';
import { api } from '../pages/utils/api';

const ChatInterface = ({ buddy, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chats/${buddy.id}`); // Fetch chat with this buddy
        setMessages(res.data.messages);
      } catch (error) {
        console.error('Failed to load messages', error);
      }
    };

    if (buddy) fetchMessages();
  }, [buddy]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await api.post(`/chats/${buddy.id}/send`, { content: newMessage });
      setMessages(prev => [...prev, { sender: 'me', content: newMessage }]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  return (
    <div className="fixed bottom-0 right-0 w-80 h-96 bg-gray-900 border border-gray-700 rounded-xl flex flex-col">
      <div className="flex justify-between p-3 border-b border-gray-700">
        <span className="font-bold text-white">{buddy.username}</span>
        <button onClick={onClose} className="text-red-400">×</button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`p-2 rounded-lg ${msg.sender === 'me' ? 'bg-green-600 text-white self-end' : 'bg-gray-700 text-white self-start'}`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="p-3 flex gap-2">
        <input 
          type="text" 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          className="flex-1 rounded-lg p-2 bg-gray-800 text-white border border-gray-700"
          placeholder="Type a message..."
        />
        <button 
          onClick={handleSendMessage} 
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-white"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
