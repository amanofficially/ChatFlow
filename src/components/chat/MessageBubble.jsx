import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check, CheckCheck, Copy, Trash2,
  SmilePlus, FileText, Download, X as XIcon, ZoomIn, ExternalLink,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 420;

// ─── useIsPhone ───────────────────────────────────────────────────────────────
function useIsPhone() {
  const [phone, setPhone] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const h = (e) => setPhone(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return phone;
}

// ─── useOutsideClick ──────────────────────────────────────────────────────────
function useOutsideClick(ref, onClose, ignoreRefs = [], enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (ignoreRefs.some((r) => r?.current?.contains(e.target))) return;
      onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler, { passive: true });
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onClose, enabled]); // eslint-disable-line
}

// ─── ImageLightbox ────────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.96)", backdropFilter: "blur(20px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}
      >
        <a
          href={src} download target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-medium active:scale-95"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", touchAction: "manipulation" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={14} /><span>Save</span>
        </a>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full text-white active:scale-90"
          style={{ background: "rgba(255,255,255,0.15)", touchAction: "manipulation" }}
          onClick={onClose}
        >
          <XIcon size={18} />
        </button>
      </div>
      {!loaded && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          <span className="text-white/40 text-xs">Loading image…</span>
        </div>
      )}
      <img
        src={src} alt="full size"
        onLoad={() => setLoaded(true)}
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
        className="rounded-2xl object-contain transition-transform duration-200 select-none"
        style={{
          maxWidth: "min(94vw, 900px)",
          maxHeight: "85dvh",
          width: "auto", height: "auto",
          opacity: loaded ? 1 : 0,
          transform: `scale(${scale})`,
          cursor: scale > 1 ? "zoom-out" : "zoom-in",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          WebkitTouchCallout: "default",
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {loaded && scale === 1 && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white/35 select-none pointer-events-none whitespace-nowrap">
          Double-tap to zoom · tap outside to close
        </p>
      )}
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
export function ConfirmModal({
  icon: Icon = Trash2, iconBg = "bg-red-500/10", iconColor = "text-red-400",
  title, body, onConfirm, onCancel,
  confirmLabel = "Delete", confirmClass = "bg-red-500 hover:bg-red-600 text-white",
}) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 shadow-2xl"
        style={{ animation: "sheetSlideUp 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}>
          <Icon size={22} className={iconColor} />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">{title}</h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">{body}</p>
        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 h-11 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ touchAction: "manipulation" }}>Cancel</button>
          <button onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${confirmClass}`}
            style={{ touchAction: "manipulation" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── InlineReactionBar ────────────────────────────────────────────────────────
// Shown directly below a bubble on mobile single-tap.
// For images/files: also shows Download + Open-fullscreen actions at the bottom.
function InlineReactionBar({ isOwn, currentReaction, onReact, messageType, content, fileName, onOpenImage }) {
  const isImage = messageType === "image";
  const isFile = messageType === "file";

  return (
    <div className={`flex flex-col gap-1 mt-1 ${isOwn ? "items-end mr-1" : "items-start ml-1"}`}>
      {/* Emoji reactions row */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 rounded-full border border-[var(--border)]"
        style={{
          background: "var(--bg-secondary)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
          animation: "reactionBarIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onReact(emoji)}
            style={{ touchAction: "manipulation" }}
            className={`text-xl w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90
              ${currentReaction === emoji
                ? "bg-[var(--brand)]/15 scale-110 ring-2 ring-[var(--brand)]/40"
                : "hover:bg-[var(--bg-tertiary)] hover:scale-125"}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Image/File action row */}
      {(isImage || isFile) && (
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-2xl border border-[var(--border)]"
          style={{
            background: "var(--bg-secondary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            animation: "reactionBarIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {isImage && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={onOpenImage}
              style={{ touchAction: "manipulation" }}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[var(--brand)] hover:bg-[var(--brand)]/10 transition active:scale-95 text-sm font-medium"
            >
              <ZoomIn size={15} />
              <span>View</span>
            </button>
          )}
          <a
            href={content}
            download={isFile ? (fileName || true) : undefined}
            target={isImage ? "_blank" : undefined}
            rel="noopener noreferrer"
            onMouseDown={(e) => e.preventDefault()}
            style={{ touchAction: "manipulation" }}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[var(--brand)] hover:bg-[var(--brand)]/10 transition active:scale-95 text-sm font-medium"
          >
            <Download size={15} />
            <span>Download</span>
          </a>
        </div>
      )}
    </div>
  );
}

