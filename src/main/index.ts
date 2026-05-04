import { app, shell, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from "electron"
import { join, resolve } from "path"

// isDev: detect if running in dev mode
const isDev = !!(process.env.ELECTRON_RENDERER_URL || process.env.ELECTRON_ENABLE_LOGGING)
const DEEP_LINK_PROTOCOL = "walkie-chattie"

let mainWindow: BrowserWindow | null = null
let debugWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let pendingOAuthUrl: string | null = null

type DebugLevel = "info" | "warn" | "error"

type DebugLogEntry = {
  id: number
  timestamp: string
  level: DebugLevel
  source: string
  message: string
  details?: unknown
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

function getWindowUrl(route = "") {
  const hashRoute = route ? "/#" + route : ""
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
    title: "Walkie-Chattie Debug",
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

function createWindow() {
  let iconPath = isDev
    ? join(__dirname, '../../resources/icons/icon-16.png')
    : join(process.resourcesPath, 'resources/icons/icon-16.png')
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    show: false,
    backgroundColor: "#0e1117",
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
    if (pendingOAuthUrl && mainWindow) {
      mainWindow.webContents.send("oauth-callback", pendingOAuthUrl)
      pendingOAuthUrl = null
    }
  })

  mainWindow.on("close", (event) => {
    if (!isQuitting) { event.preventDefault(); mainWindow?.hide() }
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
  let iconPath = isDev
    ? join(__dirname, '../../resources/icons/icon-16.png')
    : join(process.resourcesPath, 'resources/icons/icon-16.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip("Walkie-Chattie")
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Walkie-Chattie", click: () => mainWindow?.show() },
    { type: "separator" },
    { label: "Quit", click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on("click", () => {
    if (mainWindow?.isVisible()) mainWindow.hide()
    else mainWindow?.show()
  })
}

function popupUrl(data: object) {
  const encoded = encodeURIComponent(JSON.stringify(data))
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    return process.env.ELECTRON_RENDERER_URL + "/#/popup/" + encoded
  }
  return "file://" + join(__dirname, "../renderer/index.html") + "#/popup/" + encoded
}

process.on("uncaughtException", (error) => {
  addDebugLog("error", "main-process", "Uncaught exception", error)
})

process.on("unhandledRejection", (reason) => {
  addDebugLog("error", "main-process", "Unhandled promise rejection", reason)
})

app.whenReady().then(() => {
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
    if (url && mainWindow) {
      mainWindow.webContents.send("oauth-callback", url)
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on("open-url", (event, url) => {
    event.preventDefault()
    if (mainWindow) {
      mainWindow.webContents.send("oauth-callback", url)
      mainWindow.show()
      mainWindow.focus()
    } else {
      pendingOAuthUrl = url
    }
  })

  // IPC: shout popup — 80% of screen with transparent background
  ipcMain.on("show-shout", (_, data) => {
    addDebugLog("info", "main-window", "Opening shout popup", data)
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const win = new BrowserWindow({
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.8),
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
      },
    })
    attachWindowDebugging(win, "shout-popup")
    win.center()
    const timeout = setTimeout(() => { if (!win.isDestroyed()) win.close() }, 12000)
    win.loadURL(popupUrl({ ...data, popupType: "shout" }))
    win.on("closed", () => clearTimeout(timeout))
  })

  // IPC: whisper/tap popup — 80% of screen with transparent background
  ipcMain.on("show-whisper", (_, data) => {
    addDebugLog("info", "main-window", "Opening tap popup", data)
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const win = new BrowserWindow({
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.8),
      transparent: true,
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

  // IPC: open URL in system default browser
  ipcMain.on("open-external", (_, url) => {
    addDebugLog("info", "main-window", "Opening external URL", { url })
    shell.openExternal(url)
  })

  ipcMain.on("debug-open", () => openDebugWindow())
  ipcMain.on("debug-log", (_, entry: { level?: DebugLevel; source?: string; message?: string; details?: unknown }) => {
    addDebugLog(entry.level || "info", entry.source || "renderer", entry.message || "Renderer event", entry.details)
  })
  ipcMain.handle("debug-get-logs", () => debugLogs)
  ipcMain.on("debug-clear", () => { debugLogs.length = 0 })

  createWindow()
  createTray()

  // Auto-start
  // TODO (PRODUCTION): Uncomment this when ready to ship
  // app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

app.on("before-quit", () => { isQuitting = true })
