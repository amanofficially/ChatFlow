import { create } from "zustand";
import axios from "axios";

// ── Helper: persist active conversation ID across page refresh ──
const getPersistedConvId = () => {
  try { return sessionStorage.getItem("cf_active_conv") || null; }
  catch { return null; }
};
const setPersistedConvId = (id) => {
  try {
    if (id) sessionStorage.setItem("cf_active_conv", id);
    else sessionStorage.removeItem("cf_active_conv");
  } catch {}
};

// ── Helper: get current user from localStorage ──────────────
const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem("chat_user") || "{}"); }
  catch { return {}; }
};

// Status rank — never go backwards
const STATUS_RANK = { sent: 0, delivered: 1, read: 2 };

const useChatStore = create((set, get) => ({
  // ── Core State ───────────────────────────────────────────────
  conversations: [],
  activeConversation: null,
  messagesByConv: {},           // { [convId]: Message[] }
  loadingConversations: false,
  loadingMessages: false,
  searchQuery: "",
  typingUsers: {},              // { [convId]: userId[] }
  prefetchingConvIds: new Set(),
  unreadSnapshotByConv: {},     // { [convId]: number } — unread count at time of open

  setSearchQuery: (q) => set({ searchQuery: q }),

  getMessagesForConversation: (conversationId) =>
    get().messagesByConv[conversationId] || [],

  // ============================================================
  // FETCH CONVERSATIONS
  // ============================================================
  fetchConversations: async () => {
    set({ loadingConversations: true });
    try {
      const { data } = await axios.get("/conversations");
      const conversations = data.conversations;
      set({ conversations, loadingConversations: false });

      // Restore active conversation from sessionStorage on first load
      const persistedId = getPersistedConvId();
      if (persistedId && !get().activeConversation) {
        const conv = conversations.find((c) => c._id === persistedId);
        if (conv) get().setActiveConversation(conv);
      }
    } catch (err) {
      set({ loadingConversations: false });
    }
  },

  // ============================================================
  // SET ACTIVE CONVERSATION
  // ============================================================
  setActiveConversation: async (conversation) => {
    if (!conversation) {
      setPersistedConvId(null);
      set({ activeConversation: null, loadingMessages: false });
      return;
    }
    setPersistedConvId(conversation._id);

    const cached = get().messagesByConv[conversation._id] || [];
    const isCacheValid =
      cached.length > 0 && !cached.some((m) => m._isOptimistic);

    // Snapshot the unread count BEFORE zeroing it — MessageList uses this
    const currentUnread = get().conversations.find(
      (c) => c._id === conversation._id
    )?.unreadCount || 0;

    set((s) => ({
      activeConversation: conversation,
      loadingMessages: !isCacheValid,
      conversations: s.conversations.map((c) =>
        c._id === conversation._id ? { ...c, unreadCount: 0 } : c
      ),
      unreadSnapshotByConv: {
        ...s.unreadSnapshotByConv,
        [conversation._id]: currentUnread,
      },
    }));

    // Fire read marks in background
    axios.put(`/messages/${conversation._id}/read`).catch(() => {});
    axios.put(`/conversations/${conversation._id}/read`).catch(() => {});

    if (isCacheValid) return;

    try {
      const { data } = await axios.get(`/messages/${conversation._id}`);
      set((s) => ({
        messagesByConv: { ...s.messagesByConv, [conversation._id]: data.messages },
        loadingMessages: false,
      }));
    } catch (err) {
      set({ loadingMessages: false });
    }
  },

  // ============================================================
  // PREFETCH MESSAGES on sidebar hover
  // ============================================================
  prefetchMessages: async (conversationId) => {
    const s = get();
    if (
      (s.messagesByConv[conversationId] || []).length > 0 ||
      s.prefetchingConvIds.has(conversationId)
    ) return;

    set((s) => ({ prefetchingConvIds: new Set([...s.prefetchingConvIds, conversationId]) }));
    try {
      const { data } = await axios.get(`/messages/${conversationId}`);
      set((s) => {
        const next = new Set(s.prefetchingConvIds);
        next.delete(conversationId);
        return {
          messagesByConv: { ...s.messagesByConv, [conversationId]: data.messages },
          prefetchingConvIds: next,
        };
      });
    } catch {
      set((s) => {
        const next = new Set(s.prefetchingConvIds);
        next.delete(conversationId);
        return { prefetchingConvIds: next };
      });
    }
  },

  // ============================================================
  // SEND MESSAGE — optimistic UI
  // ============================================================
  sendMessage: async (conversationId, content, type = "text", fileName = null) => {
    const tempId = `temp-${Date.now()}`;
    const user = getCurrentUser();

    const optimistic = {
      _id: tempId, conversationId, content, type, fileName,
      status: "sent", createdAt: new Date().toISOString(),
      sender: user, _isOptimistic: true,
    };

    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [conversationId]: [...(s.messagesByConv[conversationId] || []), optimistic],
      },
    }));

    try {
      const { data } = await axios.post("/messages", { conversationId, content, type, fileName });
      const newMsg = data.message;

      set((s) => {
        const msgs = s.messagesByConv[conversationId] || [];

        // Case 1: temp still exists → replace it
        if (msgs.some((m) => m._id === tempId)) {
          return {
            messagesByConv: {
              ...s.messagesByConv,
              [conversationId]: msgs.map((m) => (m._id === tempId ? newMsg : m)),
            },
            conversations: s.conversations
              .map((c) =>
                c._id === conversationId
                  ? { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt }
                  : c,
              )
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
          };
        }

        // Case 2: socket already replaced temp — just update sidebar
        return {
          conversations: s.conversations
            .map((c) =>
              c._id === conversationId
                ? { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt }
                : c,
            )
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        };
      });

      return newMsg;
    } catch (err) {
      // Remove optimistic message on failure
      set((s) => ({
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: (s.messagesByConv[conversationId] || []).filter(
            (m) => m._id !== tempId
          ),
        },
      }));
      throw err;
    }
  },

  // ============================================================
  // RECEIVE INCOMING MESSAGE
  // ============================================================
  receiveMessage: (message, conversationId) => {
    set((s) => {
      const existing = s.messagesByConv[conversationId] || [];

      // Dedup 1: exact _id match
      if (existing.some((m) => m._id === message._id)) return s;

      const msgSenderId =
        typeof message.sender === "object"
          ? message.sender._id?.toString()
          : message.sender?.toString();
      const msgTime = new Date(message.createdAt).getTime();

      // Dedup 2: same sender + content + within 5s (echo guard)
      const isDuplicate = existing.some((m) => {
        if (m._isOptimistic) return false;
        const mSenderId =
          typeof m.sender === "object"
            ? m.sender._id?.toString()
            : m.sender?.toString();
        const mTime = new Date(m.createdAt).getTime();
        return (
          mSenderId === msgSenderId &&
          m.content === message.content &&
          Math.abs(mTime - msgTime) < 5000
        );
      });
      if (isDuplicate) return s;

      // Replace matching optimistic bubble if present
      const hasOptimisticMatch = existing.some(
        (m) =>
          m._isOptimistic &&
          m.content === message.content &&
          msgSenderId ===
            (typeof m.sender === "object"
              ? m.sender._id?.toString()
              : m.sender?.toString()),
      );

      const updatedMessages = hasOptimisticMatch
        ? existing.map((m) =>
            m._isOptimistic && m.content === message.content ? message : m,
          )
        : [...existing, message];

      const isActive = s.activeConversation?._id === conversationId;
      const convExists = s.conversations.some((c) => c._id === conversationId);

      const updatedConversations = convExists
        ? s.conversations
            .map((c) => {
              if (c._id !== conversationId) return c;
              return {
                ...c,
                lastMessage: message,
                updatedAt: message.createdAt,
                unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
              };
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        : s.conversations;

      return {
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: updatedMessages,
        },
        conversations: updatedConversations,
      };
    });
  },

  removeMessage: (messageId, conversationId) => {
    set((s) => {
      if (!conversationId) {
        const updated = {};
        for (const id in s.messagesByConv) {
          updated[id] = s.messagesByConv[id].filter((m) => m._id !== messageId);
        }
        return { messagesByConv: updated };
      }
      return {
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: (s.messagesByConv[conversationId] || []).filter(
            (m) => m._id !== messageId
          ),
        },
      };
    });
  },

  addConversationIfMissing: (conversation) => {
    set((s) => {
      if (s.conversations.some((c) => c._id === conversation._id)) return s;
      return { conversations: [conversation, ...s.conversations] };
    });
  },

  createConversation: async (participantId) => {
    const { data } = await axios.post("/conversations", { participantId });
    const conv = data.conversation;
    get().addConversationIfMissing(conv);
    return conv;
  },

  clearMessages: () => {
    setPersistedConvId(null);
    set({ activeConversation: null });
  },

  // ============================================================
  // UPDATE MESSAGE STATUS
  // ============================================================
  updateMessageStatus: (messageId, status) => {
    const nextRank = STATUS_RANK[status] ?? -1;
    if (nextRank < 0) return;

    set((s) => {
      let targetConvId = null;
      for (const convId in s.messagesByConv) {
        if (s.messagesByConv[convId].some((m) => m._id === messageId)) {
          targetConvId = convId;
          break;
        }
      }
      if (!targetConvId) return s;

      return {
        messagesByConv: {
          ...s.messagesByConv,
          [targetConvId]: s.messagesByConv[targetConvId].map((msg) => {
            if (msg._id !== messageId) return msg;
            const currRank = STATUS_RANK[msg.status] ?? 0;
            return nextRank > currRank ? { ...msg, status } : msg;
          }),
        },
      };
    });
  },

  // ============================================================
  // MARK ALL IN CONVERSATION AS READ
  // ============================================================
  updateConversationRead: (conversationId) => {
    const user = getCurrentUser();
    set((s) => {
      const msgs = s.messagesByConv[conversationId];
      if (!msgs) return s;
      return {
        messagesByConv: {
          ...s.messagesByConv,
          [conversationId]: msgs.map((m) => {
            const sid = typeof m.sender === "object" ? m.sender?._id : m.sender;
            return sid?.toString() === user._id?.toString()
              ? { ...m, status: "read" }
              : m;
          }),
        },
      };
    });
  },

  // ============================================================
  // REACTIONS
  // ============================================================
  updateReaction: (messageId, userId, emoji) => {
    set((s) => {
      let targetConvId = null;
      for (const convId in s.messagesByConv) {
        if (s.messagesByConv[convId].some((m) => m._id === messageId)) {
          targetConvId = convId;
          break;
        }
      }
      if (!targetConvId) return s;

      return {
        messagesByConv: {
          ...s.messagesByConv,
          [targetConvId]: s.messagesByConv[targetConvId].map((msg) => {
            if (msg._id !== messageId) return msg;
            // reactions can be a plain object or a Map — normalise to plain object
            const existing =
              msg.reactions instanceof Map
                ? Object.fromEntries(msg.reactions)
                : { ...(msg.reactions || {}) };
            if (emoji) existing[userId] = emoji;
            else delete existing[userId];
            return { ...msg, reactions: existing };
          }),
        },
      };
    });
  },

  // ============================================================
  // TYPING INDICATORS
  // ============================================================
  setTypingUser: (conversationId, userId, isTyping) => {
    set((s) => {
      const list = s.typingUsers[conversationId] || [];
      const already = list.includes(userId);
      if (isTyping && already) return s;
      if (!isTyping && !already) return s;
      return {
        typingUsers: {
          ...s.typingUsers,
          [conversationId]: isTyping
            ? [...list, userId]
            : list.filter((id) => id !== userId),
        },
      };
    });
  },
}));

export default useChatStore;