// ─── ContextMenu (Desktop) ────────────────────────────────────────────────────
function ContextMenu({ isOwn, messageType, content, fileName, onCopy, onDelete, onClose, ignoreRefs = [] }) {
  const ref = useRef();
  useOutsideClick(ref, onClose, ignoreRefs);
  const isText = messageType === "text";
  const isImage = messageType === "image";
  const isFile = messageType === "file";
  const isPdf = isFile && fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div
      ref={ref}
      className={`context-menu-popup absolute bottom-full mb-2 z-50 ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "contextMenuIn 0.18s cubic-bezier(0.34,1.4,0.64,1)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {isText && (
        <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(); }} className="context-menu-item">
          <div className="context-menu-icon" style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}>
            <Copy size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Copy text</span>
        </button>
      )}
      {(isImage || isFile) && (
        <a href={content} download={isFile ? fileName : undefined} target={isImage ? "_blank" : undefined}
          rel="noopener noreferrer" className="context-menu-item"
          onMouseDown={(e) => { e.stopPropagation(); setTimeout(onClose, 150); }}>
          <div className="context-menu-icon" style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}>
            <Download size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Download</span>
        </a>
      )}
      {isPdf && (
        <a href={content} target="_blank" rel="noopener noreferrer" className="context-menu-item"
          onMouseDown={(e) => { e.stopPropagation(); setTimeout(onClose, 150); }}>
          <div className="context-menu-icon" style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}>
            <ExternalLink size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Open PDF</span>
        </a>
      )}
      {isOwn && (
        <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} className="context-menu-item danger">
          <div className="context-menu-icon" style={{ background: "rgba(239,68,68,0.12)" }}>
            <Trash2 size={13} style={{ color: "#ef4444" }} />
          </div>
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}

// ─── ReactionSummary ──────────────────────────────────────────────────────────
function ReactionSummary({ reactions, isOwn, onPillClick }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;
  const counts = {};
  Object.values(reactions).forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
  return (
    <div
      className={`absolute -bottom-4 flex items-center gap-0.5 z-10 ${isOwn ? "right-2" : "left-2"}`}
      style={{ animation: "reactionPop 0.22s ease-out" }}
    >
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onPillClick(); }}
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-[var(--bg-secondary)] border border-[var(--border)] shadow-md hover:border-[var(--brand)]/50 active:scale-95 transition-all cursor-pointer"
        >
          <span style={{ fontSize: 13 }}>{emoji}</span>
          {count > 1 && <span className="text-[10px] text-[var(--text-muted)] font-semibold">{count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── TickIcon ─────────────────────────────────────────────────────────────────
function TickIcon({ status }) {
  if (status === "read") return <CheckCheck size={13} className="text-green-500 flex-shrink-0" />;
  if (status === "delivered") return <CheckCheck size={13} className="text-[var(--text-muted)] flex-shrink-0" />;
  return <Check size={13} className="text-[var(--text-muted)] flex-shrink-0" />;
}

function SelectionCheckbox({ checked, isOwn }) {
  return (
    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
      ${checked ? "bg-[var(--brand)] border-[var(--brand)] scale-110" : "bg-[var(--bg-secondary)] border-[var(--border)]"}
      ${isOwn ? "ml-2" : "mr-2"}`}>
      {checked && <Check size={13} className="text-white" strokeWidth={3} />}
    </div>
  );
}

