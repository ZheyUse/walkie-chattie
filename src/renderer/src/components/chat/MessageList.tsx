import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore, type Message } from '../../stores/chat.store'
import MessageItem from './MessageItem'

export default function MessageList() {
  const { currentSpace } = useSpaceStore()
  const { messages, setMessages, searchQuery } = useChatStore()
  const listRef = useRef<HTMLDivElement>(null)
  var shouldScrollRef = useRef(true)

  useEffect(() => {
    if (!currentSpace) return
    setMessages([])
    // Load initial messages
    supabase
      .from('messages')
      .select('*')
      .eq('space_id', currentSpace.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data) })

    // Realtime subscription
    var ch = supabase
      .channel('space:' + currentSpace.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'space_id=eq.' + currentSpace.id
      }, async function(payload) {
        var msg = payload.new as Message
        // Show shout popup on all connected windows
        if (msg.type === 'shout') {
          window.api.showShout({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined })
        }
        // Show whisper popup only for target
        if (msg.type === 'whisper' && !msg.target_user_id) {
          var session = (await supabase.auth.getSession()).data.session
          if (msg.sender_id === session?.user?.id || msg.target_user_id === session?.user?.id) {
            window.api.showWhisper({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined })
          }
        }
        setMessages(function(prev) { return prev.some(function(m) { return m.id === msg.id }) ? prev : [...prev, msg] })
        shouldScrollRef.current = true
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