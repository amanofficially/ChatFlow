import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

// In production, VITE_SERVER_URL points to the Render backend.
// In dev, requests go to "/" and Vite's proxy forwards /api → localhost:5000.
axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : "/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start loading=false if we already have a saved user — no spinner needed
  // FIX: If token+user exist in localStorage, start loading=true so ProtectedRoute
  // shows a spinner instead of instantly redirecting to /auth before useEffect runs.
  // Without this, refresh always logs the user out.
  const [loading, setLoading] = useState(() => {
    try {
      const token = localStorage.getItem("chat_token");
      const savedUser = localStorage.getItem("chat_user");
      if (token && savedUser) {
        return true; // Hold ProtectedRoute until we've restored the user
      }
    } catch {}
    return false; // No token = go to auth page immediately, no spinner
  });

  const setAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("chat_token");
    const savedUser = localStorage.getItem("chat_user");

    if (token && savedUser) {
      // Set user immediately from cache — no loading delay
      setAuthHeader(token);
      try {
        setUser(JSON.parse(savedUser));
        setLoading(false); // FIX: user restored — stop blocking ProtectedRoute
      } catch {
        localStorage.removeItem("chat_user");
        localStorage.removeItem("chat_token");
        setAuthHeader(null);
        setLoading(false);
        return;
      }

      // Silently verify token in background — if expired, log out
      axios
        .get("/auth/me")
        .then(({ data }) => {
          // Update with fresh server data (e.g. updated avatar/bio)
          setUser(data.user);
          localStorage.setItem("chat_user", JSON.stringify(data.user));
          setLoading(false);
        })
        .catch(() => {
          // Token expired or invalid — clear and redirect to login
          setUser(null);
          setAuthHeader(null);
          localStorage.removeItem("chat_user");
          localStorage.removeItem("chat_token");
          setLoading(false);
        });
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await axios.post("/auth/login", { email, password });
    setUser(data.user);
    setAuthHeader(data.token);
    localStorage.setItem("chat_token", data.token);
    localStorage.setItem("chat_user", JSON.stringify(data.user));
    return data;
  };

  const signup = async (username, email, password, mobile = "") => {
    const { data } = await axios.post("/auth/signup", {
      username,
      email,
      password,
      mobile,
    });
    setUser(data.user);
    setAuthHeader(data.token);
    localStorage.setItem("chat_token", data.token);
    localStorage.setItem("chat_user", JSON.stringify(data.user));
    return data;
  };

  const logout = async () => {
    setUser(null);
    setAuthHeader(null);
    localStorage.removeItem("chat_token");
    localStorage.removeItem("chat_user");
    // Replace history so back button cannot re-enter the chat
    window.history.replaceState(null, "", "/auth");
  };

  const updateProfile = async (updates) => {
    const { data } = await axios.put("/auth/profile", updates);
    setUser(data.user);
    localStorage.setItem("chat_user", JSON.stringify(data.user));
    return data;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
