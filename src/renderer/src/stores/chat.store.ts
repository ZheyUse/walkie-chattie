import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { debugLog } from '../lib/debug'
import type { Space } from './space.store'

export type MessageType = 'chat' | 'shout' | 'whisper' | 'system'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error'

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
  created_at: string
  status?: MessageStatus
  /** Used when a temp ID is shown before the real DB ID is assigned */
  tmpId?: string
}

interface ChatState {
  messages: Message[]
  pendingImage: File | null
  pendingGifUrl: string | null
  pendingGifPreview: string | null
  searchQuery: string
  loading: boolean
  setMessages: (msgs: Message[]) => void
  prependMessage: (msg: Message) => void
  updateMessageStatus: (lookupId: string, status: MessageStatus) => void
  replaceMessage: (lookupId: string, msg: Message) => void
  removeMessage: (id: string) => void
  retryMessage: (msg: Message) => Promise<void>
  setPendingImage: (f: File | null) => void
  setPendingGif: (url: string | null, preview: string | null) => void
  setSearchQuery: (q: string) => void
  setLoading: (l: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  pendingImage: null,
  pendingGifUrl: null,
  pendingGifPreview: null,
  searchQuery: '',
  loading: false,
  setMessages: (msgs) => {
    debugLog({ source: 'chat', message: '[store] setMessages', details: { count: msgs.length } })
    set({ messages: msgs })
  },
  prependMessage: (msg) => {
    debugLog({
      source: 'chat',
      message: '[store] prependMessage',
      details: { id: msg.id, tmpId: msg.tmpId, status: msg.status, sender: msg.sender_nickname, type: msg.type },
    })
    set((s) => ({ messages: [...s.messages, msg] }))
  },
  updateMessageStatus: (lookupId, status) => {
    debugLog({ source: 'chat', message: '[store] updateMessageStatus', details: { lookupId, newStatus: status } })
    set((s) => {
      const matched = s.messages.some(m => m.id === lookupId || m.tmpId === lookupId)
      if (!matched) {
        debugLog({ level: 'warn', source: 'chat', message: '[store] updateMessageStatus — no match found', details: { lookupId, status } })
      }
      return {
        messages: s.messages.map(m => (m.id === lookupId || m.tmpId === lookupId) ? { ...m, status } : m)
      }
    })
  },
  replaceMessage: (lookupId, msg) => {
    debugLog({
      source: 'chat',
      message: '[store] replaceMessage',
      details: { lookupId, newId: msg.id, newStatus: msg.status, sender: msg.sender_nickname },
    })
    set((s) => {
      const matched = s.messages.some(m => m.id === lookupId || m.tmpId === lookupId)
      if (!matched) {
        debugLog({ level: 'warn', source: 'chat', message: '[store] replaceMessage — no match found', details: { lookupId, newId: msg.id } })
      }
      return { messages: s.messages.map(m => (m.id === lookupId || m.tmpId === lookupId) ? msg : m) }
    })
  },
  removeMessage: (id) => set((s) => ({
    messages: s.messages.filter(m => m.id !== id)
  })),
  retryMessage: async (msg) => {
    debugLog({ source: 'chat', message: '[store] retryMessage', details: { id: msg.id, type: msg.type } })
    set((s) => ({ messages: s.messages.map(m => (m.id === msg.id || m.tmpId === msg.id) ? { ...m, status: 'sending' } : m) }))

    const payload = {
      space_id: msg.space_id,
      sender_id: msg.sender_id,
      sender_nickname: msg.sender_nickname,
      type: msg.type,
      content: msg.content,
      image_url: msg.image_url,
      gif_url: msg.gif_url,
      target_user_id: msg.target_user_id,
    }

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single()

    if (error) {
      set((s) => ({ messages: s.messages.map(m => (m.id === msg.id || m.tmpId === msg.id) ? { ...m, status: 'error' } : m) }))
      return
    }

    // Remove the error temp msg and insert the new real one
    set((s) => ({
      messages: s.messages
        .filter(m => m.id !== msg.id && m.tmpId !== msg.id)
        .concat([{ ...inserted, status: 'sent' } as Message])
    }))
  },
  setPendingImage: (f) => set({ pendingImage: f }),
  setPendingGif: (url, preview) => set({ pendingGifUrl: url, pendingGifPreview: preview }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLoading: (l) => set({ loading: l })
}))