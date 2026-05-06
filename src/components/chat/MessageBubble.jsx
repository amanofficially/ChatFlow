import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Trash2,
  SmilePlus,
  FileText,
  Download,
  X as XIcon,
  ZoomIn,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { formatMessageTime } from "../../utils/helpers";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import axios from "axios";
import useChatStore from "../../context/chatStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "👎"];
const LONG_PRESS_MS = 420;
const SCROLL_THRESHOLD = 8;

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useIsPhone() {
  const [phone, setPhone] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const h = (e) => setPhone(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return phone;
}

// Closes a panel when clicking/touching outside ref (ignoreRefs are safe zones)
function useOutsideClick(ref, onClose, enabled, ignoreRefs = []) {
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
  }, [enabled]); // eslint-disable-line
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function shouldOpenUp(anchorEl) {
  if (!anchorEl) return true;
  const rect = anchorEl.getBoundingClientRect();
  return rect.top >= 72 || rect.top > window.innerHeight - rect.bottom;
}

// ─── EmojiBar ─────────────────────────────────────────────────────────────────
function EmojiBar({ currentReaction, onReact }) {
  return (
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

// ─── MobileActionSheet ────────────────────────────────────────────────────────
// Single tap on mobile: shows reaction bar + relevant context actions.
// Auto-hides on outside tap or after reacting.
function MobileActionSheet({
  isOwn,
  currentReaction,
  onReact,
  messageType,
  content,
  fileName,
  onOpenImage,
  onCopy,
  onDelete,
  onDismiss,
  anchorEl,
}) {
  const openUp = shouldOpenUp(anchorEl);
  const isText = messageType === "text";
  const isImage = messageType === "image";
  const isFile = messageType === "file";
  const isPdf = isFile && fileName?.toLowerCase().endsWith(".pdf");

  const actionBtn =
    "flex items-center gap-2.5 px-4 h-11 w-full text-left text-sm font-medium transition active:scale-95 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]";
  const dangerBtn =
    "flex items-center gap-2.5 px-4 h-11 w-full text-left text-sm font-medium transition active:scale-95 text-red-400 hover:bg-red-500/10";

  return (
    <div
      data-sheet
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: isOwn ? "flex-end" : "flex-start",
        ...(isOwn ? { right: 0 } : { left: 0 }),
        ...(openUp
          ? { bottom: "calc(100% + 10px)" }
          : { top: "calc(100% + 10px)" }),
        pointerEvents: "auto",
      }}
    >
      {/* Reactions row */}
      <EmojiBar currentReaction={currentReaction} onReact={onReact} />

      {/* Context actions */}
      <div
        className="flex flex-col py-1 rounded-2xl border border-[var(--border)] overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "reactionBarIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          alignSelf: isOwn ? "flex-end" : "flex-start",
          minWidth: 168,
        }}
      >
        {isText && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onDismiss();
              onCopy();
            }}
            style={{ touchAction: "manipulation" }}
            className={actionBtn}
          >
            <Copy size={15} className="text-[var(--brand)] flex-shrink-0" />
            Copy text
          </button>
        )}

        {isImage && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onDismiss();
              onOpenImage();
            }}
            style={{ touchAction: "manipulation" }}
            className={actionBtn}
          >
            <ZoomIn size={15} className="text-[var(--brand)] flex-shrink-0" />
            View image
          </button>
        )}

        {(isImage || isFile) && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onDismiss();
              blobDownload(content, fileName || "image");
            }}
            style={{ touchAction: "manipulation" }}
            className={actionBtn}
          >
            <Download size={15} className="text-[var(--brand)] flex-shrink-0" />
            Download
          </button>
        )}

        {isPdf && (
          <a
            href={content}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDismiss}
            style={{ touchAction: "manipulation" }}
            className={actionBtn}
          >
            <ExternalLink
              size={15}
              className="text-[var(--brand)] flex-shrink-0"
            />
            Open PDF
          </a>
        )}

        {isOwn && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onDismiss();
              onDelete();
            }}
            style={{ touchAction: "manipulation" }}
            className={dangerBtn}
          >
            <Trash2 size={15} className="flex-shrink-0" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ContextMenu (desktop) ────────────────────────────────────────────────────
