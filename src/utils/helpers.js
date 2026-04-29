import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'

export function formatMessageTime(date) {
  const d = new Date(date)
  return format(d, 'h:mm a')
}

export function formatConversationTime(date) {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

export function formatLastSeen(date) {
  if (!date) return 'Offline'
  return `Last seen ${formatDistanceToNow(new Date(date), { addSuffix: true })}`
}

export function getAvatarUrl(user) {
  if (user?.avatar) return user.avatar
  // Generate a colorful avatar from initials using DiceBear
  const seed = user?.username || user?.email || 'user'
  return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
