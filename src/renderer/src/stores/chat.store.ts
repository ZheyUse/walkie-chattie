import { create } from 'zustand'
import type { Space } from './space.store'

export type MessageType = 'chat' | 'shout' | 'whisper' | 'system'

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
  setMessages: (msgs) => set({ messages: msgs }),
  prependMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setPendingImage: (f) => set({ pendingImage: f }),
  setPendingGif: (url, preview) => set({ pendingGifUrl: url, pendingGifPreview: preview }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setLoading: (l) => set({ loading: l })
}))
