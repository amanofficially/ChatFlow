import { useEffect, useLayoutEffect, useRef, useState, memo, useMemo, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "../ui/TypingIndicator";
import { SkeletonMessage } from "../ui/Skeleton";
import useChatStore from "../../context/chatStore";
import { useAuth } from "../../context/AuthContext";
import { format, isSameDay } from "date-fns";
import { ChevronDown } from "lucide-react";

const SKELETON_CONFIGS = [
  { align: "left",  width: 180 },
  { align: "right", width: 140 },
  { align: "left",  width: 220 },
  { align: "left",  width: 160 },
  { align: "right", width: 200 },
  { align: "right", width: 130 },
  { align: "left",  width: 190 },
  { align: "right", width: 170 },
];

const DateDivider = memo(function DateDivider({ date }) {
  const d = new Date(date);
  const today = new Date();
  let label;
  if (isSameDay(d, today)) label = "Today";
  else if (isSameDay(d, new Date(today - 86_400_000))) label = "Yesterday";
  else label = format(d, "MMMM d, yyyy");
  return (
    <div className="flex items-center gap-3 my-4 px-2">
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-primary)] px-3 py-1 rounded-full border border-[var(--border)] select-none">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
});

const UnreadDivider = memo(function UnreadDivider({ count }) {
  return (
    <div className="flex items-center gap-3 my-3 px-2" data-unread-divider="true">
      <div className="flex-1 h-px bg-[var(--brand)]/40" />
      <span className="text-[10px] font-bold text-[var(--brand)] bg-[var(--brand)]/10 px-3 py-1 rounded-full border border-[var(--brand)]/30 whitespace-nowrap select-none">
        {count} new {count === 1 ? "message" : "messages"}
      </span>
      <div className="flex-1 h-px bg-[var(--brand)]/40" />
    </div>
  );
});

const MemoMessageBubble = memo(MessageBubble);

