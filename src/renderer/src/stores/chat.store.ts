import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { debugLog } from '../lib/debug'

export type MessageType = 'chat' | 'shout' | 'whisper' | 'tap' | 'system' | 'all'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error'

export interface MessageReaction {
  emoji: string
  count: number
  reacted: boolean
  userIds: string[]
}

export interface Message {
  id: string
  space_id: string
  sender_id: string
  sender_nickname: string
  type: MessageType
  content: string | null
  image_url: string | null
  gif_url: string | null
  target_user_id: string | null
  reply_to?: string | null
  created_at: string
  status?: MessageStatus
  tmpId?: string
  seenBy?: string[]
  reactions?: MessageReaction[]
}

interface ChatState {
  messages: Message[]
  pendingImage: File | null
  pendingGifUrl: string | null
  pendingGifPreview: string | null
  searchQuery: string
  loading: boolean
  editingMessage: Message | null
  replyingTo: Message | null
  setMessages: (msgs: Message[]) => void
  prependMessage: (msg: Message) => void
  prependMessages: (msgs: Message[]) => void
  updateMessageStatus: (lookupId: string, status: MessageStatus) => void
  replaceMessage: (lookupId: string, msg: Message) => void
  updateMessageContent: (lookupId: string, content: string) => void
  removeMessage: (id: string) => void
  markSeen: (msgId: string, userId: string) => void
  retryMessage: (msg: Message) => Promise<void>
  setPendingImage: (f: File | null) => void
  setPendingGif: (url: string | null, preview: string | null) => void
  setSearchQuery: (q: string) => void
  setLoading: (l: boolean) => void
  setEditingMessage: (msg: Message | null) => void
  setReplyingTo: (msg: Message | null) => void
  toggleReaction: (lookupId: string, emoji: string, userId: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  pendingImage: null,
  pendingGifUrl: null,
  pendingGifPreview: null,
  searchQuery: '',
  loading: false,
  editingMessage: null,
  replyingTo: null,

  setMessages: (msgs) => {
    debugLog({ source: 'chat', message: '[store] setMessages', details: { count: msgs.length } })
    set({ messages: msgs })
  },

  prependMessage: (msg) => {
    debugLog({ source: 'chat', message: '[store] prependMessage', details: { id: msg.id, status: msg.status } })
    set((s) => ({ messages: [...s.messages, msg] }))
  },

  prependMessages: (msgs) => set((s) => ({ messages: [...msgs, ...s.messages] })),

  updateMessageStatus: (lookupId, status) => {
    debugLog({ source: 'chat', message: '[store] updateMessageStatus', details: { lookupId, status } })
    set((s) => ({
      messages: s.messages.map(m =>
        (m.id === lookupId || m.tmpId === lookupId) ? { ...m, status } : m
      )
    }))
  },

  replaceMessage: (lookupId, msg) => {
    debugLog({ source: 'chat', message: '[store] replaceMessage', details: { lookupId, newId: msg.id } })
    set((s) => ({
      messages: s.messages.map(m => (m.id === lookupId || m.tmpId === lookupId) ? msg : m)
    }))
  },

  updateMessageContent: (lookupId, content) => {
    debugLog({ source: 'chat', message: '[store] updateMessageContent', details: { lookupId } })
    set((s) => ({
      messages: s.messages.map(m => (m.id === lookupId || m.tmpId === lookupId) ? { ...m, content } : m)
    }))
  },

  removeMessage: (id) => set((s) => ({ messages: s.messages.filter(m => m.id !== id) })),

  markSeen: (msgId, userId) => {
    set((s) => {
      const msg = s.messages.find(m => m.id === msgId || m.tmpId === msgId)
      if (!msg || msg.seenBy?.includes(userId) || msg.sender_id === userId) return {}
      const newSeenBy = [...(msg.seenBy || []), userId]
      return {
        messages: s.messages.map(m =>
          (m.id === msgId || m.tmpId === msgId) ? { ...m, seenBy: newSeenBy } : m
        )
      }
    })
    supabase.from('messages').select('seen_by').eq('id', msgId).maybeSingle()
      .then(({ data }) => {
        const current = data?.seen_by || []
        if (!userId || current.includes(userId)) return
        const updated = [...current.filter((id: string) => id !== null), userId]
        return supabase.from('messages').update({ seen_by: updated }).eq('id', msgId)
      })
  },

  retryMessage: async (msg) => {
    debugLog({ source: 'chat', message: '[store] retryMessage', details: { id: msg.id } })
    set((s) => ({ messages: s.messages.map(m => (m.id === msg.id || m.tmpId === msg.id) ? { ...m, status: 'sending' } : m) }))
    const payload = { space_id: msg.space_id, sender_id: msg.sender_id, sender_nickname: msg.sender_nickname, type: msg.type, content: msg.content, image_url: msg.image_url, gif_url: msg.gif_url, target_user_id: msg.target_user_id }
    const { data: inserted, error } = await supabase.from('messages').insert(payload).select().single()
    if (error) {
      set((s) => ({ messages: s.messages.map(m => (m.id === msg.id || m.tmpId === msg.id) ? { ...m, status: 'error' } : m) }))
      return
    }
    set((s) => ({
      messages: s.messages.filter(m => m.id !== msg.id && m.tmpId !== msg.id).concat([{ ...inserted, status: 'sent' } as Message])
    }))
  },

  setPendingImage: (f) => set({ pendingImage: f }),
  setPendingGif: (url, preview) => set({ pendingGifUrl: url, pendingGifPreview: preview }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLoading: (l) => set({ loading: l }),

  setEditingMessage: (msg) => set({ editingMessage: msg }),

  setReplyingTo: (msg) => set({ replyingTo: msg }),

  toggleReaction: async (lookupId, emoji, userId) => {
    let nextReactions: MessageReaction[] | null = null
    set((s) => ({
      messages: s.messages.map(m => {
        if (m.id !== lookupId && m.tmpId !== lookupId) return m
        const reactions = [...(m.reactions || [])]
        const idx = reactions.findIndex(r => r.emoji === emoji)
        if (idx !== -1) {
          const r = reactions[idx]
          if (r.userIds.includes(userId)) {
            const newUserIds = r.userIds.filter(id => id !== userId)
            if (newUserIds.length === 0) {
              reactions.splice(idx, 1)
            } else {
              reactions[idx] = { ...r, count: r.count - 1, reacted: false, userIds: newUserIds }
            }
          } else {
            reactions[idx] = { ...r, count: r.count + 1, reacted: true, userIds: [...r.userIds, userId] }
          }
        } else {
          reactions.push({ emoji, count: 1, reacted: true, userIds: [userId] })
        }
        nextReactions = reactions
        return { ...m, reactions }
      })
    }))

    if (!nextReactions) return

    const payload = nextReactions.map(r => ({
      emoji: r.emoji,
      user_ids: r.userIds,
    }))

    await supabase
      .from('messages')
      .update({ reactions: payload })
      .eq('id', lookupId)
  },
}))