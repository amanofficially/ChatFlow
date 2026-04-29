import useChatStore from '../../context/chatStore'
import { DEMO_USERS } from '../../context/chatStore'
import Avatar from './Avatar'

export default function TypingIndicator() {
  const { activeConversation, typingUsers } = useChatStore()
  const convTyping = typingUsers[activeConversation?._id] || []
  if (convTyping.length === 0) return null

  const typingUser = DEMO_USERS[convTyping[0]]

  return (
    <div className="flex items-end gap-2 animate-slide-up">
      <Avatar user={typingUser} size="xs" />
      <div className="message-bubble-in px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
