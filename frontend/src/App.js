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

  const [reduceMotion, setReduceMotion] = useState(() => {
    return localStorage.getItem("reduceMotion") === "true";
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

    if (reduceMotion) {
      root.classList.add("motion-reduce");
      localStorage.setItem("reduceMotion", "true");
    } else {
      root.classList.remove("motion-reduce");
      localStorage.setItem("reduceMotion", "false");
    }
  }, [darkMode, reduceMotion]);

  return (
    <BrowserRouter basename="/blockchain-voting-dapp">
      {/* ⛳️ Enhanced Navigation Bar */}
      <nav className="bg-surface/90 dark:bg-black/90 backdrop-blur-md border-b border-white/5 dark:border-white/5 border-black/5 py-4 px-6 flex flex-col md:flex-row items-center justify-between fixed w-full top-0 z-50 transition-all duration-500">
        {/* 🌟 Centered Navigation Links */}
        <div className="flex-1 flex justify-center order-2 md:order-1 mt-4 md:mt-0">
          <div className="flex space-x-2 md:space-x-8 font-headline tracking-widest">
            {["register", "vote", "results", "admin"].map((path) => (
              <NavLink
                to={`/${path}`}
                end
                key={path}
              >
                {({ isActive }) => (
                  <div className="relative group">
                    <span
                      className={`
          px-3 py-2 text-sm md:text-base transition-all duration-300 uppercase
          ${isActive
                          ? "text-accent font-bold drop-shadow-[0_0_8px_rgba(199,58,49,0.5)]"
                          : "text-text/60 hover:text-text dark:text-gray-400 dark:hover:text-white"
                        }
        `}
                    >
                      {path}
                    </span>
                    <span
                      className={`
          absolute left-0 -bottom-1 h-0.5 bg-accent
          transition-all duration-300
          ${isActive ? "w-full shadow-[0_0_10px_rgba(199,58,49,0.8)]" : "w-0 group-hover:w-1/2"}
        `}
                    />
                  </div>
                )}
              </NavLink>

            ))}
          </div>
        </div>

        {/* 👛 Right-aligned Wallet + Theme */}
        <div className="order-1 md:order-2 flex items-center space-x-4 w-full md:w-auto justify-between md:justify-normal">
          <WalletConnector />

          <button
            onClick={() => setReduceMotion(!reduceMotion)}
            className="
              bg-white/5 dark:bg-white/5 bg-black/5 p-2 rounded-lg
              border border-white/10 dark:border-white/10 border-black/10
              hover:bg-black/10 dark:hover:bg-white/10 hover:border-accent/50
              transition-all duration-300
              shadow-sm group
            "
            title="Toggle Motion"
          >
            <span className={`text-xs font-bold ${reduceMotion ? "text-accent" : "text-text/60 group-hover:text-text"}`}>
              {reduceMotion ? "M-OFF" : "M-ON"}
            </span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="
              bg-white/5 dark:bg-white/5 bg-black/5 p-2 rounded-lg
              border border-white/10 dark:border-white/10 border-black/10
              hover:bg-black/10 dark:hover:bg-white/10 hover:border-accent/50
              transition-all duration-300
              shadow-sm group
            "
            title="Toggle Theme"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5 text-secondary group-hover:rotate-180 transition-transform duration-500" />
            ) : (
              <MoonIcon className="h-5 w-5 text-text/60 group-hover:text-text" />
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
