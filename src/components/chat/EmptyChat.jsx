import { MessageCircle, Zap, Shield, Smile } from 'lucide-react'

const features = [
  { icon: Zap, label: 'Instant messaging', desc: 'Real-time chat with smart bot replies' },
  { icon: Shield, label: 'Demo mode', desc: '5 contacts with conversation history' },
  { icon: Smile, label: 'Emoji support', desc: 'Express yourself with emoji picker' },
]

export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow animate-pulse-soft">
          <MessageCircle size={36} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Welcome to ChatFlow</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Select a conversation from the sidebar to start chatting
          </p>
        </div>
      </div>

      <div className="grid gap-3 w-full max-w-xs">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon size={15} className="text-brand-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
              <p className="text-xs text-[var(--text-muted)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
