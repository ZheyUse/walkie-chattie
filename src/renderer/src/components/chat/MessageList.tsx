import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore, type Message } from '../../stores/chat.store'
import { useAuthStore } from '../../stores/auth.store'
import MessageItem from './MessageItem'
import { debugLog } from '../../lib/debug'

export default function MessageList() {
  const { currentSpace } = useSpaceStore()
  const { profile } = useAuthStore()
  const { messages, setMessages, searchQuery, updateMessageStatus } = useChatStore()
  const listRef = useRef<HTMLDivElement>(null)
  var shouldScrollRef = useRef(true)

  useEffect(() => {
    if (!currentSpace) return
    setMessages([])
    supabase
      .from('messages')
      .select('*')
      .eq('space_id', currentSpace.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data) })

    var ch = supabase
      .channel('space:' + currentSpace.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'space_id=eq.' + currentSpace.id
      }, async function(payload) {
        var msg = payload.new as Message

        // Show shout/whisper popups
        if (msg.type === 'shout') {
          const includeSelf = localStorage.getItem('include_self_shout') === 'true'
          const isOwnForShout = msg.sender_id === profile?.id
          if (includeSelf || !isOwnForShout) {
            window.api.showShout({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined })
          }
        }
        if (msg.type === 'whisper' && !msg.target_user_id) {
          var session = (await supabase.auth.getSession()).data.session
          if (msg.sender_id === session?.user?.id || msg.target_user_id === session?.user?.id) {
            window.api.showWhisper({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined })
          }
        }

        // Handle own vs other messages
        const isOwn = msg.sender_id === profile?.id
        debugLog({
          source: 'chat-realtime',
          message: isOwn ? 'Realtime INSERT for own message' : 'Realtime INSERT for other member',
          details: { msgId: msg.id, senderId: msg.sender_id, isOwn, type: msg.type },
        })

        setMessages(function(prev) {
          // Find the temp placeholder (identified by tmpId) for our own messages
          if (isOwn) {
            // Look for a temp message from the same sender/space/time
            // We stored it as: id=tempId, tmpId=tempId, status=sending
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
              // Replace the temp entry with the real DB record, keeping status='sent'
              var next = [...prev]
              next[existingIdx] = { ...msg, status: 'sent', tmpId: prev[existingIdx].tmpId } as Message
              return next
            }
            // No temp found — but the db record itself IS the confirmation
            // Check if already exists (from a direct append)
            if (prev.some(function(m) { return m.id === msg.id })) return prev
            debugLog({ source: 'chat-realtime', message: 'No temp found — appending from DB', details: { msgId: msg.id } })
            return [...prev, { ...msg, status: 'sent' } as Message]
          }

          // Other member's message — this is "received"
          if (prev.some(function(m) { return m.id === msg.id })) return prev
          debugLog({
            source: 'chat-realtime',
            message: 'Other member message received',
            details: { msgId: msg.id, sender: msg.sender_nickname },
          })
          return [...prev, msg]
        })

        shouldScrollRef.current = true
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: 'space_id=eq.' + currentSpace.id
      }, function(payload) {
        var updated = payload.new as Message
        var newStatus = (updated.status || 'sent') as Message['status']
        debugLog({
          source: 'chat-realtime',
          message: 'Status update received',
          details: { msgId: updated.id, newStatus, senderId: updated.sender_id },
        })
        if (newStatus === 'sent' && updated.sender_id !== profile?.id) {
          // Mark as delivered for messages from other members that just got inserted/confirmed
          newStatus = 'delivered' as Message['status']
        }
        setMessages(function(prev) {
          return prev.map(function(m) {
            if (m.id === updated.id || m.tmpId === updated.id) {
              return { ...m, status: newStatus }
            }
            // Also check if there's a sending message from the same sender that should be updated
            if (m.sender_id === updated.sender_id &&
                m.space_id === updated.space_id &&
                (m.tmpId || '').startsWith('temp-') &&
                m.status === 'sending') {
              debugLog({
                source: 'chat-realtime',
                message: 'Found sending msg matched by sender - updating status',
                details: { msgId: m.id, updatedId: updated.id, newStatus },
              })
              return { ...m, status: newStatus }
            }
            return m
          })
        })
      })
      .subscribe()

    return function() { supabase.removeChannel(ch) }
  }, [currentSpace?.id])

  // Auto-scroll
  useEffect(() => {
    if (shouldScrollRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
      shouldScrollRef.current = false
    }
  }, [messages.length])

  // Filter messages by search query
  var visible = messages
  if (searchQuery.trim()) {
    var q = searchQuery.toLowerCase()
    visible = messages.filter(function(m) {
      return (m.content && m.content.toLowerCase().includes(q)) || m.sender_nickname.toLowerCase().includes(q)
    })
  }

  return (
    <div ref={listRef} className='flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5'>
      {messages.length === 0 && (
        <div className='flex-1 flex items-center justify-center'>
          <p className='text-text-lo text-sm font-body'>No messages yet. Say hi!</p>
        </div>
      )}
      {visible.map(function(msg, i) {
        var prev = visible[i - 1]
        var showAvatar = !prev || prev.sender_id !== msg.sender_id ||
          new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000
        var showNickname = showAvatar
        return <MessageItem key={msg.id} msg={msg} showAvatar={showAvatar} showNickname={showNickname} />
      })}
    </div>
  )
}