import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

// ── helpers ──────────────────────────────────────────────────────────────────
const COOKIE_KEYS = ["userToken", "userName", "userEmail", "UserId", "likedJobs"];

function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function removeCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ── provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // initialise from cookies (or fall back to localStorage for existing sessions)
    const token =
      getCookie("userToken") || localStorage.getItem("userToken");
    const name =
      getCookie("userName") || localStorage.getItem("userName");
    const email =
      getCookie("userEmail") || localStorage.getItem("userEmail");
    const userId =
      getCookie("UserId") || localStorage.getItem("UserId");
    const likedJobsRaw =
      getCookie("likedJobs") || localStorage.getItem("likedJobs");

    if (!token) return null;

    // migrate from localStorage to cookie once
    if (!getCookie("userToken") && token) {
      setCookie("userToken", token);
      setCookie("userName", name || "");
      setCookie("userEmail", email || "");
      setCookie("UserId", userId || "");
      setCookie("likedJobs", likedJobsRaw || "[]");
    }

    return {
      token,
      name,
      email,
      userId,
      likedJobs: (() => {
        try { return JSON.parse(likedJobsRaw); } catch { return []; }
      })(),
    };
  });

  // keep localStorage in sync (for pages that still read it directly)
  useEffect(() => {
    if (user) {
      localStorage.setItem("userToken", user.token || "");
      localStorage.setItem("userName", user.name || "");
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("UserId", user.userId || "");
      localStorage.setItem("likedJobs", JSON.stringify(user.likedJobs || []));
    } else {
      ["userToken", "userName", "userEmail", "UserId", "likedJobs"].forEach((k) =>
        localStorage.removeItem(k)
      );
    }
  }, [user]);

  // called from Login component after successful API response
  const login = ({ token, name, email, userId, likedJobs }) => {
    const data = { token, name, email, userId, likedJobs: likedJobs || [] };
    setCookie("userToken", token);
    setCookie("userName", name || "");
    setCookie("userEmail", email || "");
    setCookie("UserId", userId || "");
    setCookie("likedJobs", JSON.stringify(likedJobs || []));
    setUser(data);
  };

  // called from Navbar logout handler
  const logout = () => {
    COOKIE_KEYS.forEach(removeCookie);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// convenience hook
export const useAuth = () => useContext(AuthContext);
