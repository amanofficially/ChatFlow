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
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 480;
const isTouch = () =>
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

function useOutsideClick(ref, onClose, anchorRef = null) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
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
  }, [ref, anchorRef, onClose]);
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function ImageLightbox({ src, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
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
      {/* Top bar */}
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

      {/* Loading skeleton */}
      {!loaded && (
        <div
          className="w-48 h-48 rounded-2xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      )}

      {/* Main image — perfectly centered via flex parent */}
      <img
        src={src}
        alt="full size"
        onLoad={() => setLoaded(true)}
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
        className="rounded-2xl shadow-2xl object-contain transition-transform duration-200 select-none"
        style={{
          maxWidth: "min(92vw, 880px)",
          maxHeight: "82dvh",
          width: "auto",
          height: "auto",
          opacity: loaded ? 1 : 0,
          transform: `scale(${scale})`,
          cursor: scale > 1 ? "zoom-out" : "zoom-in",
          WebkitTouchCallout: "default",
          /* No border, no outline */
          border: "none",
          outline: "none",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
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

// ─── Context Menu ─────────────────────────────────────────────────────────────
function ContextMenu({
  isOwn,
  hasText,
  onCopy,
  onDelete,
  onClose,
  anchorRef,
  position,
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose, anchorRef);
  return (
    <div
      ref={ref}
      className={`context-menu-popup absolute z-50 ${position === "above" ? "bottom-full mb-2" : "top-full mt-2"} ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "contextMenuIn 0.18s cubic-bezier(0.34,1.4,0.64,1)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasText && onCopy && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopy();
          }}
          style={{ touchAction: "manipulation" }}
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
      {isOwn && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          style={{ touchAction: "manipulation" }}
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

// ─── Reaction Bar ─────────────────────────────────────────────────────────────
function ReactionBar({ isOwn, currentReaction, onReact, onClose, triggerRef }) {
  const ref = useRef();
  useOutsideClick(ref, onClose, triggerRef);
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
          style={{ touchAction: "manipulation" }}
          className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90
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

// ─── Reaction Summary ─────────────────────────────────────────────────────────
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

// ─── Tick Icon ────────────────────────────────────────────────────────────────
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

// ─── Message Content ──────────────────────────────────────────────────────────
function MessageContent({ message, isOwn, onImageClick }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showFileActions, setShowFileActions] = useState(false);
  const fileMenuRef = useRef();

  useEffect(() => {
    if (!showFileActions) return;
    const handler = (e) => {
      if (!fileMenuRef.current?.contains(e.target)) setShowFileActions(false);
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
  }, [showFileActions]);

  if (message.type === "image") {
    return (
      /* FIX: no border, no outline, no ring on image wrapper */
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
        {!imgError ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(message.content);
            }}
            style={{
              touchAction: "manipulation",
              display: imgLoaded ? "block" : "none",
              /* Remove ALL default button styling that causes borders */
              background: "none",
              border: "none",
              outline: "none",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
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
                /* No border at all */
                border: "none",
                outline: "none",
              }}
              draggable={false}
            />
            {/* Zoom overlay */}
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
        ) : (
          <div
            className="rounded-xl flex items-center justify-center text-xs opacity-60 px-4 py-3"
            style={{ background: "rgba(128,128,128,0.1)", minWidth: 120 }}
          >
            Image unavailable
          </div>
        )}
      </div>
    );
  }

  if (message.type === "file") {
    const fileName = message.fileName || "File";
    const url = message.content;
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    return (
      <div className="relative" ref={fileMenuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFileActions((v) => !v);
          }}
          style={{ touchAction: "manipulation" }}
          className={`flex items-center gap-3 min-w-[180px] max-w-[240px] p-1 rounded-xl hover:opacity-80 transition-opacity text-left w-full ${isOwn ? "text-white" : "text-[var(--text-primary)]"}`}
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
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p
              className={`text-[11px] mt-0.5 ${isOwn ? "text-white/55" : "text-[var(--text-muted)]"}`}
            >
              Tap to open · download
            </p>
          </div>
          <Download size={14} className="flex-shrink-0 opacity-50" />
        </button>
        {showFileActions && (
          <div
            className="absolute bottom-full mb-2 left-0 z-50 py-1.5 min-w-[180px] shadow-2xl rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              animation: "contextMenuIn 0.16s ease-out",
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
            }}
          >
            {isPdf && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowFileActions(false)}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <ExternalLink size={14} className="text-[var(--text-muted)]" />
                <span>Open PDF</span>
              </a>
            )}
            <a
              href={url}
              download={fileName}
              onClick={() => setShowFileActions(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Download size={14} className="text-[var(--text-muted)]" />
              <span>Download</span>
            </a>
          </div>
        )}
      </div>
    );
  }

  return <span>{message.content}</span>;
}

// ─── Main MessageBubble ───────────────────────────────────────────────────────
export default function MessageBubble({ message, isOwn, showAvatar, sender }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [menuPosition, setMenuPosition] = useState("above");

  const longPressTimer = useRef(null);
  const longFired = useRef(false);
  const isPressingRef = useRef(false);
  const touchStartPos = useRef(null);
  const menuBtnRef = useRef();
  const smileBtnRef = useRef();
  const bubbleRef = useRef();

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

  const closeAll = useCallback(() => {
    setShowMenu(false);
    setShowReactions(false);
  }, []);

  const openReactions = useCallback(() => {
    setShowReactions(true);
    setShowMenu(false);
  }, []);

  const openMenu = useCallback(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      setMenuPosition(rect.top > 180 ? "above" : "below");
    }
    setShowMenu(true);
    setShowReactions(false);
  }, []);

  // FIX: Long press now opens BOTH reaction bar + context menu together (like WhatsApp)
  const openBoth = useCallback(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      setMenuPosition(rect.top > 180 ? "above" : "below");
    }
    setShowReactions(true);
    setShowMenu(true);
  }, []);

  const handleCopy = useCallback(async () => {
    closeAll();
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied!");
    } catch {
      try {
        const el = Object.assign(document.createElement("textarea"), {
          value: message.content,
          style: "position:fixed;opacity:0",
        });
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
      const currentEmoji = reactions[myUserId];
      const isToggle = currentEmoji === emoji;
      updateReaction(message._id, myUserId, isToggle ? null : emoji);
      try {
        await axios.post(`/messages/${message._id}/react`, {
          emoji: isToggle ? null : emoji,
        });
      } catch {
        updateReaction(message._id, myUserId, currentEmoji || null);
        toast.error("Reaction failed");
      }
    },
    [message._id, myUserId, reactions],
  );

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(
    (e) => {
      // Allow native button/img/a clicks to pass through
      if (["A", "BUTTON"].includes(e.target.tagName)) return;

      longFired.current = false;
      isPressingRef.current = true;
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      longPressTimer.current = setTimeout(() => {
        longFired.current = true;
        isPressingRef.current = false;
        window.getSelection()?.removeAllRanges();
        if (navigator.vibrate) navigator.vibrate(20);
        // FIX: Open both reaction bar AND context menu on long press (sender & receiver)
        openBoth();
      }, LONG_PRESS_MS);
    },
    [openBoth],
  );

  const handleTouchMove = useCallback((e) => {
    if (!isPressingRef.current || !touchStartPos.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current);
      isPressingRef.current = false;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      // Allow native button/img/a taps
      if (["A", "BUTTON"].includes(e.target.tagName)) return;

      clearTimeout(longPressTimer.current);
      const wasLong = longFired.current;
      isPressingRef.current = false;
      touchStartPos.current = null;
      longFired.current = false;

      if (!wasLong) {
        // FIX: For image messages, single tap opens lightbox instead of menu
        if (message.type === "image") return;

        setShowMenu((prev) => {
          if (prev) return false;
          setShowReactions(false);
          return true;
        });
      }
    },
    [message.type],
  );

  if (isDeleting) return null;

  // ── Optimistic message ──────────────────────────────────────────────────────
  if (message._isOptimistic) {
    return (
      <div className="flex flex-col items-end mb-0.5">
        <div className="flex items-end gap-2 w-full flex-row-reverse">
          <div className="flex flex-col gap-0.5 items-end min-w-0">
            <div className="message-bubble-out break-words whitespace-pre-wrap opacity-70 relative pb-4">
              {message.type === "image" ? (
                <img
                  src={message.content}
                  alt="sending..."
                  className="rounded-xl max-h-48 block"
                  loading="lazy"
                  style={{ maxWidth: 200, border: "none", outline: "none" }}
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

  const touch = isTouch();
  const displayMessage = storeMessage || message;

  // FIX: For image bubbles — remove padding so image sits flush, no bubble bg showing as border
  const isImageMsg = displayMessage.type === "image";

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
            <div className="relative flex items-center gap-1 max-w-full">
              {/* Desktop hover action buttons */}
              {!touch && (
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
                  <button
                    ref={menuBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      showMenu ? closeAll() : openMenu();
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                    title="More"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              )}

              <div className="relative" ref={bubbleRef}>
                {/*
                  FIX: Image messages get bare wrapper with no background/padding (avoids purple border effect).
                  Text/file messages keep the normal bubble class.
                */}
                <div
                  className={
                    isImageMsg
                      ? `relative animate-slide-up rounded-xl overflow-hidden`
                      : `relative ${isOwn ? "message-bubble-out" : "message-bubble-in"} break-words whitespace-pre-wrap animate-slide-up`
                  }
                  style={
                    isImageMsg
                      ? {
                          /* No padding, no background — image IS the bubble */
                          padding: 0,
                          background: "none",
                          border: "none",
                          outline: "none",
                          boxShadow: "none",
                          lineHeight: 0,
                        }
                      : { paddingBottom: "1.25rem", minWidth: "60px" }
                  }
                  onTouchStart={touch ? handleTouchStart : undefined}
                  onTouchMove={touch ? handleTouchMove : undefined}
                  onTouchEnd={touch ? handleTouchEnd : undefined}
                >
                  <MessageContent
                    message={displayMessage}
                    isOwn={isOwn}
                    onImageClick={setLightboxSrc}
                  />

                  {/* Timestamp — only for non-image messages */}
                  {!isImageMsg && (
                    <span
                      className={`absolute bottom-1 text-[9px] leading-none pointer-events-none ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </span>
                  )}

                  {/* Reaction bar — shown inside bubble (positioned relative to it) */}
                  {showReactions && (
                    <ReactionBar
                      isOwn={isOwn}
                      currentReaction={myReaction}
                      onReact={handleReact}
                      onClose={closeAll}
                      triggerRef={smileBtnRef}
                    />
                  )}

                  {/* Context menu */}
                  {showMenu && (
                    <ContextMenu
                      isOwn={isOwn}
                      hasText={message.type === "text"}
                      onCopy={message.type === "text" ? handleCopy : null}
                      onDelete={handleDelete}
                      onClose={closeAll}
                      anchorRef={menuBtnRef}
                      position={menuPosition}
                    />
                  )}
                </div>

                {/* Image timestamp overlay (bottom-right of image) */}
                {isImageMsg && (
                  <span
                    className={`absolute bottom-2 text-[9px] leading-none pointer-events-none px-1.5 py-0.5 rounded-md`}
                    style={{
                      right: "8px",
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
            </div>

            {isOwn && (
              <div
                className="px-1 flex justify-end"
                style={{ marginTop: hasReactions ? "0.625rem" : undefined }}
              >
                <TickIcon status={displayMessage.status || message.status} />
              </div>
            )}
          </div>

          {!isOwn && <div className="w-5 flex-shrink-0" />}
        </div>
      </div>
    </>
  );
}
