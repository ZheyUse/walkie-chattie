import { useEffect, useMemo, useState } from "react"
import type { DebugLogEntry } from "../lib/debug"

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

  useEffect(() => {
    window.api.getDebugLogs().then((entries) => setLogs(dedupeLogs(entries)))
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

  return (
    <div className="h-screen bg-bg-deep text-text-hi flex flex-col overflow-hidden">
      <header className="h-14 border-b border-border-lo flex items-center justify-between px-4 bg-bg-panel">
        <div>
          <h1 className="font-display text-lg">Debug Mode</h1>
          <p className="text-xs text-text-lo">F1 opens this window. Events, crashes, network failures, and app actions appear here.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-lo">
          {showFilteredCount && <span>{filtered.length} shown</span>}
          <span className={showFilteredCount ? "text-text-lo" : ""}>{logs.length} logs</span>
          <span className="text-green-400">{logs.filter((entry) => entry.level === "success").length} success</span>
          <span className="text-red-400">{logs.filter((entry) => entry.level === "error").length} errors</span>
          <button
            onClick={copyAllLogs}
            className="flex items-center gap-1.5 h-7 px-2 rounded border border-border-md text-text-md hover:text-accent hover:border-accent transition-colors"
            title="Copy filtered logs to clipboard"
          >
            {copiedAll ? (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {copiedText}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                </svg>
                Copy All
              </>
            )}
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 h-7 px-2 rounded border border-border-md text-text-md hover:text-shout hover:border-shout transition-colors"
            title="Clear all logs"
          >
            {cleared ? (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Cleared
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Clear
              </>
            )}
          </button>
        </div>
      </header>

      <div className="h-12 border-b border-border-lo flex items-center gap-3 px-4 bg-bg-surface">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search logs..."
          className="input-field h-8 max-w-sm"
        />
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as typeof level)}
          className="bg-bg-panel border border-border-md rounded-input h-8 px-2 text-xs text-text-hi"
        >
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warn">Warnings</option>
          <option value="error">Errors</option>
        </select>
        <button
          onClick={() => window.api.openDebugWindow()}
          className="h-8 px-3 rounded-input bg-bg-panel border border-border-md text-xs text-text-md hover:text-accent"
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
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      </svg>
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
    </div>
  )
}
