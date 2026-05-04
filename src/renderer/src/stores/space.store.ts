import { create } from 'zustand'

export interface Space {
  id: string
  name: string
  avatar_emoji: string
  owner_id: string
  context_window_limit: number
  context_window_used: number
}

export interface Member {
  user_id: string
  nickname: string
  avatar_color: string
  role: string
  joined_at: string
}

interface SpaceState {
  currentSpace: Space | null
  spaces: Space[]
  members: Member[]
  settingsPanelOpen: boolean
  joinOrCreateModalOpen: boolean
  onlineUsers: Set<string>
  typingUsers: Set<string>
  setSpace: (s: Space | null) => void
  setSpaces: (s: Space[]) => void
  setMembers: (m: Member[]) => void
  toggleSettings: () => void
  setJoinOrCreateModalOpen: (open: boolean) => void
  setOnlineUsers: (u: Set<string>) => void
  setTypingUsers: (u: Set<string>) => void
  isMuted: () => boolean
}

export const useSpaceStore = create<SpaceState>((set) => ({
  currentSpace: null,
  spaces: [],
  members: [],
  settingsPanelOpen: false,
  joinOrCreateModalOpen: false,
  onlineUsers: new Set(),
  typingUsers: new Set(),
  setSpace: (s) => set({ currentSpace: s }),
  setSpaces: (s) => set({ spaces: s }),
  setMembers: (m) => set({ members: m }),
  toggleSettings: () => set((s) => ({ settingsPanelOpen: !s.settingsPanelOpen })),
  setJoinOrCreateModalOpen: (open) => set({ joinOrCreateModalOpen: open }),
  setOnlineUsers: (u) => set({ onlineUsers: u }),
  setTypingUsers: (u) => set({ typingUsers: u }),
  isMuted: () => {
    const space = useSpaceStore.getState().currentSpace
    if (!space) return false
    const raw = localStorage.getItem(`space-muted:${space.id}`)
    if (!raw) return false
    const expiry = parseInt(raw, 10)
    if (isNaN(expiry)) return false
    if (expiry === 0) return true // "until I change it"
    return expiry > Date.now()
  },
}))
