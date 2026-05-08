import useChatStore from "../../context/chatStore";
import { useAuth } from "../../context/AuthContext";
import Avatar from "./Avatar";

// Animated three dots
function TypingDots() {
  return (
    <div className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] inline-block"
          style={{
            animation: "typingBounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

// Inline compact version for ChatHeader
export function TypingBadge() {
  return (
    <span className="flex items-center gap-1.5">
      <TypingDots />
      <span className="text-xs text-[var(--brand)] font-medium">typing</span>
    </span>
  );
}

// Full bubble shown in message list
export default function TypingIndicator() {
  const { user } = useAuth();
  const activeConversation = useChatStore((s) => s.activeConversation);
  const typingUsers = useChatStore((s) => s.typingUsers);

  const convId = activeConversation?._id;
  // Filter out current user — only show others typing
  const othersTyping = (typingUsers[convId] || []).filter(
    (id) => id !== user?._id?.toString(),
  );

  if (othersTyping.length === 0) return null;

  const typingUserId = othersTyping[0];
  const typingUser = activeConversation?.participants?.find(
    (p) => p._id?.toString() === typingUserId,
  ) || { username: "...", avatar: null };

  return (
    <div className="flex items-end gap-2 animate-slide-up px-1">
      <Avatar user={typingUser} size="xs" />
      <div className="message-bubble-in px-4 py-3 flex items-center gap-1">
        <TypingDots />
      </div>
    </div>
  );
}