// ─── MessageContent ───────────────────────────────────────────────────────────
function MessageContent({ message, isOwn, onImageClick }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (message.type === "image") {
    return (
      <div style={{ lineHeight: 0 }}>
        {!imgLoaded && !imgError && (
          <div
            className="rounded-xl animate-pulse flex items-center justify-center"
            style={{
              width: "clamp(120px, 55vw, 240px)",
              height: "clamp(90px, 40vw, 200px)",
              background: "rgba(128,128,128,0.15)",
            }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        )}
        {imgError ? (
          <div
            className="rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs opacity-60 px-6 py-6"
            style={{ background: "rgba(128,128,128,0.1)", minWidth: 120 }}
          >
            <span className="text-2xl">🖼️</span>
            <span>Image unavailable</span>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onImageClick(message.content); }}
            className="group/img rounded-xl overflow-hidden focus:outline-none active:opacity-75 relative"
            style={{
              display: imgLoaded ? "block" : "none",
              background: "none", border: "none", outline: "none",
              padding: 0, margin: 0, cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <img
              src={message.content}
              alt="shared image"
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
              draggable={false}
              style={{
                width: "clamp(140px, 55vw, 260px)",
                height: "clamp(100px, 42vw, 220px)",
                objectFit: "cover",
                display: "block",
                border: "none",
                borderRadius: "0.75rem",
              }}
            />
            <div
              className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-150"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                <ZoomIn size={18} className="text-white" />
              </div>
            </div>
          </button>
        )}
      </div>
    );
  }

  if (message.type === "file") {
    return (
      <div className={`flex items-center gap-3 min-w-[180px] max-w-[240px] p-1 rounded-xl select-none ${isOwn ? "text-white" : "text-[var(--text-primary)]"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOwn ? "bg-white/20" : "bg-[var(--brand)]/12"}`}>
          <FileText size={20} className={isOwn ? "text-white" : "text-[var(--brand)]"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{message.fileName || "File"}</p>
          <p className={`text-[11px] mt-0.5 ${isOwn ? "text-white/55" : "text-[var(--text-muted)]"}`}>Hold to download</p>
        </div>
        <Download size={14} className="flex-shrink-0 opacity-40" />
      </div>
    );
  }

  return <span>{message.content}</span>;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
export default function MessageBubble({
  message, isOwn, showAvatar, sender,
  selectionMode = false, isSelected = false, onSelect,
  onEnterMultiSelect,  // (messageId) => void — long-press enters multi-select
  onBubbleTap,         // (messageId | null) => void — short-tap on mobile notifies parent
  activeSingleId,      // the currently active single-select id (to sync close)
}) {
  // showInlineReactions: mobile single-tap shows reaction bar below this bubble
  const [showInlineReactions, setShowInlineReactions] = useState(false);

  // Sync: if another bubble was tapped (or single-select was cancelled), close ours
  useEffect(() => {
    if (activeSingleId !== message._id) {
      setShowInlineReactions(false);
    }
  }, [activeSingleId, message._id]);
  // Desktop: context menu & reaction bar popups
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const longPressTimer = useRef(null);
  const longFired = useRef(false);
  const isPressing = useRef(false);
  const touchStart = useRef(null);
  const smileBtnRef = useRef();
  const menuBtnRef = useRef();

  const phone = useIsPhone();

  const activeConversationId = useChatStore((s) => s.activeConversation?._id);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const storeMessage = useChatStore((s) => {
    if (!activeConversationId) return null;
    return (s.messagesByConv[activeConversationId] || []).find((m) => m._id === message._id) || null;
  });

  const reactions = useMemo(() => {
    const r = storeMessage?.reactions || message.reactions || {};
    return r instanceof Map ? Object.fromEntries(r) : r;
  }, [storeMessage?.reactions, message.reactions]);

  const myUserId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("chat_user") || "{}")._id ?? null; }
    catch { return null; }
  }, []);

  const myReaction = reactions[myUserId];
  const hasReactions = Object.keys(reactions).length > 0;
  const displayMsg = storeMessage || message;
  const isImageMsg = displayMsg.type === "image";

  const closeAll = useCallback(() => {
    setShowMenu(false);
    setShowReactions(false);
    setShowInlineReactions(false);
  }, []);

  // Close inline UI when entering multi-select
  useEffect(() => {
    if (selectionMode) {
      setShowInlineReactions(false);
      setShowMenu(false);
      setShowReactions(false);
    }
  }, [selectionMode]);

  const handleCopy = useCallback(async () => {
    closeAll();
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied!");
    } catch {
      try {
        const el = Object.assign(document.createElement("textarea"), { value: message.content });
        el.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(el);
        el.focus(); el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        toast.success("Copied!");
      } catch { toast.error("Copy failed"); }
    }
  }, [message.content, closeAll]);

  const handleDelete = useCallback(async () => {
    closeAll();
    setIsDeleting(true);
    try {
      await axios.delete(`/messages/${message._id}`);
      removeMessage(message._id, activeConversationId);
      toast.success("Message deleted");
    } catch {
      setIsDeleting(false);
      toast.error("Could not delete message");
    }
  }, [message._id, activeConversationId, removeMessage, closeAll]);

  const handleReact = useCallback(async (emoji) => {
    if (!myUserId) return;
    const { updateReaction } = useChatStore.getState();
    const prev = reactions[myUserId];
    const next = prev === emoji ? null : emoji;
    updateReaction(message._id, myUserId, next);
    closeAll();
    // FIX: dismiss single-select header toolbar after reacting
    onBubbleTap?.(null);
    setShowInlineReactions(false);
    try {
      await axios.post(`/messages/${message._id}/react`, { emoji: next });
    } catch {
      updateReaction(message._id, myUserId, prev || null);
      toast.error("Reaction failed");
    }
  }, [message._id, myUserId, reactions, closeAll, onBubbleTap]);

  // ── Touch handlers (mobile) ───────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (["A", "BUTTON"].includes(e.target.tagName)) return;
    longFired.current = false;
    isPressing.current = true;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      longFired.current = true;
      isPressing.current = false;
      window.getSelection()?.removeAllRanges();
      if (navigator.vibrate) navigator.vibrate(18);
      if (selectionMode) {
        // Already in multi-select → toggle this bubble
        onSelect?.(message._id);
      } else if (isImageMsg) {
        // Long-press on image → open lightbox
        setLightboxSrc(displayMsg.content);
        setShowInlineReactions(false);
        onBubbleTap?.(null);
      } else {
        // Long press in normal mode → enter multi-select
        onEnterMultiSelect?.(message._id);
      }
    }, LONG_PRESS_MS);
  }, [selectionMode, onSelect, onEnterMultiSelect, message._id]);

  const onTouchMove = useCallback((e) => {
    if (!isPressing.current || !touchStart.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dx > 8 || dy > 8) { clearTimeout(longPressTimer.current); isPressing.current = false; }
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (["A", "BUTTON"].includes(e.target.tagName)) return;
    clearTimeout(longPressTimer.current);
    const wasLong = longFired.current;
    isPressing.current = false;
    touchStart.current = null;
    longFired.current = false;
    if (wasLong) return;
    if (selectionMode) {
      onSelect?.(message._id);
      return;
    }
    // Short tap → toggle inline reaction/action bar + notify parent
    // Images also show the bar (with download option) instead of immediately opening lightbox
    setShowInlineReactions((prev) => {
      const next = !prev;
      if (next) onBubbleTap?.(message._id);
      else onBubbleTap?.(null);
      return next;
    });
  }, [selectionMode, onSelect, message._id, onBubbleTap]);

  const handleBubbleClick = useCallback((e) => {
    if (selectionMode) { e.stopPropagation(); onSelect?.(message._id); }
  }, [selectionMode, onSelect, message._id]);

  if (isDeleting) return null;

  // ── Optimistic placeholder ────────────────────────────────────────────────
  if (message._isOptimistic) {
    return (
      <div className="flex flex-col items-end mb-0.5">
        <div className="flex items-end gap-2 w-full flex-row-reverse">
          <div className="flex flex-col gap-0.5 items-end min-w-0">
            <div className="message-bubble-out break-words whitespace-pre-wrap opacity-70 relative pb-4">
              {message.type === "image" ? (
                <img
                  src={message.content}
                  alt="sending…"
                  loading="lazy"
                  style={{
                    width: "clamp(140px, 55vw, 240px)",
                    height: "clamp(100px, 42vw, 200px)",
                    objectFit: "cover",
                    display: "block",
                    border: "none",
                    borderRadius: "0.75rem",
                  }}
                />
              ) : message.type === "file" ? (
                <div className="flex items-center gap-2 min-w-[160px]">
                  <FileText size={18} className="text-white/70 flex-shrink-0" />
                  <span className="text-sm truncate max-w-[160px]">{message.fileName || "File"}</span>
                </div>
              ) : <span>{message.content}</span>}
              <span className="absolute bottom-1 right-2 text-[9px] text-white/50 leading-none">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
            <div className="px-1">
              <div className="w-3 h-3 border-[1.5px] border-[var(--text-muted)]/40 border-t-[var(--text-muted)] rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show inline reaction bar on mobile when single-tapped (not in multi-select)
  const showMobileReactionBar = phone && showInlineReactions && !selectionMode;

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {confirmDelete && (
        <ConfirmModal
          title="Delete message?"
          body="This message will be permanently deleted."
          onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div
        className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-0.5 transition-colors duration-150
          ${selectionMode ? "cursor-pointer select-none" : ""}
          ${isSelected ? "bg-[var(--brand)]/10 rounded-xl" : ""}
          ${showMobileReactionBar ? "bg-[var(--brand)]/5 rounded-xl" : ""}`}
        style={{ marginBottom: hasReactions ? "0.875rem" : undefined }}
        onClick={handleBubbleClick}
      >
        <div className={`flex items-end gap-2 group w-full ${isOwn ? "flex-row-reverse" : ""}`}>
          {selectionMode && <SelectionCheckbox checked={isSelected} isOwn={isOwn} />}

          {!isOwn && (
            <div className={`flex-shrink-0 ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <Avatar user={sender} size="xs" />
            </div>
          )}

          <div className={`flex flex-col gap-0 min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
            <div className="relative flex items-center gap-1.5 max-w-full">

              {/* Desktop hover buttons — hidden in selection mode */}
              {!phone && !selectionMode && (
                <div
                  className={`flex items-center gap-0.5 transition-opacity duration-150 flex-shrink-0
                    ${isOwn ? "order-first" : "order-last"}
                    opacity-0 group-hover:opacity-100
                    ${showMenu || showReactions ? "!opacity-100" : ""}`}
                >
                  <button
                    ref={smileBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      showReactions ? closeAll() : (setShowReactions(true), setShowMenu(false));
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                    title="React"
                  >
                    {myReaction ? <span className="text-base leading-none">{myReaction}</span> : <SmilePlus size={14} />}
                  </button>
                  <button
                    ref={menuBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      showMenu ? closeAll() : (setShowMenu(true), setShowReactions(false));
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                    title="More options"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}

              {/* Bubble */}
              <div className="relative">
                {/* Desktop: floating reaction bar above bubble */}
                {!phone && showReactions && (
                  <div className={`absolute bottom-full mb-2 z-50 ${isOwn ? "right-0" : "left-0"}`}>
                    <div
                      className="flex items-center gap-0.5 px-2 py-1.5 rounded-full border border-[var(--border)]"
                      style={{
                        background: "var(--bg-secondary)",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
                        animation: "reactionBarIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { handleReact(emoji); closeAll(); }}
                          style={{ touchAction: "manipulation" }}
                          className={`text-xl w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90
                            ${myReaction === emoji
                              ? "bg-[var(--brand)]/15 scale-110 ring-2 ring-[var(--brand)]/40"
                              : "hover:bg-[var(--bg-tertiary)] hover:scale-125"}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Desktop: context menu */}
                {!phone && showMenu && (
                  <ContextMenu
                    isOwn={isOwn}
                    messageType={displayMsg.type}
                    content={displayMsg.content}
                    fileName={displayMsg.fileName}
                    onCopy={handleCopy}
                    onDelete={() => { closeAll(); setConfirmDelete(true); }}
                    onClose={closeAll}
                    ignoreRefs={[menuBtnRef]}
                  />
                )}

                <div
                  className={
                    isImageMsg
                      ? "relative animate-slide-up rounded-xl overflow-hidden"
                      : `relative ${isOwn ? "message-bubble-out" : "message-bubble-in"} break-words whitespace-pre-wrap animate-slide-up`
                  }
                  style={
                    isImageMsg
                      ? { padding: 0, background: "none", border: "none", lineHeight: 0 }
                      : { paddingBottom: "1.25rem", minWidth: "60px" }
                  }
                  onTouchStart={phone ? onTouchStart : undefined}
                  onTouchMove={phone ? onTouchMove : undefined}
                  onTouchEnd={phone ? onTouchEnd : undefined}
                >
                  <MessageContent message={displayMsg} isOwn={isOwn} onImageClick={setLightboxSrc} />
                  {!isImageMsg && (
                    <span className={`absolute bottom-1 text-[9px] leading-none pointer-events-none ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}>
                      {formatMessageTime(message.createdAt)}
                    </span>
                  )}
                </div>

                {isImageMsg && (
                  <span
                    className="absolute bottom-2 right-2 text-[9px] leading-none pointer-events-none px-1.5 py-0.5 rounded-md"
                    style={{ color: "#fff", background: "rgba(0,0,0,0.42)", backdropFilter: "blur(4px)" }}
                  >
                    {formatMessageTime(message.createdAt)}
                  </span>
                )}

                <ReactionSummary
                  reactions={reactions} isOwn={isOwn}
                  onPillClick={() => { setShowReactions((p) => !p); setShowMenu(false); }}
                />
              </div>
            </div>

            {isOwn && (
              <div className="px-1 flex justify-end" style={{ marginTop: hasReactions ? "0.625rem" : undefined }}>
                <TickIcon status={displayMsg.status || message.status} />
              </div>
            )}

            {/* Mobile: inline reaction bar below bubble on single tap */}
            {showMobileReactionBar && (
              <InlineReactionBar
                isOwn={isOwn}
                currentReaction={myReaction}
                messageType={displayMsg.type}
                content={displayMsg.content}
                fileName={displayMsg.fileName}
                onOpenImage={() => {
                  setLightboxSrc(displayMsg.content);
                  setShowInlineReactions(false);
                  onBubbleTap?.(null);
                }}
                onReact={(emoji) => {
                  handleReact(emoji);
                  setShowInlineReactions(false);
                }}
              />
            )}
          </div>

          {!isOwn && <div className="w-5 flex-shrink-0" />}
        </div>
      </div>
    </>
  );
}
