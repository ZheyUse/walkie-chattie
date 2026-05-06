// Tracks last user interaction timestamp for automatic "busy" detection (online but idle 10+ min).
// Uses Supabase Realtime presence to share each user's last-active time with others in the space.

import { useEffect } from 'react'

// Module-level: tracks last interaction timestamp (ms) per userId for the local user only.
// Presence metadata is the authoritative source shared across all clients.
export const lastActiveRef: Record<string, number> = {}

// Mark the current user as having interacted right now.
export function touchUser(userId: string) {
  lastActiveRef[userId] = Date.now()
}

// Returns 'offline' | 'online' | 'busy' based on:
// - offline: user not in onlineUsers
// - online: user is present AND last active < 10 min ago
// - busy: user is present BUT last active >= 10 min ago
export function getOnlineStatus(userId: string, onlineUsers: Set<string>): 'online' | 'busy' | 'offline' {
  if (!onlineUsers.has(userId)) return 'offline'
  const lastActive = lastActiveRef[userId]
  if (!lastActive) return 'online' // no tracking data yet — assume online
  return Date.now() - lastActive < 10 * 60 * 1000 ? 'online' : 'busy'
}

// Read lastActive from presence metadata that was shared via broadcast.
export function applyPresenceLastActive(userId: string, timestamp: number) {
  lastActiveRef[userId] = timestamp
}

// Hook: attach global activity listeners to track when the current user is active.
export function useIdleTracker(userId: string) {
  useEffect(() => {
    if (!userId) return
    touchUser(userId)
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => touchUser(userId)
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [userId])
}