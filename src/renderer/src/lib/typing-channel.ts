import { supabase } from "./supabase"
import { useSpaceStore } from "../stores/space.store"
import type { RealtimeChannel } from "@supabase/supabase-js"

let typingChannel: RealtimeChannel | null = null
let stopTypingTimer: ReturnType<typeof setTimeout> | null = null

export function initTypingChannel(spaceId: string, userId: string) {
  teardownTypingChannel()

  typingChannel = supabase.channel(`space-typing:${spaceId}`, {
    config: { broadcast: { self: false } },
  })

  typingChannel
    .on("broadcast", { event: "typing" }, (payload) => {
      const uid = (payload.payload as { user_id: string }).user_id
      if (uid === userId) return
      const current = useSpaceStore.getState().typingUsers
      useSpaceStore.getState().setTypingUsers(new Set([...current, uid]))
      window.setTimeout(() => {
        const next = new Set(useSpaceStore.getState().typingUsers)
        next.delete(uid)
        useSpaceStore.getState().setTypingUsers(next)
      }, 4000)
    })
    .on("broadcast", { event: "stop_typing" }, (payload) => {
      const uid = (payload.payload as { user_id: string }).user_id
      const next = new Set(useSpaceStore.getState().typingUsers)
      next.delete(uid)
      useSpaceStore.getState().setTypingUsers(next)
    })
    .subscribe()
}

export function teardownTypingChannel() {
  if (typingChannel) {
    supabase.removeChannel(typingChannel)
    typingChannel = null
  }
}

export function sendTyping(userId: string) {
  if (!typingChannel) return
  if (stopTypingTimer) clearTimeout(stopTypingTimer)
  typingChannel.send({
    type: "broadcast",
    event: "typing",
    payload: { user_id: userId },
  })
  stopTypingTimer = setTimeout(() => {
    sendStopTyping(userId)
    stopTypingTimer = null
  }, 4000)
}

export function sendStopTyping(userId: string) {
  if (!typingChannel) return
  if (stopTypingTimer) {
    clearTimeout(stopTypingTimer)
    stopTypingTimer = null
  }
  typingChannel.send({
    type: "broadcast",
    event: "stop_typing",
    payload: { user_id: userId },
  })
  const next = new Set(useSpaceStore.getState().typingUsers)
  next.delete(userId)
  useSpaceStore.getState().setTypingUsers(next)
}