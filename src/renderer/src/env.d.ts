/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
}

interface Window {
  api: {
    platform: string
    minimize: () => void
    toggleMaximize: () => void
    closeWindow: () => void
    showShout: (data: { sender: string; message: string; gifUrl?: string; imageUrl?: string; color?: string; spaceName?: string; spaceIcon?: string }) => void
    showTap: (data: { sender: string; message: string; gifUrl?: string; imageUrl?: string; color?: string }) => void
    showBroadcast: (data: { sender: string; message: string; gifUrl?: string; imageUrl?: string; color?: string; spaceName?: string; spaceIcon?: string }) => void
    isWindowFocused: () => Promise<boolean>
    closePopup: () => void
    openSystemBrowser: (url: string) => void
    onOAuthCallback: (callback: (url: string) => void) => void
    onOAuthClosed: (callback: () => void) => void
    getOAuthRedirectUri: () => string
    closeOAuthBrowser: () => void
    openDebugWindow: () => void
    logDebug: (entry: {
      level: 'info' | 'warn' | 'error' | 'success'
      source: string
      message: string
      details?: unknown
    }) => void
    getDebugLogs: () => Promise<Array<{
      id: number
      timestamp: string
      level: 'info' | 'warn' | 'error' | 'success'
      source: string
      message: string
      details?: unknown
    }>>
    clearDebugLogs: () => void
    setDebugMode: (enabled: boolean) => void
    onDebugStateChanged: (callback: (enabled: boolean) => void) => () => void
    onDebugLog: (callback: (entry: {
      id: number
      timestamp: string
      level: 'info' | 'warn' | 'error' | 'success'
      source: string
      message: string
      details?: unknown
    }) => void) => () => void
    // Auto-updater
    restartToUpdate: () => void
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>
    checkForUpdates: () => Promise<{ success: boolean; updateAvailable?: boolean; updateVersion?: string; error?: string; message?: string }>
    getUpdateStatus: () => Promise<{ status: string; version?: string; percent?: number; transferred?: number; total?: number } | null>
    onUpdateStatus: (callback: (data: { status: string; version?: string; percent?: number; transferred?: number; total?: number }) => void) => () => void
  }
}
