import 'material-symbols'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore, type Message } from '../../stores/chat.store'
import { useAuthStore } from '../../stores/auth.store'
import MessageItem from './MessageItem'
import { debugLog } from '../../lib/debug'
import { triggerNotification } from '../../lib/notifications'

const PAGE_SIZE = 100
const BOTTOM_THRESHOLD = 80

export default function MessageList() {
  const { currentSpace, setSpace } = useSpaceStore()
  const { profile } = useAuthStore()
  const { messages, setMessages, prependMessages, searchQuery, markSeen } = useChatStore()
  const listRef = useRef<HTMLDivElement>(null)
  const msgObserverRef = useRef<IntersectionObserver | null>(null)
  const markedRef = useRef<Set<string>>(new Set())
  const profileIdRef = useRef<string | undefined>(profile?.id)
  const isAtBottomRef = useRef(true)
  const autoScrollRef = useRef(false)
  const [showJumpBtn, setShowJumpBtn] = useState(false)

  // Pagination state
  const [pageOffset, setPageOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const prevMessagesLenRef = useRef(0)

  useEffect(() => { profileIdRef.current = profile?.id }, [profile?.id])

  // Scroll to bottom when messages first load (not on pagination prepends)
  useEffect(() => {
    if (messages.length === 0 || pageOffset > 0) return
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    })
  }, [messages.length, pageOffset])

  // Fetch messages for a given offset
  const fetchMessages = (offset: number, resetLoad = false) => {
    if (!currentSpace) return

    if (resetLoad) setMessages([])
    else setLoadingOlder(true)

    supabase
      .from('messages')
      .select('*')
      .eq('space_id', currentSpace.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
      .then(({ data, count }) => {
        if (!data) { setLoadingOlder(false); return }

        const formatted = data.map(m => ({ ...m, status: 'sent' as const })) as Message[]

        if (offset === 0) {
          setMessages(formatted)
        } else {
          prependMessages(formatted)
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

    var ch = supabase
      .channel('space:' + currentSpace.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'space_id=eq.' + currentSpace.id
      }, async function(payload) {
        var msg = payload.new as Message
        debugLog({ source: 'chat-realtime', message: 'INSERT event received', details: { msgId: msg.id, type: msg.type, sender: msg.sender_nickname } })

        if (msg.type === 'shout') {
          const includeSelf = localStorage.getItem('include_self_shout') === 'true'
          const isOwnForShout = msg.sender_id === profileIdRef.current
          debugLog({ source: 'chat-realtime', message: 'Shout check', details: { includeSelf, isOwnForShout } })
          if (includeSelf || !isOwnForShout) {
            window.api.showShout({
              sender: msg.sender_nickname,
              message: msg.content || '',
              gifUrl: msg.gif_url || undefined,
              spaceName: currentSpace?.name,
              spaceIcon: currentSpace?.avatar_emoji,
            })
          }
        }
        if ((msg.type === 'whisper' || msg.type === 'tap') && !msg.target_user_id) {
          var session = (await supabase.auth.getSession()).data.session
          if (msg.sender_id === session?.user?.id || msg.target_user_id === session?.user?.id) {
            window.api.showTap({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined })
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
              spaceName: currentSpace?.name,
              spaceIcon: currentSpace?.avatar_emoji,
            })
          }
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
            body: msg.type === 'shout' ? '🔊 ' + (msg.content || '') :
                  msg.type === 'whisper' || msg.type === 'tap' ? '💜 ' + (msg.content || '') :
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
            nextMessages[existingIdx] = { ...msg, status: 'sent', tmpId: currentMessages[existingIdx].tmpId } as Message
          } else {
            debugLog({ source: 'chat-realtime', message: 'Own message received (no temp found)', details: { msgId: msg.id } })
            nextMessages = [...currentMessages, { ...msg, status: 'sent' } as Message]
          }
        } else {
          debugLog({ source: 'chat-realtime', message: 'Other member message received', details: { msgId: msg.id, sender: msg.sender_nickname } })
          nextMessages = [...currentMessages, msg]
        }

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
        var newStatus = (updated.status || 'sent') as Message['status']
        if (newStatus === 'sent' && updated.sender_id !== profile?.id) {
          newStatus = 'delivered' as Message['status']
        }
        const updatedSeenBy = (updated as any).seen_by ?? updated.seenBy
        const prev = useChatStore.getState().messages
        const nextMessages = prev.map(function(m: Message) {
          if (m.id === updated.id || m.tmpId === updated.id) {
            return { ...m, status: newStatus, seenBy: updatedSeenBy ?? m.seenBy }
          }
          if (m.sender_id === updated.sender_id &&
              m.space_id === updated.space_id &&
              (m.tmpId || '').startsWith('temp-') &&
              m.status === 'sending') {
            return { ...m, status: newStatus, seenBy: updatedSeenBy ?? m.seenBy }
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
  }, [currentSpace?.id])

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

    if (!addedMessage || !autoScrollRef.current || !isAtBottomRef.current || searchQuery.trim()) {
      autoScrollRef.current = false
      return
    }

    requestAnimationFrame(() => {
      if (!listRef.current) return
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      autoScrollRef.current = false
    })
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

  var visible = messages
  if (searchQuery.trim()) {
    var q = searchQuery.toLowerCase()
    visible = messages.filter(function(m) {
      return (m.content && m.content.toLowerCase().includes(q)) || m.sender_nickname.toLowerCase().includes(q)
    })
  }

  return (
    <div className='relative flex-1'>
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

        {messages.length === 0 && !loadingOlder && (
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
        )}

        {visible.map(function(msg, i) {
          var prev = visible[i - 1]
          var showAvatar = !prev || prev.sender_id !== msg.sender_id ||
            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
          var showNickname = showAvatar
          var showTimestamp = showAvatar
          return <div key={msg.id} data-msg-id={msg.id}><MessageItem msg={msg} showAvatar={showAvatar} showNickname={showNickname} showTimestamp={showTimestamp} /></div>
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
