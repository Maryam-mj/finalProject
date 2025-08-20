import React from "react";
import { BookOpen } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black text-white py-16">
      <div className="container mx-auto max-w-7xl px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-8">
          <div className="space-y-6 px-2 md:px-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold">StudyBuddy</span>
            </div>
            <p className="text-white/80 leading-relaxed max-w-md">
              Connecting students worldwide to make learning more engaging, collaborative, and successful.
            </p>
          </div>

          {/* Platform Links */}
          <div className="px-2 md:px-0">
            <h4 className="font-semibold mb-5">Platform</h4>
            <ul className="space-y-3 text-white/80">
              {["Find Buddies", "Study Groups", "Progress Tracking", "Challenges"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-red-600 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div className="px-2 md:px-0">
            <h4 className="font-semibold mb-5">Resources</h4>
            <ul className="space-y-3 text-white/80">
              {["Study Tips", "Help Center", "Community", "Blog"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-red-600 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="px-2 md:px-0">
            <h4 className="font-semibold mb-5">Company</h4>
            <ul className="space-y-3 text-white/80">
              {["About Us", "Careers", "Privacy", "Terms"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-red-600 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-white/60">
          <p>
            &copy; 2024 StudyBuddy. All rights reserved. Made with ❤️ for students worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
