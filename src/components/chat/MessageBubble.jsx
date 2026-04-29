import { useState } from 'react'
import { Check, CheckCheck, Copy, Trash2, MoreHorizontal } from 'lucide-react'
import { formatMessageTime } from '../../utils/helpers'
import Avatar from '../ui/Avatar'
import toast from 'react-hot-toast'

export default function MessageBubble({ message, isOwn, showAvatar, sender }) {
  const [showMenu, setShowMenu] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success('Copied!')
    setShowMenu(false)
  }

  return (
    <div
      className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : ''} animate-slide-up`}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className={showAvatar ? 'opacity-100' : 'opacity-0 pointer-events-none'}>
          <Avatar user={sender} size="xs" />
        </div>
      )}

      <div className={`flex flex-col gap-0.5 max-w-[75%] md:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && showAvatar && sender?.username && (
          <span className="text-[11px] font-semibold text-brand-400 pl-1 mb-0.5">
            {sender.username}
          </span>
        )}

        <div className="relative flex items-center gap-1">
          {/* Context menu button — shows on hover */}
          <button
            onClick={() => setShowMenu(v => !v)}
            className={`opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center
                        hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] flex-shrink-0
                        ${isOwn ? 'order-first' : 'order-last'}`}
          >
            <MoreHorizontal size={13} />
          </button>

          {/* Context menu dropdown */}
          {showMenu && (
            <div className={`absolute bottom-full mb-1 z-20 card py-1 min-w-[110px] animate-slide-up
                            ${isOwn ? 'right-6' : 'left-6'}`}>
              <button onClick={handleCopy} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
                <Copy size={12} /> Copy
              </button>
              <button
                onClick={() => { toast('Delete — connect backend!'); setShowMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}

          {/* Bubble */}
          <div className={isOwn ? 'message-bubble-out' : 'message-bubble-in'}>
            {message.type === 'image' ? (
              <img
                src={message.content}
                alt="shared"
                className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.content, '_blank')}
              />
            ) : (
              <span className="break-words whitespace-pre-wrap">{message.content}</span>
            )}
          </div>
        </div>

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 
                         transition-opacity duration-200 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[11px] text-[var(--text-muted)]">
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="text-[var(--text-muted)]">
              <CheckCheck size={13} />
            </span>
          )}
        </div>
      </div>

      {!isOwn && <div className="w-5 flex-shrink-0" />}
    </div>
  )
}
