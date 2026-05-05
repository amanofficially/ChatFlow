import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import useChatStore from "../context/chatStore";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export function useSocketEvents() {
  const { getSocket, isConnected } = useSocket();
  const { addNotification, dismissByConversation } = useNotifications();
  const { user } = useAuth();

  const receiveMessage         = useChatStore((s) => s.receiveMessage);
  const setTypingUser          = useChatStore((s) => s.setTypingUser);
  const updateMessageStatus    = useChatStore((s) => s.updateMessageStatus);
  const removeMessage          = useChatStore((s) => s.removeMessage);
  const fetchConversations     = useChatStore((s) => s.fetchConversations);
  const addConversationIfMissing = useChatStore((s) => s.addConversationIfMissing);
  const updateReaction         = useChatStore((s) => s.updateReaction);
  const updateConversationRead = useChatStore((s) => s.updateConversationRead);

  const activeConvIdRef = useRef(null);

  // Track active conversation + auto join/leave rooms
  useEffect(() => {
    const unsub = useChatStore.subscribe(
      (state) => state.activeConversation?._id,
      (newId, prevId) => {
        const socket = getSocket();
        if (!socket) return;

        if (prevId && prevId !== newId) {
          socket.emit("leaveConversation", prevId);
          socket.emit("typingStop", { conversationId: prevId });
        }

        if (newId) {
          socket.emit("joinConversation", newId);
          axios.put(`/messages/${newId}/read`).catch(() => {});
          axios.put(`/conversations/${newId}/read`).catch(() => {});
          dismissByConversation(newId);
        }

        activeConvIdRef.current = newId ?? null;
      }
    );
    return () => unsub();
  }, [getSocket, dismissByConversation]);

  // Rejoin room + refresh on reconnect
  useEffect(() => {
    if (!isConnected) return;
    const socket = getSocket();
    if (!socket) return;

    const convId = activeConvIdRef.current;
    if (convId) {
      socket.emit("joinConversation", convId);
      axios.put(`/messages/${convId}/read`).catch(() => {});
    }

    fetchConversations();
  }, [isConnected, getSocket, fetchConversations]);

  const handleNewMessage = useCallback(
    ({ message, conversationId }) => {
      receiveMessage(message, conversationId);

      const senderId =
        typeof message.sender === "object"
          ? message.sender._id?.toString()
          : message.sender?.toString();

      setTypingUser(conversationId, senderId, false);

      const convExists = useChatStore.getState().conversations.some((c) => c._id === conversationId);
      if (!convExists) fetchConversations();

      const activeConvId = useChatStore.getState().activeConversation?._id;
      if (activeConvId === conversationId) {
        axios.put(`/messages/${conversationId}/read`).catch(() => {});
        axios.put(`/conversations/${conversationId}/read`).catch(() => {});
      }
    },
    [receiveMessage, setTypingUser, fetchConversations]
  );

  const handleInAppNotification = useCallback(
    ({ conversationId, senderName, senderAvatar, content }) => {
      const activeConv = useChatStore.getState().activeConversation;
      if (activeConv?._id === conversationId) return;
      addNotification({ conversationId, senderName, senderAvatar, content });
    },
    [addNotification]
  );

  const handleNewConversation = useCallback(
    ({ conversation }) => addConversationIfMissing(conversation),
    [addConversationIfMissing]
  );

  const handleTypingStart = useCallback(
    ({ userId, conversationId }) => {
      if (!userId || !conversationId) return;
      if (userId.toString() === user?._id?.toString()) return;
      setTypingUser(conversationId, userId.toString(), true);
    },
    [setTypingUser, user]
  );

  const handleTypingStop = useCallback(
    ({ userId, conversationId }) => {
      if (!userId || !conversationId) return;
      setTypingUser(conversationId, userId.toString(), false);
    },
    [setTypingUser]
  );

  const handleMessageStatusUpdated = useCallback(
    ({ messageId, status }) => updateMessageStatus(messageId, status),
    [updateMessageStatus]
  );

  const handleMessagesRead = useCallback(
    ({ conversationId, readBy }) => {
      const readById = readBy?.toString?.() || readBy;
      if (readById === user?._id?.toString()) return;
      updateConversationRead(conversationId);
    },
    [updateConversationRead, user]
  );

  const handleMessageDeleted = useCallback(
    ({ messageId, conversationId }) => removeMessage(messageId, conversationId),
    [removeMessage]
  );

  const handleMessageReaction = useCallback(
    ({ messageId, userId, emoji }) => updateReaction(messageId, userId, emoji),
    [updateReaction]
  );

  // Register all listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) return;

    socket.on("newMessage",           handleNewMessage);
    socket.on("inAppNotification",    handleInAppNotification);
    socket.on("newConversation",      handleNewConversation);
    socket.on("typingStart",          handleTypingStart);
    socket.on("typingStop",           handleTypingStop);
    socket.on("messageStatusUpdated", handleMessageStatusUpdated);
    socket.on("messagesRead",         handleMessagesRead);
    socket.on("messageDeleted",       handleMessageDeleted);
    socket.on("messageReaction",      handleMessageReaction);

    return () => {
      socket.off("newMessage",           handleNewMessage);
      socket.off("inAppNotification",    handleInAppNotification);
      socket.off("newConversation",      handleNewConversation);
      socket.off("typingStart",          handleTypingStart);
      socket.off("typingStop",           handleTypingStop);
      socket.off("messageStatusUpdated", handleMessageStatusUpdated);
      socket.off("messagesRead",         handleMessagesRead);
      socket.off("messageDeleted",       handleMessageDeleted);
      socket.off("messageReaction",      handleMessageReaction);
    };
  }, [
    getSocket, isConnected,
    handleNewMessage, handleInAppNotification, handleNewConversation,
    handleTypingStart, handleTypingStop,
    handleMessageStatusUpdated, handleMessagesRead,
    handleMessageDeleted, handleMessageReaction,
  ]);
}
