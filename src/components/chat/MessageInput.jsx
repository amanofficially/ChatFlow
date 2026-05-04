import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Send, Smile, Paperclip, X, Loader2 } from "lucide-react";
import useChatStore from "../../context/chatStore";
import { useTyping } from "../../hooks/useTyping";
import { useSound } from "../../context/SoundContext";
import axios from "axios";
import toast from "react-hot-toast";

let EmojiPickerModule = null;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function MessageInput() {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const { play } = useSound();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [EmojiPicker, setEmojiPicker] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const fileRef = useRef();
  const textRef = useRef();
  const typingTimeoutRef = useRef(null);
  const previewRef = useRef(null);

  const { startTyping, stopTyping } = useTyping(activeConversation?._id);

  const enterSend = useMemo(
    () => localStorage.getItem("cf-enter-send") !== "false",
    [],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  // Close emoji on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (!e.target.closest(".emoji-zone")) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showEmoji]);

  // Reset on conversation switch
  useEffect(() => {
    setText("");
    setShowEmoji(false);
    if (previewRef.current?.localUrl?.startsWith("blob:"))
      URL.revokeObjectURL(previewRef.current.localUrl);
    setPreview(null);
    previewRef.current = null;
  }, [activeConversation?._id]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);
  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  const loadEmojiPicker = async () => {
    if (!EmojiPickerModule) {
      const mod = await import("emoji-picker-react");
      EmojiPickerModule = mod.default;
    }
    setEmojiPicker(() => EmojiPickerModule);
    setShowEmoji((v) => !v);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10 MB)");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreview({ file, localUrl, name: file.name, mimeType: file.type });
  };

  const clearPreview = useCallback(() => {
    if (previewRef.current?.localUrl?.startsWith("blob:"))
      URL.revokeObjectURL(previewRef.current.localUrl);
    setPreview(null);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !preview) return;
    if (!activeConversation || isSending) return;

    stopTyping();
    setIsSending(true);
    setUploadPct(0);

    const capturedText = trimmed;
    const capturedPreview = preview;
    setText("");
    setPreview(null);
    setShowEmoji(false);
    textRef.current?.focus();

    try {
      if (capturedPreview) {
        const base64 = await fileToBase64(capturedPreview.file);
        if (capturedPreview.localUrl?.startsWith("blob:"))
          URL.revokeObjectURL(capturedPreview.localUrl);

        const { data: uploadData } = await axios.post(
          "/upload/chat-media",
          {
            file: base64,
            name: capturedPreview.name,
            mimeType: capturedPreview.mimeType,
          },
          {
            onUploadProgress: (e) => {
              if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100));
            },
          },
        );
        setUploadPct(100);
        await sendMessage(
          activeConversation._id,
          uploadData.url,
          uploadData.type,
          uploadData.type === "file" ? uploadData.originalName : null,
        );
      }

      if (capturedText) {
        await sendMessage(activeConversation._id, capturedText, "text", null);
      }

      play("message_sent");
    } catch (err) {
      const detail =
        err?.response?.data?.detail || err?.response?.data?.message;
      toast.error(detail ? `Failed: ${detail}` : "Failed to send message");
      if (capturedText) setText(capturedText);
    } finally {
      setIsSending(false);
      setUploadPct(0);
    }
  }, [
    text,
    preview,
    activeConversation,
    sendMessage,
    stopTyping,
    isSending,
    play,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && enterSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val) {
      startTyping();
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => stopTyping(), 2000);
    } else {
      stopTyping();
    }
  };

  const onEmojiClick = (emojiData) => {
    setText((t) => t + emojiData.emoji);
    textRef.current?.focus();
  };

  if (!activeConversation) return null;

  const isImage = preview?.mimeType?.startsWith("image/");
  const canSend = !isSending && !!(text.trim() || preview);

  return (
    <div className="px-3 pb-3 pt-2 bg-[var(--bg-secondary)] flex-shrink-0 border-t border-[var(--border)]">
      {/* Upload progress */}
      {isSending && uploadPct > 0 && uploadPct < 100 && (
        <div className="mb-2 h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-200 rounded-full"
            style={{ width: `${uploadPct}%` }}
          />
        </div>
      )}

      {/* File preview */}
      {preview && (
        <div className="mb-2 relative inline-block animate-bounce-in">
          {isImage ? (
            <img
              src={preview.localUrl}
              alt="preview"
              className="h-20 w-20 object-cover rounded-xl border border-[var(--border)]"
            />
          ) : (
            <div className="h-12 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] flex items-center gap-2 max-w-[200px]">
              <Paperclip size={14} className="text-brand-500 flex-shrink-0" />
              <span className="text-xs text-[var(--text-secondary)] truncate">
                {preview.name}
              </span>
            </div>
          )}
          {!isSending && (
            <button
              onClick={clearPreview}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                         flex items-center justify-center hover:bg-red-600 transition-colors shadow"
              style={{ touchAction: "manipulation" }}
            >
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && EmojiPicker && (
        <div className="mb-2 animate-slide-up emoji-zone">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme="auto"
            height={280}
            width="100%"
            lazyLoadEmojis
            skinTonesDisabled
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach */}
        <button
          onClick={() => !isSending && fileRef.current?.click()}
          disabled={isSending}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                     bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-secondary)]
                     transition-all duration-200 active:scale-90 disabled:opacity-50"
          style={{ touchAction: "manipulation" }}
          title="Attach file or image"
        >
          <Paperclip size={17} />
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.mp4,.mp3"
          onChange={handleFile}
        />

        {/* Text area + emoji */}
        <div
          className="flex-1 relative bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl
                      focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500
                      transition-all duration-200 flex items-end"
        >
          <textarea
            ref={textRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            disabled={isSending}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)]
                       placeholder:text-[var(--text-muted)] resize-none outline-none
                       px-3.5 py-2.5 max-h-28 leading-relaxed disabled:opacity-50"
            style={{ scrollbarWidth: "none", overflow: "hidden" }}
          />
          <button
            onClick={loadEmojiPicker}
            className={`emoji-zone p-2 mb-0.5 mr-0.5 transition-colors flex-shrink-0 ${
              showEmoji
                ? "text-brand-500"
                : "text-[var(--text-muted)] hover:text-brand-400"
            }`}
            style={{ touchAction: "manipulation" }}
          >
            <Smile size={18} />
          </button>
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      transition-all duration-200 active:scale-90
                      ${
                        canSend
                          ? "bg-brand-500 hover:bg-brand-600 text-white shadow-glow"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed"
                      }`}
          style={{ touchAction: "manipulation" }}
        >
          {isSending ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Send size={17} className={canSend ? "translate-x-px" : ""} />
          )}
        </button>
      </div>
    </div>
  );
}
