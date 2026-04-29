import { useState } from 'react'
import { Phone, Video, ArrowLeft, Info, X, Mail, Clock, User } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { useSocket } from '../../context/SocketContext'
import { useAuth } from '../../context/AuthContext'
import { formatLastSeen } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── CALL MODAL ────────────────────────────────────────────────────────────────
function CallModal({ type, user, onClose }) {
  const [status, setStatus] = useState('calling') // calling | connected | ended

  const handleEnd = () => { setStatus('ended'); setTimeout(onClose, 800) }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <Avatar user={user} size="xl" />
        <h2 className="text-white text-xl font-bold">{user?.username}</h2>
        <p className="text-white/60 text-sm animate-pulse">
          {status === 'calling' ? `${type === 'voice' ? '📞' : '📹'} ${type === 'voice' ? 'Voice' : 'Video'} calling...`
            : status === 'connected' ? '🟢 Connected'
            : '📵 Call ended'}
        </p>
      </div>

      {/* Fake video area for video call */}
      {type === 'video' && status !== 'ended' && (
        <div className="w-64 h-40 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <p className="text-white/40 text-sm">Camera feed (backend needed)</p>
        </div>
      )}

      <div className="flex items-center gap-6 mt-4">
        {status === 'calling' && (
          <button
            onClick={() => setStatus('connected')}
            className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 transition-colors shadow-lg"
          >
            {type === 'voice' ? <Phone size={22} className="text-white" /> : <Video size={22} className="text-white" />}
          </button>
        )}
        <button
          onClick={handleEnd}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg rotate-[135deg]"
        >
          <Phone size={22} className="text-white" />
        </button>
      </div>
      <p className="text-white/30 text-xs">Demo mode — no real connection</p>
    </div>
  )
}

// ── CHAT INFO PANEL ───────────────────────────────────────────────────────────
function ChatInfoPanel({ conversation, user, onClose }) {
  const { onlineUsers } = useSocket()
  const other = conversation?.participants?.find(p => p._id !== user?._id) || {}
  const isOnline = onlineUsers.includes(other._id)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 animate-bounce-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-[var(--text-primary)] text-lg">Contact Info</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 mb-6">
          <Avatar user={other} size="xl" showStatus isOnline={isOnline} />
          <div className="text-center">
            <h3 className="font-bold text-[var(--text-primary)] text-lg">{other.username}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
              {isOnline ? '● Online' : formatLastSeen(other.lastSeen)}
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
            <Mail size={15} className="text-[var(--text-muted)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Email</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{other.email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
            <User size={15} className="text-[var(--text-muted)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">User ID</p>
              <p className="text-sm font-medium text-[var(--text-primary)] font-mono">{other._id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
            <Clock size={15} className="text-[var(--text-muted)]" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">Last seen</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{isOnline ? 'Currently online' : formatLastSeen(other.lastSeen)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { onClose(); toast('Voice call — demo mode 📞') }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-sm font-semibold"
          >
            <Phone size={15} /> Call
          </button>
          <button
            onClick={() => { onClose(); toast('Video call — demo mode 📹') }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors text-sm font-semibold"
          >
            <Video size={15} /> Video
          </button>
        </div>

        <button onClick={onClose} className="w-full btn-primary mt-3">Close</button>
      </div>
    </div>
  )
}

// ── MAIN HEADER ───────────────────────────────────────────────────────────────
export default function ChatHeader({ conversation, onBack }) {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()
  const [callType, setCallType] = useState(null) // 'voice' | 'video' | null
  const [showInfo, setShowInfo] = useState(false)

  const other = conversation?.participants?.find(p => p._id !== user?._id) || {}
  const isOnline = onlineUsers.includes(other._id)

  return (
    <>
      {callType && <CallModal type={callType} user={other} onClose={() => setCallType(null)} />}
      {showInfo && <ChatInfoPanel conversation={conversation} user={user} onClose={() => setShowInfo(false)} />}

      <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden btn-ghost w-9 h-9 p-0 flex items-center justify-center mr-1">
            <ArrowLeft size={20} />
          </button>

          <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Avatar user={other} size="md" showStatus isOnline={isOnline} />
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-sm leading-tight">{other.username || 'Unknown'}</h2>
              <p className={`text-xs leading-tight ${isOnline ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                {isOnline ? 'Online' : formatLastSeen(other.lastSeen)}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCallType('voice')}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 active:scale-90"
            title="Voice call"
          >
            <Phone size={17} />
          </button>
          <button
            onClick={() => setCallType('video')}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 active:scale-90"
            title="Video call"
          >
            <Video size={17} />
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 active:scale-90"
            title="Contact info"
          >
            <Info size={17} />
          </button>
        </div>
      </div>
    </>
  )
}
