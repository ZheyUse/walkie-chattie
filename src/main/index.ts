import { app, shell, BrowserWindow, ipcMain, Menu, Tray, nativeImage, Notification, globalShortcut } from "electron"
import { join, resolve } from "path"
import { rm } from "fs/promises"
import { autoUpdater } from "electron-updater"
import { createClient } from "@supabase/supabase-js"

// Supabase credentials (same as renderer)
const SUPABASE_URL = "https://wqoljftjltqdebdmkxuc.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxb2xqZnRqbHRxZGViZG1reHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Mzg2MjgsImV4cCI6MjA5MzIxNDYyOH0.-4qv-UloidDoj5Fnqgmt2sx_jawTc4jlG07fFYXKqhM"

// Create Supabase client for main process
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// isDev: detect if running in dev mode
const isDev = !!(process.env.ELECTRON_RENDERER_URL || process.env.ELECTRON_ENABLE_LOGGING)
const DEEP_LINK_PROTOCOL = "astra"

let mainWindow: BrowserWindow | null = null
let debugWindow: BrowserWindow | null = null
let oauthWindow: BrowserWindow | null = null
let oauthSucceeded = false
let tray: Tray | null = null
let isQuitting = false
let pendingOAuthUrl: string | null = null
let startInBackground = false
let lastUpdateStatus: UpdateStatusPayload | null = null
// Track current user ID for offline status update on quit
let currentUserId: string | null = null

type DebugLevel = "info" | "warn" | "error"

type DebugLogEntry = {
  id: number
  timestamp: string
  level: DebugLevel
  source: string
  message: string
  details?: unknown
}

type UpdateStatusPayload = {
  status: "available" | "downloading" | "ready"
  version?: string
  percent?: number
  transferred?: number
  total?: number
}

const debugLogs: DebugLogEntry[] = []
let debugLogId = 0
const MAX_DEBUG_LOGS = 1000

function safeDetails(details: unknown) {
  if (details instanceof Error) {
    return { name: details.name, message: details.message, stack: details.stack }
  }

  return details
}

