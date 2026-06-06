// src/context/ThemeContext.jsx
// Central dark-mode context.
// - Persists choice in localStorage
// - Applies the "dark" class to <html> (Tailwind darkMode: "class")
// - Detects OS preference on first visit

import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Saved preference
    const saved = localStorage.getItem("pyonea-theme");
    if (saved === "dark" || saved === "light") return saved;
    // 2. OS preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const isDark = theme === "dark";

  // Apply class to <html> every time theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("pyonea-theme", theme);
  }, [theme, isDark]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const setLight    = () => setTheme("light");
  const setDark     = () => setTheme("dark");

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setLight, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};