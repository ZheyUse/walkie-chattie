import { useState, useRef, useCallback } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import { useChatStore } from "../../stores/chat.store"
import ImagePreview from "./ImagePreview"
import GifPicker from "./GifPicker"
import WhisperSuggest from "./WhisperSuggest"
import { debugLog } from "../../lib/debug"
import { sendTyping, sendStopTyping } from "../../lib/typing-channel"

export default function ChatInput() {
  const [value, setValue] = useState("")
  const [showGif, setShowGif] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mentionActive, setMentionActive] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 })
  const [error, setError] = useState("")

  const pendingImage = useChatStore(s => s.pendingImage)
  const setPendingImage = useChatStore(s => s.setPendingImage)
  const pendingGifUrl = useChatStore(s => s.pendingGifUrl)
  const pendingGifPreview = useChatStore(s => s.pendingGifPreview)
  const setPendingGif = useChatStore(s => s.setPendingGif)
  const members = useSpaceStore(s => s.members)
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const profile = useAuthStore(s => s.profile)
  const prependMessage = useChatStore(s => s.prependMessage)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const detectCommand = (text: string) => {
    if (text.startsWith("/shout ")) return "shout"
    if (text.startsWith("/whisper ")) return "whisper"
    return "chat"
  }

  const send = useCallback(async () => {
    if ((!value.trim() && !pendingImage && !pendingGifUrl) || !currentSpace || !profile) {
      debugLog({
        level: "warn",
        source: "chat",
        message: "Message send blocked",
        details: {
          hasText: Boolean(value.trim()),
          hasImage: Boolean(pendingImage),
          hasGif: Boolean(pendingGifUrl),
          hasSpace: Boolean(currentSpace),
          hasProfile: Boolean(profile),
        },
      })
      return
    }
    setError("")
    const trimmed = value.trim()
    const cmd = detectCommand(trimmed)
    let theContent = trimmed
    if (cmd === "shout") theContent = trimmed.slice(7)
    if (cmd === "whisper") theContent = trimmed.slice(9)

    debugLog({
      source: "chat",
      message: "Sending message",
      details: {
        type: cmd,
        spaceId: currentSpace.id,
        senderId: profile.id,
        hasImage: Boolean(pendingImage),
        hasGif: Boolean(pendingGifUrl),
        contentLength: theContent.length,
      },
    })

    let imageUrl = null
    if (pendingImage) {
      const ext = pendingImage.name.split(".").pop() || "jpg"
      const path2 = currentSpace.id + "/" + Date.now() + "." + ext
      debugLog({ source: "chat", message: "Uploading message image", details: { path: path2, size: pendingImage.size, type: pendingImage.type } })
      const up = await supabase.storage.from("space-images").upload(path2, pendingImage)
      if (up.error) {
        debugLog({ level: "error", source: "chat", message: "Image upload failed", details: up.error })
        setError(up.error.message)
        return
      }
      imageUrl = supabase.storage.from("space-images").getPublicUrl(path2).data.publicUrl
    }

    const payload = {
      space_id: currentSpace.id,
      sender_id: profile.id,
      sender_nickname: profile.nickname,
      type: cmd,
      content: theContent || null,
      image_url: imageUrl || null,
      gif_url: pendingGifUrl || null,
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      debugLog({ level: "error", source: "chat", message: "Message send failed", details: insertError })
      setError(insertError.message)
      return
    }

    debugLog({ source: "chat", message: "Message sent", details: { messageId: message?.id, type: cmd } })
    if (message) prependMessage(message)
    if (profile) sendStopTyping(profile.id)
    setValue("")
    setPendingImage(null)
    setPendingGif(null, null)
    textareaRef.current?.focus()
  }, [value, pendingImage, pendingGifUrl, currentSpace, profile, prependMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      debugLog({ source: "chat", message: "Enter pressed in message input" })
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
    debugLog({ source: "chat", message: "Mention selected", details: { nickname } })
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
      debugLog({ source: "chat", message: "Image dropped into message input", details: { name: file.name, size: file.size, type: file.type } })
      setPendingImage(file)
    }
  }, [setPendingImage])

  return (
    <div className="flex-shrink-0 border-t border-border-lo p-3 bg-bg-panel">
      {(pendingImage || pendingGifPreview) && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          {pendingImage && <ImagePreview file={pendingImage} onRemove={() => setPendingImage(null)} />}
          {pendingGifPreview && (
            <div className="relative">
              <img src={pendingGifPreview} alt="GIF" className="max-h-20 rounded-lg object-contain" />
              <button onClick={() => setPendingGif(null, null)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-bg-deep border border-border-md rounded-full
                           flex items-center justify-center text-xs text-text-lo">x</button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">{error}</p>}

      {showGif && <GifPicker onClose={() => setShowGif(false)} />}

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

      <div
        className={"flex items-end gap-1 rounded-card border transition-all " + (dragging ? "border-accent bg-accent/5" : "border-border-md")}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <button onClick={() => { debugLog({ source: "chat", message: "GIF picker toggled", details: { open: !showGif } }); setShowGif(!showGif) }}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-text-lo hover:text-accent text-base transition-colors">GIF</button>
        <button onClick={() => { debugLog({ source: "chat", message: "Image picker opened" }); fileRef.current?.click() }}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-text-lo hover:text-accent text-base transition-colors">+</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0]
            if (f) {
              debugLog({ source: "chat", message: "Image selected", details: { name: f.name, size: f.size, type: f.type } })
              setPendingImage(f)
            }
          }} />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={2000}
          placeholder="Message... (/shout or /whisper)"
          className="flex-1 bg-transparent text-text-hi text-sm font-body placeholder-text-lo resize-none py-2 pr-2 focus:outline-none max-h-32 overflow-y-auto"
          style={{ minHeight: "36px" }}
        />
        <button onClick={send}
          disabled={!value.trim() && !pendingImage && !pendingGifUrl}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-accent hover:text-accent/80 disabled:text-text-lo text-base">Send</button>
      </div>
    </div>
  )
}
