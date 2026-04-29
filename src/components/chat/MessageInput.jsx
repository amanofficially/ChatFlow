import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Smile, Paperclip, X } from 'lucide-react'
import useChatStore from '../../context/chatStore'
import toast from 'react-hot-toast'

let EmojiPickerImport = null

export default function MessageInput() {
  const { activeConversation, sendMessage } = useChatStore()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [EmojiPicker, setEmojiPicker] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()
  const textRef = useRef()

  // Read enter-to-send setting
  const enterSend = localStorage.getItem('cf-enter-send') !== 'false'

  // Auto-resize textarea
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }, [text])

  // Close emoji on outside click
  useEffect(() => {
    if (!showEmoji) return
    const handler = (e) => {
      if (!e.target.closest('.emoji-zone')) setShowEmoji(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const loadEmojiPicker = async () => {
    if (!EmojiPickerImport) {
      const mod = await import('emoji-picker-react')
      EmojiPickerImport = mod.default
      setEmojiPicker(() => EmojiPickerImport)
    } else {
      setEmojiPicker(() => EmojiPickerImport)
    }
    setShowEmoji(v => !v)
  }

  const handleSend = useCallback(async () => {
    const content = text.trim()
    if (!content && !preview) return
    if (!activeConversation) return

    setSending(true)
    try {
      if (preview) {
        await sendMessage(activeConversation._id, preview.url, 'image')
        setPreview(null)
      }
      if (content) {
        await sendMessage(activeConversation._id, content, 'text')
        setText('')
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
      setShowEmoji(false)
      textRef.current?.focus()
    }
  }, [text, preview, activeConversation, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && enterSend) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return }
    const url = URL.createObjectURL(file)
    setPreview({ file, url, name: file.name, type: file.type })
    e.target.value = ''
  }

  const onEmojiClick = (emojiData) => {
    setText(t => t + emojiData.emoji)
    textRef.current?.focus()
  }

  if (!activeConversation) return null

  const canSend = (text.trim() || preview) && !sending

  return (
    <div className="px-4 pb-4 pt-2 bg-[var(--bg-secondary)] flex-shrink-0 border-t border-[var(--border)]">

      {/* Image/file preview */}
      {preview && (
        <div className="mb-3 relative inline-block animate-bounce-in">
          {preview.type?.startsWith('image/') ? (
            <img src={preview.url} alt="preview" className="h-24 w-24 object-cover rounded-xl border border-[var(--border)]" />
          ) : (
            <div className="h-14 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] flex items-center gap-2">
              <Paperclip size={15} className="text-brand-500" />
              <span className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]">{preview.name}</span>
            </div>
          )}
          <button
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && EmojiPicker && (
        <div className="mb-2 animate-slide-up emoji-zone">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme="auto"
            height={300}
            width="100%"
            lazyLoadEmojis
            skinTonesDisabled
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                     bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-secondary)]
                     transition-all duration-200 active:scale-90"
          title="Attach file"
        >
          <Paperclip size={17} />
        </button>
        <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFile} />

        {/* Textarea */}
        <div className="flex-1 relative bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-2xl
                        focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500
                        transition-all duration-200 flex items-end">
          <textarea
            ref={textRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)]
                       placeholder:text-[var(--text-muted)] resize-none outline-none
                       px-4 py-3 max-h-32 leading-relaxed"
            style={{ scrollbarWidth: 'none', overflow: 'hidden' }}
          />
          <button
            onClick={loadEmojiPicker}
            className={`emoji-zone p-2.5 mr-1 transition-colors ${showEmoji ? 'text-brand-500' : 'text-[var(--text-muted)] hover:text-brand-400'}`}
          >
            <Smile size={18} />
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      transition-all duration-200 active:scale-90
                      ${canSend
              ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-glow'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send size={17} className={canSend ? 'translate-x-px' : ''} />
          }
        </button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 text-center">
        {enterSend ? 'Enter to send · Shift+Enter for new line' : 'Click send button to send'}
      </p>
    </div>
  )
}
