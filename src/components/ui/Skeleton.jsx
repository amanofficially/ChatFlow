export function SkeletonConversation() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="shimmer-line w-24 h-3" />
        <div className="shimmer-line w-36 h-2.5" />
      </div>
      <div className="shimmer-line w-8 h-2" />
    </div>
  )
}

export function SkeletonMessage({ align = 'left' }) {
  return (
    <div className={`flex items-end gap-2 ${align === 'right' ? 'flex-row-reverse' : ''} animate-pulse`}>
      {align === 'left' && <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />}
      <div className="space-y-1 max-w-[60%]">
        <div className="h-9 rounded-2xl bg-[var(--bg-tertiary)]" style={{ width: `${120 + Math.random() * 100}px` }} />
      </div>
    </div>
  )
}
