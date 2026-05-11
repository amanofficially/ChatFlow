import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Trash2,
  SmilePlus,
  FileText,
  Download,
  ExternalLink,
  Reply,
  Star,
  Forward,
} from "lucide-react";
import { formatMessageTime, getStoredUserId } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 420;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useIsPhone() {
  const [phone, setPhone] = useState(
    () =>
      typeof window !== "undefined" &&
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

function useOutsideClick(ref, onClose, ignoreRefs = []) {
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, onClose]);
}

async function blobDownload(url, fallbackName = "file") {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext =
      blob.type.split("/")[1] || fallbackName.split(".").pop() || "bin";
    const name = fallbackName.includes(".")
      ? fallbackName
      : `${fallbackName}.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: objectUrl,
      download: name,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// ─── BubbleTail ───────────────────────────────────────────────────────────────
// WhatsApp-style SVG tail on bubbles
function BubbleTail({ isOwn }) {
  if (isOwn) {
    return (
      <span
        className="absolute top-0 -right-[7px] pointer-events-none"
        style={{ lineHeight: 0 }}
      >
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
          <path d="M8 0 Q8 13 0 13 L8 13 Z" fill="var(--bubble-out, #DCF8C6)" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="absolute top-0 -left-[7px] pointer-events-none"
      style={{ lineHeight: 0 }}
    >
      <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
        <path d="M0 0 Q0 13 8 13 L0 13 Z" fill="var(--bubble-in, #FFFFFF)" />
      </svg>
    </span>
  );
}

// ─── TickIcon ──────────────────────────────────────────────────────────────────
// WhatsApp-style: blue double-tick = read, grey double = delivered, grey single = sent
function TickIcon({ status }) {
  if (status === "read")
    return (
      <span className="flex-shrink-0" style={{ lineHeight: 0 }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <polyline
            points="1 5 4.5 8.5 9.5 2"
            stroke="#53BDEB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="6 5 9.5 8.5 14.5 2"
            stroke="#53BDEB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  if (status === "delivered")
    return (
      <span className="flex-shrink-0" style={{ lineHeight: 0 }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <polyline
            points="1 5 4.5 8.5 9.5 2"
            stroke="var(--color-muted, #667781)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="6 5 9.5 8.5 14.5 2"
            stroke="var(--color-muted, #667781)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  // sent (single tick)
  return (
    <span className="flex-shrink-0" style={{ lineHeight: 0 }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <polyline
          points="1 5 4.5 8.5 10 2"
          stroke="var(--color-muted, #667781)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// ─── ReplyPreview ─────────────────────────────────────────────────────────────
// Quoted reply bar inside bubble (WhatsApp style)
function ReplyPreview({ reply, isOwn }) {
  if (!reply) return null;
  return (
    <div
      className={`rounded-md mb-1.5 px-2.5 py-1.5 text-xs border-l-[3px] border-[var(--brand)]
        ${isOwn ? "bg-black/10" : "bg-black/5"}`}
      style={{ maxWidth: "100%" }}
    >
      <p className="font-semibold text-[var(--brand)] mb-0.5 truncate">
        {reply.senderName || "You"}
      </p>
      <p className="text-[var(--text-muted)] truncate">{reply.text}</p>
    </div>
  );
}

// ─── EmojiBar ─────────────────────────────────────────────────────────────────
function EmojiBar({ currentReaction, onReact }) {
  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1.5 rounded-full border border-[var(--border)]"
      style={{
        background: "var(--bg-secondary)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
        animation: "reactionBarIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onReact(emoji)}
          style={{ touchAction: "manipulation" }}
          className={`text-xl w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90
            ${
              currentReaction === emoji
                ? "bg-[var(--brand)]/15 scale-110 ring-2 ring-[var(--brand)]/40"
                : "hover:bg-[var(--bg-tertiary)] hover:scale-125"
            }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── ContextMenu ──────────────────────────────────────────────────────────────
// WhatsApp-style action sheet on mobile, popover on desktop
function ContextMenu({
  isOwn,
  messageType,
  content,
  fileName,
  onCopy,
  onDelete,
  onReply,
  onStar,
  onForward,
  onClose,
  ignoreRefs = [],
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose, ignoreRefs);

  const isText = messageType === "text";
  const isImage = messageType === "image";
  const isFile = messageType === "file";
  const isPdf = isFile && fileName?.toLowerCase().endsWith(".pdf");

  const iconBg = "color-mix(in srgb, var(--brand) 12%, transparent)";
  const dangerBg = "rgba(239,68,68,0.12)";

  const Item = ({ icon: Icon, label, onClick, danger = false }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`context-menu-item ${danger ? "danger" : ""}`}
    >
      <div
        className="context-menu-icon"
        style={{ background: danger ? dangerBg : iconBg }}
      >
        <Icon
          size={13}
          style={{ color: danger ? "#ef4444" : "var(--brand)" }}
        />
      </div>
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={ref}
      className={`context-menu-popup absolute bottom-full mb-2 z-50 ${isOwn ? "right-0" : "left-0"}`}
      style={{ animation: "contextMenuIn 0.18s cubic-bezier(0.34,1.4,0.64,1)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <Item icon={Reply} label="Reply" onClick={onReply} />
      {isText && <Item icon={Copy} label="Copy text" onClick={onCopy} />}
      <Item
        icon={Star}
        label="Star message"
        onClick={() => {
          onStar?.();
          onClose();
        }}
      />
      <Item
        icon={Forward}
        label="Forward"
        onClick={() => {
          onForward?.();
          onClose();
        }}
      />
      {(isImage || isFile) && (
        <Item
          icon={Download}
          label="Download"
          onClick={() => {
            onClose();
            blobDownload(content, fileName || "file");
          }}
        />
      )}
      {isPdf && (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="context-menu-item"
          onMouseDown={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <div className="context-menu-icon" style={{ background: iconBg }}>
            <ExternalLink size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Open PDF</span>
        </a>
      )}
      {isOwn && <Item icon={Trash2} label="Delete" onClick={onDelete} danger />}
    </div>
  );
}

// ─── DeleteSheet ──────────────────────────────────────────────────────────────
// WhatsApp-style "Delete for me / Delete for everyone" bottom sheet
export function DeleteSheet({ onDeleteForMe, onDeleteForAll, onCancel }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end justify-center">
      <div
        className="w-full max-w-sm rounded-t-2xl bg-[var(--bg-secondary)] border-t border-[var(--border)] overflow-hidden"
        style={{ animation: "sheetSlideUp 0.22s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)] text-center">
            Delete message?
          </p>
        </div>
        <button
          onClick={onDeleteForAll}
          className="w-full px-4 py-4 text-left text-sm font-medium text-red-500 border-b border-[var(--border)] active:bg-[var(--bg-tertiary)] transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          Delete for everyone
        </button>
        <button
          onClick={onDeleteForMe}
          className="w-full px-4 py-4 text-left text-sm font-medium text-[var(--text-primary)] border-b border-[var(--border)] active:bg-[var(--bg-tertiary)] transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          Delete for me
        </button>
        <button
          onClick={onCancel}
          className="w-full px-4 py-4 text-left text-sm font-medium text-[var(--text-muted)] active:bg-[var(--bg-tertiary)] transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmModal (kept for non-delete uses) ──────────────────────────────────
export function ConfirmModal({
  icon: Icon = Trash2,
  iconBg = "bg-red-500/10",
  iconColor = "text-red-400",
  title,
  body,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  confirmClass = "bg-red-500 hover:bg-red-600 text-white",
}) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 shadow-2xl"
        style={{ animation: "sheetSlideUp 0.22s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div
          className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}
        >
          <Icon size={22} className={iconColor} />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">
          {title}
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">
          {body}
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ touchAction: "manipulation" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${confirmClass}`}
            style={{ touchAction: "manipulation" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
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

// ─── SelectionCheckbox ────────────────────────────────────────────────────────
function SelectionCheckbox({ checked, isOwn }) {
  return (
    <div
      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
        ${checked ? "bg-[var(--brand)] border-[var(--brand)] scale-110" : "bg-[var(--bg-secondary)] border-[var(--border)]"}
        ${isOwn ? "ml-2" : "mr-2"}`}
    >
      {checked && <Check size={13} className="text-white" strokeWidth={3} />}
    </div>
  );
}

// ─── MessageContent ───────────────────────────────────────────────────────────
function MessageContent({ message, isOwn }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (message.type === "image") {
    return (
      <div style={{ lineHeight: 0 }}>
        {!imgLoaded && !imgError && (
          <div
            className="rounded-xl animate-pulse flex items-center justify-center"
            style={{
              width: "clamp(160px, min(65vw, 42vh), 280px)",
              height: "clamp(120px, min(48vw, 32vh), 220px)",
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
          <div
            className="rounded-xl overflow-hidden"
            style={{ display: imgLoaded ? "block" : "none" }}
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
              draggable={false}
              style={{
                width: "clamp(160px, min(65vw, 42vh), 280px)",
                height: "clamp(120px, min(48vw, 32vh), 220px)",
                objectFit: "cover",
                display: "block",
                borderRadius: "0.75rem",
                WebkitTouchCallout: "default",
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (message.type === "file") {
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
          <p className="text-sm font-medium truncate">
            {message.fileName || "File"}
          </p>
          <p
            className={`text-[11px] mt-0.5 ${isOwn ? "text-white/55" : "text-[var(--text-muted)]"}`}
          >
            Hold to download
          </p>
        </div>
        <Download size={14} className="flex-shrink-0 opacity-40" />
      </div>
    );
  }

  return <span>{message.content}</span>;
}

// ─── MessageBubble (main export) ──────────────────────────────────────────────
export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  sender,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onEnterMultiSelect,
  onReply,          // NEW: (message) => void — triggers reply composer
  onStar,           // NEW: (messageId) => void
  onForward,        // NEW: (messageId) => void
  activeSingleId,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  // WhatsApp: tap opens emoji+menu together as one overlay on mobile
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    return (
      (s.messagesByConv[activeConversationId] || []).find(
        (m) => m._id === message._id
      ) || null
    );
  });

  const reactions = useMemo(() => {
    const r = storeMessage?.reactions || message.reactions || {};
    return r instanceof Map ? Object.fromEntries(r) : r;
  }, [storeMessage?.reactions, message.reactions]);

  const myUserId = useMemo(() => getStoredUserId(), []);
  const myReaction = reactions[myUserId];
  const hasReactions = Object.keys(reactions).length > 0;
  const displayMsg = storeMessage || message;
  const isImageMsg = displayMsg.type === "image";
  const isTextMsg = displayMsg.type === "text";

  const closeAll = useCallback(() => {
    setShowMenu(false);
    setShowReactions(false);
    setShowMobileOverlay(false);
  }, []);

  // Close when another bubble becomes active
  useEffect(() => {
    if (activeSingleId !== message._id) setShowMobileOverlay(false);
  }, [activeSingleId, message._id]);

  // Close on multi-select enter
  useEffect(() => {
    if (selectionMode) closeAll();
  }, [selectionMode, closeAll]);

  // Close mobile overlay on outside tap
  useEffect(() => {
    if (!showMobileOverlay) return;
    const handler = (e) => {
      if (e.target.closest("[data-overlay]")) return;
      setShowMobileOverlay(false);
    };
    const t = setTimeout(
      () => document.addEventListener("touchstart", handler, { passive: true }),
      80
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("touchstart", handler);
    };
  }, [showMobileOverlay]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    closeAll();
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Copied!");
    } catch {
      try {
        const el = Object.assign(document.createElement("textarea"), {
          value: message.content,
        });
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

  const handleDelete = useCallback(
    async (forEveryone = false) => {
      closeAll();
      setDeleteSheet(false);
      setIsDeleting(true);
      try {
        await axios.delete(`/messages/${message._id}`, {
          data: { forEveryone },
        });
        removeMessage(message._id, activeConversationId);
        toast.success(
          forEveryone ? "Deleted for everyone" : "Message deleted"
        );
      } catch {
        setIsDeleting(false);
        toast.error("Could not delete message");
      }
    },
    [message._id, activeConversationId, removeMessage, closeAll]
  );

  const handleReact = useCallback(
    async (emoji) => {
      if (!myUserId) return;
      const { updateReaction } = useChatStore.getState();
      const prev = reactions[myUserId];
      const next = prev === emoji ? null : emoji;
      updateReaction(message._id, myUserId, next);
      closeAll();
      try {
        await axios.post(`/messages/${message._id}/react`, { emoji: next });
      } catch {
        updateReaction(message._id, myUserId, prev || null);
        toast.error("Reaction failed");
      }
    },
    [message._id, myUserId, reactions, closeAll]
  );

  const handleReply = useCallback(() => {
    closeAll();
    onReply?.(displayMsg);
  }, [closeAll, onReply, displayMsg]);

  const handleStar = useCallback(() => {
    closeAll();
    onStar?.(message._id);
    toast.success("Message starred ⭐");
  }, [closeAll, onStar, message._id]);

  const handleForward = useCallback(() => {
    closeAll();
    onForward?.(message._id);
  }, [closeAll, onForward, message._id]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = useCallback(
    (e) => {
      if (["A", "BUTTON"].includes(e.target.tagName)) return;
      longFired.current = false;
      isPressing.current = true;
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      longPressTimer.current = setTimeout(() => {
        longFired.current = true;
        isPressing.current = false;
        window.getSelection()?.removeAllRanges();
        if (navigator.vibrate) navigator.vibrate(18);
        if (selectionMode) {
          onSelect?.(message._id);
        } else {
          onEnterMultiSelect?.(message._id);
        }
      }, LONG_PRESS_MS);
    },
    [selectionMode, onSelect, onEnterMultiSelect, message._id]
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
      if (selectionMode) {
        onSelect?.(message._id);
        return;
      }
      // WhatsApp: single tap opens combined emoji+menu overlay on mobile
      setShowMobileOverlay((prev) => !prev);
    },
    [selectionMode, onSelect, message._id]
  );

  const handleBubbleClick = useCallback(
    (e) => {
      if (selectionMode) {
        e.stopPropagation();
        onSelect?.(message._id);
      }
    },
    [selectionMode, onSelect, message._id]
  );

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
                    width: "clamp(160px, min(65vw, 42vh), 280px)",
                    height: "clamp(120px, min(48vw, 32vh), 220px)",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: "0.75rem",
                  }}
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* WhatsApp-style delete sheet (two options) */}
      {deleteSheet && (
        <DeleteSheet
          onDeleteForMe={() => handleDelete(false)}
          onDeleteForAll={() => handleDelete(true)}
          onCancel={() => setDeleteSheet(false)}
        />
      )}

      <div
        className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-0.5 transition-colors duration-150
          ${selectionMode ? "cursor-pointer select-none" : ""}
          ${isSelected ? "bg-[var(--brand)]/10 rounded-xl" : ""}
          ${showMobileOverlay ? "bg-[var(--brand)]/5 rounded-xl" : ""}`}
        style={{ marginBottom: hasReactions ? "0.875rem" : undefined }}
        onClick={handleBubbleClick}
      >
        <div
          className={`flex items-end gap-2 group w-full ${isOwn ? "flex-row-reverse" : ""}`}
        >
          {selectionMode && (
            <SelectionCheckbox checked={isSelected} isOwn={isOwn} />
          )}

          {!isOwn && (
            <div
              className={`flex-shrink-0 ${showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <Avatar user={sender} size="xs" />
            </div>
          )}

          <div
            className={`flex flex-col gap-0 min-w-0 ${isOwn ? "items-end" : "items-start"}`}
          >
            <div className="relative flex items-center gap-1.5 max-w-full">
              {/* Desktop hover action buttons */}
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
                      showReactions
                        ? closeAll()
                        : (setShowReactions(true), setShowMenu(false));
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
                    title="React"
                  >
                    {myReaction ? (
                      <span className="text-base leading-none">{myReaction}</span>
                    ) : (
                      <SmilePlus size={14} />
                    )}
                  </button>
                  <button
                    ref={menuBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      showMenu
                        ? closeAll()
                        : (setShowMenu(true), setShowReactions(false));
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                    title="More options"
                  >
                    {/* chevron-down icon — WhatsApp desktop style */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Bubble + overlays */}
              <div className="relative">
                {/* Desktop emoji picker */}
                {!phone && showReactions && (
                  <div
                    className={`absolute bottom-full mb-2 z-50 ${isOwn ? "right-0" : "left-0"}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmojiBar
                      currentReaction={myReaction}
                      onReact={handleReact}
                    />
                  </div>
                )}

                {/* Desktop context menu */}
                {!phone && showMenu && (
                  <ContextMenu
                    isOwn={isOwn}
                    messageType={displayMsg.type}
                    content={displayMsg.content}
                    fileName={displayMsg.fileName}
                    onCopy={handleCopy}
                    onDelete={() => {
                      closeAll();
                      setDeleteSheet(true);
                    }}
                    onReply={handleReply}
                    onStar={handleStar}
                    onForward={handleForward}
                    onClose={closeAll}
                    ignoreRefs={[menuBtnRef]}
                  />
                )}

                {/* ── Bubble ───────────────────────────────────────────── */}
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
                          lineHeight: 0,
                        }
                      : { paddingBottom: "1.25rem", minWidth: "60px" }
                  }
                  onTouchStart={phone ? onTouchStart : undefined}
                  onTouchMove={phone ? onTouchMove : undefined}
                  onTouchEnd={phone ? onTouchEnd : undefined}
                >
                  {/* WhatsApp tail */}
                  {!isImageMsg && <BubbleTail isOwn={isOwn} />}

                  {/* Reply preview */}
                  {!isImageMsg && displayMsg.replyTo && (
                    <ReplyPreview
                      reply={displayMsg.replyTo}
                      isOwn={isOwn}
                    />
                  )}

                  <MessageContent message={displayMsg} isOwn={isOwn} />

                  {!isImageMsg && (
                    <span
                      className={`absolute bottom-1 text-[9px] leading-none pointer-events-none flex items-center gap-0.5
                        ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}
                    >
                      {formatMessageTime(message.createdAt)}
                      {isOwn && (
                        <span className="ml-0.5">
                          <TickIcon
                            status={displayMsg.status || message.status}
                          />
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Image timestamp overlay */}
                {isImageMsg && (
                  <span
                    className="absolute bottom-2 right-2 text-[9px] leading-none pointer-events-none px-1.5 py-0.5 rounded-md flex items-center gap-1"
                    style={{
                      color: "#fff",
                      background: "rgba(0,0,0,0.42)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {formatMessageTime(message.createdAt)}
                    {isOwn && (
                      <TickIcon status={displayMsg.status || message.status} />
                    )}
                  </span>
                )}

                <ReactionSummary
                  reactions={reactions}
                  isOwn={isOwn}
                  onPillClick={() => {
                    setShowReactions((p) => !p);
                    setShowMenu(false);
                  }}
                />
              </div>
            </div>

            {/* Mobile overlay: emoji bar + context actions stacked */}
            {phone && showMobileOverlay && !selectionMode && (
              <div
                data-overlay
                className={`flex flex-col gap-1.5 mt-1.5 ${isOwn ? "items-end mr-1" : "items-start ml-1"}`}
                style={{
                  animation: "reactionBarIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                {/* Emoji row */}
                <EmojiBar
                  currentReaction={myReaction}
                  onReact={handleReact}
                />

                {/* Action pills row */}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-2xl border border-[var(--border)]"
                  style={{
                    background: "var(--bg-secondary)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                  }}
                >
                  {/* Reply */}
                  <ActionPill
                    icon={Reply}
                    label="Reply"
                    onClick={handleReply}
                  />
                  {/* Copy (text only) */}
                  {isTextMsg && (
                    <ActionPill
                      icon={Copy}
                      label="Copy"
                      onClick={() => {
                        setShowMobileOverlay(false);
                        handleCopy();
                      }}
                    />
                  )}
                  {/* Star */}
                  <ActionPill icon={Star} label="Star" onClick={handleStar} />
                  {/* Forward */}
                  <ActionPill
                    icon={Forward}
                    label="Forward"
                    onClick={handleForward}
                  />
                  {/* Download (image/file) */}
                  {(displayMsg.type === "image" ||
                    displayMsg.type === "file") && (
                    <ActionPill
                      icon={Download}
                      label="Save"
                      onClick={() => {
                        setShowMobileOverlay(false);
                        blobDownload(
                          displayMsg.content,
                          displayMsg.fileName || "file"
                        );
                      }}
                    />
                  )}
                  {/* Delete (own messages) */}
                  {isOwn && (
                    <ActionPill
                      icon={Trash2}
                      label="Delete"
                      danger
                      onClick={() => {
                        setShowMobileOverlay(false);
                        setDeleteSheet(true);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {!isOwn && <div className="w-5 flex-shrink-0" />}
        </div>
      </div>
    </>
  );
}

// ─── ActionPill ───────────────────────────────────────────────────────────────
// Small icon+label button used in the mobile action row
function ActionPill({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ touchAction: "manipulation" }}
      className={`flex flex-col items-center gap-0.5 px-2.5 h-12 justify-center rounded-xl transition active:scale-95
        ${
          danger
            ? "text-red-500 hover:bg-red-500/10"
            : "text-[var(--brand)] hover:bg-[var(--brand)]/10"
        }`}
    >
      <Icon size={17} />
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}