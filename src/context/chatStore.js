import { create } from 'zustand'

// ── DEMO USERS ───────────────────────────────────────────────────────────────
export const DEMO_USERS = {
  u1: { _id: 'u1', username: 'You', email: 'demo@chatflow.app', avatar: null },
  u2: { _id: 'u2', username: 'Rahul Sharma', email: 'rahul@test.com', avatar: null, lastSeen: new Date(Date.now() - 60000) },
  u3: { _id: 'u3', username: 'Priya Patel', email: 'priya@test.com', avatar: null, lastSeen: new Date(Date.now() - 3600000) },
  u4: { _id: 'u4', username: 'Amit Verma', email: 'amit@test.com', avatar: null, lastSeen: new Date(Date.now() - 7200000) },
  u5: { _id: 'u5', username: 'Neha Singh', email: 'neha@test.com', avatar: null, lastSeen: new Date(Date.now() - 86400000) },
  u6: { _id: 'u6', username: 'Arjun Mehta', email: 'arjun@test.com', avatar: null, lastSeen: new Date(Date.now() - 172800000) },
}

// ── BOT REPLIES ──────────────────────────────────────────────────────────────
const BOT_REPLIES = {
  u2: [
    'Haan bhai, bol! 😄',
    'Sahi hai yaar! 🔥',
    'Kya scene hai? 👀',
    'Bro kal mil? Coffee peete hain ☕',
    'Haha 😂 ekdum sahi bola',
    'Dekh lena, main aata hoon 👍',
    'Okay okay, samajh gaya 🤝',
    'Yaar seriously bata, kya hua? 🤔',
  ],
  u3: [
    'Haan, kab milna hai? 📅',
    'Okay, noted! ✅',
    'Meeting 3 baje confirm hai 🕒',
    'Thanks for letting me know 😊',
    "Sure, I'll check and revert 🙏",
    "Great idea! Let's go with that 🚀",
  ],
  u4: [
    'Bhai code mein bug hai 😅',
    'Deploy kar diya, dekho 🚀',
    'PR raise kar deta hoon ✅',
    'Kal review karte hain yaar',
    'Build pass ho gayi finally! 🎉',
    'Server down tha, ab theek hai 😅',
  ],
  u5: [
    '😊',
    'Okay!',
    'Sure sure!',
    "Haha that's funny 😄",
    'Noted! Will do.',
    '❤️',
  ],
  u6: [
    'Weekend plans kya hain? 🏕️',
    'Game khelne chalein? 🎮',
    'Movie dekhi? Kaisi thi? 🎬',
    'Bhai mast tha yaar! 🔥',
    'Haha ekdum sahi 😂',
  ],
}

const getBotReply = (userId, userMsg) => {
  const replies = BOT_REPLIES[userId] || ['👍', 'Okay!', 'Got it!']
  const text = (userMsg || '').toLowerCase()
  if (text.includes('hi') || text.includes('hello') || text.includes('hey'))
    return 'Hey! 👋 Kya haal hai?'
  if (text.includes('bye') || text.includes('later'))
    return 'Bye! Take care 👋'
  if (text.includes('thanks') || text.includes('thank'))
    return 'Anytime! 😊🙏'
  if (text.includes('?'))
    return 'Hmm, good question! Let me think... 🤔'
  return replies[Math.floor(Math.random() * replies.length)]
}

// ── DEMO MESSAGES ─────────────────────────────────────────────────────────────
const now = Date.now()
const MIN = 60 * 1000
const HR = 60 * MIN

