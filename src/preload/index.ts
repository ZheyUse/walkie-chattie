import { contextBridge, ipcRenderer } from 'electron'

export type PopupData = {
  sender: string
  message: string
  gifUrl?: string
  color?: string
  spaceName?: string
  spaceIcon?: string
  type: 'shout' | 'whisper' | 'tap'
}

export type NotificationPayload = {
  title: string
  body: string
  tag?: string
}

export type DebugLogEntry = {
  id: number
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  source: string
  message: string
  details?: unknown
}

const api = {
  // Window controls (titlebar)
  minimize: () => ipcRenderer.send('window-minimize'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-max'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Popup controls
  showShout: (data: Omit<PopupData, 'type'>) =>
    ipcRenderer.send('show-shout', data),
  showTap: (data: Omit<PopupData, 'type'>) =>
    ipcRenderer.send('show-whisper', data),
  closePopup: () => ipcRenderer.send('popup-close'),

  // Platform info
  platform: process.platform,

  // Debug tools
  openDebugWindow: () => ipcRenderer.send('debug-open'),
  logDebug: (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) =>
    ipcRenderer.send('debug-log', entry),
  getDebugLogs: () => ipcRenderer.invoke('debug-get-logs') as Promise<DebugLogEntry[]>,
  clearDebugLogs: () => ipcRenderer.send('debug-clear'),
  onDebugLog: (callback: (entry: DebugLogEntry) => void) => {
    const listener = (_: Electron.IpcRendererEvent, entry: DebugLogEntry) => callback(entry)
    ipcRenderer.on('debug-log-entry', listener)
    return () => ipcRenderer.removeListener('debug-log-entry', listener)
  },

  // OAuth helpers — open OAuth URL in system browser (avoids Google blocking embedded browsers)
  openSystemBrowser: (url: string) => ipcRenderer.send('open-external', url),

  onOAuthCallback: (callback: (url: string) => void) =>
    ipcRenderer.on('oauth-callback', (_, url) => callback(url)),

  onOAuthClosed: (callback: () => void) =>
    ipcRenderer.on('oauth-closed', () => callback()),

  // Custom protocol redirect URI for OAuth
  getOAuthRedirectUri: () => 'walkie-chattie://login-callback',

  // Native OS notifications
  showNotification: (data: NotificationPayload) =>
    ipcRenderer.send('show-notification', data),
  onNotificationClicked: (callback: (tag: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, tag: string) => callback(tag)
    ipcRenderer.on('notification-clicked', listener)
    return () => ipcRenderer.removeListener('notification-clicked', listener)
  },
  isWindowFocused: () => ipcRenderer.invoke('is-window-focused') as Promise<boolean>,
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