export default function MessageList({
  selectionMode = false,
  selectedIds,
  onSelect,
  onEnterMultiSelect,
  onBubbleTap,
  activeSingleId = null,
}) {
  const { user } = useAuth();
  const loadingMessages    = useChatStore((s) => s.loadingMessages);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const convId = activeConversation?._id;
  const typingUsersForConv = useChatStore((s) => s.typingUsers[convId] || []);
  const messages           = useChatStore((s) => convId ? (s.messagesByConv[convId] || []) : []);
  const unreadSnapshot     = useChatStore((s) => convId ? (s.unreadSnapshotByConv[convId] || 0) : 0);

  const bottomRef      = useRef();
  const containerRef   = useRef();
  const prevCountRef   = useRef(0);
  const prevConvIdRef  = useRef(null);
  const justSwitchedRef = useRef(false);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadBelow, setUnreadBelow] = useState(0);

  const othersTyping = useMemo(
    () => typingUsersForConv.filter((id) => id !== user?._id?.toString()),
    [typingUsersForConv, user?._id],
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadBelow(0);
  }, []);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
      if (distFromBottom < 100) setUnreadBelow(0);
    };
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  const grouped = useMemo(() => {
    if (!messages.length) return [];
    const myId = user?._id?.toString();
    const result = [];
    let lastDate = null;

    let firstNewIdx = -1;
    if (unreadSnapshot > 0) {
      let found = 0;
      for (let i = messages.length - 1; i >= 0; i--) {
        const sid =
          typeof messages[i].sender === "object"
            ? messages[i].sender._id?.toString()
            : messages[i].sender?.toString();
        if (sid !== myId) {
          found++;
          if (found === unreadSnapshot) { firstNewIdx = i; break; }
        }
      }
    }

    messages.forEach((msg, i) => {
      if (i === firstNewIdx) {
        result.push({ type: "unread-divider", count: unreadSnapshot, key: "unread-divider" });
      }
      const msgDate = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        result.push({ type: "divider", date: msg.createdAt, key: `div-${i}` });
        lastDate = msgDate;
      }
      const prev = messages[i - 1];
      const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
      const prevSenderId = prev ? (typeof prev.sender === "object" ? prev.sender._id : prev.sender) : null;
      result.push({
        type: "message", msg,
        showAvatar: !prev || prevSenderId !== senderId,
        senderId,
        key: msg._id || `msg-${i}`,
      });
    });
    return result;
  }, [messages, unreadSnapshot, user?._id]);

  useLayoutEffect(() => {
    if (convId !== prevConvIdRef.current) {
      prevConvIdRef.current = convId;
      prevCountRef.current = 0;
      justSwitchedRef.current = true;
      setShowScrollBtn(false);
      setUnreadBelow(0);
    }
  }, [convId]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (justSwitchedRef.current && !loadingMessages && messages.length > 0) {
      justSwitchedRef.current = false;
      prevCountRef.current = messages.length;
      const unreadEl = containerRef.current.querySelector("[data-unread-divider='true']");
      if (unreadEl) unreadEl.scrollIntoView({ block: "center" });
      else containerRef.current.scrollTop = containerRef.current.scrollHeight;
      return;
    }
    const isNew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (isNew && bottomRef.current) {
      const c = containerRef.current;
      const distFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
      const nearBottom = distFromBottom < 250;
      if (nearBottom) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
        setUnreadBelow(0);
      } else {
        // Incoming message but user scrolled up — show badge
        const lastMsg = messages[messages.length - 1];
        const senderId = typeof lastMsg?.sender === "object" ? lastMsg?.sender?._id : lastMsg?.sender;
        if (senderId?.toString() !== user?._id?.toString()) {
          setUnreadBelow(prev => prev + 1);
        }
      }
    }
  }, [messages.length, loadingMessages]);

  useEffect(() => {
    if (othersTyping.length > 0 && bottomRef.current && containerRef.current) {
      const c = containerRef.current;
      const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 300;
      if (nearBottom) bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [othersTyping.length]);

  if (loadingMessages) {
    return (
      <div className="flex-1 overflow-y-auto msg-scroll px-4 py-4 space-y-3">
        {SKELETON_CONFIGS.map((cfg, i) => (
          <SkeletonMessage key={i} align={cfg.align} width={cfg.width} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto msg-scroll px-4 py-4 space-y-1"
        style={{ contain: "paint layout" }}
      >
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl">💬</div>
            <p className="text-sm text-[var(--text-muted)]">No messages yet. Say hello!</p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "divider") return <DateDivider key={item.key} date={item.date} />;
          if (item.type === "unread-divider") return <UnreadDivider key={item.key} count={item.count} />;

          const { msg, showAvatar, senderId } = item;
          const isOwn =
            senderId === user?._id ||
            senderId?.toString() === user?._id?.toString();

          const senderObj =
            typeof msg.sender === "object"
              ? msg.sender
              : activeConversation?.participants?.find((p) => p._id === senderId);

          return (
            <div
              key={item.key}
              className={isOwn ? "animate-msg-in-right" : "animate-msg-in-left"}
            >
              <MemoMessageBubble
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                sender={isOwn ? user : senderObj}
                selectionMode={selectionMode}
                isSelected={selectedIds?.has(msg._id) || false}
                onSelect={onSelect}
                onEnterMultiSelect={onEnterMultiSelect}
                onBubbleTap={onBubbleTap}
                activeSingleId={activeSingleId}
              />
            </div>
          );
        })}

        {othersTyping.length > 0 && <TypingIndicator />}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="scroll-to-bottom-btn"
          title="Scroll to bottom"
        >
          {unreadBelow > 0 && (
            <span className="scroll-btn-badge">
              {unreadBelow > 9 ? "9+" : unreadBelow}
            </span>
          )}
          <ChevronDown size={18} />
        </button>
      )}
    </div>
  );
}
