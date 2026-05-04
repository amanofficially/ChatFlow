# ChatFlow — Frontend

A beautiful, production-ready React + Vite chat app frontend, fully wired for your MERN + Socket.io backend.

## 🚀 Quick Start

```bash
cd client
npm install
npm run dev
```

Runs at `http://localhost:3000`. Proxies API requests to `http://localhost:5000`.

---

## 🔌 Backend API Contract

The frontend is ready to connect — just implement these endpoints:

### Auth (`/api/auth`)
| Method | Route | Body | Returns |
|--------|-------|------|---------|
| POST | `/auth/signup` | `{ username, email, password }` | `{ user }` |
| POST | `/auth/login` | `{ email, password }` | `{ user }` |
| POST | `/auth/logout` | — | `{ message }` |
| GET | `/auth/me` | — | `{ user }` |
| PUT | `/auth/profile` | `{ username, avatar, ... }` | `{ user }` |

### Users (`/api/users`)
| Method | Route | Returns |
|--------|-------|---------|
| GET | `/users/search?q=query` | `[user, ...]` |

### Conversations (`/api/conversations`)
| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET | `/conversations` | — | `[conversation, ...]` |
| POST | `/conversations` | `{ participantId }` | `conversation` |

### Messages (`/api/messages`)
| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET | `/messages/:conversationId` | — | `[message, ...]` |
| POST | `/messages/:conversationId` | `{ content, type }` | `message` |
| PUT | `/messages/:conversationId/read` | — | `{ success }` |

---

## 🔁 Socket.io Events

### Client → Server
| Event | Payload |
|-------|---------|
| `typingStart` | `{ conversationId }` |
| `typingStop` | `{ conversationId }` |

### Server → Client
| Event | Payload |
|-------|---------|
| `newMessage` | `message` object |
| `getOnlineUsers` | `[userId, ...]` |
| `typingStart` | `{ conversationId, userId }` |
| `typingStop` | `{ conversationId, userId }` |

---

## 📁 Data Shapes

```js
// User
{ _id, username, email, avatar, lastSeen, createdAt }

// Conversation
{ _id, participants: [User], lastMessage: Message, unreadCount, updatedAt }

// Message
{ _id, conversationId, sender: User | userId, content, type: 'text'|'image', readBy: [userId], createdAt }
```

---

## 🎨 Features
- ✅ Light / Dark theme (persisted)
- ✅ Real-time typing indicators
- ✅ Online status via socket
- ✅ Message read receipts
- ✅ Image attachment preview
- ✅ Emoji picker
- ✅ Fully responsive (mobile + desktop)
- ✅ Smooth animations throughout
- ✅ Zustand state management
- ✅ Skeleton loading states
- ✅ Date dividers in messages
