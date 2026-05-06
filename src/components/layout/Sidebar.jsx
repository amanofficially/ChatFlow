import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Plus, X, Zap, Trash2, MessageSquare } from "lucide-react";
import Avatar from "../ui/Avatar";
import ThemeToggle from "../ui/ThemeToggle";
import SoundToggle from "../ui/SoundToggle";
import { SkeletonConversation } from "../ui/Skeleton";
import useChatStore from "../../context/chatStore";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { formatConversationTime } from "../../utils/helpers";
import { useNotifications } from "../../context/NotificationContext";
import toast from "react-hot-toast";
import ProfileMenu from "./ProfileMenu";
import axios from "axios";

/* ── Delete Confirm Modal ── */
function DeleteModal({ username, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 shadow-2xl"
        style={{ animation: "slideUp 0.2s ease" }}
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-400" />
        </div>

        <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">
          Delete conversation?
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">
          Your chat with <span className="font-semibold text-[var(--text-secondary)]">{username}</span> and all messages will be permanently removed.
        </p>

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl text-sm font-medium border border-[var(--border)]
              text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl text-sm font-semibold
              bg-red-500 hover:bg-red-600 text-white transition-colors active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Single conversation row with swipe-reveal delete ── */
function ConvItem({ conv, other, isActive, isOnline, isTyping, unread, onOpen, onDelete, prefetch }) {
  const [swiped, setSwiped] = useState(false);
  const touchStartX = useRef(null);
  const holdTimer = useRef(null);
  const itemRef = useRef(null);

  // Close swipe when another item opens
  useEffect(() => {
    const close = () => setSwiped(false);
    document.addEventListener("conv-swipe-reset", close);
    return () => document.removeEventListener("conv-swipe-reset", close);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    holdTimer.current = setTimeout(() => {
      document.dispatchEvent(new Event("conv-swipe-reset"));
      setSwiped(true);
    }, 450);
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.touches[0].clientX;
    if (dx > 40) {
      clearTimeout(holdTimer.current);
      document.dispatchEvent(new Event("conv-swipe-reset"));
      setSwiped(true);
    } else if (dx < -10) {
      clearTimeout(holdTimer.current);
      setSwiped(false);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(holdTimer.current);
    touchStartX.current = null;
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    document.dispatchEvent(new Event("conv-swipe-reset"));
    setSwiped(true);
  };

  const handleClick = () => {
    if (swiped) { setSwiped(false); return; }
    onOpen();
  };

  return (
    <div
      ref={itemRef}
      className="relative mb-0.5 overflow-hidden rounded-2xl"
      onContextMenu={handleContextMenu}
    >
      {/* Delete action behind — revealed on swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center
          bg-red-500 rounded-2xl transition-all duration-200"
        style={{ width: swiped ? "72px" : "0px", minWidth: swiped ? "72px" : "0px" }}
      >
        {swiped && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-white"
          >
            <Trash2 size={17} strokeWidth={2} />
            <span className="text-[9px] font-semibold tracking-wide">DELETE</span>
          </button>
        )}
      </div>

      {/* Main row */}
      <button
        onClick={handleClick}
        onMouseEnter={() => !swiped && prefetch()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`conv-item w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl
          transition-all duration-200 relative
          ${isActive ? "conv-item-active" : "conv-item-hover"}`}
        style={{
          transform: swiped ? "translateX(-72px)" : "translateX(0)",
          transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[var(--brand)] opacity-80" />
        )}

        <Avatar user={other} size="md" showStatus isOnline={isOnline} />

        <div className="flex-1 text-left min-w-0">
          <div className="flex justify-between items-center gap-1 mb-0.5">
            <p className={`text-[13.5px] truncate leading-tight
              ${unread > 0 ? "font-bold text-[var(--text-primary)]" : "font-semibold text-[var(--text-primary)]"}`}>
              {other.username}
            </p>
            <span className={`text-[10px] flex-shrink-0 tabular-nums
              ${unread > 0 ? "text-[var(--brand)] font-semibold" : "text-[var(--text-muted)]"}`}>
              {conv.lastMessage?.createdAt ? formatConversationTime(conv.lastMessage.createdAt) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate leading-tight
              ${isTyping ? "text-[var(--brand)] font-medium italic"
                : unread > 0 ? "text-[var(--text-secondary)] font-medium"
                : "text-[var(--text-muted)]"}`}>
              {isTyping ? "typing…" :
                  conv.lastMessage?.type === "image" ? "📷 Image"
                  : conv.lastMessage?.type === "file" ? `📎 ${conv.lastMessage?.fileName || "File"}`
                  : conv.lastMessage?.content || "No messages yet"}
            </p>
            {unread > 0 && (
              <span className="conv-badge flex-shrink-0">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

export default function Sidebar({ onConversationSelect, onGoHome }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { dismissByConversation } = useNotifications();

  const conversations = useChatStore((s) => s.conversations);
  const loadingConversations = useChatStore((s) => s.loadingConversations);
  const activeConvId = useChatStore((s) => s.activeConversation?._id);
  const searchQuery = useChatStore((s) => s.searchQuery);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setSearchQuery = useChatStore((s) => s.setSearchQuery);
  const createConversation = useChatStore((s) => s.createConversation);
  const prefetchMessages = useChatStore((s) => s.prefetchMessages);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { convId, username }

  useEffect(() => {
    if (!userSearch.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get(`/users/search?q=${encodeURIComponent(userSearch)}`);
        setSearchResults(data.users);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const wasActive = useChatStore.getState().activeConversation?._id === deleteTarget.convId;
    try {
      await axios.delete(`/conversations/${deleteTarget.convId}`);
      useChatStore.setState((s) => ({
        conversations: s.conversations.filter((c) => c._id !== deleteTarget.convId),
        activeConversation: wasActive ? null : s.activeConversation,
      }));
      toast.success("Chat deleted");
      // FIX: redirect to sidebar/home on mobile when deleting the active chat
      if (wasActive) onGoHome?.();
    } catch {
      toast.error("Could not delete chat");
    }
    setDeleteTarget(null);
  };

  const startConversation = async (targetUser) => {
    try {
      const conv = await createConversation(targetUser._id);
      await setActiveConversation(conv);
      setShowNewChat(false);
      setUserSearch(""); setSearchResults([]);
      onConversationSelect?.();
    } catch { toast.error("Could not start conversation"); }
  };

  const openConversation = (conv) => {
    dismissByConversation(conv._id);
    setActiveConversation(conv);
    setShowNewChat(false);
    setUserSearch(""); setSearchResults([]);
    onConversationSelect?.();
  };

  const getOtherParticipant = useCallback(
    (conv) => conv.participants?.find((p) => p._id !== user?._id) || {},
    [user?._id],
  );

  const filteredConvos = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const other = getOtherParticipant(c);
      return other.username?.toLowerCase().includes(q) || other.mobile?.includes(searchQuery);
    });
  }, [conversations, searchQuery, getOtherParticipant]);

  return (
    <aside className="flex flex-col h-full w-full sidebar-glass border-r border-[var(--border)]">

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteModal
          username={deleteTarget.username}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── TOP HEADER ── */}
      <div className="sidebar-header px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onGoHome?.(); }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity active:scale-95 transition-transform"
              title="Home"
            >
            <div className="relative">
              <div className="sidebar-logo w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap size={16} className="text-white" strokeWidth={2.5} />
              </div>
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full
                  bg-[var(--accent)] text-white text-[9px] flex items-center justify-center font-bold
                  shadow-md ring-2 ring-[var(--bg-sidebar)]">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div>
              <span className="sidebar-brand-text font-bold text-[var(--text-primary)] text-[15px] tracking-tight">
                ChatFlow
              </span>
              {totalUnread > 0 && (
                <p className="text-[10px] text-[var(--text-muted)] leading-none mt-0.5">
                  {totalUnread} unread
                </p>
              )}
            </div>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SoundToggle />
            <button
              onClick={() => setShowNewChat((v) => !v)}
              className={`sidebar-icon-btn ${showNewChat ? "sidebar-icon-btn-active" : ""}`}
              title="New chat"
            >
              {showNewChat ? <X size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {!showNewChat && (
          <div className="sidebar-search-wrap relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="sidebar-search-input pl-9"
            />
          </div>
        )}
      </div>

      {/* ── NEW CHAT PANEL ── */}
      {showNewChat && (
        <div className="px-3 py-2 border-b border-[var(--border)] flex-shrink-0">
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">
            New conversation
          </p>
          <div className="sidebar-search-wrap relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="sidebar-search-input pl-9"
              autoFocus
            />
          </div>
          <div className="mt-1.5 space-y-0.5">
            {searching && <p className="text-xs text-[var(--text-muted)] text-center py-3">Searching…</p>}
            {!searching && userSearch && searchResults.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-3">No users found</p>
            )}
            {searchResults.map((u) => (
              <button
                key={u._id}
                onClick={() => startConversation(u)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl
                  hover:bg-[var(--bg-tertiary)] transition-colors text-left"
              >
                <Avatar user={u} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.username}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION LABEL ── */}
      {!showNewChat && !searchQuery && filteredConvos.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex-shrink-0 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Messages
          </span>
          <span className="text-[10px] text-[var(--text-muted)] hidden sm:block">
            ← swipe or right-click to delete
          </span>
        </div>
      )}

      {/* ── CONVERSATION LIST ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {loadingConversations ? (
          <SkeletonConversation />
        ) : filteredConvos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
              <MessageSquare size={24} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
              {searchQuery ? "No conversations match your search" : "No conversations yet.\nHit + to start one!"}
            </p>
          </div>
        ) : (
          <div className="px-2 py-1">
            {filteredConvos.map((conv) => {
              const other = getOtherParticipant(conv);
              const unread = conv.unreadCount || 0;
              const isActive = activeConvId === conv._id;
              const isOnline = onlineUsers.includes(other._id);
              const convTypingUsers = typingUsers[conv._id] || [];
              const isTyping = convTypingUsers.filter((id) => id !== user?._id?.toString()).length > 0;

              return (
                <ConvItem
                  key={conv._id}
                  conv={conv}
                  other={other}
                  isActive={isActive}
                  isOnline={isOnline}
                  isTyping={isTyping}
                  unread={unread}
                  onOpen={() => openConversation(conv)}
                  onDelete={() => setDeleteTarget({ convId: conv._id, username: other.username })}
                  prefetch={() => prefetchMessages(conv._id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── PROFILE FOOTER ── */}
      <ProfileMenu />
    </aside>
  );
}
