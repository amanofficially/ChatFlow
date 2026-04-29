import { getAvatarUrl, getInitials } from '../../utils/helpers'

const SIZES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
}

const STATUS_SIZES = {
  xs: 'w-2 h-2 -bottom-0 -right-0',
  sm: 'w-2.5 h-2.5 -bottom-0 -right-0',
  md: 'w-3 h-3 bottom-0 right-0',
  lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5',
  xl: 'w-4 h-4 bottom-0.5 right-0.5',
}

const PALETTE = [
  ['#6366f1', '#818cf8'], ['#ec4899', '#f472b6'],
  ['#14b8a6', '#2dd4bf'], ['#f59e0b', '#fbbf24'],
  ['#3b82f6', '#60a5fa'], ['#8b5cf6', '#a78bfa'],
]

function getColor(name) {
  if (!name) return PALETTE[0]
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length
  return PALETTE[idx]
}

export default function Avatar({ user, size = 'md', showStatus = false, isOnline = false }) {
  const initials = getInitials(user?.username || user?.email)
  const [from, to] = getColor(user?.username)
  const sizeClass = SIZES[size] || SIZES.md
  const statusClass = STATUS_SIZES[size] || STATUS_SIZES.md

  return (
    <div className={`relative flex-shrink-0 ${sizeClass} rounded-full`}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizeClass} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white select-none`}
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute ${statusClass} rounded-full border-2 border-[var(--bg-sidebar)]
                      ${isOnline ? 'bg-green-400' : 'bg-[var(--text-muted)]'}`}
        />
      )}
    </div>
  )
}