function ContextMenu({
  isOwn,
  messageType,
  content,
  fileName,
  onCopy,
  onDelete,
  onClose,
  ignoreRefs,
}) {
  const ref = useRef();
  useOutsideClick(ref, onClose, true, ignoreRefs);

  const isText = messageType === "text";
  const isImage = messageType === "image";
  const isFile = messageType === "file";
  const isPdf = isFile && fileName?.toLowerCase().endsWith(".pdf");
  const iconBrand = {
    background: "color-mix(in srgb, var(--brand) 12%, transparent)",
  };
  const iconDanger = { background: "rgba(239,68,68,0.12)" };

  return (
    <div
      ref={ref}
      className={`context-menu-popup absolute bottom-full mb-2 z-50 ${isOwn ? "right-0" : "left-0"}`}
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
          <div className="context-menu-icon" style={iconBrand}>
            <Copy size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Copy text</span>
        </button>
      )}
      {(isImage || isFile) && (
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
            blobDownload(content, fileName || "image");
          }}
          className="context-menu-item"
        >
          <div className="context-menu-icon" style={iconBrand}>
            <Download size={13} style={{ color: "var(--brand)" }} />
          </div>
          <span>Download</span>
        </button>
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
          <div className="context-menu-icon" style={iconBrand}>
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
          <div className="context-menu-icon" style={iconDanger}>
            <Trash2 size={13} style={{ color: "#ef4444" }} />
          </div>
          <span>Delete</span>
        </button>
      )}
    </div>
  );
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
      style={{ background: "rgba(0,0,0,0.96)", backdropFilter: "blur(20px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        }}
      >
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-xs font-medium active:scale-95"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            touchAction: "manipulation",
          }}
          onClick={() => blobDownload(src, "image")}
        >
          <Download size={14} />
          <span>Save</span>
        </button>
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          <span className="text-white/40 text-xs">Loading image…</span>
        </div>
      )}

      <img
        src={src}
        alt="full size"
        onLoad={() => setLoaded(true)}
        onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
        className="rounded-2xl object-contain transition-transform duration-200 select-none"
        style={{
          maxWidth: "min(94vw, 900px)",
          maxHeight: "85dvh",
          width: "auto",
          height: "auto",
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
            style={{ touchAction: "manipulation" }}
            className="flex-1 h-11 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ touchAction: "manipulation" }}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${confirmClass}`}
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
  const counts = useMemo(() => {
    if (!reactions || Object.keys(reactions).length === 0) return null;
    const c = {};
    Object.values(reactions).forEach((e) => {
      c[e] = (c[e] || 0) + 1;
    });
    return c;
  }, [reactions]);

  if (!counts) return null;

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
function MessageContent({ message, isOwn, onImageClick, disableImageClick }) {
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
            onClick={(e) => {
              e.stopPropagation();
              if (!disableImageClick) onImageClick(message.content);
            }}
            className="group/img rounded-xl overflow-hidden focus:outline-none active:opacity-75 relative"
            style={{
              display: imgLoaded ? "block" : "none",
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              cursor: disableImageClick ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
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
                width: "clamp(140px, 55vw, 260px)",
                height: "clamp(100px, 42vw, 220px)",
                objectFit: "cover",
                display: "block",
                borderRadius: "0.75rem",
              }}
            />
            {!disableImageClick && (
              <div
                className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-150"
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                >
                  <ZoomIn size={18} className="text-white" />
                </div>
              </div>
            )}
          </button>
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
            Tap to download
          </p>
        </div>
        <Download size={14} className="flex-shrink-0 opacity-40" />
      </div>
    );
  }

  return <span>{message.content}</span>;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  sender,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onEnterMultiSelect,
  onBubbleTap,
  activeSingleId,
}) {
  // "reactions" | "menu" | "mobileSheet" | null
  const [activePanel, setActivePanel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const bubbleRef = useRef(null);
  const smileBtnRef = useRef();
  const menuBtnRef = useRef();
  const press = useRef({
    timer: null,
    fired: false,
    active: false,
    startX: 0,
    startY: 0,
  });

  const phone = useIsPhone();

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
  const showMobileSheet =
    phone && activePanel === "mobileSheet" && !selectionMode;

  const closeAll = useCallback(() => setActivePanel(null), []);

  // Close when another bubble is tapped
  useEffect(() => {
    if (activeSingleId !== message._id) setActivePanel(null);
  }, [activeSingleId, message._id]);

  // Close on selection mode
  useEffect(() => {
    if (selectionMode) setActivePanel(null);
  }, [selectionMode]);

  // Auto-hide mobile sheet on outside tap
  useEffect(() => {
    if (!showMobileSheet) return;
    const handler = (e) => {
      if (e.target.closest("[data-sheet]")) return;
      if (bubbleRef.current?.contains(e.target)) return;
      setActivePanel(null);
    };
    const t = setTimeout(
      () => document.addEventListener("touchstart", handler, { passive: true }),
      80,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("touchstart", handler);
    };
  }, [showMobileSheet]);

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

  // Auto-closes sheet after reacting
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
    [message._id, myUserId, reactions, closeAll],
  );

  // ── Touch handlers ───────────────────────────────────────────────────────
  const onTouchStart = useCallback(
    (e) => {
      if (["A", "BUTTON"].includes(e.target.tagName)) return;
      press.current = {
        timer: null,
        fired: false,
        active: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
      };
      press.current.timer = setTimeout(() => {
        press.current.fired = true;
        press.current.active = false;
        window.getSelection()?.removeAllRanges();
        if (navigator.vibrate) navigator.vibrate(18);
        if (selectionMode) {
          onSelect?.(message._id);
        } else if (isImageMsg) {
          setLightboxSrc(displayMsg.content);
          setActivePanel(null);
        } else {
          onEnterMultiSelect?.(message._id);
        }
      }, LONG_PRESS_MS);
    },
    [
      selectionMode,
      onSelect,
      onEnterMultiSelect,
      message._id,
      isImageMsg,
      displayMsg.content,
    ],
  );

  const onTouchMove = useCallback((e) => {
    if (!press.current.active) return;
    const dx = Math.abs(e.touches[0].clientX - press.current.startX);
    const dy = Math.abs(e.touches[0].clientY - press.current.startY);
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
      clearTimeout(press.current.timer);
      press.current.active = false;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (["A", "BUTTON"].includes(e.target.tagName)) return;
      clearTimeout(press.current.timer);
      const wasLong = press.current.fired;
      press.current.active = false;
      press.current.fired = false;
      if (wasLong) return;
      if (selectionMode) {
        onSelect?.(message._id);
        return;
      }
      // Single tap → toggle action sheet
      onBubbleTap?.(message._id);
      setActivePanel((prev) => (prev === "mobileSheet" ? null : "mobileSheet"));
    },
    [selectionMode, onSelect, onBubbleTap, message._id],
  );

  const handleBubbleClick = useCallback(
    (e) => {
      if (selectionMode) {
        e.stopPropagation();
        onSelect?.(message._id);
      }
    },
    [selectionMode, onSelect, message._id],
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
                    width: "clamp(140px, 55vw, 240px)",
                    height: "clamp(100px, 42vw, 200px)",
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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete message?"
          body="This message will be permanently deleted."
          onConfirm={() => {
            setConfirmDelete(false);
            handleDelete();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div
        className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-0.5 transition-colors duration-150
          ${selectionMode ? "cursor-pointer select-none" : ""}
          ${isSelected ? "bg-[var(--brand)]/10 rounded-xl" : ""}
          ${showMobileSheet ? "bg-[var(--brand)]/5 rounded-xl" : ""}`}
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
              {/* Desktop: hover action buttons */}
              {!phone && !selectionMode && (
                <div
                  className={`flex items-center gap-0.5 transition-opacity duration-150 flex-shrink-0
                    ${isOwn ? "order-first" : "order-last"}
                    opacity-0 group-hover:opacity-100
                    ${activePanel ? "!opacity-100" : ""}`}
                >
                  <button
                    ref={smileBtnRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePanel((p) =>
                        p === "reactions" ? null : "reactions",
                      );
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
                      setActivePanel((p) => (p === "menu" ? null : "menu"));
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              )}

              {/* Bubble wrapper — all absolute panels anchor here */}
              <div className="relative" ref={bubbleRef}>
                {/* Desktop: emoji picker */}
                {!phone && activePanel === "reactions" && (
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

                {/* Desktop: context menu */}
                {!phone && activePanel === "menu" && (
                  <ContextMenu
                    isOwn={isOwn}
                    messageType={displayMsg.type}
                    content={displayMsg.content}
                    fileName={displayMsg.fileName}
                    onCopy={handleCopy}
                    onDelete={() => {
                      closeAll();
                      setConfirmDelete(true);
                    }}
                    onClose={closeAll}
                    ignoreRefs={[menuBtnRef]}
                  />
                )}

                {/* Message bubble — text and image stay distinctly styled */}
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
                  <MessageContent
                    message={displayMsg}
                    isOwn={isOwn}
                    onImageClick={setLightboxSrc}
                    disableImageClick={phone}
                  />
                  {!isImageMsg && (
                    <span
                      className={`absolute bottom-1 text-[9px] leading-none pointer-events-none
                        ${isOwn ? "right-2 text-white/50" : "left-4 text-[var(--text-muted)]"}`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </span>
                  )}
                </div>

                {/* Timestamp overlay for images */}
                {isImageMsg && (
                  <span
                    className="absolute bottom-2 right-2 text-[9px] leading-none pointer-events-none px-1.5 py-0.5 rounded-md"
                    style={{
                      color: "#fff",
                      background: "rgba(0,0,0,0.42)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {formatMessageTime(message.createdAt)}
                  </span>
                )}

                <ReactionSummary
                  reactions={reactions}
                  isOwn={isOwn}
                  onPillClick={() =>
                    setActivePanel((p) =>
                      p === "reactions" ? null : "reactions",
                    )
                  }
                />

                {/* Mobile: single-tap opens reactions + relevant context actions */}
                {showMobileSheet && (
                  <MobileActionSheet
                    isOwn={isOwn}
                    currentReaction={myReaction}
                    messageType={displayMsg.type}
                    content={displayMsg.content}
                    fileName={displayMsg.fileName}
                    onOpenImage={() => {
                      setLightboxSrc(displayMsg.content);
                      setActivePanel(null);
                    }}
                    onReact={handleReact}
                    onCopy={handleCopy}
                    onDelete={() => {
                      closeAll();
                      setConfirmDelete(true);
                    }}
                    onDismiss={closeAll}
                    anchorEl={bubbleRef.current}
                  />
                )}
              </div>
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
