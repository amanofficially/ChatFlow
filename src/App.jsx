import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SoundProvider } from "./context/SoundContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import InAppNotifications from "./components/ui/InAppNotifications";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SoundProvider>
          <SocketProvider>
            <NotificationProvider>
              <div className="h-full flex flex-col">
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/chat"
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                  <Route path="*" element={<Navigate to="/chat" replace />} />
                </Routes>
              </div>

              {/* In-app notifications overlay */}
              <InAppNotifications />

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 1000,
                  style: {
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "Sora, sans-serif",
                    boxShadow: "var(--shadow-md)",
                  },
                  success: {
                    iconTheme: { primary: "#6366f1", secondary: "#fff" },
                  },
                }}
              />
            </NotificationProvider>
          </SocketProvider>
        </SoundProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
