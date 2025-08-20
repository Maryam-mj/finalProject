import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-24 flex-grow flex flex-col justify-center">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold">
            Welcome to <span className="text-red-600">BuddySystem</span>
          </h2>
          <p className="text-lg text-gray-400">
            Find your perfect study partner, join study groups, and boost your learning journey together.
            Collaborate through chat, share notes, and track your progress with ease.
          </p>
          <button
            className="mt-6 px-8 py-3 rounded-xl font-semibold text-black bg-red-600 hover:bg-red-700 transition"
            onClick={() => navigate("/signup")}
          >
            Get Started
          </button>
        </section>

        {/* Features Section */}
        <section className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-5xl mx-auto">
          {[
            {
              emoji: "🤝",
              title: "Connect with Buddies",
              desc: "Match with students who share your subjects and study habits.",
            },
            {
              emoji: "💬",
              title: "Collaborate Effortlessly",
              desc: "Chat, share notes, and work on study sessions together in real-time.",
            },
            {
              emoji: "📈",
              title: "Track Your Progress",
              desc: "Set goals and stay motivated with daily challenges and progress tracking.",
            },
          ].map(({ emoji, title, desc }) => (
            <article
              key={title}
              className="p-6 rounded-2xl bg-gray-900 border border-red-600 hover:shadow-2xl transition-shadow duration-300"
            >
              <h3 className="flex items-center text-2xl font-bold mb-4">
                <span className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center mr-4 text-3xl">
                  {emoji}
                </span>
                {title}
              </h3>
              <p className="text-gray-400">{desc}</p>
            </article>
          ))}
        </section>

        {/* How It Works */}
        <section className="mt-32 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-10">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-gray-300">
            {[
              {
                step: "1",
                title: "Create Your Profile",
                desc: "Tell us about your subjects, study habits, and goals to find the best matches.",
              },
              {
                step: "2",
                title: "Find & Connect",
                desc: "Browse recommended buddies or join study groups that fit your interests.",
              },
              {
                step: "3",
                title: "Study & Succeed",
                desc: "Use chat, share notes, and track your progress to level up your learning.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-gray-900 p-6 rounded-2xl border border-red-600">
                <div className="w-14 h-14 rounded-full bg-red-600 text-black flex items-center justify-center text-xl font-bold mb-4 mx-auto">
                  {step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-32 max-w-4xl mx-auto text-white">
          <h2 className="text-3xl font-extrabold mb-10 text-center">Frequently Asked Questions</h2>
          <dl className="space-y-6 text-gray-300">
            <div>
              <dt className="font-semibold text-lg mb-2">Is BuddySystem free to use?</dt>
              <dd>Yes! Our platform is completely free for students and educators.</dd>
            </div>
            <div>
              <dt className="font-semibold text-lg mb-2">Can I join multiple study groups?</dt>
              <dd>Absolutely! You can join as many groups as you like based on your interests.</dd>
            </div>
            <div>
              <dt className="font-semibold text-lg mb-2">How do I track my progress?</dt>
              <dd>BuddySystem offers goal setting and progress tracking features visible on your dashboard.</dd>
            </div>
          </dl>
        </section>

        {/* Our Mission */}
        <section className="mt-32 max-w-3xl mx-auto bg-gray-900 border border-red-600 rounded-2xl p-10 text-center text-gray-300">
          <h2 className="text-3xl font-extrabold mb-6 text-red-600">Our Mission</h2>
          <p>
            At BuddySystem, we believe collaboration is the key to effective learning. Our mission is to
            connect students across disciplines to empower each other through shared knowledge, support,
            and motivation. Together, we make studying more engaging and successful.
          </p>
        </section>
      </div>
    </main>
  );
};

export default Home;
