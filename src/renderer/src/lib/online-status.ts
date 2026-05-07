// Global online status management
// Sets user as online in database when app connects, and offline when app closes
// This makes users appear online in ALL spaces they are members of

import { supabase } from './supabase'
import { debugLog } from './debug'

let heartbeatInterval: ReturnType<typeof setInterval> | null = null

// Set user as online in the database
export async function setUserOnline(userId: string) {
  debugLog({ source: 'online-status', message: '[STATUS] Setting user ONLINE', details: { userId, action: 'setUserOnline' } })
  const { error } = await supabase
    .from('profiles')
    .update({ is_online: true, last_seen_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    debugLog({ level: 'error', source: 'online-status', message: '[ERROR] Failed to set user online', details: { userId, error: error.message } })
  } else {
    debugLog({ source: 'online-status', message: '[STATUS] User is now ONLINE', details: { userId } })
  }
}

// Update last_seen_at timestamp (heartbeat)
export async function updateLastSeen(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    debugLog({ level: 'error', source: 'online-status', message: 'Failed to update last_seen', details: { userId, error: error.message } })
  }
}

// Set user as offline in the database
export async function setUserOffline(userId: string) {
  debugLog({ source: 'online-status', message: '[STATUS] Setting user OFFLINE', details: { userId, action: 'setUserOffline' } })
  const { error } = await supabase
    .from('profiles')
    .update({ is_online: false })
    .eq('id', userId)

  if (error) {
    debugLog({ level: 'error', source: 'online-status', message: '[ERROR] Failed to set user offline', details: { userId, error: error.message } })
  } else {
    debugLog({ source: 'online-status', message: '[STATUS] User is now OFFLINE', details: { userId } })
  }
}

// Start heartbeat to keep user online
export function startOnlineHeartbeat(userId: string) {
  debugLog({ source: 'online-status', message: '[HEARTBEAT] Starting online heartbeat', details: { userId } })
  stopOnlineHeartbeat()

  // Set online immediately
  setUserOnline(userId)

  // Start heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    updateLastSeen(userId)
  }, 30_000)

  debugLog({ source: 'online-status', message: '[HEARTBEAT] Heartbeat started', details: { userId, intervalMs: 30000 } })
}

// Stop heartbeat and set user offline
export function stopOnlineHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
    debugLog({ source: 'online-status', message: '[HEARTBEAT] Heartbeat stopped' })
  }
}
