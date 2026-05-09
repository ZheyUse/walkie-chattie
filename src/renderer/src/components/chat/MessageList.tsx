import 'material-symbols'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore, type Message } from '../../stores/chat.store'

import { applyPresenceLastActive } from "../../lib/presence"
import { useAuthStore } from '../../stores/auth.store'
import MessageItem from './MessageItem'
import Loader from '../ui/Loader'
import { debugLog } from '../../lib/debug'
import { triggerNotification } from '../../lib/notifications'

const PAGE_SIZE = 100
const BOTTOM_THRESHOLD = 80

export default function MessageList() {
  const { currentSpace, setSpace, spaces } = useSpaceStore()
  const { profile } = useAuthStore()
  const { messages, setMessages, prependMessages, searchQuery, markSeen } = useChatStore()
  const listRef = useRef<HTMLDivElement>(null)
  const msgObserverRef = useRef<IntersectionObserver | null>(null)
  const markedRef = useRef<Set<string>>(new Set())
  const profileIdRef = useRef<string | undefined>(profile?.id)
  const isAtBottomRef = useRef(true)
  const autoScrollRef = useRef(false)
  const isOwnMessageInsertRef = useRef(false)
  const messageCacheRef = useRef<Map<string, Message[]>>(new Map())
  const [showJumpBtn, setShowJumpBtn] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [pageOffset, setPageOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const prevMessagesLenRef = useRef(0)

  useEffect(() => { profileIdRef.current = profile?.id }, [profile?.id])

  // Normalize raw reactions from DB to UI format
  const normalizeReactions = (raw: unknown): Message['reactions'] => {
    if (!Array.isArray(raw)) return []
    return raw
      .map((r) => {
        const emoji = typeof r?.emoji === 'string' ? r.emoji : null
        const userIds = Array.isArray(r?.user_ids) ? r.user_ids.filter(Boolean) : []
        if (!emoji) return null
        return { emoji, userIds, count: userIds.length, reacted: userIds.includes(profileIdRef.current ?? '') }
      })
      .filter(Boolean) as Message['reactions']
  }

  // Fetch messages for a given offset
  const fetchMessages = (offset: number, resetLoad = false) => {
    if (!currentSpace) return

    if (resetLoad) {
      setMessages([])
      setInitialLoading(true)
    } else {
      setLoadingOlder(true)
    }

    // Fetch newest messages first, then reverse for display
    supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('space_id', currentSpace.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
      .then(({ data, count }) => {
        if (!data) { setLoadingOlder(false); return }

        // Reverse to display in chronological order (ascending)
        const formatted = data.reverse().map(m => {
          const reactions = normalizeReactions((m as Message & { reactions?: unknown }).reactions)
          return { ...m, status: 'sent' as const, reactions } as Message
        })

        if (offset === 0) {
          setMessages(formatted)
          setInitialLoading(false)
        } else {
          // When loading older (scrolling up), prepend older messages at the BEGINNING
          setMessages([...formatted, ...useChatStore.getState().messages])
        }

        const totalCount = count ?? data.length
        setHasMore(offset + data.length < totalCount)
        setPageOffset(offset)
        setLoadingOlder(false)
      })
  }

  // ── Subscription state tracking ──
  const subscriptionActiveRef = useRef(false)
  const subscriptionErrorRef = useRef(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial page
  useEffect(() => {
    if (!currentSpace) return
    setPageOffset(0)
    setHasMore(true)
    markedRef.current.clear()
    fetchMessages(0, true)

    // Reset subscription state on space change
    subscriptionActiveRef.current = false
    subscriptionErrorRef.current = false
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)

    // Build list of ALL space IDs user is a member of (for cross-space shout/tap)
    const allSpaceIds = spaces.map(s => s.id).length > 0 ? spaces.map(s => s.id) : [currentSpace.id]
    debugLog({ source: 'chat-realtime', message: 'Setting up subscriptions for all user spaces', details: { spaceCount: allSpaceIds.length, spaceIds: allSpaceIds, currentSpaceId: currentSpace.id } })

    // Helper to get space info by ID
    const getSpaceInfo = (spaceId: string) => {
      const space = useSpaceStore.getState().spaces.find(s => s.id === spaceId)
      return space ? { name: space.name, icon: space.avatar_emoji } : null
    }

    var ch = supabase
      .channel('spaces:' + allSpaceIds.join('+'))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `space_id=in.(${allSpaceIds.join(',')})`
      }, async function(payload) {
        var msg = payload.new as Message

        debugLog({ source: 'chat-realtime', message: 'INSERT event received', details: { msgId: msg.id, type: msg.type, sender: msg.sender_nickname, spaceId: msg.space_id, currentSpaceId: currentSpace.id } })

        // Get space info (from message's space, not current)
        const spaceInfo = getSpaceInfo(msg.space_id)

        if (msg.type === 'shout') {
          const includeSelf = localStorage.getItem('include_self_shout') === 'true'
          const isOwnForShout = msg.sender_id === profileIdRef.current
          debugLog({ source: 'chat-realtime', message: 'Shout check', details: { includeSelf, isOwnForShout, spaceInfo } })
          if (includeSelf || !isOwnForShout) {
            window.api.showShout({
              sender: msg.sender_nickname,
              message: msg.content || '',
              gifUrl: msg.gif_url || undefined,
              imageUrl: msg.image_url || undefined,
              spaceName: spaceInfo?.name || msg.space_id,
              spaceIcon: spaceInfo?.icon || undefined,
            })
          }
        }
        if ((msg.type === 'whisper' || msg.type === 'tap') && msg.target_user_id) {
          var session = (await supabase.auth.getSession()).data.session
          const includeSelf = localStorage.getItem('include_self_shout') === 'true'
          const isOwn = msg.sender_id === session?.user?.id
          const isTarget = msg.target_user_id === session?.user?.id
          if (isTarget || (includeSelf && isOwn)) {
            window.api.showTap({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined, imageUrl: msg.image_url || undefined })
          }
        }
        if (msg.type === 'all') {
          const includeSelf = localStorage.getItem('include_self_shout') === 'true'
          const isOwn = msg.sender_id === profileIdRef.current
          if (includeSelf || !isOwn) {
            window.api.showBroadcast({
              sender: msg.sender_nickname,
              message: msg.content || '',
              gifUrl: msg.gif_url || undefined,
              spaceName: spaceInfo?.name || msg.space_id,
              spaceIcon: spaceInfo?.icon || undefined,
            })
          }
        }

        // Only add to message list if from current space - skip cross-space messages (popups already shown above)
        if (msg.space_id !== currentSpace.id) {
          debugLog({ source: 'chat-realtime', message: 'Cross-space message - popup shown, skipping list add', details: { msgId: msg.id, spaceId: msg.space_id, currentSpaceId: currentSpace.id } })
          return // Don't add cross-space messages to current space's list
        }

        const isOwn = msg.sender_id === profileIdRef.current
        if (!isOwn) {
          // Detect @mentions — still notify these even when the space is muted (like Discord)
          const myNickname = profileIdRef.current ? useAuthStore.getState().profile?.nickname : null
          const contentLower = (msg.content || '').toLowerCase()
          const isMentioned = myNickname
            ? contentLower.includes(`@${myNickname.toLowerCase()}`)
            : false

          if (isMentioned) debugLog({ source: 'chat-realtime', message: 'Mention detected — bypassing mute', details: { myNickname, content: msg.content } })

          triggerNotification({
            title: msg.sender_nickname || 'New message',
            body: msg.type === 'shout' ? '🔔 ' + (msg.content || '') :
                  msg.type === 'whisper' || msg.type === 'tap' ? '💓 ' + (msg.content || '') :
                  (msg.content || ''),
            tag: msg.id,
          }, isMentioned)
        }

        const currentMessages = useChatStore.getState().messages
        if (currentMessages.some(function(m: Message) { return m.id === msg.id })) {
          debugLog({ source: 'chat-realtime', message: 'Duplicate INSERT ignored', details: { msgId: msg.id } })
          return
        }

        let nextMessages: Message[]

        if (isOwn) {
          const existingIdx = currentMessages.findIndex(function(m: Message) { return m.sender_id === msg.sender_id && m.space_id === msg.space_id && (m.tmpId || '').startsWith('temp-') && m.status === 'sending' })
          if (existingIdx !== -1) {
            debugLog({ source: 'chat-realtime', message: 'Replacing temp message with DB record', details: { tempId: currentMessages[existingIdx].id, realId: msg.id } })
            nextMessages = [...currentMessages]
            nextMessages[existingIdx] = { ...msg, status: 'sent', tmpId: currentMessages[existingIdx].tmpId, reactions: normalizeReactions(msg.reactions) } as Message
          } else {
            debugLog({ source: 'chat-realtime', message: 'Own message received (no temp found)', details: { msgId: msg.id } })
            nextMessages = [...currentMessages, { ...msg, status: 'sent', reactions: normalizeReactions(msg.reactions) } as Message]
          }
        } else {
          debugLog({ source: 'chat-realtime', message: 'Other member message received', details: { msgId: msg.id, sender: msg.sender_nickname } })
          nextMessages = [...currentMessages, { ...msg, reactions: normalizeReactions(msg.reactions) }]
        }

        // Always scroll to show new messages in current space
        autoScrollRef.current = true
        isOwnMessageInsertRef.current = isOwn
        setMessages(nextMessages)

        // Instantly refresh context window counter
        supabase
          .from('spaces')
          .select('context_window_used')
          .eq('id', currentSpace.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && data.context_window_used !== undefined) {
              const space = useSpaceStore.getState().currentSpace
              if (space) setSpace({ ...space, context_window_used: data.context_window_used })
            }
          })

        autoScrollRef.current = true
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: 'space_id=eq.' + currentSpace.id
      }, function(payload) {
        const deleted = payload.old as Message
        const prev = useChatStore.getState().messages
        setMessages(prev.filter(function(m: Message) { return m.id !== deleted.id }))
        // Sync updated context window from DB
        supabase
          .from('spaces')
          .select('context_window_used')
          .eq('id', currentSpace.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && data.context_window_used !== undefined) {
              const space = useSpaceStore.getState().currentSpace
              if (space) setSpace({ ...space, context_window_used: data.context_window_used })
            }
          })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: 'space_id=eq.' + currentSpace.id
      }, function(payload) {
        var updated = payload.new as Message

        // Preserve original status - only update status explicitly if message was newly confirmed
        const prev = useChatStore.getState().messages
        const existingMsg = prev.find(m => m.id === updated.id || m.tmpId === updated.id)
        const originalStatus = existingMsg?.status || 'sent'

        // Only update reactions, keep the existing status
        const updatedSeenBy = (updated as any).seen_by ?? updated.seenBy
        const updatedReactions = normalizeReactions((updated as Message & { reactions?: unknown }).reactions)
        const nextMessages = prev.map(function(m: Message) {
          if (m.id === updated.id || m.tmpId === updated.id) {
            // Keep original status (don't overwrite with null/default on reaction updates)
            return {
              ...m,
              status: originalStatus as Message['status'],
              seenBy: updatedSeenBy ?? m.seenBy,
              reactions: updatedReactions.length ? updatedReactions : m.reactions
            }
          }
          if (m.sender_id === updated.sender_id &&
              m.space_id === updated.space_id &&
              (m.tmpId || '').startsWith('temp-') &&
              m.status === 'sending') {
            // Replace temp message with real one
            return { ...m, status: 'sent' as const, seenBy: updatedSeenBy ?? m.seenBy, reactions: updatedReactions.length ? updatedReactions : m.reactions }
          }
          return m
        })
        setMessages(nextMessages)
        // Sync updated context window from DB (backend may have changed it)
        supabase
          .from('spaces')
          .select('context_window_used')
          .eq('id', currentSpace.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && data.context_window_used !== undefined) {
              const space = useSpaceStore.getState().currentSpace
              if (space && space.context_window_used !== data.context_window_used) {
                setSpace({ ...space, context_window_used: data.context_window_used })
              }
            }
          })
      })
      .subscribe(function(status: string) {
        var connected = false
        if (status === 'SUBSCRIBED') {
          subscriptionActiveRef.current = true
          subscriptionErrorRef.current = false
          connected = true
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          subscriptionErrorRef.current = true
          subscriptionActiveRef.current = false
          debugLog({ level: 'warn', source: 'chat-realtime', message: 'Subscription failed, scheduling reconnect', details: { status, spaceId: currentSpace.id } })
          reconnectTimerRef.current = window.setTimeout(function() {
            if (currentSpace) { fetchMessages(0, true) }
          }, 3000) as ReturnType<typeof setTimeout>
        }
        debugLog({ source: 'chat-realtime', message: 'Subscription status', details: { status, connected, spaceId: currentSpace.id } })
      })

    return function() {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      supabase.removeChannel(ch)
    }
  }, [currentSpace?.id, spaces])

  // Track scroll: detect user scrolled to top (load older) or bottom (enable auto-scroll)
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const handleScroll = () => {
      const atTop = el.scrollTop < 100
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD

      isAtBottomRef.current = atBottom
      setShowJumpBtn(!atBottom)

      if (atTop && hasMore && !loadingOlder && pageOffset > 0) {
        fetchMessages(pageOffset)
      }

      if (atBottom) autoScrollRef.current = true
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadingOlder, pageOffset, messages.length])

  // Auto-scroll on new messages (only when at bottom and not searching)
  useEffect(() => {
    // Detect if a new message was appended (not prepended)
    const addedMessage = messages.length > prevMessagesLenRef.current
    prevMessagesLenRef.current = messages.length

    debugLog({ source: "auto-scroll", message: "[DEBUG] New message check", details: { addedMessage, autoScrollRef: autoScrollRef.current, isOwnMessageInsertRef: isOwnMessageInsertRef.current, searchQuery: searchQuery.trim() } })

    if (!addedMessage || (!autoScrollRef.current && !isOwnMessageInsertRef.current) || searchQuery.trim()) {
      if (!addedMessage) {
        autoScrollRef.current = false
      }
      return
    }

    // Force instant scroll to bottom
    if (listRef.current) {
      const maxScroll = listRef.current.scrollHeight - listRef.current.clientHeight
      listRef.current.scrollTop = maxScroll
      debugLog({ source: "auto-scroll", message: "[SUCCESS] Scroll to bottom for new message", details: {
        scrollHeight: listRef.current.scrollHeight,
        clientHeight: listRef.current.clientHeight,
        maxScroll: maxScroll,
        scrollTopAfter: listRef.current.scrollTop
      }})
    } else {
      debugLog({ level: "error", source: "auto-scroll", message: "[ERROR] listRef.current is null", details: {} })
    }
    isOwnMessageInsertRef.current = false
    autoScrollRef.current = false
  }, [messages.length, searchQuery])

  // IntersectionObserver for seen tracking
  useEffect(() => {
    if (!listRef.current) return

    const intersectObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const msgId = el.dataset.msgId
          if (!msgId || markedRef.current.has(msgId)) return
          const msg = messages.find(m => m.id === msgId || m.tmpId === msgId)
          if (!msg || msg.sender_id === profileIdRef.current || msg.status === 'sending' || msg.status === 'error') return
          markedRef.current.add(msgId)
          const pid = profileIdRef.current
          if (pid) markSeen(msgId, pid)
        })
      },
      { threshold: 0.3 }
    )

    const mutObs = new MutationObserver(() => {
      if (!listRef.current) return
      listRef.current.querySelectorAll('[data-msg-id]').forEach(el => {
        if (!(el as HTMLElement).dataset._observed) {
          (el as HTMLElement).dataset._observed = '1'
          intersectObs.observe(el)
        }
      })
    })

    mutObs.observe(listRef.current, { childList: true, subtree: false })
    msgObserverRef.current = intersectObs

    return () => {
      intersectObs.disconnect()
      mutObs.disconnect()
    }
  }, [markSeen])

  const scrollToBottom = () => {
    isAtBottomRef.current = true
    autoScrollRef.current = true
    setShowJumpBtn(false)
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }

  // On initial load, scroll to bottom (visual bottom of chronologically ordered list)
  // This makes the latest messages visible without requiring a manual scroll
  useEffect(() => {
    if (messages.length === 0 || pageOffset > 0) return
    if (!listRef.current) return

    // Scroll to bottom after a short delay to ensure DOM is rendered
    const timeoutId = setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [messages.length, pageOffset, currentSpace?.id])

  // Render messages in chronological order (oldest to newest)
  var visible = messages
  if (searchQuery.trim()) {
    var q = searchQuery.toLowerCase()
    visible = messages.filter(function(m) {
      return (m.content && m.content.toLowerCase().includes(q)) || m.sender_nickname.toLowerCase().includes(q)
    })
  }

  return (
    <div className='relative flex-1'>
      {/* Debug: Message counter */}
      <div className='absolute top-1 left-3 z-30 text-[10px] text-text-lo/40'>
        {currentSpace?.name} — {messages.length} messages
      </div>
      <div
        ref={listRef}
        className='absolute inset-0 overflow-y-auto px-2 py-2 flex flex-col gap-0.5'
      >
        {/* Load more indicator */}
        {loadingOlder && (
          <div className='flex justify-center py-2'>
            <span className='text-text-lo text-xs animate-pulse'>Loading older messages...</span>
          </div>
        )}

        {initialLoading ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-3'>
              <Loader />
              <p className='text-text-lo text-sm'>Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className='flex-1 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-3'>
              <div
                className='w-12 h-12 rounded-2xl flex items-center justify-center'
                style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'rgba(139, 92, 246, 0.4)' }}>chat</span>
              </div>
              <p className='text-text-lo text-sm'>No messages yet. Start the conversation.</p>
            </div>
          </div>
        ) : null}

        {!initialLoading && messages.length > 0 && visible.map(function(msg, i) {
          var prev = visible[i - 1]
          var showAvatar = !prev || prev.sender_id !== msg.sender_id ||
            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
          var showNickname = showAvatar
          var showTimestamp = showAvatar

          // Check if this is the latest message sent by the current user
          // This is used to show the checkmark status only on the latest message
          const latestOwnMsg = messages.length > 0
            ? [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).find(m => m.sender_id === profile?.id)
            : null
          const isLatestOwnMessage = msg.id === latestOwnMsg?.id

          return <div key={msg.id} data-msg-id={msg.id}><MessageItem msg={msg} showAvatar={showAvatar} showNickname={showNickname} showTimestamp={showTimestamp} isLatestOwnMessage={isLatestOwnMessage} /></div>
        })}
      </div>

      {showJumpBtn && !searchQuery.trim() && (
        <button
          onClick={scrollToBottom}
          aria-label='Scroll to latest message'
          className="absolute bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-semibold rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.9) 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>expand_more</span>
          New messages
        </button>
      )}
    </div>
  )
}