const INITIAL_MESSAGES = [
  // c1 — Rahul
  { _id: 'm1', conversationId: 'c1', sender: 'u2', content: 'Bhai kya scene hai! 😄', createdAt: new Date(now - 2 * HR) },
  { _id: 'm2', conversationId: 'c1', sender: 'u1', content: 'Sab badhiya yaar, tu bata?', createdAt: new Date(now - 2 * HR + 2 * MIN) },
  { _id: 'm3', conversationId: 'c1', sender: 'u2', content: 'Kal coffee peene chalein? ☕', createdAt: new Date(now - 1 * HR) },
  { _id: 'm4', conversationId: 'c1', sender: 'u1', content: 'Bilkul! Kaun sa cafe?', createdAt: new Date(now - 55 * MIN) },
  { _id: 'm5', conversationId: 'c1', sender: 'u2', content: 'Brew Brothers chalte hain, 4 baje?', createdAt: new Date(now - 50 * MIN) },
  { _id: 'm6', conversationId: 'c1', sender: 'u1', content: 'Done bhai! 🔥', createdAt: new Date(now - 45 * MIN) },
  // c2 — Priya
  { _id: 'm7', conversationId: 'c2', sender: 'u3', content: 'Meeting kab hai kal?', createdAt: new Date(now - 3 * HR) },
  { _id: 'm8', conversationId: 'c2', sender: 'u1', content: '3 baje confirm hai', createdAt: new Date(now - 3 * HR + 5 * MIN) },
  { _id: 'm9', conversationId: 'c2', sender: 'u3', content: 'Perfect! Agenda share kar dena pehle 📋', createdAt: new Date(now - 2 * HR + 30 * MIN) },
  { _id: 'm10', conversationId: 'c2', sender: 'u1', content: 'Haan kar deta hoon aaj shaam tak', createdAt: new Date(now - 2 * HR + 35 * MIN) },
  // c3 — Amit
  { _id: 'm11', conversationId: 'c3', sender: 'u4', content: 'Bhai deployment mein issue aa raha hai 😩', createdAt: new Date(now - 5 * HR) },
  { _id: 'm12', conversationId: 'c3', sender: 'u1', content: 'Kya error hai?', createdAt: new Date(now - 5 * HR + 3 * MIN) },
  { _id: 'm13', conversationId: 'c3', sender: 'u4', content: 'CORS policy block kar raha hai prod mein', createdAt: new Date(now - 5 * HR + 5 * MIN) },
  { _id: 'm14', conversationId: 'c3', sender: 'u1', content: 'Server mein headers add kar — Access-Control-Allow-Origin', createdAt: new Date(now - 4 * HR + 55 * MIN) },
  { _id: 'm15', conversationId: 'c3', sender: 'u4', content: 'Sorted ho gaya! Thanks bhai 🙌', createdAt: new Date(now - 4 * HR + 58 * MIN) },
  { _id: 'm16', conversationId: 'c3', sender: 'u1', content: '😄 Koi baat nahi! Build pass ho gayi?', createdAt: new Date(now - 4 * HR + 59 * MIN) },
  { _id: 'm17', conversationId: 'c3', sender: 'u4', content: 'Haan green hai! 🎉 Deploy kar diya', createdAt: new Date(now - 20 * MIN) },
  // c4 — Neha
  { _id: 'm18', conversationId: 'c4', sender: 'u1', content: 'Hey Neha! Kya haal hai?', createdAt: new Date(now - 24 * HR) },
  { _id: 'm19', conversationId: 'c4', sender: 'u5', content: 'Sab theek hai! Tu bata 😊', createdAt: new Date(now - 23 * HR) },
  { _id: 'm20', conversationId: 'c4', sender: 'u5', content: 'Weekend kuch plan hai?', createdAt: new Date(now - 10 * MIN) },
  // c5 — Arjun
  { _id: 'm21', conversationId: 'c5', sender: 'u6', content: 'Game khelne chalein weekend pe? 🎮', createdAt: new Date(now - 48 * HR) },
  { _id: 'm22', conversationId: 'c5', sender: 'u1', content: 'Haan bhai! Kaun sa game?', createdAt: new Date(now - 47 * HR) },
  { _id: 'm23', conversationId: 'c5', sender: 'u6', content: 'Valorant? Ya BGMI chalega?', createdAt: new Date(now - 47 * HR + 5 * MIN) },
  { _id: 'm24', conversationId: 'c5', sender: 'u1', content: 'Valorant chalte hain 🔥', createdAt: new Date(now - 47 * HR + 10 * MIN) },
]

