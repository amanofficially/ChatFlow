import { useState, useEffect } from 'react'
import { Search, Plus, MessageSquarePlus, X, CheckCheck } from 'lucide-react'
import Avatar from '../ui/Avatar'
import ThemeToggle from '../ui/ThemeToggle'
import { SkeletonConversation } from '../ui/Skeleton'
import useChatStore, { DEMO_USERS } from '../../context/chatStore'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { formatConversationTime } from '../../utils/helpers'
import toast from 'react-hot-toast'
import ProfileMenu from './ProfileMenu'

export default function Sidebar({ onConversationSelect, mobileOpen, onMobileClose }) {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()

  const {
    conversations, loadingConversations,
    setActiveConversation, activeConversation,
    searchQuery, setSearchQuery, createConversation,
  } = useChatStore()

  const [showNewChat, setShowNewChat] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!userSearch.trim()) { setSearchResults([]); return }
    const timer = setTimeout(() => {
      setSearching(true)
      const allUsers = Object.values(DEMO_USERS).filter((u) => u._id !== 'u1')
      const filtered = allUsers.filter((u) =>
        u.username.toLowerCase().includes(userSearch.toLowerCase())
      )
      setSearchResults(filtered)
      setSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [userSearch])

  const startConversation = async (targetUser) => {
    try {
      const conv = await createConversation(targetUser._id)
      setActiveConversation(conv)
      setShowNewChat(false)
      setUserSearch('')
      onConversationSelect?.()
    } catch {
      toast.error('Could not start conversation')
    }
  }

  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== (user?._id || 'u1')) || {}

  const filteredConvos = conversations.filter((c) => {
    const other = getOtherParticipant(c)
    return other.username?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <aside
      className={`flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)]
                  transition-all duration-300
                  ${mobileOpen
          ? 'fixed inset-y-0 left-0 z-30 w-80 shadow-xl'
          : 'relative w-80 hidden md:flex'
        }`}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <MessageSquarePlus size={16} className="text-white" />
            </div>
            <span className="font-bold text-[var(--text-primary)] text-lg">ChatFlow</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={() => setShowNewChat((v) => !v)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90
                          ${showNewChat
                  ? 'bg-brand-500 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-brand-500/10 hover:text-brand-500'
                }`}
              title="New Chat"
            >
              <Plus size={18} />
            </button>
            {mobileOpen && (
              <button onClick={onMobileClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* NEW CHAT PANEL */}
      {showNewChat && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50 animate-slide-up">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider px-1">Start New Chat</p>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search people..."
              className="input-field pl-8 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-0.5">
            {searching && (
              <p className="text-xs text-[var(--text-muted)] text-center py-3">Searching...</p>
            )}
            {!searching && userSearch && searchResults.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-3">No users found</p>
            )}
            {!searching && !userSearch && (
              Object.values(DEMO_USERS)
                .filter((u) => u._id !== 'u1')
                .map((u) => (
                  <button key={u._id} onClick={() => startConversation(u)}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-left"
                  >
                    <Avatar user={u} size="sm" showStatus isOnline={onlineUsers.includes(u._id)} />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{u.username}</p>
                      <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                    </div>
                  </button>
                ))
            )}
            {!searching && userSearch && searchResults.map((u) => (
              <button key={u._id} onClick={() => startConversation(u)}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-[var(--bg-secondary)] transition-colors text-left"
              >
                <Avatar user={u} size="sm" showStatus isOnline={onlineUsers.includes(u._id)} />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{u.username}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONVERSATIONS */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations ? (
          <SkeletonConversation />
        ) : filteredConvos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm text-[var(--text-muted)]">No conversations yet</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredConvos.map((conv) => {
              const other = getOtherParticipant(conv)
              const isActive = activeConversation?._id === conv._id
              const isOnline = onlineUsers.includes(other._id)

              return (
                <button
                  key={conv._id}
                  onClick={() => { setActiveConversation(conv); onConversationSelect?.() }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl transition-all duration-150 relative
                              ${isActive
                      ? 'bg-brand-500/10 border border-brand-500/20'
                      : 'hover:bg-[var(--bg-tertiary)] border border-transparent'
                    }`}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <Avatar user={other} size="md" showStatus isOnline={isOnline} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-brand-500' : 'text-[var(--text-primary)]'}`}>
                        {other.username}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                        {formatConversationTime(conv.lastMessage?.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {conv.lastMessage?.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ProfileMenu />
    </aside>
  )
}
