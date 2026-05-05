import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Trash2,
  MoreHorizontal,
  SmilePlus,
  FileText,
  Download,
  X as XIcon,
  ZoomIn,
  ExternalLink,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 480;

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// ─── useOutsideClick ──────────────────────────────────────────────────────────
function useOutsideClick(ref, onClose, ignoreRef = null) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (ignoreRef?.current?.contains(e.target)) return;
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
  }, [ref, ignoreRef, onClose]);
}

// ─── ImageLightbox ────────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
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
      style={{
        background: "rgba(0,0,0,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
        }}
      >
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-medium active:scale-95"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            touchAction: "manipulation",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={14} />
          <span>Save</span>
        </a>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full text-white active:scale-90"
          style={{
            background: "rgba(255,255,255,0.15)",
            touchAction: "manipulation",
          }}
          onClick={onClose}
        >
          <XIcon size={18} />
        </button>
      </div>

      {!loaded && (
        <div
          className="w-48 h-48 rounded-2xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      )}

      <img
        src={src}
        alt="full size"
        onLoad={() => setLoaded(true)}
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
        className="rounded-2xl object-contain transition-transform duration-200 select-none"
        style={{
          maxWidth: "min(92vw, 880px)",
          maxHeight: "82dvh",
          width: "auto",
          height: "auto",
          opacity: loaded ? 1 : 0,
          transform: `scale(${scale})`,
          cursor: scale > 1 ? "zoom-out" : "zoom-in",
          border: "none",
          outline: "none",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          WebkitTouchCallout: "default",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {loaded && scale === 1 && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white/40 select-none pointer-events-none whitespace-nowrap">
          Double-tap to zoom
        </p>
      )}
    </div>
  );
}

// ─── Desktop ReactionBar (absolute, above bubble) ─────────────────────────────
function DesktopReactionBar({
  isOwn,
  currentReaction,
  onReact,
  onClose,
  ignoreRef,
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose, ignoreRef);

  return (
    <div
      ref={ref}
      className={`absolute z-40 bottom-full mb-2 flex items-center gap-0.5 px-2 py-1.5 rounded-2xl shadow-2xl border border-[var(--border)] ${isOwn ? "right-0" : "left-0"}`}
      style={{
        background: "var(--bg-secondary)",
        animation: "reactionBarIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150
            ${
              currentReaction === emoji
                ? "bg-[var(--brand)]/15 scale-110 ring-2 ring-[var(--brand)]/30"
                : "hover:bg-[var(--bg-tertiary)] hover:scale-125"
            }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── Desktop ContextMenu (absolute, above/below bubble) ───────────────────────
function DesktopContextMenu({
  isOwn,
  messageType,
  content,
  fileName,
  position,
  onCopy,
  onDelete,
  onClose,
  ignoreRef,
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose, ignoreRef);

  const isText = messageType === "text";
  const isImage = messageType === "image";
  const isFile = messageType === "file";
  const isPdf = isFile && fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div
      ref={ref}
      className={`context-menu-popup absolute z-50
        ${position === "above" ? "bottom-full mb-2" : "top-full mt-2"}
        ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "contextMenuIn 0.18s cubic-bezier(0.34,1.4,0.64,1)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {isText && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopy();
          }}
          className="context-menu-item"
        >
          <div
            className="context-menu-icon"
            style={{
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
            }}
          >
            <Copy size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Copy text</span>
        </button>
      )}
      {isImage && (
        <a
          href={content}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="context-menu-item"
          onMouseDown={(e) => {
            e.stopPropagation();
            setTimeout(onClose, 150);
          }}
        >
          <div
            className="context-menu-icon"
            style={{
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
            }}
          >
            <Download size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Download</span>
        </a>
      )}
      {isFile && (
        <a
          href={content}
          download={fileName}
          className="context-menu-item"
          onMouseDown={(e) => {
            e.stopPropagation();
            setTimeout(onClose, 150);
          }}
        >
          <div
            className="context-menu-icon"
            style={{
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
            }}
          >
            <Download size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Download</span>
        </a>
      )}
      {isPdf && (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="context-menu-item"
          onMouseDown={(e) => {
            e.stopPropagation();
            setTimeout(onClose, 150);
          }}
        >
          <div
            className="context-menu-icon"
            style={{
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
            }}
          >
            <ExternalLink size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Open PDF</span>
        </a>
      )}
      {isOwn && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="context-menu-item danger"
        >
          <div
            className="context-menu-icon"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <Trash2 size={13} style={{ color: "#ef4444" }} />
          </div>
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}

// ─── MobileActionBar ──────────────────────────────────────────────────────────
// Shown inline beside the bubble after long-press on mobile.
// Contains: emoji reactions row + context action buttons row.
// Sits in the SAME flex row as the bubble — no absolute positioning, no overlap.
// Auto-hides after any action (reaction pick or menu item tap).
function MobileActionBar({
  isOwn,
  myReaction,
  showReactions,
  showMenu,
  messageType,
  content,
  fileName,
  onReact,
  onCopy,
  onDelete,
  onClose,
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose);

  const isText = messageType === "text";
  const isImage = messageType === "image";
  const isFile = messageType === "file";
  const isPdf = isFile && fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div
      ref={ref}
      className={`flex flex-col gap-1.5 flex-shrink-0 ${isOwn ? "order-first items-end" : "order-last items-start"}`}
      style={{ animation: "reactionBarIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Emoji row */}
      {showReactions && (
        <div
          className="flex items-center gap-0.5 px-2 py-1.5 rounded-2xl border border-[var(--border)]"
          style={{
            background: "var(--bg-secondary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onReact(emoji)} // onReact already calls closeAll
              style={{ touchAction: "manipulation" }}
              className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90
                ${
                  myReaction === emoji
                    ? "bg-[var(--brand)]/15 scale-110 ring-2 ring-[var(--brand)]/30"
                    : "hover:bg-[var(--bg-tertiary)]"
                }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons row */}
      {showMenu && (
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded-2xl border border-[var(--border)]"
          style={{
            background: "var(--bg-secondary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {isText && (
            <button
              onClick={() => {
                onCopy();
              }} // onCopy calls closeAll
              style={{ touchAction: "manipulation" }}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Copy"
            >
              <Copy size={15} style={{ color: "var(--brand)" }} />
            </button>
          )}
          {isImage && (
            <a
              href={content}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTimeout(onClose, 150)}
              style={{ touchAction: "manipulation" }}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Download"
            >
              <Download size={15} style={{ color: "var(--brand)" }} />
            </a>
          )}
          {isFile && (
            <a
              href={content}
              download={fileName}
              onClick={() => setTimeout(onClose, 150)}
              style={{ touchAction: "manipulation" }}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Download"
            >
              <Download size={15} style={{ color: "var(--brand)" }} />
            </a>
          )}
          {isPdf && (
            <a
              href={content}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTimeout(onClose, 150)}
              style={{ touchAction: "manipulation" }}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Open PDF"
            >
              <ExternalLink size={15} style={{ color: "var(--brand)" }} />
            </a>
          )}
          {isOwn && (
            <button
              onClick={() => {
                onDelete();
              }} // onDelete calls closeAll
              style={{ touchAction: "manipulation" }}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Delete"
            >
              <Trash2 size={15} style={{ color: "#ef4444" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ReactionSummary ──────────────────────────────────────────────────────────
function ReactionSummary({ reactions, isOwn, onPillClick }) {
  if (!reactions || Object.keys(reactions).length === 0) return null;
  const counts = {};
  Object.values(reactions).forEach((e) => {
    counts[e] = (counts[e] || 0) + 1;
  });

  return (
    <div
      className={`absolute -bottom-4 flex items-center gap-0.5 z-10 ${isOwn ? "right-2" : "left-2"}`}
      style={{ animation: "reactionPop 0.22s ease-out" }}
    >
      {Object.entries(counts).map(([emoji, count]) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onPillClick();
          }}
          style={{ touchAction: "manipulation" }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-[var(--bg-secondary)] border border-[var(--border)] shadow-md hover:border-[var(--brand)]/50 active:scale-95 transition-all cursor-pointer"
        >
          <span style={{ fontSize: 13 }}>{emoji}</span>
          {count > 1 && (
            <span className="text-[10px] text-[var(--text-muted)] font-semibold">
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── TickIcon ─────────────────────────────────────────────────────────────────
function TickIcon({ status }) {
  if (status === "read")
    return <CheckCheck size={13} className="text-green-500 flex-shrink-0" />;
  if (status === "delivered")
    return (
      <CheckCheck
        size={13}
        className="text-[var(--text-muted)] flex-shrink-0"
      />
    );
  return <Check size={13} className="text-[var(--text-muted)] flex-shrink-0" />;
}

// ─── MessageContent ───────────────────────────────────────────────────────────
function MessageContent({ message, isOwn, onImageClick }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (message.type === "image") {
    return (
      <div className="relative group/img" style={{ lineHeight: 0 }}>
        {!imgLoaded && !imgError && (
          <div
            className="rounded-xl animate-pulse flex items-center justify-center"
            style={{
              width: 200,
              height: 140,
              background: "rgba(128,128,128,0.15)",
            }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        )}
        {imgError ? (
          <div
            className="rounded-xl flex items-center justify-center text-xs opacity-60 px-4 py-3"
            style={{ background: "rgba(128,128,128,0.1)", minWidth: 120 }}
          >
            Image unavailable
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(message.content);
            }}
            style={{
              display: imgLoaded ? "block" : "none",
              background: "none",
              border: "none",
              outline: "none",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            className="rounded-xl overflow-hidden focus:outline-none active:opacity-80 relative"
          >
            <img
              src={message.content}
              alt="shared image"
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgError(true);
                setImgLoaded(true);
              }}
              className="rounded-xl object-cover block"
              style={{
                maxWidth: 220,
                maxHeight: 260,
                minWidth: 120,
                minHeight: 80,
                border: "none",
                outline: "none",
              }}
              draggable={false}
            />
            <div
              className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.25)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <ZoomIn size={18} className="text-white" />
              </div>
            </div>
          </button>
        )}
      </div>
    );
  }

  if (message.type === "file") {
    const name = message.fileName || "File";
    return (
      <div
        className={`flex items-center gap-3 min-w-[180px] max-w-[240px] p-1 rounded-xl select-none ${isOwn ? "text-white" : "text-[var(--text-primary)]"}`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOwn ? "bg-white/20" : "bg-[var(--brand)]/12"}`}
        >
          <FileText
            size={20}
            className={isOwn ? "text-white" : "text-[var(--brand)]"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p
            className={`text-[11px] mt-0.5 ${isOwn ? "text-white/55" : "text-[var(--text-muted)]"}`}
          >
            Hold to open · download
          </p>
        </div>
        <Download size={14} className="flex-shrink-0 opacity-40" />
      </div>
    );
  }

  return <span>{message.content}</span>;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, showAvatar, sender }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [menuPosition, setMenuPosition] = useState("above");

  const longPressTimer = useRef(null);
  const longFired = useRef(false);
  const isPressing = useRef(false);
  const touchStart = useRef(null);

  const smileBtnRef = useRef();
  const menuBtnRef = useRef();
  const bubbleRef = useRef();

  // ── Store ──────────────────────────────────────────────────────────────────
  const activeConversationId = useChatStore((s) => s.activeConversation?._id);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const storeMessage = useChatStore((s) => {
    if (!activeConversationId) return null;
    return (
      (s.messagesByConv[activeConversationId] || []).find(
        (m) => m._id === message._id,
      ) || null
    );
  });

  const reactions = useMemo(() => {
    const r = storeMessage?.reactions || message.reactions || {};
    return r instanceof Map ? Object.fromEntries(r) : r;
  }, [storeMessage?.reactions, message.reactions]);

  const myUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_user") || "{}")._id ?? null;
    } catch {
      return null;
    }
  }, []);

  const myReaction = reactions[myUserId];
  const hasReactions = Object.keys(reactions).length > 0;
  const displayMsg = storeMessage || message;
  const isImageMsg = displayMsg.type === "image";

  // ── Helpers ────────────────────────────────────────────────────────────────
  const closeAll = useCallback(() => {
    setShowMenu(false);
    setShowReactions(false);
  }, []);

  const resolvePos = useCallback(() => {
    if (bubbleRef.current) {
      setMenuPosition(
        bubbleRef.current.getBoundingClientRect().top > 180 ? "above" : "below",
      );
    }
  }, []);

  // Desktop only
  const openReactions = useCallback(() => {
    resolvePos();
    setShowReactions(true);
    setShowMenu(false);
  }, [resolvePos]);
  const openMenu = useCallback(() => {
    resolvePos();
    setShowMenu(true);
    setShowReactions(false);
  }, [resolvePos]);
  // Mobile long-press: open both together
  const openBoth = useCallback(() => {
    resolvePos();
    setShowReactions(true);
    setShowMenu(true);
  }, [resolvePos]);

  // ── Actions (all call closeAll so toolbar hides after action) ──────────────
  const handleCopy = useCallback(async () => {
    closeAll();
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied!");
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = message.content;
        el.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        toast.success("Copied!");
      } catch {
        toast.error("Copy failed");
      }
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

  const handleReact = useCallback(
    async (emoji) => {
      if (!myUserId) return;
      const { updateReaction } = useChatStore.getState();
      const prev = reactions[myUserId];
      const next = prev === emoji ? null : emoji;
      updateReaction(message._id, myUserId, next);
      closeAll(); // auto-hide toolbar after picking reaction
      try {
        await axios.post(`/messages/${message._id}/react`, { emoji: next });
      } catch {
        updateReaction(message._id, myUserId, prev || null);
        toast.error("Reaction failed");
      }
    },
    [message._id, myUserId, reactions, closeAll],
  );

  // ── Touch handlers ─────────────────────────────────────────────────────────
  const onTouchStart = useCallback(
    (e) => {
      if (["A", "BUTTON"].includes(e.target.tagName)) return;
      longFired.current = false;
      isPressing.current = true;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      longPressTimer.current = setTimeout(() => {
        longFired.current = true;
        isPressing.current = false;
        window.getSelection()?.removeAllRanges();
        if (navigator.vibrate) navigator.vibrate(18);
        openBoth();
      }, LONG_PRESS_MS);
    },
    [openBoth],
  );

  const onTouchMove = useCallback((e) => {
    if (!isPressing.current || !touchStart.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current);
      isPressing.current = false;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (["A", "BUTTON"].includes(e.target.tagName)) return;
      clearTimeout(longPressTimer.current);
      const wasLong = longFired.current;
      isPressing.current = false;
      touchStart.current = null;
      longFired.current = false;

      if (wasLong) return;

      // Short tap: image → lightbox, text/file → toggle menu
      if (isImageMsg) {
        setLightboxSrc(displayMsg.content);
      } else {
        setShowMenu((prev) => {
          if (prev) return false;
          setShowReactions(false);
          return true;
        });
      }
    },
    [isImageMsg, displayMsg.content],
  );

  if (isDeleting) return null;

  // ── Optimistic ─────────────────────────────────────────────────────────────
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
                  className="rounded-xl max-h-48 block"
                  loading="lazy"
                  style={{ maxWidth: 200, border: "none" }}
                />
              ) : message.type === "file" ? (
                <div className="flex items-center gap-2 min-w-[160px]">
                  <FileText size={18} className="text-white/70 flex-shrink-0" />
                  <span className="text-sm truncate max-w-[160px]">
                    {message.fileName || "File"}
                  </span>
                </div>
              ) : (
                <span>{message.content}</span>
              )}
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

  const touch = isTouchDevice();
  const showMobileBar = touch && (showReactions || showMenu);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div
        className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-0.5`}
        style={{ marginBottom: hasReactions ? "0.875rem" : undefined }}
      >
        <div
          className={`flex items-end gap-2 group w-full ${isOwn ? "flex-row-reverse" : ""}`}
        >
          {!isOwn && (
            <div
              className={`flex-shrink-0 ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <Avatar user={sender} size="xs" />
            </div>
          )}

          <div
            className={`flex flex-col gap-0.5 min-w-0 ${isOwn ? "items-end" : "items-start"}`}
          >
            {/*
              This row contains:
              [desktop] hover-action-buttons  |  bubble
              [mobile]  bubble  |  inline-action-bar (after long-press)
              Order is controlled by `order-first` / `order-last` per side.
            */}
            <div className="relative flex items-center gap-1.5 max-w-full">
              {/* ── Desktop: 😊 + ··· hover buttons ── */}
              {!touch && (
                <div
                  className={`flex items-center gap-0.5 transition-opacity duration-150 flex-shrink-0
                    ${isOwn ? "order-first" : "order-last"}
                    opacity-0 group-hover:opacity-100
                    ${showMenu || showReactions ? "!opacity-100" : ""}`}
                >
                  {/* Smile button — opens reaction bar (absolute above) */}
                  <div className="relative">
                    <button
                      ref={smileBtnRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        showReactions ? closeAll() : openReactions();
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                      title="React"
                    >
                      {myReaction ? (
                        <span className="text-base leading-none">
                          {myReaction}
                        </span>
                      ) : (
                        <SmilePlus size={14} />
                      )}
                    </button>
                    {showReactions && (
                      <DesktopReactionBar
                        isOwn={isOwn}
                        currentReaction={myReaction}
                        onReact={handleReact}
                        onClose={closeAll}
                        ignoreRef={smileBtnRef}
                      />
                    )}
                  </div>

                  {/* ··· button — opens context menu (absolute on bubble) */}
                  <button
                    ref={menuBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      showMenu ? closeAll() : openMenu();
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              )}

              {/* ── Bubble ── */}
              <div className="relative" ref={bubbleRef}>
                <div
                  className={
                    isImageMsg
                      ? "relative animate-slide-up rounded-xl overflow-hidden"
                      : `relative ${isOwn ? "message-bubble-out" : "message-bubble-in"} break-words whitespace-pre-wrap animate-slide-up`
                  }
                  style={
                    isImageMsg
                      ? {
                          padding: 0,
                          background: "none",
                          border: "none",
                          outline: "none",
                          boxShadow: "none",
                          lineHeight: 0,
                        }
                      : { paddingBottom: "1.25rem", minWidth: "60px" }
                  }
                  onTouchStart={touch ? onTouchStart : undefined}
                  onTouchMove={touch ? onTouchMove : undefined}
                  onTouchEnd={touch ? onTouchEnd : undefined}
                >
                  <MessageContent
                    message={displayMsg}
                    isOwn={isOwn}
                    onImageClick={setLightboxSrc}
                  />

                  {!isImageMsg && (
                    <span
                      className={`absolute bottom-1 text-[9px] leading-none pointer-events-none
                        ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </span>
                  )}

                  {/* Desktop context menu — absolute relative to bubble */}
                  {!touch && showMenu && (
                    <DesktopContextMenu
                      isOwn={isOwn}
                      messageType={displayMsg.type}
                      content={displayMsg.content}
                      fileName={displayMsg.fileName}
                      position={menuPosition}
                      onCopy={handleCopy}
                      onDelete={handleDelete}
                      onClose={closeAll}
                      ignoreRef={menuBtnRef}
                    />
                  )}
                </div>

                {/* Image timestamp overlay */}
                {isImageMsg && (
                  <span
                    className="absolute bottom-2 right-2 text-[9px] leading-none pointer-events-none px-1.5 py-0.5 rounded-md"
                    style={{
                      color: "#fff",
                      background: "rgba(0,0,0,0.38)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {formatMessageTime(message.createdAt)}
                  </span>
                )}

                <ReactionSummary
                  reactions={reactions}
                  isOwn={isOwn}
                  onPillClick={openReactions}
                />
              </div>

              {/* ── Mobile: inline action bar shown after long-press ──
                  Rendered in the same flex row as the bubble.
                  own message  → bar appears to the LEFT  (order-first)
                  received msg → bar appears to the RIGHT (order-last)
                  This mirrors desktop hover button positions exactly. */}
              {showMobileBar && (
                <MobileActionBar
                  isOwn={isOwn}
                  myReaction={myReaction}
                  showReactions={showReactions}
                  showMenu={showMenu}
                  messageType={displayMsg.type}
                  content={displayMsg.content}
                  fileName={displayMsg.fileName}
                  onReact={handleReact}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  onClose={closeAll}
                />
              )}
            </div>

            {isOwn && (
              <div
                className="px-1 flex justify-end"
                style={{ marginTop: hasReactions ? "0.625rem" : undefined }}
              >
                <TickIcon status={displayMsg.status || message.status} />
              </div>
            )}
          </div>

          {!isOwn && <div className="w-5 flex-shrink-0" />}
        </div>
      </div>
    </>
  );
}