const INITIAL_CONVERSATIONS = [
  {
    _id: 'c1',
    participants: [DEMO_USERS.u1, DEMO_USERS.u2],
    lastMessage: { content: 'Done bhai! 🔥', createdAt: new Date(now - 45 * MIN) },
    unreadCount: 0,
  },
  {
    _id: 'c2',
    participants: [DEMO_USERS.u1, DEMO_USERS.u3],
    lastMessage: { content: 'Haan kar deta hoon aaj shaam tak', createdAt: new Date(now - 2 * HR + 35 * MIN) },
    unreadCount: 1,
  },
  {
    _id: 'c3',
    participants: [DEMO_USERS.u1, DEMO_USERS.u4],
    lastMessage: { content: 'Haan green hai! 🎉 Deploy kar diya', createdAt: new Date(now - 20 * MIN) },
    unreadCount: 1,
  },
  {
    _id: 'c4',
    participants: [DEMO_USERS.u1, DEMO_USERS.u5],
    lastMessage: { content: 'Weekend kuch plan hai?', createdAt: new Date(now - 10 * MIN) },
    unreadCount: 2,
  },
  {
    _id: 'c5',
    participants: [DEMO_USERS.u1, DEMO_USERS.u6],
    lastMessage: { content: 'Valorant chalte hain 🔥', createdAt: new Date(now - 47 * HR + 10 * MIN) },
    unreadCount: 0,
  },
]

// ── STORE ────────────────────────────────────────────────────────────────────
const useChatStore = create((set, get) => ({
  conversations: INITIAL_CONVERSATIONS,
  activeConversation: null,
  messages: INITIAL_MESSAGES,
  loadingConversations: false,
  loadingMessages: false,
  searchQuery: '',
  typingUsers: {},

  setSearchQuery: (q) => set({ searchQuery: q }),

  setActiveConversation: (conversation) => {
    set({
      activeConversation: conversation,
    })
    // mark as read
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c,
      ),
    }))
  },

  getMessagesForConversation: (conversationId) => {
    return get().messages.filter((m) => m.conversationId === conversationId)
  },

  sendMessage: async (conversationId, content, type = 'text') => {
    const state = get()
    const conv = state.conversations.find((c) => c._id === conversationId)
    const otherUser = conv?.participants?.find((p) => p._id !== 'u1')

    const newMsg = {
      _id: Date.now().toString(),
      conversationId,
      sender: 'u1',
      content,
      type,
      createdAt: new Date(),
    }

    set((s) => ({
      messages: [...s.messages, newMsg],
      conversations: s.conversations.map((c) =>
        c._id === conversationId
          ? { ...c, lastMessage: { content, createdAt: new Date() } }
          : c,
      ),
    }))

    // Show typing indicator
    if (otherUser) {
      set((s) => ({
        typingUsers: { ...s.typingUsers, [conversationId]: [otherUser._id] },
      }))

      // Bot reply after delay
      setTimeout(() => {
        const botReply = {
          _id: (Date.now() + 1).toString(),
          conversationId,
          sender: otherUser._id,
          content: getBotReply(otherUser._id, content),
          type: 'text',
          createdAt: new Date(),
        }

        set((s) => ({
          messages: [...s.messages, botReply],
          typingUsers: { ...s.typingUsers, [conversationId]: [] },
          conversations: s.conversations.map((c) =>
            c._id === conversationId
              ? { ...c, lastMessage: botReply }
              : c,
          ),
        }))
      }, 1000 + Math.random() * 1000)
    }

    return newMsg
  },

  createConversation: async (participantId) => {
    const state = get()
    // Check if convo already exists
    const existing = state.conversations.find((c) =>
      c.participants.some((p) => p._id === participantId),
    )
    if (existing) return existing

    const otherUser = DEMO_USERS[participantId] || {
      _id: participantId,
      username: 'New User',
      email: '',
    }

    const newConv = {
      _id: `c_${Date.now()}`,
      participants: [DEMO_USERS.u1, otherUser],
      lastMessage: { content: 'Chat started', createdAt: new Date() },
      unreadCount: 0,
    }

    set((s) => ({ conversations: [newConv, ...s.conversations] }))
    return newConv
  },

  markAsRead: (conversationId) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }))
  },

  clearMessages: () => set({ activeConversation: null }),
}))

export default useChatStore
