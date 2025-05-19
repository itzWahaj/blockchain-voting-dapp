import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import AdminDashboard from "./pages/AdminDashboard";
import RegisterPage from "./pages/RegisterPage";
import VotingPage from "./pages/VotingPage";
import ResultPage from "./pages/ResultPage";
import WalletConnector from "./components/WalletConnector";
import PageWrapper from "./components/PageWrapper";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      {/* ⛳️ Enhanced Navigation Bar */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 py-4 px-6 flex flex-col md:flex-row items-center justify-between fixed w-full top-0 z-50 transition-all duration-500">
        {/* 🌟 Centered Navigation Links */}
        <div className="flex-1 flex justify-center order-2 md:order-1 mt-4 md:mt-0">
          <div className="flex space-x-2 md:space-x-6 font-medium">
            {["register", "vote", "results", "admin"].map((path) => (
              <NavLink
                to={`/${path}`}
                end
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`
          px-3 py-2 text-sm md:text-base transition-all duration-300
          ${isActive
                          ? "text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-300"
                        }
        `}
                    >
                      {path.charAt(0).toUpperCase() + path.slice(1)}
                    </span>
                    <span
                      className={`
          absolute left-0 -bottom-1 h-0.5 bg-blue-500 dark:bg-blue-400
          transition-all duration-300
          ${isActive ? "w-full" : "w-0"}
        `}
                    />
                  </>
                )}
              </NavLink>

            ))}
          </div>
        </div>

        {/* 👛 Right-aligned Wallet + Theme */}
        <div className="order-1 md:order-2 flex items-center space-x-4 w-full md:w-auto justify-between md:justify-normal">
          <WalletConnector />

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="
              bg-white dark:bg-gray-800 p-2 rounded-lg
              border border-gray-200 dark:border-gray-700
              hover:scale-105 hover:shadow-sm
              transition-all duration-300
              shadow-sm
            "
            title="Toggle Theme"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5 text-yellow-400 hover:text-yellow-500" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-600 hover:text-gray-800 dark:text-gray-300" />
            )}
          </button>
        </div>
      </nav>

      {/* 🎯 Routes */}
      <div className="mt-20"> {/* Add margin to account for fixed navbar */}
        <Routes>
          <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
          <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
          <Route path="/vote" element={<PageWrapper><VotingPage /></PageWrapper>} />
          <Route path="/results" element={<PageWrapper><ResultPage /></PageWrapper>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
