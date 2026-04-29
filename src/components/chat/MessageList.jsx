import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import TypingIndicator from '../ui/TypingIndicator'
import { SkeletonMessage } from '../ui/Skeleton'
import useChatStore from '../../context/chatStore'
import { useAuth } from '../../context/AuthContext'
import { format, isSameDay } from 'date-fns'

function DateDivider({ date }) {
  const d = new Date(date)
  const today = new Date()
  let label
  if (isSameDay(d, today)) label = 'Today'
  else if (isSameDay(d, new Date(today - 86400000))) label = 'Yesterday'
  else label = format(d, 'MMMM d, yyyy')

  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-primary)] px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border)]" />
    </div>
  )
}

export default function MessageList() {
  const { user } = useAuth()
  const { messages, loadingMessages, activeConversation, typingUsers, getMessagesForConversation } = useChatStore()
  const bottomRef = useRef()

  // Get messages for active conversation
  const convMessages = activeConversation
    ? getMessagesForConversation(activeConversation._id)
    : []

  const convTypingUsers = typingUsers[activeConversation?._id] || []
  const othersTyping = convTypingUsers.filter((id) => id !== (user?._id || 'u1'))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length, othersTyping.length])

  if (loadingMessages) {
    return (
      <div className="flex-1 overflow-y-auto msg-scroll px-4 py-4 space-y-3">
        {[...Array(8)].map((_, i) => (
          <SkeletonMessage key={i} align={i % 3 === 0 ? 'right' : 'left'} />
        ))}
      </div>
    )
  }

  // Group messages with date dividers
  const grouped = []
  let lastDate = null
  convMessages.forEach((msg, i) => {
    const msgDate = new Date(msg.createdAt)
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      grouped.push({ type: 'divider', date: msg.createdAt, key: `div-${i}` })
      lastDate = msgDate
    }
    const prev = convMessages[i - 1]
    const showAvatar = !prev || prev.sender !== msg.sender
    grouped.push({ type: 'message', msg, showAvatar, key: msg._id || `msg-${i}` })
  })

  const currentUserId = user?._id || 'u1'

  return (
    <div className="flex-1 overflow-y-auto msg-scroll px-4 py-4 space-y-1.5">
      {grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl">
            💬
          </div>
          <p className="text-sm text-[var(--text-muted)]">No messages yet. Say hello!</p>
        </div>
      )}

      {grouped.map((item) => {
        if (item.type === 'divider') return <DateDivider key={item.key} date={item.date} />
        const { msg, showAvatar } = item
        const isOwn = msg.sender === currentUserId
        const senderObj = isOwn
          ? user
          : activeConversation?.participants?.find((p) => p._id === msg.sender)
        return (
          <MessageBubble
            key={item.key}
            message={msg}
            isOwn={isOwn}
            showAvatar={showAvatar}
            sender={senderObj}
          />
        )
      })}

      {othersTyping.length > 0 && <TypingIndicator />}
      <div ref={bottomRef} className="h-1" />
    </div>
  )
}
