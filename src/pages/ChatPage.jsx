import { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import ChatHeader from '../components/chat/ChatHeader'
import MessageList from '../components/chat/MessageList'
import MessageInput from '../components/chat/MessageInput'
import EmptyChat from '../components/chat/EmptyChat'
import useChatStore from '../context/chatStore'
import { Menu } from 'lucide-react'

export default function ChatPage() {
  const { activeConversation, clearMessages } = useChatStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onConversationSelect={() => setMobileSidebarOpen(false)}
      />

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              onBack={() => { clearMessages(); setMobileSidebarOpen(true) }}
            />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          <>
            {/* Mobile top bar */}
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              >
                <Menu size={18} />
              </button>
              <span className="font-semibold text-[var(--text-primary)]">ChatFlow</span>
            </div>
            <EmptyChat />
          </>
        )}
      </main>
    </div>
  )
}
