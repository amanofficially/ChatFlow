import { useState } from "react";
import { useAuth, DEMO_CREDENTIALS } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  MessageCircle,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
} from "lucide-react";
import ThemeToggle from "../components/ui/ThemeToggle";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        if (!form.username.trim()) {
          toast.error("Username is required");
          setLoading(false);
          return;
        }
        await signup(form.username, form.email, form.password);
      }
      toast.success("Welcome to ChatFlow! 🎉");
      navigate("/chat");
    } catch (err) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
      toast.success("Demo login successful! 🚀");
      navigate("/chat");
    } catch {
      toast.error("Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[80px]" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-brand-400/30 animate-pulse-soft"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-2 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow mb-2">
            <MessageCircle size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] font-display tracking-tight">
            ChatFlow
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm">
            {mode === "login"
              ? "Welcome back! Ready to connect?"
              : "Join thousands of people connecting daily"}
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 animate-bounce-in">
          {/* Demo login banner */}
          <div
            onClick={handleDemoLogin}
            className="mb-5 p-3.5 rounded-xl border border-brand-500/30 bg-brand-500/5 
                       flex items-center gap-3 cursor-pointer hover:bg-brand-500/10 
                       transition-all duration-200 active:scale-[0.98] group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-glow">
              <Zap size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Try Demo Mode
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Instant access — no signup needed
              </p>
            </div>
            <span className="text-xs font-bold text-brand-500 group-hover:translate-x-0.5 transition-transform">
              Enter →
            </span>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-[var(--bg-tertiary)] rounded-xl p-1 mb-6">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold capitalize transition-all duration-200
                            ${
                              mode === m
                                ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                            }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative animate-slide-up">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  name="username"
                  type="text"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  className="input-field pl-10"
                  autoComplete="username"
                />
              </div>
            )}

            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                name="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                required
                className="input-field pl-10"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="input-field pl-10 pr-10"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Use any email & password to sign in</span>
                <button
                  type="button"
                  className="text-brand-500 hover:text-brand-400 transition-colors"
                >
                  Forgot?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} />
                  {mode === "login" ? "Sign In" : "Create Account"}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">
              or continue with
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                className="flex items-center justify-center gap-2 border border-[var(--border)] bg-[var(--bg-tertiary)] hover:bg-[var(--border)] rounded-xl py-2.5 px-4 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 active:scale-95"
                onClick={() => toast("OAuth coming soon!", { icon: "🔔" })}
              >
                <span className="text-base">
                  {provider === "Google" ? "🔵" : "⚫"}
                </span>
                {provider}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center mt-2 text-sm text-[var(--text-muted)]">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-brand-500 hover:text-brand-400 font-semibold transition-colors"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
