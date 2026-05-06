import { create } from "zustand"
import { supabase } from "../lib/supabase"
import type { User, Session } from "@supabase/supabase-js"

export interface Profile {
  id: string
  nickname: string
  avatar_color: string
  picture?: string
  created_at: string
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  signOut: () => Promise<void>
  checkProfile: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  setProfile: (profile) => set({ profile, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  checkProfile: async () => {
    const user = get().user
    if (!user) return false
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
    if (data) { set({ profile: data }); return true }
    return false
  },
}))