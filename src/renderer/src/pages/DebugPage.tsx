import 'material-symbols'
import { useEffect, useMemo, useState } from "react"
import type { DebugLogEntry } from "../lib/debug"
import { assetPath } from "../lib/assets"
import { setDebugEnabled } from "../lib/debug"

function formatDetails(details: unknown) {
  if (details === undefined || details === null || details === "") return ""
  if (typeof details === "string") return details

  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

function explain(entry: DebugLogEntry) {
  if (entry.level === "error") {
    return "Something failed here. Check the message and details for the failing step, returned error, or stack trace."
  }

  if (entry.level === "success") {
    return "Operation completed successfully. Details show what was accomplished."
  }

  if (entry.message.toLowerCase().includes("clicked")) {
    return "A user action happened. The label shows which visible control was pressed."
  }

  if (entry.message.toLowerCase().includes("message")) {
    return "Chat message flow changed. Details usually include the command type, space, and success or failure."
  }

  if (entry.message.toLowerCase().includes("oauth") || entry.message.toLowerCase().includes("auth")) {
    return "Login state changed. If sign-in breaks, inspect the callback, token, and Supabase error details."
  }

  return "Informational app event captured while the app was running."
}

function dedupeLogs(logs: DebugLogEntry[]) {
  return Array.from(new Map(logs.map((entry) => [entry.id, entry])).values())
}

export default function DebugPage() {
  const [logs, setLogs] = useState<DebugLogEntry[]>([])
  const [level, setLevel] = useState<"all" | DebugLogEntry["level"]>("all")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [showIconPreview, setShowIconPreview] = useState(false)
  const [debugEnabled, setDebugEnabledState] = useState(() => {
    return localStorage.getItem('debugEnabled') === 'true'
  })

  const toggleDebug = () => {
    const newValue = !debugEnabled
    setDebugEnabledState(newValue)
    setDebugEnabled(newValue)
  }

  const sendTestLog = () => {
    window.api?.logDebug({
      level: 'success',
      source: 'test',
      message: 'Test log - debug is working!',
      details: { time: new Date().toISOString() }
    })
  }
  const [apiAvailable, setApiAvailable] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api) {
      setApiAvailable(false)
      setApiError("Debug API was not injected. The preload script may not have loaded.")
      return
    }

    window.api.getDebugLogs()
      .then((entries) => setLogs(dedupeLogs(entries)))
      .catch((error) => {
        setApiError(String(error))
      })

    return window.api.onDebugLog((entry) => {
      setLogs((current) => dedupeLogs([...current, entry]).slice(-1000))
    })
  }, [])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return logs.filter((entry) => {
      if (level !== "all" && entry.level !== level) return false
      if (!normalizedQuery) return true
      return [
        entry.level,
        entry.source,
        entry.message,
        formatDetails(entry.details),
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [logs, level, query])

  const selected = filtered.find((entry) => entry.id === selectedId) || filtered[filtered.length - 1]

  const copyDetails = async (entry: DebugLogEntry) => {
    const details = formatDetails(entry.details) || "No extra details for this event."
    const text = [
      `Level: ${entry.level}`,
      `Source: ${entry.source}`,
      `Message: ${entry.message}`,
      `Time: ${new Date(entry.timestamp).toLocaleString()}`,
      "",
      "Details:",
      details,
    ].join("\n")

    await navigator.clipboard.writeText(text)
    setCopiedId(entry.id)
    window.setTimeout(() => setCopiedId((current) => current === entry.id ? null : current), 1500)
  }

  const copyAllLogs = async () => {
    const text = filtered.map((entry) => {
      const details = formatDetails(entry.details)
      return `[${new Date(entry.timestamp).toLocaleString()}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}${details ? "\n  " + details : ""}`
    }).join("\n")
    await navigator.clipboard.writeText(text)
    setCopiedAll(true)
    window.setTimeout(() => setCopiedAll(false), 1500)
  }

  const clearLogs = () => {
    window.api.clearDebugLogs?.()
    setLogs([])
    setCleared(true)
    window.setTimeout(() => setCleared(false), 1500)
  }

  const showFilteredCount = filtered.length !== logs.length
  const copiedText = showFilteredCount
    ? `Copied ${filtered.length} (filtered)`
    : `Copied ${filtered.length}`

  if (!apiAvailable) {
    return (
      <div className="h-screen bg-bg-deep text-text-hi flex items-center justify-center">
        <div className="max-w-lg text-center px-6 py-6 rounded-xl border border-border-lo bg-bg-panel">
          <h1 className="font-display text-lg">Debug Window Failed</h1>
          <p className="text-sm text-text-lo mt-2">The debug API is unavailable in this window.</p>
          {apiError && (
            <pre className="mt-4 text-xs text-text-md bg-bg-deep border border-border-lo rounded-lg p-3 whitespace-pre-wrap break-words">
              {apiError}
            </pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-bg-deep text-text-hi flex flex-col overflow-hidden">
      <header className="border-b border-border-lo px-4 py-2 bg-bg-panel flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-base sm:text-lg">Debug Mode</h1>
            <p className="text-[10px] sm:text-xs text-text-lo hidden sm:block">F1 opens this window.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-lo flex-wrap">
            <img
              src={assetPath("resources/icons/icon-64.png")}
              alt="app icon"
              title="Click to preview full size"
              className="rounded cursor-pointer hover:ring-2 hover:ring-accent transition-all w-6 h-6 sm:w-8 sm:h-8"
              onClick={() => setShowIconPreview(true)}
            />
            <span className="hidden sm:inline">{filtered.length}/{logs.length}</span>
            <span className="text-green-400">{logs.filter((entry) => entry.level === "success").length} SUCCESS</span>
            <span className="text-red-400">{logs.filter((entry) => entry.level === "error").length} ERROR</span>
            <span className={"h-7 px-2 sm:px-3 rounded border text-xs font-display font-semibold " + (debugEnabled ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-border-md text-text-lo bg-bg-panel')}>
              {debugEnabled ? '● ON' : '○ OFF'}
            </span>
            <button
              onClick={toggleDebug}
              className="h-8 px-3 rounded-input text-xs font-display"
              title="Toggle debug logging"
            >
              {debugEnabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={sendTestLog}
              className="h-7 px-2 rounded border border-border-md text-xs text-text-md hover:text-accent hover:border-accent transition-colors"
              title="Send test log"
            >
              Test
            </button>
            <button
              onClick={copyAllLogs}
              className="flex items-center gap-1 h-7 px-2 rounded border border-border-md text-text-md hover:text-accent hover:border-accent transition-colors"
              title="Copy filtered logs to clipboard"
            >
              {copiedAll ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                  <span className="hidden sm:inline">{copiedText}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center gap-1 h-7 px-2 rounded border border-border-md text-text-md hover:text-shout hover:border-shout transition-colors"
              title="Clear all logs"
            >
              {cleared ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                  <span className="hidden sm:inline">Cleared</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                  <span className="hidden sm:inline">Clear</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="h-auto sm:h-12 border-b border-border-lo flex items-center gap-2 px-4 py-2 bg-bg-surface flex-wrap">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="input-field h-8 flex-1 min-w-[120px] max-w-xs"
        />
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as typeof level)}
          className="bg-bg-panel border border-border-md rounded-input h-8 px-2 text-xs text-text-hi"
        >
          <option value="all">All</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <button
          onClick={() => window.api.openDebugWindow()}
          className="h-8 px-2 sm:px-3 rounded-input bg-bg-panel border border-border-md text-xs text-text-md hover:text-accent"
        >
          Focus
        </button>
      </div>

      <main className="flex-1 grid grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        <section className="overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center text-text-lo text-sm">No matching logs yet.</div>
          ) : filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={"w-full text-left grid grid-cols-[92px_92px_minmax(0,1fr)] gap-3 px-4 py-2 border-b border-border-lo hover:bg-bg-hover " +
                (selected?.id === entry.id ? "bg-accent/10" : "")}
            >
              <span className={"text-xs font-display uppercase " + (
                entry.level === "error" ? "text-red-400" : entry.level === "warn" ? "text-yellow-300" : entry.level === "success" ? "text-green-400" : "text-accent"
              )}>{entry.level}</span>
              <span className="text-xs text-text-lo truncate">{entry.source}</span>
              <span className="min-w-0">
                <span className="block text-sm text-text-hi truncate">{entry.message}</span>
                <span className="block text-xs text-text-lo">{new Date(entry.timestamp).toLocaleString()}</span>
              </span>
            </button>
          ))}
        </section>

        <aside className="border-l border-border-lo bg-bg-panel overflow-y-auto p-4">
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-display text-text-lo">What happened</p>
                <p className="mt-1 text-sm">{selected.message}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-display text-text-lo">Why it matters</p>
                <p className="mt-1 text-sm text-text-md">{explain(selected)}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-display text-text-lo">When</p>
                <p className="mt-1 text-sm">{new Date(selected.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase font-display text-text-lo">Details</p>
                  <button
                    onClick={() => copyDetails(selected)}
                    title="Copy error details"
                    aria-label="Copy error details"
                    className="w-7 h-7 rounded flex items-center justify-center text-text-lo hover:text-accent hover:bg-bg-hover transition-colors"
                  >
                    {copiedId === selected.id ? (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                    )}
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-card bg-bg-deep border border-border-lo p-3 text-xs text-text-md">
                  {formatDetails(selected.details) || "No extra details for this event."}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-lo">Select a log to inspect it.</p>
          )}
        </aside>
      </main>

      {/* App icon preview overlay */}
      {showIconPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowIconPreview(false)}
        >
          <div className="relative rounded-2xl overflow-hidden" style={{ background: 'rgba(15,18,28,0.98)', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 16px 64px rgba(0,0,0,0.8)' }}>
            <button
              onClick={() => setShowIconPreview(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-text-lo hover:text-text-hi hover:bg-white/5 transition-colors z-10"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
            <div className="p-8 flex flex-col items-center gap-4">
              <p className="font-display text-sm text-text-md">App Icon — 1080×1080px</p>
              <img
                src={assetPath("resources/icons/icon-512.png")}
                alt="App icon full preview"
                className="rounded-xl"
                style={{ width: 480, height: 480 }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
