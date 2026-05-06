import 'material-symbols'
import { useEffect, useState, useRef } from 'react'
import { debugLog } from '../../lib/debug'

type UpdateStatus =
  | { status: 'available'; version: string }
  | { status: 'downloading'; version: string; percent: number; transferred: number; total: number }
  | { status: 'ready'; version: string }

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1)
}

// ── Floating progress bar ─────────────────────────────────────────────────────

function ProgressBar({ version, percent, transferred, total }: { version: string; percent: number; transferred: number; total: number }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="fixed bottom-5 right-5 flex flex-col overflow-hidden rounded-2xl shadow-2xl"
      style={{
        width: collapsed ? '56px' : '300px',
        background: 'rgba(14,18,28,0.97)',
        border: '1px solid rgba(139,92,246,0.22)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)',
        transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        backdropFilter: 'blur(24px)',
        zIndex: 9999,
      }}
    >
      {/* Header row — always visible */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(26,159,255,0.12))', border: '1px solid rgba(139,92,246,0.22)' }}
        >
          <span className="material-symbols-outlined text-sm" style={{ color: 'rgba(167,139,250,0.9)', fontSize: '15px' }}>
            downloading
          </span>
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-display font-bold leading-tight" style={{ color: 'rgba(232,234,237,0.9)' }}>
              Downloading v{version}
            </p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/[0.06]"
          style={{ color: 'rgba(160,170,184,0.55)' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className="material-symbols-outlined text-sm" style={{ fontSize: '14px' }}>
            {collapsed ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
          </span>
        </button>
      </div>

      {/* Expanded — progress bar + MB counter */}
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${Math.min(100, percent)}%`,
                background: 'linear-gradient(90deg, rgba(139,92,246,0.9), rgba(26,159,255,0.8))',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-body" style={{ color: 'rgba(160,170,184,0.5)' }}>
              {formatMB(transferred)} / {formatMB(total)} MB
            </span>
            <span className="text-[10px] font-display font-semibold tabular-nums" style={{ color: 'rgba(167,139,250,0.7)' }}>
              {percent}%
            </span>
          </div>
        </div>
      )}

      {/* Collapsed — fill indicator */}
      {collapsed && (
        <div className="px-3 pb-3 flex flex-col items-center gap-1">
          <div className="h-1.5 rounded-full overflow-hidden w-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${Math.min(100, percent)}%`,
                background: 'linear-gradient(90deg, rgba(139,92,246,0.9), rgba(26,159,255,0.8))',
              }}
            />
          </div>
          <span className="text-[9px] font-display font-semibold tabular-nums" style={{ color: 'rgba(167,139,250,0.6)' }}>
            {percent}%
          </span>
        </div>
      )}

      <style>{`
        @keyframes progress-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

// ── Restart modal ─────────────────────────────────────────────────────────────

function RestartModal({ version, onRestart }: { version: string; onRestart: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slight delay so it doesn't flash before the bar disappears
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', animation: 'modal-in 0.22s ease-out' }}
    >
      <div
        className="flex flex-col items-center gap-5 px-8 py-8 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(14,18,28,0.98)',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)',
          width: '360px',
          maxWidth: '90vw',
        }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(26,159,255,0.15))',
            border: '1px solid rgba(139,92,246,0.3)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgba(167,139,250,0.9)' }}>
            check_circle
          </span>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-lg font-display font-bold" style={{ color: 'rgba(232,234,237,0.96)' }}>
            Update Finished!
          </h2>
          <p className="text-sm font-body" style={{ color: 'rgba(160,170,184,0.72)' }}>
            Astra v{version} is ready to install.
          </p>
        </div>

        {/* Restart button */}
        <button
          onClick={onRestart}
          className="w-full py-2.5 rounded-xl font-display font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            color: '#fff',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
          }}
        >
          Restart Astra Now
        </button>
      </div>
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ── Update available banner ───────────────────────────────────────────────────

function UpdateBanner({ version, onUpdate, dismiss }: { version: string; onUpdate: () => void; dismiss: () => void }) {
  const [downloading, setDownloading] = useState(false)

  const handleUpdate = async () => {
    if (downloading) return
    setDownloading(true)
    onUpdate()
    debugLog({ source: 'updater', message: 'Update button clicked in renderer' })

    try {
      const result = await window.api.downloadUpdate()
      if (!result?.success) {
        debugLog({
          level: 'error',
          source: 'updater',
          message: 'downloadUpdate returned failure',
          details: result?.error ?? 'Unknown error',
        })
        setDownloading(false)
      }
    } catch (error) {
      debugLog({ level: 'error', source: 'updater', message: 'downloadUpdate threw in renderer', details: error })
      setDownloading(false)
    }
  }

  return (
    <div className="fixed top-5 left-1/2 z-[120] -translate-x-1/2 px-4 w-full max-w-sm pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(19,25,41,0.98)',
          border: '1px solid rgba(139,92,246,0.28)',
          boxShadow: '0 14px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.08)',
          backdropFilter: 'blur(22px)',
          animation: 'update-slide-up 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(26,159,255,0.12))',
            border: '1px solid rgba(139,92,246,0.22)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'rgba(167,139,250,0.9)' }}>
            downloading
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-bold leading-tight" style={{ color: 'rgba(232,234,237,0.96)' }}>
            Astra v{version} is available
          </p>
          {downloading && (
            <p className="text-[10px] font-body" style={{ color: 'rgba(160,170,184,0.5)' }}>
              Downloading…
            </p>
          )}
        </div>

        <button
          onClick={handleUpdate}
          disabled={downloading}
          className="px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] flex-shrink-0 disabled:opacity-50"
          style={{
            color: '#fff',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            boxShadow: '0 2px 10px rgba(139,92,246,0.35)',
          }}
        >
          {downloading ? (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '11px' }}>sync</span>
              Downloading
            </span>
          ) : (
            'Update'
          )}
        </button>

        {!downloading && (
          <button
            onClick={dismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/[0.06]"
            style={{ color: 'rgba(160,170,184,0.4)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
          </button>
        )}
      </div>
      <style>{`
        @keyframes update-slide-up {
          from { opacity: 0; transform: translateY(-12px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function UpdatePrompt() {
  const [updateState, setUpdateState] = useState<UpdateStatus | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [showRestartModal, setShowRestartModal] = useState(false)
  const dismissedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!window.api?.onUpdateStatus) return
    const applyUpdateStatus = (data: { status: string; version?: string; percent?: number; transferred?: number; total?: number }) => {
      const s = data.status as UpdateStatus['status']

      if (s === 'available') {
        const v = data.version!
        dismissedRef.current = null

        setShowRestartModal(false)
        setUpdateState({ status: 'available', version: v })
      } else if (s === 'downloading') {
        setShowProgress(true)
        setUpdateState({
          status: 'downloading',
          version: data.version ?? 'unknown',
          percent: data.percent ?? 0,
          transferred: data.transferred ?? 0,
          total: data.total ?? 0,
        })
      } else if (s === 'ready') {
        const v = data.version!
        setShowProgress(false)
        setShowRestartModal(true)
        setUpdateState({ status: 'ready', version: v })
        dismissedRef.current = v
      }
    }

    window.api.getUpdateStatus?.().then((status) => {
      if (status) applyUpdateStatus(status)
    })

    return window.api.onUpdateStatus((data) => applyUpdateStatus(data))
  }, [])

  const currentVersion = updateState?.status === 'available' ? updateState.version : undefined
  const isDismissed = currentVersion ? dismissedRef.current === currentVersion : false

  if (!updateState) return null

  if (updateState.status === 'available' && !isDismissed && !showProgress) {
    return <UpdateBanner version={updateState.version} onUpdate={() => setShowProgress(true)} dismiss={() => { dismissedRef.current = updateState.version }} />
  }

  if (showProgress && updateState.status === 'downloading') {
    return (
      <ProgressBar
        version={updateState.version}
        percent={updateState.percent}
        transferred={updateState.transferred}
        total={updateState.total}
      />
    )
  }

  if (showRestartModal && updateState.status === 'ready') {
    return <RestartModal version={updateState.version} onRestart={() => window.api.restartToUpdate()} />
  }

  return null
}