function addDebugLog(level: DebugLevel, source: string, message: string, details?: unknown) {
  const entry: DebugLogEntry = {
    id: ++debugLogId,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details: safeDetails(details),
  }

  debugLogs.push(entry)
  if (debugLogs.length > MAX_DEBUG_LOGS) debugLogs.shift()

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("debug-log-entry", entry)
  }

  const line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}`
  if (level === "error") console.error(line, entry.details ?? "")
  else if (level === "warn") console.warn(line, entry.details ?? "")
  else console.log(line, entry.details ?? "")

  return entry
}

function broadcastUpdateStatus(payload: UpdateStatusPayload) {
  lastUpdateStatus = payload
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("update-status", payload)
  }
}

function getWindowUrl(route = "") {
  const cleanedRoute = route.replace(/^#/, "")
  const normalizedRoute = cleanedRoute ? (cleanedRoute.startsWith("/") ? cleanedRoute : "/" + cleanedRoute) : ""
  const hashRoute = normalizedRoute ? "#" + normalizedRoute : ""
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    return process.env.ELECTRON_RENDERER_URL + hashRoute
  }
  return "file://" + join(__dirname, "../renderer/index.html") + hashRoute
}

function attachWindowDebugging(win: BrowserWindow, label: string) {
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F1") {
      event.preventDefault()
      addDebugLog("info", label, "F1 pressed; opening debug window")
      openDebugWindow()
    }
  })

  win.webContents.on("console-message", (_, level, message, line, sourceId) => {
    const mappedLevel: DebugLevel = level >= 2 ? "error" : level === 1 ? "warn" : "info"
    addDebugLog(mappedLevel, label, "Renderer console message", { message, line, sourceId })
  })

  win.webContents.on("did-fail-load", (_, errorCode, errorDescription, validatedURL) => {
    addDebugLog("error", label, "Window failed to load", { errorCode, errorDescription, validatedURL })
  })

  win.webContents.on("render-process-gone", (_, details) => {
    addDebugLog("error", label, "Renderer process stopped unexpectedly", details)
  })
}

function openDebugWindow() {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.show()
    if (debugWindow.isMinimized()) debugWindow.restore()
    debugWindow.focus()
    return
  }

  debugWindow = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: "Astra Debug",
    backgroundColor: "#0e1117",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  attachWindowDebugging(debugWindow, "debug-window")
  debugWindow.on("ready-to-show", () => debugWindow?.show())
  debugWindow.on("closed", () => { debugWindow = null })
  debugWindow.loadURL(getWindowUrl("/debug"))
}

function getIconPath(size: 32 | 256 | "ico" = "ico") {
  const filename = size === "ico" ? "icon.ico" : `icon-${size}.png`
  return isDev
    ? join(__dirname, "../../resources/icons", filename)
    : join(process.resourcesPath, "resources/icons", filename)
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  // Re-enable throttling when window is shown
  mainWindow.webContents.setBackgroundThrottling(true)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    show: false,
    backgroundColor: "#0e1117",
    autoHideMenuBar: true,
    icon: getIconPath("ico"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on("ready-to-show", () => {
    if (pendingOAuthUrl) {
      finishOAuth(pendingOAuthUrl)
      pendingOAuthUrl = null
      return
    }
    if (startInBackground) mainWindow?.hide()
    else showMainWindow()
  })

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
      // Disable background throttling to keep Supabase Realtime WebSocket alive in tray
      mainWindow?.webContents.setBackgroundThrottling(false)
      addDebugLog("info", "main-window", "Background throttling disabled (in tray)")
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  attachWindowDebugging(mainWindow, "main-window")

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

function createTray() {
  // In dev the path is relative to project root; in prod it's inside asar
  const iconPath = getIconPath(32)
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip("Astra")
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Astra", click: () => showMainWindow() },
    { label: "Diagnostics", click: () => openDebugWindow() },
    { type: "separator" },
    { label: "Quit", click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on("click", () => {
    if (mainWindow?.isVisible()) mainWindow.hide()
    else {
      showMainWindow()
      // Re-enable throttling when window is restored
      mainWindow?.webContents.setBackgroundThrottling(true)
      addDebugLog("info", "main-window", "Background throttling re-enabled")
    }
  })
}

function registerDebugShortcut() {
  const accelerator = process.platform === "darwin" ? "Command+Shift+D" : "Control+Shift+D"
  const success = globalShortcut.register(accelerator, () => {
    addDebugLog("info", "main-window", "Debug shortcut triggered", { accelerator })
    openDebugWindow()
  })

  if (!success) {
    addDebugLog("warn", "main-window", "Failed to register debug shortcut", { accelerator })
  }
}

function popupUrl(data: object) {
  const encoded = encodeURIComponent(JSON.stringify(data))
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    return process.env.ELECTRON_RENDERER_URL + "/#/popup/" + encoded
  }
  return "file://" + join(__dirname, "../renderer/index.html") + "#/popup/" + encoded
}

function finishOAuth(redirectUrl: string) {
  oauthSucceeded = true
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("oauth-callback", redirectUrl)
    showMainWindow()
  } else {
    pendingOAuthUrl = redirectUrl
  }

  if (oauthWindow && !oauthWindow.isDestroyed()) {
    oauthWindow.destroy()
  }
}

process.on("uncaughtException", (error) => {
  addDebugLog("error", "main-process", "Uncaught exception", error)
})

process.on("unhandledRejection", (reason) => {
  addDebugLog("error", "main-process", "Unhandled promise rejection", reason)
})

app.whenReady().then(() => {
  const loginSettings = app.getLoginItemSettings()
  startInBackground = !isDev && (loginSettings.wasOpenedAtLogin || loginSettings.wasOpenedAsHidden)

  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL, process.execPath, [resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL)
  }

  const initialOAuthUrl = process.argv.find(arg => arg.startsWith(DEEP_LINK_PROTOCOL + "://"))
  if (initialOAuthUrl) pendingOAuthUrl = initialOAuthUrl

  // Handle deep-link URL on Windows (second-instance)
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) { app.quit(); return }
  app.on("second-instance", (_, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith(DEEP_LINK_PROTOCOL + "://"))
    if (url) {
      finishOAuth(url)
    } else {
      showMainWindow()
    }
  })

  app.on("open-url", (event, url) => {
    event.preventDefault()
    finishOAuth(url)
  })

  // IPC: shout popup
  ipcMain.on("show-shout", (_, data) => {
    addDebugLog("info", "main-window", "Opening shout popup", data)
    const win = new BrowserWindow({
      fullscreen: true,
      backgroundColor: '#060810',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
      },
    })
    attachWindowDebugging(win, "shout-popup")
    const timeout = setTimeout(() => { if (!win.isDestroyed()) win.close() }, 12000)
    win.loadURL(popupUrl({ ...data, popupType: "shout" }))
    win.on("closed", () => clearTimeout(timeout))
  })

  // IPC: whisper/tap popup
  ipcMain.on("show-whisper", (_, data) => {
    addDebugLog("info", "main-window", "Opening tap popup", data)
    const win = new BrowserWindow({
      fullscreen: true,
      backgroundColor: '#060810',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
      },
    })
    attachWindowDebugging(win, "tap-popup")
    win.center()
    const timeout = setTimeout(() => { if (!win.isDestroyed()) win.close() }, 8000)
    win.loadURL(popupUrl({ ...data, popupType: "tap" }))
    win.on("closed", () => clearTimeout(timeout))
  })

  // IPC: @all broadcast popup
  ipcMain.on("show-broadcast", (_, data) => {
    addDebugLog("info", "main-window", "Opening broadcast popup", data)
    const win = new BrowserWindow({
      fullscreen: true,
      backgroundColor: '#060810',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
      },
    })
    attachWindowDebugging(win, "broadcast-popup")
    const timeout = setTimeout(() => { if (!win.isDestroyed()) win.close() }, 12000)
    win.loadURL(popupUrl({ ...data, popupType: "broadcast" }))
    win.on("closed", () => clearTimeout(timeout))
  })

  // IPC: window controls
  ipcMain.on("window-minimize", () => {
    addDebugLog("info", "main-window", "Window minimize requested")
    mainWindow?.minimize()
  })
  ipcMain.on("window-toggle-max", () => {
    addDebugLog("info", "main-window", "Window maximize toggle requested")
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on("window-close", () => {
    addDebugLog("info", "main-window", "Window close requested; hiding to tray")
    mainWindow?.hide()
  })
  ipcMain.on("popup-close", (event) => {
    addDebugLog("info", "popup", "Popup close requested")
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // IPC: open URL in system default browser (fallback for non-OAuth URLs)
  ipcMain.on("open-external", (_, url) => {
    addDebugLog("info", "main-window", "Opening external URL", { url })
    shell.openExternal(url)
  })

  // IPC: open OAuth URL in the system browser so Google sign-in works in packaged builds.
  ipcMain.on("open-oauth-browser", (_, url: string) => {
    addDebugLog("info", "main-window", "Opening OAuth in system browser", { url })
    oauthSucceeded = false
    shell.openExternal(url)
  })

  ipcMain.on("close-oauth-browser", () => {
    if (oauthWindow && !oauthWindow.isDestroyed()) {
      addDebugLog("info", "main-window", "Closing OAuth BrowserWindow by request")
      oauthSucceeded = true
      oauthWindow.destroy()
    }
  })

  ipcMain.on("debug-open", () => openDebugWindow())
  ipcMain.on("debug-log", (_, entry: { level?: DebugLevel; source?: string; message?: string; details?: unknown }) => {
    addDebugLog(entry.level || "info", entry.source || "renderer", entry.message || "Renderer event", entry.details)
  })
  ipcMain.handle("debug-get-logs", () => debugLogs)
  ipcMain.handle("get-update-status", () => lastUpdateStatus)
  ipcMain.on("debug-clear", () => { debugLogs.length = 0 })

  // IPC: toggle debug mode across all windows
  let globalDebugEnabled = !app.isPackaged // Default to enabled in development
  addDebugLog("info", "main-process", `Debug mode defaulting to ${globalDebugEnabled ? 'ENABLED' : 'DISABLED'} (isPackaged: ${app.isPackaged})`)
  ipcMain.on("debug-toggle", (_, enabled: boolean) => {
    globalDebugEnabled = enabled
    // Broadcast to all windows
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send("debug-state-changed", enabled)
    }
    addDebugLog("info", "main-process", `Global debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`, { windowCount: BrowserWindow.getAllWindows().length })
  })
  ipcMain.handle("debug-get-state", () => globalDebugEnabled)

  // IPC: native OS notification
  ipcMain.on("show-notification", (_, data: { title: string; body: string; tag?: string }) => {
    if (!Notification.isSupported()) {
      addDebugLog("warn", "main-window", "OS notifications not supported on this platform")
      return
    }
    const notification = new Notification({
      title: data.title,
      body: data.body,
      silent: false,
    })
    notification.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        showMainWindow()
        mainWindow.webContents.send("notification-clicked", data.tag || "")
      }
    })
    notification.show()
  })

  // IPC: track user login/logout for offline status update on quit
  ipcMain.on("user-logged-in", (_, userId: string) => {
    currentUserId = userId
    addDebugLog("info", "main-process", `User logged in tracking: ${userId}`)
  })
  ipcMain.on("user-logged-out", () => {
    currentUserId = null
    addDebugLog("info", "main-process", "User logged out tracking cleared")
  })

  createWindow()
  createTray()
  setupAutoUpdater()
  registerDebugShortcut()

  // IPC: check if window is focused (used by renderer to decide in-app vs OS notification)
  ipcMain.handle("is-window-focused", () => mainWindow?.isFocused() ?? false)

  // IPC: download a pending update (triggered when user clicks "Update" in the banner)
  ipcMain.handle("download-update", async () => {
    try {
      addDebugLog("info", "updater", "User triggered manual download")
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (err) {
      addDebugLog("error", "updater", "downloadUpdate failed", err)
      return { success: false, error: String(err) }
    }
  })

  // IPC: manually check for updates (triggered by clicking version in titlebar)
  ipcMain.handle("check-for-updates", async () => {
    if (isDev) return { success: true, message: "Skipped in dev mode" }
    try {
      addDebugLog("info", "updater", "Manual update check triggered")
      const result = await autoUpdater.checkForUpdates()
      return { success: true, updateAvailable: Boolean(result?.updateInfo?.version), updateVersion: result?.updateInfo?.version }
    } catch (err) {
      addDebugLog("error", "updater", "Manual checkForUpdates failed", err)
      return { success: false, error: String(err) }
    }
  })

  // IPC: install downloaded update and restart
  ipcMain.on("restart-to-update", async () => {
    isQuitting = true
    // Clean up downloaded installer before restart
    try {
      const updateDir = join(app.getPath("userData"), "Update")
      await rm(updateDir, { recursive: true, force: true })
      addDebugLog("info", "updater", "Cleaned up update cache", { updateDir })
    } catch (err) {
      addDebugLog("warn", "updater", "Failed to clean up update cache", { error: String(err) })
    }
    autoUpdater.quitAndInstall()
  })

  // Auto-start in background (only in production builds)
  if (!isDev) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showMainWindow()
  })
})

app.on("before-quit", async () => {
  isQuitting = true
  addDebugLog("info", "main-process", "[BEFORE-QUIT] App is quitting", { currentUserId })
  if (currentUserId) {
    try {
      await supabase
        .from("profiles")
        .update({ is_online: false, last_seen_at: new Date().toISOString() })
        .eq("id", currentUserId)
      addDebugLog("info", "main-process", "[BEFORE-QUIT] User set offline successfully", { userId: currentUserId })
    } catch (err) {
      addDebugLog("error", "main-process", "[BEFORE-QUIT] Failed to set offline", { userId: currentUserId, error: String(err) })
    }
  }
})
app.on("will-quit", () => { globalShortcut.unregisterAll() })

// ── Auto-updater ────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  let cachedUpdateVersion: string | undefined
  let usedGenericFallback = false
  const genericFeedUrl = "https://github.com/ZheyUse/walkie-chattie/releases/latest/download/"

  autoUpdater.autoDownload = false

  autoUpdater.logger = {
    info: (msg) => addDebugLog("info", "updater", String(msg)),
    warn: (msg) => addDebugLog("warn", "updater", String(msg)),
    error: (msg) => addDebugLog("error", "updater", String(msg)),
    debug: (msg) => addDebugLog("info", "updater", `[debug] ${String(msg)}`),
  }

  autoUpdater.on("checking-for-update", () => {
    addDebugLog("info", "updater", "Checking for updates...", {
      currentVersion: app.getVersion(),
    })
  })

  autoUpdater.on("update-available", (info) => {
    addDebugLog("info", "updater", "Update available", info)
    addDebugLog("info", "updater", `Found update ${info.version}`, {
      currentVersion: app.getVersion(),
      releaseName: info.releaseName,
      releaseDate: info.releaseDate,
      files: info.files?.map((file) => ({ url: file.url, size: file.size })),
    })
    cachedUpdateVersion = info.version
    broadcastUpdateStatus({ status: "available", version: info.version })
  })

  autoUpdater.on("update-not-available", () => {
    addDebugLog("info", "updater", "No updates available", {
      currentVersion: app.getVersion(),
    })
  })

  autoUpdater.on("download-progress", (progress) => {
    addDebugLog("info", "updater", "Download progress", { percent: progress.percent.toFixed(1), transferred: progress.transferred, total: progress.total })
    broadcastUpdateStatus({
      status: "downloading",
      version: cachedUpdateVersion,
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on("update-downloaded", (info) => {
    addDebugLog("info", "updater", `Update ${info.version} downloaded — will install on restart`)
    cachedUpdateVersion = info.version
    broadcastUpdateStatus({ status: "ready", version: info.version })
  })

  autoUpdater.on("error", (err) => {
    addDebugLog("error", "updater", "Auto-updater error", err)
  })

  // Check for updates — skips in dev mode (ELECTRON_RENDERER_URL is only set in dev)
  if (!isDev) {
    autoUpdater.checkForUpdates()
      .then((result) => {
        addDebugLog("info", "updater", "Update check completed", {
          currentVersion: app.getVersion(),
          updateAvailable: Boolean(result?.updateInfo?.version),
          updateVersion: result?.updateInfo?.version,
        })
      })
      .catch((err) => {
        addDebugLog("error", "updater", "checkForUpdatesAndNotify failed", err)

        const message = err instanceof Error ? err.message : String(err)
        if (!usedGenericFallback && message.includes("latest.yml")) {
          usedGenericFallback = true
          addDebugLog("warn", "updater", "Falling back to generic latest feed", { url: genericFeedUrl })
          autoUpdater.setFeedURL({ provider: "generic", url: genericFeedUrl })
          autoUpdater.checkForUpdates()
            .then((result) => {
              addDebugLog("info", "updater", "Generic update check completed", {
                currentVersion: app.getVersion(),
                updateAvailable: Boolean(result?.updateInfo?.version),
                updateVersion: result?.updateInfo?.version,
              })
            })
            .catch((fallbackError) => {
              addDebugLog("error", "updater", "Generic update check failed", fallbackError)
            })
        }
      })
  }
}
