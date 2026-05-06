import { contextBridge, ipcRenderer } from 'electron'

export type PopupData = {
  sender: string
  message: string
  gifUrl?: string
  color?: string
  spaceName?: string
  spaceIcon?: string
  type: 'shout' | 'whisper' | 'tap' | 'broadcast'
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
  showBroadcast: (data: Omit<PopupData, 'type'>) =>
    ipcRenderer.send('show-broadcast', data),
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

  // OAuth helpers — open in a managed BrowserWindow so the tab auto-closes after auth
  openSystemBrowser: (url: string) => ipcRenderer.send('open-oauth-browser', url),
  closeOAuthBrowser: () => ipcRenderer.send('close-oauth-browser'),

  onOAuthCallback: (callback: (url: string) => void) =>
    ipcRenderer.on('oauth-callback', (_, url) => callback(url)),

  onOAuthClosed: (callback: () => void) =>
    ipcRenderer.on('oauth-closed', () => callback()),

  // Custom protocol redirect URI for OAuth
  getOAuthRedirectUri: () => 'astra://login-callback',

  // Native OS notifications
  showNotification: (data: NotificationPayload) =>
    ipcRenderer.send('show-notification', data),
  onNotificationClicked: (callback: (tag: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, tag: string) => callback(tag)
    ipcRenderer.on('notification-clicked', listener)
    return () => ipcRenderer.removeListener('notification-clicked', listener)
  },
  isWindowFocused: () => ipcRenderer.invoke('is-window-focused') as Promise<boolean>,

  // Auto-updater
  restartToUpdate: () => ipcRenderer.send('restart-to-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (callback: (data: { status: string; version?: string; percent?: number; transferred?: number; total?: number }) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { status: string; version?: string; percent?: number; transferred?: number; total?: number }) => callback(data)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
