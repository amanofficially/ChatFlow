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

  // ── Single-select state (one bubble tapped on mobile) ─────────────────────
  // singleSelectMsg: the full message object of the tapped bubble, or null
  const [singleSelectMsg, setSingleSelectMsg] = useState(null);

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

  // Long-press on a bubble → enters multi-select with that bubble pre-selected
  const handleEnterMultiSelect = useCallback((id) => {
    setSingleSelectMsg(null);  // clear any single-select
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  // Cancel multi-select
  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Cancel single-select
  const handleCancelSingleSelect = useCallback(() => {
    setSingleSelectMsg(null);
  }, []);

  // Copy selected text messages (multi-select)
  const handleCopySelected = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Delete selected — optimistic + API (multi-select)
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

  // Reset all selection when conversation changes
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSingleSelectMsg(null);
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
      if (singleSelectMsg) {
        e.preventDefault?.();
        setSingleSelectMsg(null);
        window.history.pushState({ chatPage: true }, "");
      } else if (selectionMode) {
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
  }, [mobileView, selectionMode, singleSelectMsg, clearMessages, setActiveConversation, handleCancelSelection]);

  const openConversation = () => setMobileView("chat");

  const handleBack = () => {
    if (singleSelectMsg) { setSingleSelectMsg(null); return; }
    if (selectionMode) { handleCancelSelection(); return; }
    clearMessages();
    setActiveConversation(null);
    setMobileView("sidebar");
    window.history.pushState({ chatPage: true }, "");
  };

  const handleGoHome = useCallback(() => {
    handleCancelSelection();
    setSingleSelectMsg(null);
    clearMessages();
    setActiveConversation(null);
    setMobileView("sidebar");
  }, [clearMessages, setActiveConversation, handleCancelSelection]);

  // When a bubble is single-tapped: find its message object and set it (null clears)
  const handleBubbleTap = useCallback((msgId) => {
    if (!msgId) { setSingleSelectMsg(null); return; }
    const msg = messages.find((m) => m._id === msgId) || null;
    setSingleSelectMsg(msg);
  }, [messages]);

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
              // Multi-select
              selectionMode={selectionMode}
              selectedMessages={selectedMessages}
              selectedIds={[...selectedIds]}
              onCancelSelection={handleCancelSelection}
              onDeleteSelected={handleDeleteSelected}
              onCopySelected={handleCopySelected}
              // Single-select
              singleSelectMessage={singleSelectMsg}
              onCancelSingleSelect={handleCancelSingleSelect}
              onGoHome={handleGoHome}
            />
            <MessageList
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onEnterMultiSelect={handleEnterMultiSelect}
              onBubbleTap={handleBubbleTap}
              activeSingleId={singleSelectMsg?._id ?? null}
            />
            {/* Hide input during selection */}
            {!selectionMode && !singleSelectMsg && <MessageInput />}
          </>
        ) : (
          <EmptyChat />
        )}
      </main>
    </div>
  );
}
