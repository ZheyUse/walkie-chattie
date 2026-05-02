/// <reference types="vite/client" />

interface Window {
  api: {
    platform: string
    minimize: () => void
    toggleMaximize: () => void
    closeWindow: () => void
    showShout: (data: { sender: string; message: string; gifUrl?: string; color?: string }) => void
    showWhisper: (data: { sender: string; message: string; gifUrl?: string; color?: string }) => void
    closePopup: () => void
    openSystemBrowser: (url: string) => void
    onOAuthCallback: (callback: (url: string) => void) => void
    onOAuthClosed: (callback: () => void) => void
    getOAuthRedirectUri: () => string
    openDebugWindow: () => void
    logDebug: (entry: {
      level: 'info' | 'warn' | 'error'
      source: string
      message: string
      details?: unknown
    }) => void
    getDebugLogs: () => Promise<Array<{
      id: number
      timestamp: string
      level: 'info' | 'warn' | 'error'
      source: string
      message: string
      details?: unknown
    }>>
    onDebugLog: (callback: (entry: {
      id: number
      timestamp: string
      level: 'info' | 'warn' | 'error'
      source: string
      message: string
      details?: unknown
    }) => void) => () => void
  }
}
