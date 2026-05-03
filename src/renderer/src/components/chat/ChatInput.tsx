import { useState, useRef, useCallback, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import { useChatStore } from "../../stores/chat.store"
import ImagePreview from "./ImagePreview"
import GifPicker from "./GifPicker"
import EmojiPicker, { insertEmoji } from "./EmojiPicker"
import StickerPicker from "./StickerPicker"
import WhisperSuggest from "./WhisperSuggest"
import { debugLog } from "../../lib/debug"
import { sendTyping, sendStopTyping } from "../../lib/typing-channel"
import type { Message } from "../../stores/chat.store"

// Tooltip component reused for all icon buttons
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-bg-deep border border-border-md rounded text-xs text-text-lo whitespace-nowrap
                      opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        {label}
      </div>
    </div>
  )
}

export default function ChatInput() {
  const [value, setValue] = useState("")
  const [showGif, setShowGif] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mentionActive, setMentionActive] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 })

  const pendingImage = useChatStore(s => s.pendingImage)
  const setPendingImage = useChatStore(s => s.setPendingImage)
  const pendingGifUrl = useChatStore(s => s.pendingGifUrl)
  const pendingGifPreview = useChatStore(s => s.pendingGifPreview)
  const setPendingGif = useChatStore(s => s.setPendingGif)
  const members = useSpaceStore(s => s.members)
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const profile = useAuthStore(s => s.profile)
  const prependMessage = useChatStore(s => s.prependMessage)
  const updateMessageStatus = useChatStore(s => s.updateMessageStatus)
  const replaceMessage = useChatStore(s => s.replaceMessage)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Close any open popovers when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.emoji-btn') && !target.closest('.emoji-popover')) {
        setShowEmoji(false)
      }
      if (!target.closest('.gif-btn') && !target.closest('.gif-popover')) {
        setShowGif(false)
      }
      if (!target.closest('.sticker-btn') && !target.closest('.sticker-popover')) {
        setShowStickers(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const closeAllPopovers = () => {
    setShowGif(false)
    setShowStickers(false)
    setShowEmoji(false)
  }

  const detectCommand = (text: string) => {
    if (text.startsWith("/shout ")) return "shout"
    if (text.startsWith("/whisper ")) return "whisper"
    return "chat"
  }

  const doInsertMessage = useCallback(async (
    tempId: string,
    payload: Omit<Message, 'id' | 'created_at' | 'status'>
  ) => {
    const { data, error } = await supabase
      .from("messages")
      .insert(payload)
      .select()
      .single()

    if (error) {
      debugLog({ level: "error", source: "chat", message: "Message send failed", details: { tempId, error } })
      updateMessageStatus(tempId, 'error')
      return null
    }

    debugLog({ source: "chat", message: "Message confirmed in DB", details: { tempId, realId: data?.id } })
    replaceMessage(tempId, { ...data, tmpId: tempId } as Message)
    updateMessageStatus(data.id, 'sent')
    return tempId
  }, [updateMessageStatus, replaceMessage])

  const send = useCallback(async () => {
    if ((!value.trim() && !pendingImage && !pendingGifUrl) || !currentSpace || !profile) return
    closeAllPopovers()
    const trimmed = value.trim()
    const cmd = detectCommand(trimmed)
    let theContent = trimmed
    if (cmd === "shout") theContent = trimmed.slice(7)
    if (cmd === "whisper") theContent = trimmed.slice(9)

    const tempId = `temp-${Date.now()}-${Math.random()}`

    debugLog({ source: "chat", message: "Sending message", details: { type: cmd, tempId } })

    let imageUrl: string | null = null
    if (pendingImage) {
      const ext = pendingImage.name.split(".").pop() || "jpg"
      const path2 = currentSpace.id + "/" + Date.now() + "." + ext
      const up = await supabase.storage.from("space-images").upload(path2, pendingImage)
      if (up.error) {
        debugLog({ level: "error", source: "chat", message: "Image upload failed", details: up.error })
        return
      }
      imageUrl = supabase.storage.from("space-images").getPublicUrl(path2).data.publicUrl
    }

    const msg = {
      id: tempId,
      tmpId: tempId,
      space_id: currentSpace.id,
      sender_id: profile.id,
      sender_nickname: profile.nickname,
      type: cmd as Message['type'],
      content: theContent || null,
      image_url: imageUrl || null,
      gif_url: pendingGifUrl || null,
      target_user_id: null,
      created_at: new Date().toISOString(),
      status: 'sending' as const,
    }
    prependMessage(msg)

    const payload = {
      space_id: currentSpace.id,
      sender_id: profile.id,
      sender_nickname: profile.nickname,
      type: cmd,
      content: theContent || null,
      image_url: imageUrl || null,
      gif_url: pendingGifUrl || null,
    }

    const insertId = await doInsertMessage(tempId, payload)
    if (profile) sendStopTyping(profile.id)

    if (insertId) {
      setValue("")
      setPendingImage(null)
      setPendingGif(null, null)
      textareaRef.current?.focus()
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [value, pendingImage, pendingGifUrl, currentSpace, profile, prependMessage, doInsertMessage, setPendingImage, setPendingGif])

  // Auto-resize textarea height based on content
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (profile) sendTyping(profile.id)
    const cursor = e.target.selectionStart || 0
    const lastAt = e.target.value.lastIndexOf("@", cursor - 1)
    if (lastAt >= 0) {
      const q = e.target.value.slice(lastAt + 1, cursor)
      if (!q.includes(" ")) {
        setMentionQuery(q); setMentionActive(true)
        const rect = textareaRef.current?.getBoundingClientRect()
        setMentionPos({ top: (rect?.bottom || 0) + 4, left: 0 })
      } else { setMentionActive(false) }
    } else { setMentionActive(false) }
  }

  const handleMentionSelect = (nickname: string) => {
    const cursor = textareaRef.current?.selectionStart || 0
    const lastAt = value.lastIndexOf("@", cursor - 1)
    if (lastAt >= 0) setValue(value.slice(0, lastAt) + "@" + nickname + " " + value.slice(cursor))
    setMentionActive(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      debugLog({ source: "chat", message: "Image dropped", details: { name: file.name } })
      setPendingImage(file)
    }
  }, [setPendingImage])

  const handleEmojiInsert = (emoji: string) => {
    insertEmoji(textareaRef.current, emoji)
    textareaRef.current?.focus()
  }

  const hasContent = value.trim() || pendingImage || pendingGifUrl
  const sendDisabled = !hasContent || !currentSpace || !profile

  return (
    <div className="flex-shrink-0 border-t border-border-lo p-3 bg-bg-panel">
      {/* Image / GIF preview bar */}
      {(pendingImage || pendingGifPreview) && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          {pendingImage && <ImagePreview file={pendingImage} onRemove={() => setPendingImage(null)} />}
          {pendingGifPreview && (
            <div className="relative">
              <img src={pendingGifPreview} alt="GIF" className="max-h-20 rounded-lg object-contain" />
              <button
                onClick={() => setPendingGif(null, null)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-bg-deep border border-border-md rounded-full flex items-center justify-center text-xs text-text-lo hover:text-text-hi"
              >
                x
              </button>
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <div
        className={"flex items-end gap-0.5 rounded-card border transition-all " +
          (dragging ? "border-accent bg-accent/5" : "border-border-md")}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {/* ── Attachment button ── */}
        <Tooltip label="Attach file">
          <button
            onClick={() => { closeAllPopovers(); fileRef.current?.click() }}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            title="Attach"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0]
            if (f) {
              debugLog({ source: "chat", message: "Image selected", details: { name: f.name } })
              setPendingImage(f)
            }
          }}
        />

        {/* ── GIF button ── */}
        <div className="relative">
          <Tooltip label="GIF">
            <button
              onClick={(e) => { e.stopPropagation(); closeAllPopovers(); setShowGif(v => !v) }}
              className="gif-btn flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M7 8h4m-4 4h6M17 8h.01M17 12h.01M7 16h3"/>
              </svg>
            </button>
          </Tooltip>
          {showGif && (
            <div className="gif-popover" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 50 }}>
              <GifPicker onClose={() => setShowGif(false)} position="top" />
            </div>
          )}
        </div>

        {/* ── Stickers button ── */}
        <div className="relative">
          <Tooltip label="Stickers">
            <button
              onClick={(e) => { e.stopPropagation(); closeAllPopovers(); setShowStickers(v => !v) }}
              className="sticker-btn flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
                <path d="M15 3v6h6"/>
                <path d="M10 11.5a1.5 1.5 0 1 1 3 0c0 .8-.5 1.5-1 2s-.5 1-1 1.5"/>
              </svg>
            </button>
          </Tooltip>
          {showStickers && (
            <div className="sticker-popover" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 50 }}>
              <StickerPicker onClose={() => setShowStickers(false)} onInsert={() => {}} />
            </div>
          )}
        </div>

        {/* ── Emoji button ── */}
        <div className="relative">
          <Tooltip label="Emoji">
            <button
              onClick={(e) => { e.stopPropagation(); closeAllPopovers(); setShowEmoji(v => !v) }}
              className="emoji-btn flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" x2="9.01" y1="9" y2="9"/>
                <line x1="15" x2="15.01" y1="9" y2="9"/>
              </svg>
            </button>
          </Tooltip>
          {showEmoji && (
            <div className="emoji-popover" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 8, zIndex: 50 }}>
              <EmojiPicker onClose={() => setShowEmoji(false)} onInsert={handleEmojiInsert} />
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-border-lo mx-0.5 self-center flex-shrink-0" />

        {/* ── Textarea ── */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="Message... (/shout or /whisper)"
          className="flex-1 bg-transparent text-text-hi text-sm font-body placeholder-text-lo focus:outline-none resize-none py-2 pr-2 scrollbar-thin"
          style={{ minHeight: '36px', maxHeight: '160px', overflowY: 'auto' }}
        />
      </div>

      {/* Mention autocomplete */}
      {mentionActive && (
        <WhisperSuggest
          query={mentionQuery}
          members={members}
          onSelect={handleMentionSelect}
          onClose={() => setMentionActive(false)}
          top={mentionPos.top}
          left={mentionPos.left}
        />
      )}

      {/* Hint line (Discord-style) */}
      <div className="flex justify-between items-center mt-1 px-1">
        <p className="text-text-lo text-xs">
          <kbd className="font-mono text-[10px] bg-bg-surface border border-border-lo rounded px-1">Enter</kbd>
          {' '}to send ·{' '}
          <kbd className="font-mono text-[10px] bg-bg-surface border border-border-lo rounded px-1">Shift+Enter</kbd>
          {' '}for new line
        </p>
        <p className="text-text-lo text-xs">
          {currentSpace && !profile ? 'Complete your profile to chat' : ''}
        </p>
      </div>
    </div>
  )
}