import { create } from 'zustand'
import { debugLog } from '../lib/debug'

export interface Space {
  id: string
  name: string
  avatar_emoji: string
  owner_id: string
  context_window_limit: number
  context_window_used: number
}

export interface Member {
  space_id: string
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
  setSpace: (s) => set((state) => {
    const prevSpaceId = state.currentSpace?.id ?? null

    if (!s) {
      debugLog({
        source: 'space-members-debug',
        message: 'Space cleared; wiping members snapshot',
        details: {
          prevSpaceId,
          nextSpaceId: null,
          memberCount: state.members.length,
          members: state.members.map((member) => ({
            space_id: member.space_id,
            user_id: member.user_id,
            nickname: member.nickname,
            role: member.role,
          })),
        },
      })
      return { currentSpace: null, members: [] }
    }

    if (state.currentSpace?.id === s.id) return { currentSpace: s }

    const scopedMembers = state.members.filter((member) => member.space_id === s.id)

    debugLog({
      source: 'space-members-debug',
      message: 'Space switched; members snapshot recorded',
      details: {
        prevSpaceId,
        nextSpaceId: s.id,
        memberCount: scopedMembers.length,
        members: scopedMembers.map((member) => ({
          space_id: member.space_id,
          user_id: member.user_id,
          nickname: member.nickname,
          role: member.role,
        })),
      },
    })

    return {
      currentSpace: s,
      members: scopedMembers,
    }
  }),
  setSpaces: (s) => set({ spaces: s }),
  setMembers: (m) => set((state) => {
    if (!state.currentSpace) return { members: m }

    const scopedMembers = m.filter((member) => member.space_id === state.currentSpace?.id)
    const rejectedMembers = m.filter((member) => member.space_id !== state.currentSpace?.id)

    if (rejectedMembers.length > 0) {
      debugLog({
        level: 'warn',
        source: 'space-members-debug',
        message: 'Store rejected members that do not belong to the active space',
        details: {
          activeSpaceId: state.currentSpace.id,
          rejectedMembers: rejectedMembers.map((member) => ({
            space_id: member.space_id,
            user_id: member.user_id,
            nickname: member.nickname,
            role: member.role,
          })),
        },
      })
    }

    return { members: scopedMembers }
  }),
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
