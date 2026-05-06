import { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "../components/layout/Sidebar";
import ChatHeader from "../components/chat/ChatHeader";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import EmptyChat from "../components/chat/EmptyChat";
import useChatStore from "../context/chatStore";
import { useSocketEvents } from "../hooks/useSocketEvents";
import axios from "axios";
import toast from "react-hot-toast";

export default function ChatPage() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const fetchConversations = useChatStore((s) => s.fetchConversations);

  const [mobileView, setMobileView] = useState("sidebar");

  // ── Multi-select state ──────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const convId = activeConversation?._id;
  const messages = useChatStore((s) => convId ? (s.messagesByConv[convId] || []) : []);
  const selectedMessages = messages.filter((m) => selectedIds.has(m._id));

  // Toggle a single message in multi-select mode
  const handleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectionMode(next.size > 0);
      return next;
    });
  }, []);

  // Called from MobileReactionSheet "Select message" → enters multi-select + selects that msg
  const handleEnterMultiSelect = useCallback((id) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  // Cancel selection
  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Copy selected text messages
  const handleCopySelected = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Delete selected — optimistic + API
  const handleDeleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    const removeMessage = useChatStore.getState().removeMessage;
    ids.forEach((id) => removeMessage(id, convId));
    setSelectionMode(false);
    setSelectedIds(new Set());
    try {
      await Promise.all(ids.map((id) => axios.delete(`/messages/${id}`)));
      toast.success(`Deleted ${ids.length} message${ids.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Some messages could not be deleted");
    }
  }, [selectedIds, convId]);

  // Reset selection when conversation changes
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [convId]);

  // ── Socket + fetch ──────────────────────────────────────────────────────────
  useSocketEvents();

  const didFetch = useRef(false);
  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchConversations();
    }
  }, [fetchConversations]);

  useEffect(() => {
    const handleOpenChat = () => setMobileView("chat");
    window.addEventListener("cf-open-chat", handleOpenChat);
    return () => window.removeEventListener("cf-open-chat", handleOpenChat);
  }, []);

  useEffect(() => {
    window.history.pushState({ chatPage: true }, "");
    const handlePopState = (e) => {
      if (selectionMode) {
        e.preventDefault?.();
        handleCancelSelection();
        window.history.pushState({ chatPage: true }, "");
      } else if (mobileView === "chat") {
        e.preventDefault?.();
        clearMessages();
        setActiveConversation(null);
        setMobileView("sidebar");
        window.history.pushState({ chatPage: true }, "");
      } else {
        window.history.pushState({ chatPage: true }, "");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobileView, selectionMode, clearMessages, setActiveConversation, handleCancelSelection]);

  const openConversation = () => setMobileView("chat");

  const handleBack = () => {
    if (selectionMode) { handleCancelSelection(); return; }
    clearMessages();
    setActiveConversation(null);
    setMobileView("sidebar");
    window.history.pushState({ chatPage: true }, "");
  };

  const handleGoHome = useCallback(() => {
    handleCancelSelection();
    clearMessages();
    setActiveConversation(null);
    setMobileView("sidebar");
  }, [clearMessages, setActiveConversation, handleCancelSelection]);

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 md:w-80 md:flex md:flex-col
          ${mobileView === "sidebar" ? "flex flex-col w-full md:w-80" : "hidden md:flex md:flex-col"}
          h-full`}
      >
        <Sidebar onConversationSelect={openConversation} onGoHome={handleGoHome} />
      </div>

      {/* Chat panel */}
      <main
        className={`flex-1 flex flex-col min-w-0 h-full relative
          ${mobileView === "chat" ? "flex" : "hidden md:flex"}`}
      >
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              onBack={handleBack}
              selectionMode={selectionMode}
              selectedMessages={selectedMessages}
              selectedIds={[...selectedIds]}
              onCancelSelection={handleCancelSelection}
              onDeleteSelected={handleDeleteSelected}
              onCopySelected={handleCopySelected}
            />
            <MessageList
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onEnterMultiSelect={handleEnterMultiSelect}
            />
            {/* Hide input during multi-select (just like WhatsApp) */}
            {!selectionMode && <MessageInput />}
          </>
        ) : (
          <EmptyChat />
        )}
      </main>
    </div>
  );
}
