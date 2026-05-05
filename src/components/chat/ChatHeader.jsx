import { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft, X, Mail, User, Phone, PhoneCall, Video,
  MoreVertical, Trash2, Info, Copy,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import useChatStore from "../../context/chatStore";
import { formatLastSeen } from "../../utils/helpers";
import { ConfirmModal } from "./MessageBubble";
import toast from "react-hot-toast";
import axios from "axios";

/* ── Info row ── */
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
      <Icon size={15} className="mt-1 text-[var(--text-muted)] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-medium text-[var(--text-primary)] break-words">{value}</p>
      </div>
    </div>
  );
}

/* ── Contact info modal ── */
function ChatInfoPanel({ other, isOnline, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="card w-full max-w-md rounded-2xl p-5 sm:p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Contact Info</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition" style={{ touchAction: "manipulation" }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col items-center text-center gap-3 mb-5">
          <Avatar user={other} size="xl" showStatus={false} />
          <div className="w-full">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">{other.username || "Unknown"}</h3>
            <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${isOnline ? "bg-green-500/10 text-green-500" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"}`}>
              {isOnline ? "Online" : formatLastSeen(other.lastSeen)}
            </span>
          </div>
        </div>
        <div className="space-y-2 mb-5">
          <InfoRow icon={Mail} label="Email" value={other.email || "Not set"} />
          <InfoRow icon={Phone} label="Mobile" value={other.mobile || "Not set"} />
          <InfoRow icon={User} label="Bio" value={other.bio || "Hey! I'm using ChatFlow"} />
        </div>
        <button onClick={onClose} className="w-full btn-primary" style={{ touchAction: "manipulation" }}>Close</button>
      </div>
    </div>
  );
}

/* ── Typing dots ── */
function TypingStatus() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1 h-1 rounded-full bg-[var(--brand)]"
            style={{ animation: "typingBounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      <span className="text-[11px] text-[var(--brand)] font-medium tracking-wide">typing</span>
    </span>
  );
}

/* ── ChatHeader ── */
export default function ChatHeader({
  conversation, onBack,
  selectionMode = false, selectedMessages = [], selectedIds = [],
  onCancelSelection, onDeleteSelected, onCopySelected,
}) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const typingUsers = useChatStore((s) => s.typingUsers);

  const [showInfo, setShowInfo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const menuRef = useRef(null);

  const other = useMemo(
    () => conversation?.participants?.find((p) => p._id !== user?._id) || {},
    [conversation, user],
  );

  const isOnline = onlineUsers.includes(other._id);
  const isOtherTyping = (typingUsers[conversation?._id] || []).some(
    (id) => id !== user?._id?.toString(),
  );

  const selCount = selectedIds.length;
  const canCopy = selCount > 0 && selectedMessages.every((m) => m.type === "text");

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  const handleDemoCall = (type) => {
    toast.success(type === "voice"
      ? `Calling ${other.username || "user"}…`
      : `Starting video call with ${other.username || "user"}…`);
  };

  const handleDeleteChat = async () => {
    setConfirmDeleteChat(false);
    try {
      await axios.delete(`/conversations/${conversation._id}`);
      useChatStore.setState((s) => ({
        conversations: s.conversations.filter((c) => c._id !== conversation._id),
        activeConversation: null,
      }));
      toast.success("Chat deleted");
    } catch {
      toast.error("Could not delete chat");
    }
  };

  const handleCopySelected = () => {
    const text = selectedMessages.filter((m) => m.type === "text").map((m) => m.content).join("\n");
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`Copied ${selCount} message${selCount !== 1 ? "s" : ""}`))
      .catch(() => toast.error("Copy failed"));
    onCopySelected?.();
  };

  // ── Selection toolbar ──────────────────────────────────────────────────────
  if (selectionMode) {
    return (
      <>
        {confirmDeleteSelected && (
          <ConfirmModal
            title={`Delete ${selCount} message${selCount !== 1 ? "s" : ""}?`}
            body="Selected messages will be permanently deleted."
            onConfirm={() => { setConfirmDeleteSelected(false); onDeleteSelected?.(); }}
            onCancel={() => setConfirmDeleteSelected(false)}
          />
        )}
        <header
          className="h-[60px] sm:h-16 px-2 sm:px-4 border-b border-[var(--brand)]/30 flex items-center justify-between flex-shrink-0"
          style={{ background: "var(--bg-secondary)", animation: "slide-down 0.18s ease" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onCancelSelection}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition active:scale-90"
              style={{ touchAction: "manipulation" }}
            >
              <X size={20} />
            </button>
            <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {selCount} selected
            </span>
          </div>
          <div className="flex items-center gap-1">
            {canCopy && (
              <button
                onClick={handleCopySelected}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand)]/10 transition active:scale-95"
                style={{ touchAction: "manipulation" }}
              >
                <Copy size={16} />
                <span className="hidden sm:inline">Copy</span>
              </button>
            )}
            <button
              onClick={() => setConfirmDeleteSelected(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition active:scale-95"
              style={{ touchAction: "manipulation" }}
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </header>
      </>
    );
  }

  // ── Normal header ──────────────────────────────────────────────────────────
  return (
    <>
      {showInfo && <ChatInfoPanel other={other} isOnline={isOnline} onClose={() => setShowInfo(false)} />}
      {confirmDeleteChat && (
        <ConfirmModal
          title="Delete conversation?"
          body={`Your chat with ${other.username || "this user"} will be permanently removed.`}
          onConfirm={handleDeleteChat}
          onCancel={() => setConfirmDeleteChat(false)}
        />
      )}

      <header className="h-[60px] sm:h-16 px-2 sm:px-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] flex-shrink-0 transition active:scale-90"
            style={{ touchAction: "manipulation" }}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90 transition py-1"
            style={{ touchAction: "manipulation" }}
          >
            <Avatar user={other} size="sm" showStatus isOnline={isOnline} />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[var(--text-primary)] text-sm truncate leading-tight">
                {other.username || "Unknown"}
              </h2>
              <div className="flex items-center h-4 mt-0.5">
                {isOtherTyping ? (
                  <TypingStatus />
                ) : (
                  <p className={`text-[11px] truncate font-medium ${isOnline ? "text-green-400" : "text-[var(--text-muted)]"}`}>
                    {isOnline ? "Online" : formatLastSeen(other.lastSeen)}
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
          <button
            onClick={() => handleDemoCall("voice")}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition active:scale-90"
            style={{ touchAction: "manipulation" }} title="Voice call"
          >
            <PhoneCall size={17} />
          </button>
          <button
            onClick={() => handleDemoCall("video")}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition active:scale-90"
            style={{ touchAction: "manipulation" }} title="Video call"
          >
            <Video size={17} />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90
                ${menuOpen ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`}
              style={{ touchAction: "manipulation" }} title="More"
            >
              <MoreVertical size={17} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 min-w-[175px] rounded-2xl overflow-hidden shadow-xl border border-[var(--border)] bg-[var(--bg-secondary)] py-1 z-50"
                style={{ animation: "slide-up 0.12s ease" }}
              >
                <button
                  onClick={() => { setShowInfo(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                  style={{ touchAction: "manipulation" }}
                >
                  <Info size={15} className="text-[var(--text-muted)]" />
                  Profile info
                </button>
                <div className="my-1 border-t border-[var(--border)] mx-3" />
                <button
                  onClick={() => { setConfirmDeleteChat(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  style={{ touchAction: "manipulation" }}
                >
                  <Trash2 size={15} />
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
