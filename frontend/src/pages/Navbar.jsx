import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-black text-white p-8 shadow-md italic">
      <nav className="container max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="text-4xl font-bold text-red-600 tracking-wide select-none">
          StudyBuddy🎓
        </div>
 
        {/* Navigation Links */}
        <ul className="flex space-x-8 items-center text-l">
          <li>
            <Link
              to="/"
              className="text-red-600 transition-colors duration-200"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/features"
              className="hover:text-red-600 transition-colors duration-200"
            >
              Features
            </Link>
          </li>

          {/* Signup Dropdown */}
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              className="hover:text-red-600 font-medium transition-colors duration-200 px-2 focus:outline-none"
            >
              Signup
            </button>

            {dropdownOpen && (
              <ul className="absolute top-full left-0 mt-2  rounded-lg overflow-hidden min-w-[140px] z-50">
                <li>
                  <Link
                    to="/adminlogin"
                    className="block px-4 py-2 text-white hover:bg-red-700 hover:text-black transition-colors duration-200"
                  >
                    Admin
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="block px-4 py-2 text-white hover:bg-red-700 hover:text-black transition-colors duration-200"
                  >
                    Buddy
                  </Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;
