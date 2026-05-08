import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--brand), var(--accent))",
              animation: "bounce-in 0.4s ease-out both",
              boxShadow: "0 0 24px color-mix(in srgb, var(--brand) 40%, transparent)",
            }}
          >
            <span className="text-white text-2xl">💬</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--brand)",
                  animation: "typingBounce 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated — replace history so back button can't return to protected page
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}
