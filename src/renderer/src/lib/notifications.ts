export interface NotificationItem {
  id: number
  title: string
  body: string
  tag: string
  avatarColor?: string
  avatarInitials?: string
  timestamp: number
}

const listeners: Set<(item: NotificationItem) => void> = new Set()

/**
 * Trigger a notification. Shows in-app toast when window is focused,
 * OS native notification when window is unfocused/minimized.
 */
export async function triggerNotification(payload: {
  title: string
  body: string
  tag: string
  avatarColor?: string
  avatarInitials?: string
}) {
  const focused = await window.api.isWindowFocused()

  const item: NotificationItem = {
    id: Date.now(),
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    avatarColor: payload.avatarColor,
    avatarInitials: payload.avatarInitials,
    timestamp: Date.now(),
  }

  if (focused) {
    // In-app toast only
    listeners.forEach(fn => fn(item))
  } else {
    // OS native notification only
    window.api.showNotification({ title: payload.title, body: payload.body, tag: payload.tag })
  }
}

/** Subscribe to in-app toasts (used by InAppNotification component) */
export function onInAppNotification(callback: (item: NotificationItem) => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}