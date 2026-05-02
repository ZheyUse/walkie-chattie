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
  setSpace: (s: Space | null) => void
  setSpaces: (s: Space[]) => void
  setMembers: (m: Member[]) => void
  toggleSettings: () => void
  setJoinOrCreateModalOpen: (open: boolean) => void
  setOnlineUsers: (u: Set<string>) => void
}

export const useSpaceStore = create<SpaceState>((set) => ({
  currentSpace: null,
  spaces: [],
  members: [],
  settingsPanelOpen: false,
  joinOrCreateModalOpen: false,
  onlineUsers: new Set(),
  setSpace: (s) => set({ currentSpace: s }),
  setSpaces: (s) => set({ spaces: s }),
  setMembers: (m) => set({ members: m }),
  toggleSettings: () => set((s) => ({ settingsPanelOpen: !s.settingsPanelOpen })),
  setJoinOrCreateModalOpen: (open) => set({ joinOrCreateModalOpen: open }),
  setOnlineUsers: (u) => set({ onlineUsers: u }),
}))
