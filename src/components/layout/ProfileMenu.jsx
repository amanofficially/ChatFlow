import { useState, useRef, useEffect } from "react";
import {
  LogOut,
  Settings,
  User,
  ChevronUp,
  Wifi,
  WifiOff,
  X,
  Camera,
  Bell,
  Moon,
  Sun,
  Shield,
  Trash2,
  Check,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// ── PROFILE MODAL ─────────────────────────────────────────────────────────────
function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    bio: user?.bio || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    setSaving(true);
    await updateProfile(form);
    toast.success("Profile updated!");
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar user={user} size="xl" />
            <button
              onClick={() => toast("Photo upload — connect backend! 📸")}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg hover:bg-brand-600 transition-colors"
            >
              <Camera size={13} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Tap to change photo
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
              Username
            </label>
            <input
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              className="input-field"
              placeholder="Your username"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="input-field"
              placeholder="your@email.com"
              type="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="input-field resize-none"
              placeholder="Tell something about yourself..."
              rows={2}
              maxLength={100}
            />
            <p className="text-xs text-[var(--text-muted)] text-right mt-0.5">
              {form.bio.length}/100
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 btn-ghost border border-[var(--border)] py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check size={15} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS MODAL ────────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const { theme, toggleTheme } = useTheme();
  const [notifs, setNotifs] = useState(
    () => localStorage.getItem("cf-notifs") !== "false",
  );
  const [sounds, setSounds] = useState(
    () => localStorage.getItem("cf-sounds") !== "false",
  );
  const [enterSend, setEnterSend] = useState(
    () => localStorage.getItem("cf-enter-send") !== "false",
  );

  const toggle = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, val);
    toast.success(`Setting ${val ? "enabled" : "disabled"}`);
  };

  const ToggleRow = ({ label, desc, value, onToggle, icon: Icon }) => (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-brand-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${value ? "bg-brand-500" : "bg-[var(--border)]"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${value ? "left-5" : "left-0.5"}`}
        />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Appearance
        </p>
        <div className="border-b border-[var(--border)] pb-3 mb-3">
          <ToggleRow
            label="Dark Mode"
            desc={theme === "dark" ? "Currently dark" : "Currently light"}
            value={theme === "dark"}
            onToggle={toggleTheme}
            icon={theme === "dark" ? Moon : Sun}
          />
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Notifications
        </p>
        <div className="mb-3">
          <ToggleRow
            label="Push Notifications"
            desc="Get notified for new messages"
            value={notifs}
            onToggle={() => toggle("cf-notifs", !notifs, setNotifs)}
            icon={Bell}
          />
          <ToggleRow
            label="Message Sounds"
            desc="Play sound on new message"
            value={sounds}
            onToggle={() => toggle("cf-sounds", !sounds, setSounds)}
            icon={Bell}
          />
        </div>

        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Chat
        </p>
        <ToggleRow
          label="Enter to Send"
          desc="Press Enter to send messages"
          value={enterSend}
          onToggle={() => toggle("cf-enter-send", !enterSend, setEnterSend)}
          icon={Shield}
        />

        <button onClick={onClose} className="w-full btn-primary mt-5">
          Done
        </button>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <div ref={ref} className="p-3 border-t border-[var(--border)] relative">
        {open && (
          <div className="absolute bottom-full left-3 right-3 mb-2 card py-1.5 animate-slide-up z-50">
            <button
              onClick={() => {
                setOpen(false);
                setShowProfile(true);
              }}
              className="sidebar-item w-full text-left gap-3 text-sm"
            >
              <User size={16} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">View Profile</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setShowSettings(true);
              }}
              className="sidebar-item w-full text-left gap-3 text-sm"
            >
              <Settings size={16} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">Settings</span>
            </button>
            <div className="mx-3 my-1 h-px bg-[var(--border)]" />
            <button
              onClick={handleLogout}
              className="sidebar-item w-full text-left gap-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 w-full rounded-xl px-2.5 py-2 hover:bg-[var(--bg-tertiary)] transition-all duration-200 group"
        >
          <Avatar user={user} size="sm" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {user?.username}
            </p>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi size={11} className="text-green-400" />
              ) : (
                <WifiOff size={11} className="text-[var(--text-muted)]" />
              )}
              <span className="text-[11px] text-[var(--text-muted)]">
                {isConnected ? "Online" : "Connecting..."}
              </span>
            </div>
          </div>
          <ChevronUp
            size={15}
            className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </>
  );
}
