import React from "react";

const CheckIcon = () => (
  <svg
    className="w-6 h-6 flex-shrink-0 text-red-600 mr-4 mt-1"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const Features = () => (
  <section
    aria-labelledby="features-title"
    className="pt-16 min-h-screen overflow-hidden bg-black"
  >
    <div className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-white">
        <header className="text-center mb-16">
          <h1
            id="features-title"
            className="text-4xl md:text-5xl font-extrabold mb-6"
          >
            Features That Make Learning{" "}
            <span className="block text-red-600">Fun & Effective</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-400">
            We've reimagined developer collaboration with gamification,
            interactive tools, and community-driven learning.
          </p>
        </header>

        {/* Smart Matching Feature */}
        <article
          aria-labelledby="smart-matching-title"
          className="grid lg:grid-cols-2 gap-12 mb-20"
        >
          <div>
            <h2
              id="smart-matching-title"
              className="text-2xl font-bold flex items-center mb-6 text-white"
            >
              <span className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center mr-4 text-2xl">
                🎯
              </span>
              Smart Matching
            </h2>
            <p className="mb-6 text-gray-400">
              Our advanced algorithm analyzes your coding style, learning pace,
              and project interests to find your perfect match.
            </p>

            <div className="space-y-4">
              {[
                "Personality & learning style assessment",
                "Skill gap analysis for complementary pairing",
                "Availability and timezone synchronization",
                "Interest-based project matching",
              ].map((item, index) => (
                <div key={index} className="flex items-start text-white">
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-xl bg-gray-900 border border-red-600">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-3">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <span className="font-medium text-white">Try our matching quiz!</span>
              </div>
              <p className="text-sm text-gray-400">
                Take our 2-minute quiz to find your ideal coding partner.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-800 to-black transform rotate-3 transition-all duration-500"></div>
            <img
              src="https://img.freepik.com/premium-photo/young-student-looking-book-library_1057389-83071.jpg?w=360"
              alt="Young student studying in a library"
              className="relative rounded-2xl shadow-xl"
              style={{ filter: "brightness(0.75)" }}
            />
          </div>
        </article>

        {/* Gamified Learning Feature */}
        <article
          aria-labelledby="gamified-learning-title"
          className="grid lg:grid-cols-2 gap-12 mb-20"
        >
          <div className="relative order-2 lg:order-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-800 to-black transform -rotate-3 transition-all duration-500"></div>
            <img
              src="https://placehold.co/600x400/000000/ff0000?text=Gamified+Learning"
              alt="Gamified learning interface with badges and leaderboards"
              className="relative rounded-2xl shadow-xl"
              style={{ filter: "brightness(0.75)" }}
            />
          </div>

          <div className="p-8 rounded-2xl bg-gray-900 border border-red-600 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 order-1 lg:order-2">
            <h2
              id="gamified-learning-title"
              className="text-2xl font-bold flex items-center mb-6 text-white"
            >
              <span className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center mr-4 text-2xl">
                🎮
              </span>
              Gamified Learning
            </h2>
            <p className="mb-6 text-gray-400">
              Level up your skills by earning badges, completing achievements,
              and competing in friendly coding challenges with your buddy.
            </p>

            <div className="space-y-4 text-white">
              {[
                "Daily and weekly coding challenges",
                "Achievements and badges for progress",
                "Leaderboards to track your ranking",
                "Buddy goals and milestones",
              ].map((item, index) => (
                <div key={index} className="flex items-start">
                  <CheckIcon />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-xl bg-gray-900 border border-red-600">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center mr-3">
                  <span className="text-xl text-white" aria-hidden="true">
                    🏆
                  </span>
                </div>
                <span className="font-medium text-white">Join a Challenge!</span>
              </div>
              <p className="text-sm text-gray-400">
                See the current challenges and team up with your buddy.
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
);

export default Features;
