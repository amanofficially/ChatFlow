import { X } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import useChatStore from "../../context/chatStore";
import Avatar from "./Avatar";

export default function InAppNotifications() {
  const { notifications, dismissNotification } = useNotifications();
  const conversations = useChatStore((s) => s.conversations);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  if (!notifications.length) return null;

  const handleClick = async (notif) => {
    dismissNotification(notif.id);
    const conv = conversations.find((c) => c._id === notif.conversationId);
    if (conv) {
      await setActiveConversation(conv);
      window.dispatchEvent(new CustomEvent("cf-open-chat", { detail: { conversationId: conv._id } }));
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[320px] w-full pointer-events-none">
      {notifications.map((notif) => {
        const senderUser = { username: notif.senderName, avatar: notif.senderAvatar };
        return (
          <div
            key={notif.id}
            className="pointer-events-auto flex items-start gap-3 px-3.5 py-3 rounded-2xl shadow-lg border border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur-md animate-slide-down cursor-pointer hover:bg-[var(--bg-tertiary)] active:scale-95 transition-all duration-150"
            style={{ boxShadow: "var(--shadow-lg)" }}
            onClick={() => handleClick(notif)}
          >
            <div className="flex-shrink-0">
              <Avatar user={senderUser} size="sm" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {notif.senderName}
                </p>
                {notif.count > 1 && (
                  <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand)] text-white text-[9px] flex items-center justify-center font-semibold">
                    {notif.count > 99 ? "99+" : notif.count}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {notif.count > 1 ? `${notif.count} new messages` : notif.content}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notif.id);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
