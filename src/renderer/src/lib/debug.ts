export type DebugLevel = "info" | "warn" | "error" | "success"

export type DebugLogEntry = {
  id: number
  timestamp: string
  level: DebugLevel
  source: string
  message: string
  details?: unknown
}

type DebugPayload = {
  level?: DebugLevel
  source?: string
  message: string
  details?: unknown
}

function serializeDetails(details: unknown) {
  if (details instanceof Error) {
    return { name: details.name, message: details.message, stack: details.stack }
  }

  if (details && typeof details === "object") {
    try {
      return JSON.parse(JSON.stringify(details))
    } catch {
      return String(details)
    }
  }

  return details
}

let debugEnabled = false

export function isDebugEnabled() {
  return debugEnabled
}

// Initialize from localStorage on load
if (typeof localStorage !== 'undefined') {
  debugEnabled = localStorage.getItem('debugEnabled') === 'true'
}

export function debugLog({ level = "info", source = "renderer", message, details }: DebugPayload) {
  // Direct local check - no IPC needed for the check itself
  if (!debugEnabled) return
  if (!window.api?.logDebug) return

  window.api.logDebug({
    level,
    source,
    message,
    details: serializeDetails(details),
  })
}

// Simple event-based debug state sync between windows
export function setDebugEnabled(enabled: boolean) {
  debugEnabled = enabled
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('debugEnabled', String(enabled))
  }
  window.api?.setDebugMode?.(enabled)
}

// Listen for debug state changes from main process
if (typeof window !== 'undefined' && window.api?.onDebugStateChanged) {
  window.api.onDebugStateChanged((enabled) => {
    debugEnabled = enabled
    localStorage?.setItem('debugEnabled', String(enabled))
  })
}

function elementLabel(target: EventTarget | null) {
  if (!(target instanceof Element)) return "Unknown element"

  const element = target.closest("button, a, input, textarea, select, [role='button'], .nav-btn") as HTMLElement | null
  if (!element) {
    const tag = target instanceof Element ? target.tagName.toLowerCase() : "unknown"
    return tag
  }

  const explicitLabel = element.getAttribute("aria-label") || element.getAttribute("aria-labelledby") || element.getAttribute("title")
  const text = element.innerText?.replace(/\s+/g, " ").trim()
  const placeholder = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
    ? element.placeholder
    : ""

  return explicitLabel || text || placeholder || element.tagName.toLowerCase()
}

export function installDebugInstrumentation() {
  if (!window.api) return

  window.addEventListener("error", (event) => {
    debugLog({
      level: "error",
      source: "renderer",
      message: "Uncaught renderer error",
      details: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: serializeDetails(event.error),
      },
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    debugLog({
      level: "error",
      source: "renderer",
      message: "Unhandled renderer promise rejection",
      details: serializeDetails(event.reason),
    })
  })

  document.addEventListener("click", (event) => {
    if (window.location.hash === "#/debug") return
    debugLog({
      source: "ui",
      message: "Clicked UI control",
      details: {
        label: elementLabel(event.target),
        tag: event.target instanceof HTMLElement ? event.target.tagName.toLowerCase() : "unknown",
      },
    })
  }, true)

  document.addEventListener("keydown", (event) => {
    if (event.key === "F1") {
      event.preventDefault()
      debugLog({ source: "ui", message: "F1 pressed; opening debug window" })
      window.api.openDebugWindow()
    }
  })

  debugLog({
    source: "renderer",
    message: "Debug instrumentation installed",
    details: {
      route: window.location.hash || window.location.pathname,
      userAgent: navigator.userAgent,
      platform: window.api.platform,
    },
  })
}
