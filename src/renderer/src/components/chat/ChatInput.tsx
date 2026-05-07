import 'material-symbols'
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
import CommandSuggest from "./CommandSuggest"
import { debugLog } from "../../lib/debug"
import { sendTyping, sendStopTyping } from "../../lib/typing-channel"
import { toast } from "../../lib/toast"
import { playSound } from "../../lib/sounds"
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
  const [cmdActive, setCmdActive] = useState(false)
  const [cmdQuery, setCmdQuery] = useState("")

  const pendingImage = useChatStore(s => s.pendingImage)
  const setPendingImage = useChatStore(s => s.setPendingImage)
  const pendingGifUrl = useChatStore(s => s.pendingGifUrl)
  const pendingGifPreview = useChatStore(s => s.pendingGifPreview)
  const setPendingGif = useChatStore(s => s.setPendingGif)
  const editingMessage = useChatStore(s => s.editingMessage)
  const setEditingMessage = useChatStore(s => s.setEditingMessage)
  const replyingTo = useChatStore(s => s.replyingTo)
  const setReplyingTo = useChatStore(s => s.setReplyingTo)
  const updateMessageContent = useChatStore(s => s.updateMessageContent)
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

  // Populate textarea when edit starts
  useEffect(() => {
    if (editingMessage) {
      setValue(editingMessage.content || '')
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ block: 'nearest' })
    } else {
      setValue('')
    }
  }, [editingMessage])

  // Focus textarea when reply is triggered
  useEffect(() => {
    const handler = () => {
      textareaRef.current?.focus()
    }
    window.addEventListener('focus-chat-input', handler)
    return () => window.removeEventListener('focus-chat-input', handler)
  }, [])

  const cancelEdit = () => {
    setEditingMessage(null)
    setValue('')
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const detectCommand = (text: string) => {
    if (!text.startsWith('/')) return 'chat'
    const command = text.slice(1).split(/\s+/)[0].toLowerCase()
    if (command === 'shout') return 'shout'
    if (command === 'tap') return 'tap'
    if (command === 'kick') return 'kick'
    if (command === 'all') return 'all'
    if (command === 'nickname') return 'nickname'

    return 'chat'
  }

  const normalizeName = (raw: string) => raw.trim().toLowerCase().replace(/\s+/g, '')
  const findMemberByName = (raw: string) => {
    const needle = normalizeName(raw)
    return members.find(m => {
      const displayKey = m.display_name ? normalizeName(m.display_name) : ''
      const nicknameKey = normalizeName(m.nickname)
      return displayKey === needle || nicknameKey === needle
    })
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

  // Get display_name from space_members if available, else fallback to nickname/profile nickname
  const getMyDisplayName = () => {
    const myMember = members.find(m => m.user_id === profile?.id && m.space_id === currentSpace?.id)
    return myMember?.display_name?.trim() || myMember?.nickname || profile?.nickname || 'Unknown'
  }

  const send = useCallback(async () => {
    if ((!value.trim() && !pendingImage && !pendingGifUrl) || !currentSpace || !profile) return
    closeAllPopovers()
    const trimmed = value.trim()
    const cmd = detectCommand(trimmed)
    let theContent = trimmed
    let targetUserId: string | null = null
    let targetNickname: string | null = null
    if (cmd === "shout") theContent = trimmed.replace(/^\/shout\s+/, '')
    if (cmd === "tap") {
      theContent = trimmed.replace(/^\/tap\s+/, '')
      debugLog({ source: "chat", message: "Tap after slice", details: { content: theContent } })
      let rawTapNick = ''
      const mentionMatch = theContent.match(/^@(\S+)\s+/)
      if (mentionMatch) {
        const rawNick = mentionMatch[1]
        rawTapNick = rawNick
        debugLog({ source: "chat", message: "Tap mention parsed", details: { rawNick, membersCount: members.length, firstMember: members[0] } })

        // Try local members list first. Members are flattened in the space store.
        const targetMember = findMemberByName(rawNick)
        debugLog({ source: "chat", message: "Tap local lookup", details: {
          matched: !!targetMember,
          targetUserId: targetMember?.user_id,
          targetNickname: targetMember?.nickname,
        } })

        if (targetMember?.user_id) {
          targetUserId = targetMember.user_id
          targetNickname = targetMember.nickname
          theContent = theContent.slice(mentionMatch[0].length)
          debugLog({ source: "chat", message: "Tap resolved from local", details: { targetUserId, targetNickname } })
        } else {
          // Fallback: query DB directly for profile
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('id, nickname')
            .ilike('nickname', rawNick)
            .single()
          if (targetProfile) {
            targetUserId = targetProfile.id
            targetNickname = targetProfile.nickname
            theContent = theContent.slice(mentionMatch[0].length)
            debugLog({ source: "chat", message: "Tap resolved from DB", details: { targetUserId, targetNickname } })
          }
        }
      } else {
        debugLog({ source: "chat", message: "Tap: no valid @mention found", details: { contentAfterSlice: theContent } })
      }

      if (!targetUserId || !targetNickname) {
        toast(rawTapNick ? `Member "${rawTapNick}" not found` : 'Use /tap @username message')
        return
      }

      // Check if target user is online (presence-based) - informational only
      // Don't block based on presence - bugs in presence status could cause false offline detection
      // The tap will reach the user if they're reachable, regardless of presence status
      const onlineUsers = useSpaceStore.getState().onlineUsers
      const isTargetOnline = onlineUsers.has(targetUserId)
      debugLog({ source: "chat", message: "Tap: checking online status", details: { targetUserId, isTargetOnline, targetNickname } })
      if (!isTargetOnline) {
        toast(`@${targetNickname} is Offline`, { duration: 2000 })
      }
      // Note: We don't block here. The tap will still be sent - they'll receive it when they reconnect
    }
    if (cmd === "kick") {
      theContent = trimmed.replace(/^\/kick\s+/, '')
      const mentionMatch = theContent.match(/^@(\S+)/)
      if (!mentionMatch) { toast('Use /kick @username'); return }
      const rawNick = mentionMatch[1]
      const isAdmin = currentSpace?.owner_id === profile?.id
      if (!isAdmin) { toast('Only admins can kick members'); return }
      const targetMember = findMemberByName(rawNick)
      if (!targetMember) { toast(`Member "${rawNick}" not found`); return }
      if (targetMember.user_id === profile?.id) { toast("You can't kick yourself"); return }
      const { error: kickError } = await supabase
        .from('space_members')
        .delete()
        .eq('space_id', currentSpace.id)
        .eq('user_id', targetMember.user_id)
      if (kickError) {
        debugLog({ level: 'error', source: 'chat', message: 'Kick failed to remove member', details: kickError })
        toast('Kick failed — try again.')
        return
      }
      const displayName = targetMember.display_name?.trim() || targetMember.nickname
      await supabase.from('messages').insert({
        space_id: currentSpace.id,
        sender_id: profile.id,
        sender_nickname: getMyDisplayName(),
        type: 'system',
        content: `${getMyDisplayName()} removed ${displayName} from the space`,
      })
      toast(`${displayName} has been removed`)
      setValue("")
      return
    }
    if (cmd === "all") theContent = trimmed.replace(/^\/all\s+/, '')

    if (cmd === "nickname") {
      const args = trimmed.replace(/^\/nickname\s+/, '').trim()
      // Check if targeting another user: /nickname @username <newname>
      const mentionMatch = args.match(/^@(\S+)\s+(.+)/)

      if (mentionMatch) {
        // Admin changing another user's nickname: /nickname @username <newname>
        const rawNick = mentionMatch[1]
        const newName = mentionMatch[2].trim()
        if (!newName) { toast('Use /nickname @username <newname>'); return }

        const isAdmin = currentSpace?.owner_id === profile?.id
        if (!isAdmin) { toast('Only admins can change others\' nicknames'); return }

        const targetMember = findMemberByName(rawNick)
        if (!targetMember) { toast(`Member "${rawNick}" not found`); return }
        if (targetMember.user_id === profile?.id) { toast('Use /nickname <newname> for yourself'); return }

        const { error } = await supabase
          .from('space_members')
          .update({ display_name: newName })
          .eq('space_id', currentSpace.id)
          .eq('user_id', targetMember.user_id)
        if (error) {
          toast('Nickname update failed')
          return
        }
        useSpaceStore.getState().setMembers(members.map(m => m.user_id === targetMember.user_id ? { ...m, display_name: newName } : m))
        toast(`${targetMember.nickname}'s nickname changed to "${newName}"`)
        setValue('')
        return
      }

      // Original: /nickname <newname> (change own nickname)
      if (!args) { toast('Use /nickname <newname> or /nickname @username <newname>'); return }
      const { error } = await supabase
        .from('space_members')
        .update({ display_name: args })
        .eq('space_id', currentSpace.id)
        .eq('user_id', profile.id)
      if (error) {
        debugLog({ level: 'error', source: 'chat', message: 'Nickname update failed', details: error })
        toast('Nickname update failed')
        return
      }
      useSpaceStore.getState().setMembers(members.map(m => m.user_id === profile.id ? { ...m, display_name: args } : m))
      toast('Nickname updated')
      setValue('')
      return
    }

    const tempId = `temp-${Date.now()}-${Math.random()}`

    debugLog({ source: "chat", message: "Sending message", details: { type: cmd, tempId, targetUserId } })

    let imageUrl: string | null = null
    if (pendingImage) {
      const ext = pendingImage.name.split(".").pop() || "jpg"
      const path2 = currentSpace.id + "/" + Date.now() + "." + ext
      const up = await supabase.storage.from("space-images").upload(path2, pendingImage)
      if (up.error) {
        debugLog({ level: "error", source: "chat", message: "Image upload failed", details: up.error })
        toast('Image upload failed. Please try again.')
        setValue("")
        setPendingImage(null)
        setPendingGif(null, null)
        setReplyingTo(null)
        return
      }
      imageUrl = supabase.storage.from("space-images").getPublicUrl(path2).data.publicUrl
    }

    const msg = {
      id: tempId,
      tmpId: tempId,
      space_id: currentSpace.id,
      sender_id: profile.id,
      sender_nickname: getMyDisplayName(),
      type: cmd as Message['type'],
      content: theContent || null,
      image_url: imageUrl || null,
      gif_url: pendingGifUrl || null,
      target_user_id: targetUserId,
      reply_to: replyingTo?.id ?? null,
      target_nickname: targetNickname,
      created_at: new Date().toISOString(),
      status: 'sending' as const,
    }
    prependMessage(msg)

    const payload = {
      space_id: currentSpace.id,
      sender_id: profile.id,
      sender_nickname: getMyDisplayName(),
      type: cmd,
      content: theContent || null,
      image_url: imageUrl || null,
      gif_url: pendingGifUrl || null,
      target_user_id: targetUserId,
      reply_to: replyingTo?.id ?? null,
    }

    const insertId = await doInsertMessage(tempId, payload)
    if (profile) sendStopTyping(profile.id)

    // Trigger shout popup directly (works even if realtime subscription missed the INSERT)
    debugLog({ source: "chat", message: "Shout check", details: { insertId, cmd, includeSelf: localStorage.getItem('include_self_shout') } })
    if (insertId && cmd === 'shout') {
      const includeSelf = localStorage.getItem('include_self_shout') === 'true'
      if (includeSelf) {
        if (imageUrl) {
          debugLog({ source: "chat", message: "[SUCCESS] showShout with imageUrl", details: { sender: profile.nickname, message: theContent, imageUrl } })
        } else {
          debugLog({ source: "chat", message: "showShout called", details: { sender: profile.nickname, message: theContent, hasImage: false } })
        }
        window.api.showShout({
          sender: getMyDisplayName(),
          message: theContent || '',
          gifUrl: pendingGifUrl || undefined,
          imageUrl: imageUrl || undefined,
          spaceName: currentSpace?.name,
          spaceIcon: currentSpace?.avatar_emoji,
        })
      }
    }

    // Trigger tap popup for the tapped user
    if (insertId && cmd === 'tap' && targetUserId && targetNickname) {
      const includeSelf = localStorage.getItem('include_self_shout') === 'true'
      if (includeSelf) {
        if (imageUrl) {
          debugLog({ source: "chat", message: "[SUCCESS] showTap with imageUrl", details: { sender: profile.nickname, targetNickname, message: theContent, imageUrl } })
        } else {
          debugLog({ source: "chat", message: "showTap called", details: { sender: profile.nickname, targetNickname, message: theContent, hasImage: false } })
        }
        window.api.showTap({
          sender: getMyDisplayName(),
          message: theContent || '',
          gifUrl: pendingGifUrl || undefined,
          imageUrl: imageUrl || undefined,
        })
      }
    }

    // Trigger broadcast popup for @all mentions
    if (insertId && cmd === 'all') {
      const includeSelf = localStorage.getItem('include_self_shout') === 'true'
      if (includeSelf) {
        debugLog({ source: "chat", message: "showBroadcast called", details: { sender: profile.nickname, message: theContent } })
        window.api.showBroadcast({
          sender: getMyDisplayName(),
          message: theContent || '',
          gifUrl: pendingGifUrl || undefined,
          spaceName: currentSpace?.name,
          spaceIcon: currentSpace?.avatar_emoji,
        })
      }
    }

    if (insertId) {
      setValue("")
      setPendingImage(null)
      setPendingGif(null, null)
      setReplyingTo(null)
      textareaRef.current?.focus()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      playSound('sent')
    }
  }, [value, pendingImage, pendingGifUrl, currentSpace, profile, members, replyingTo, prependMessage, doInsertMessage, setPendingImage, setPendingGif, setReplyingTo])

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
      if (editingMessage) {
        submitEdit()
      } else {
        send()
      }
    }
    // When @mention is active, Tab accepts the correct suggestion
    if (e.key === "Tab" && mentionActive && !editingMessage) {
      e.preventDefault()
      e.stopPropagation()
      const queryLower = mentionQuery.toLowerCase()
      const atAllMatch = 'all'.startsWith(queryLower) || queryLower === ''
      if (atAllMatch) {
        handleMentionSelect('__bold__@all')
      } else {
        const match = members.find(m => (m.display_name?.trim() || m.nickname).toLowerCase().includes(queryLower))
        if (match) handleMentionSelect(match.display_name?.trim() || match.nickname)
      }
    }
    if (e.key === "Escape") {
      cancelEdit()
      cancelReply()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (profile) sendTyping(profile.id)
    const cursor = e.target.selectionStart || 0

    // Detect @mention (but not inside a /tap command at the start)
    const lastAt = e.target.value.lastIndexOf("@", cursor - 1)
    if (lastAt >= 0) {
      const q = e.target.value.slice(lastAt + 1, cursor)
      if (!q.includes(" ") && !q.startsWith("/")) {
        setMentionQuery(q); setMentionActive(true)
        setCmdActive(false)
      } else { setMentionActive(false) }
    } else { setMentionActive(false) }

    // Detect /command
    if (e.target.value.startsWith("/")) {
      const q = e.target.value.slice(1, cursor)
      if (!q.includes(" ") && !q.includes("\n")) {
        setCmdQuery(q); setCmdActive(true)
        setMentionActive(false)
      } else { setCmdActive(false) }
    } else { setCmdActive(false) }
  }

  const handleMentionSelect = (nickname: string) => {
    const cursor = textareaRef.current?.selectionStart || 0
    const lastAt = value.lastIndexOf("@", cursor - 1)
    // Normalize suggestion to avoid @@all when the label already includes @.
    const cleanNick = nickname.replace('__bold__', '').replace(/^@+/, '')
    if (lastAt >= 0) setValue(value.slice(0, lastAt) + "@" + cleanNick + " " + value.slice(cursor))
    setMentionActive(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleCommandSelect = (command: string) => {
    const cursor = textareaRef.current?.selectionStart || 0
    const lastSlash = value.lastIndexOf("/", cursor - 1)
    if (lastSlash >= 0) setValue(value.slice(0, lastSlash) + command + " " + value.slice(cursor))
    setCmdActive(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
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

  const submitEdit = async () => {
    if (!editingMessage || !value.trim()) return
    const newContent = value.trim()
    if (newContent === editingMessage.content) {
      cancelEdit()
      return
    }
    const lookupId = editingMessage.id
    updateMessageContent(lookupId, newContent)
    await supabase.from('messages').update({ content: newContent }).eq('id', lookupId)
    toast('Message updated')
    if (profile) sendStopTyping(profile.id)
    cancelEdit()
  }

  const hasContent = value.trim() || pendingImage || pendingGifUrl
  const sendDisabled = !hasContent || !currentSpace || !profile

  // Global Enter handler — fires even when textarea/GIF picker/sticker panel doesn't have focus
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.defaultPrevented) return
      const active = document.activeElement
      // Only handle if focus is NOT on a text input (textarea handles itself)
      if (active?.tagName === "TEXTAREA" || active?.tagName === "INPUT") return
      if (!hasContent || !currentSpace || !profile) return
      e.preventDefault()
      send()
    }
    window.addEventListener("keydown", onGlobalKeyDown)
    return () => window.removeEventListener("keydown", onGlobalKeyDown)
  }, [hasContent, currentSpace, profile])

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

      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'rgba(139,92,246,0.8)' }}>reply</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-display" style={{ color: 'rgba(196,181,253,0.9)' }}>
              Replying to {replyingTo.sender_nickname}
            </div>
            <div className="text-xs font-body truncate" style={{ color: 'rgba(232,234,237,0.7)' }}>
              {replyingTo.content || (replyingTo.gif_url ? 'GIF' : replyingTo.image_url ? 'Image' : 'Message')}
            </div>
          </div>
          <button
            onClick={cancelReply}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'rgba(232,234,237,0.6)' }}
            aria-label="Cancel reply"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="relative">
        <div
          className={"flex items-end gap-0.5 rounded-card border transition-all " +
            (dragging ? "border-accent bg-accent/5" : "border-border-md")}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true) }}
          onDragLeave={() => { setDragging(false) }}
          onDrop={handleDrop}
        >
        {/* ── Attachment button ── */}
        <Tooltip label="Attach file">
          <button
            onClick={() => { closeAllPopovers(); fileRef.current?.click() }}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            title="Attach"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'inherit' }}>attach_file</span>
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
              onClick={(e) => { e.stopPropagation(); const next = !showGif; closeAllPopovers(); if (next) setShowGif(true) }}
              className="gif-btn flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'inherit' }}>gif_box</span>
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
              onClick={(e) => { e.stopPropagation(); const next = !showStickers; closeAllPopovers(); if (next) setShowStickers(true) }}
              className="sticker-btn flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'inherit' }}>sticker_add</span>
            </button>
          </Tooltip>
          {showStickers && (
            <div className="sticker-popover" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 50 }}>
              <StickerPicker onClose={() => setShowStickers(false)} />
            </div>
          )}
        </div>

        {/* ── Emoji button ── */}
        <div className="relative">
          <Tooltip label="Emoji">
            <button
              onClick={(e) => { e.stopPropagation(); const next = !showEmoji; closeAllPopovers(); if (next) setShowEmoji(true) }}
              className="emoji-btn flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-lo hover:text-text-hi rounded transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'inherit' }}>sentiment_satisfied</span>
            </button>
          </Tooltip>
          {showEmoji && (
            <div className="emoji-popover" style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 50 }}>
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
          placeholder={editingMessage ? "Edit message..." : "Message..."}
          className="flex-1 bg-transparent text-text-hi text-sm font-body placeholder-text-lo focus:outline-none resize-none py-2 pr-2 scrollbar-thin"
          style={{ minHeight: '36px', maxHeight: '160px', overflowY: 'auto' }}
        />

        <Tooltip label={editingMessage ? 'Save edit' : 'Send'}>
          <button
            onClick={() => { if (editingMessage) submitEdit(); else send() }}
            disabled={sendDisabled}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded transition-colors"
            style={{
              color: sendDisabled ? 'rgba(232,234,237,0.35)' : 'rgba(232,234,237,0.9)',
            }}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
          </button>
        </Tooltip>
      </div>

      {/* Editing indicator */}
      {editingMessage && (
        <div className='flex items-center gap-2 px-1 mt-1.5 mb-0.5'>
          <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'rgba(139,92,246,0.7)' }}>edit</span>
          <span className='text-xs font-display font-semibold' style={{ color: 'rgba(139,92,246,0.7)' }}>Editing message</span>
          <button
            onClick={cancelEdit}
            className='ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs font-display transition-colors hover:bg-white/[0.06]'
            style={{ color: 'rgba(232,234,237,0.5)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>close</span>
            Cancel
          </button>
        </div>
      )}

      {/* @mention autocomplete */}
      {mentionActive && (
        <WhisperSuggest
          query={mentionQuery}
          members={members}
          onSelect={handleMentionSelect}
          onClose={() => setMentionActive(false)}
        />
      )}

      {/* /command autocomplete */}
      {cmdActive && (
        <CommandSuggest
          query={cmdQuery}
          onSelect={handleCommandSelect}
          onClose={() => setCmdActive(false)}
        />
      )}
      </div>

      {/* Hint line (Discord-style) */}
      <div className="flex justify-between items-center mt-1 px-1">
        <p className="text-text-lo text-xs">
          <kbd className="font-body text-[10px] bg-bg-surface border border-border-lo rounded px-1">Enter</kbd>
          {' '}to send ·{' '}
          <kbd className="font-body text-[10px] bg-bg-surface border border-border-lo rounded px-1">Shift+Enter</kbd>
          {' '}for new line
        </p>
        <p className="text-text-lo text-xs">
          {currentSpace && !profile ? 'Complete your profile to chat' : ''}
        </p>
      </div>
    </div>
  )
}

