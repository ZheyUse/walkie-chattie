import 'material-symbols'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore, type Message } from '../../stores/chat.store'
import { useAuthStore } from '../../stores/auth.store'
import MessageItem from './MessageItem'
import { debugLog } from '../../lib/debug'

const PAGE_SIZE = 100
const BOTTOM_THRESHOLD = 80

export default function MessageList() {
  const { currentSpace } = useSpaceStore()
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
        if (!data) return

        const formatted = data.map(m => ({ ...m, status: 'sent' as const })) as Message[]

        if (offset === 0) {
          setMessages(formatted)
        } else {
          // Prepend older messages, keep scroll position
          prependMessages(formatted)
        }

        // Determine if there are more messages
        const totalCount = count ?? data.length
        setHasMore(offset + data.length < totalCount)
        setPageOffset(offset)
      })
      .finally(() => setLoadingOlder(false))
  }

  // Load initial page
  useEffect(() => {
    if (!currentSpace) return
    setPageOffset(0)
    setHasMore(true)
    markedRef.current.clear()
    fetchMessages(0, true)

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

        const isOwn = msg.sender_id === profile?.id
        debugLog({
          source: 'chat-realtime',
          message: isOwn ? 'Realtime INSERT for own message' : 'Realtime INSERT for other member',
          details: { msgId: msg.id, senderId: msg.sender_id, isOwn, type: msg.type },
        })

        setMessages(function(prev) {
          if (isOwn) {
            var existingIdx = prev.findIndex(function(m) {
              return m.sender_id === msg.sender_id &&
                m.space_id === msg.space_id &&
                (m.tmpId || '').startsWith('temp-') &&
                m.status === 'sending'
            })

            if (existingIdx !== -1) {
              debugLog({
                source: 'chat-realtime',
                message: 'Replacing temp message with DB record',
                details: { tempId: prev[existingIdx].id, realId: msg.id },
              })
              var next = [...prev]
              next[existingIdx] = { ...msg, status: 'sent', tmpId: prev[existingIdx].tmpId } as Message
              return next
            }
            if (prev.some(function(m) { return m.id === msg.id })) return prev
            debugLog({ source: 'chat-realtime', message: 'No temp found — appending from DB', details: { msgId: msg.id } })
            return [...prev, { ...msg, status: 'sent' } as Message]
          }

          if (prev.some(function(m) { return m.id === msg.id })) return prev
          debugLog({
            source: 'chat-realtime',
            message: 'Other member message received',
            details: { msgId: msg.id, sender: msg.sender_nickname },
          })
          return [...prev, msg]
        })

        autoScrollRef.current = true
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
        setMessages(function(prev) {
          return prev.map(function(m) {
            if (m.id === updated.id || m.tmpId === updated.id) {
              return { ...m, status: newStatus, seenBy: updated.seen_by ?? m.seenBy }
            }
            if (m.sender_id === updated.sender_id &&
                m.space_id === m.space_id &&
                (m.tmpId || '').startsWith('temp-') &&
                m.status === 'sending') {
              return { ...m, status: newStatus, seenBy: updated.seen_by ?? m.seenBy }
            }
            return m
          })
        })
      })
      .subscribe()

    return function() { supabase.removeChannel(ch) }
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
          return <div key={msg.id} data-msg-id={msg.id}><MessageItem msg={msg} showAvatar={showAvatar} showNickname={showNickname} /></div>
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
          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>expand_less</span>
          New messages
        </button>
      )}
    </div>
  )
}