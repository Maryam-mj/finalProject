import React, { useEffect, useState } from "react";
import { FireOutlined, HeartOutlined, LikeOutlined, UploadOutlined } from "@ant-design/icons";
import { api } from "../pages/utils/api";

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [challenge, setChallenge] = useState("");

  // Motivator quotes
  const motivators = [
    "🚀 Keep going, your buddies believe in you!",
    "🔥 Small steps add up to big wins!",
    "💡 Learning together makes it easier!",
    "🎯 Stay consistent, champion!"
  ];
  const randomMotivator = motivators[Math.floor(Math.random() * motivators.length)];

  // Fun brain teasers
  const brainTricks = [
    "Did you know? Reading aloud helps improve memory retention.",
    "Riddle: What has keys but can't open locks? 🎹",
    "Tip: Break study into 25-min sprints. Your brain loves short wins!",
    "Fun Fact: Laughing 10 minutes boosts focus for 30 minutes!"
  ];
  const randomTrick = brainTricks[Math.floor(Math.random() * brainTricks.length)];

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hr ago`;
    return date.toLocaleDateString();
  };

  // Add new challenge
  const handleChallengePost = async () => {
    if (!challenge.trim()) return;

    try {
      const response = await api.post("/challenges", { description: challenge });

      if (response.data.success) {
        const newChallenge = {
          id: Date.now(),
          type: "challenge_shared",
          description: `🎯 Challenge: ${challenge}`,
          timestamp: new Date().toISOString()
        };
        setActivities([newChallenge, ...activities]);
        setChallenge("");
      }
    } catch (error) {
      console.error("Error posting challenge:", error);
    }
  };

  // Fetch activities
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get("/activities");

      if (response.data.success) {
        setActivities(response.data.activities || []);
        setUser(response.data.user || null);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      // fallback demo data
      setActivities([
        {
          id: 1,
          type: "study_session",
          description: "📚 You studied 2 hours of Mathematics",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          type: "buddy_connected",
          description: "🤝 You and Alex Johnson became study buddies",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          type: "challenge_completed",
          description: "🏆 You smashed the Weekly Coding Challenge!",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-red-600 space-y-6">
      {/* Title */}
      <h3 className="text-xl font-bold mb-2">
        {user ? `📖 ${user}'s StudyBuddy Feed` : "StudyBuddy Feed"}
      </h3>

      {/* Motivator */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <p className="text-red-500 font-semibold">💬 Motivation:</p>
        <p className="text-white mt-1">{randomMotivator}</p>
      </div>

      {/* Brain Trick */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <p className="text-red-500 font-semibold">🧠 Brain Boost:</p>
        <p className="text-white mt-1">{randomTrick}</p>
      </div>

      {/* Challenge Input */}
      <div className="space-y-2">
        <textarea
          rows={2}
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          placeholder="Send a fun challenge to your buddies..."
          className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white p-2 text-sm"
        />
        <button
          onClick={handleChallengePost}
          className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-medium transition"
        >
          <UploadOutlined className="mr-2" /> Post Challenge
        </button>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="text-center text-gray-400">No recent activity yet.</div>
      ) : (
        <div className="space-y-4">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between bg-gray-800 rounded-xl p-4 border border-gray-700"
            >
              <div>
                <p className="text-white font-medium">{item.description}</p>
                <p className="text-xs text-gray-400">{formatRelativeTime(item.timestamp)}</p>
              </div>
              <div className="flex space-x-2 text-red-500">
                <FireOutlined className="cursor-pointer" />
                <HeartOutlined className="cursor-pointer" />
                <LikeOutlined className="cursor-pointer" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
