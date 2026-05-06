import 'material-symbols'
import { useEffect, useState } from 'react'

type UpdateStatus = {
  status: string
  version?: string
  percent?: number
}

export default function UpdatePrompt() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api?.onUpdateStatus) return

    return window.api.onUpdateStatus((data) => {
      if (data.status === 'available' || data.status === 'downloading' || data.status === 'ready') {
        setUpdate(data)
      }
    })
  }, [])

  if (!update) return null
  if (update.version && dismissedVersion === update.version && update.status !== 'ready') return null

  const isReady = update.status === 'ready'
  const isDownloading = update.status === 'downloading'
  const title = isReady
    ? `Astra v${update.version || ''} is ready`
    : isDownloading
      ? 'Downloading update'
      : `Astra v${update.version || ''} is available`

  const body = isReady
    ? 'Restart now to install the new version.'
    : isDownloading
      ? `${update.percent ?? 0}% downloaded`
      : 'The update will download in the background.'

  return (
    <div className="fixed top-5 left-1/2 z-[120] -translate-x-1/2 px-4 w-full max-w-md pointer-events-none">
      <div
        className="pointer-events-auto overflow-hidden rounded-xl"
        style={{
          background: 'rgba(19,25,41,0.98)',
          border: '1px solid rgba(139,92,246,0.28)',
          boxShadow: '0 14px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.08)',
          backdropFilter: 'blur(22px)',
          animation: 'update-slide-up 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div
            className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(26,159,255,0.12))',
              border: '1px solid rgba(139,92,246,0.22)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px', color: 'rgba(167,139,250,0.9)' }}>
              {isReady ? 'upgrade' : isDownloading ? 'downloading' : 'new_releases'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-display font-bold leading-tight" style={{ color: 'rgba(232,234,237,0.96)' }}>
              {title}
            </p>
            <p className="mt-1 text-xs font-body leading-snug" style={{ color: 'rgba(160,170,184,0.72)' }}>
              {body}
            </p>
          </div>

          {!isReady && (
            <button
              onClick={() => setDismissedVersion(update.version || 'unknown')}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
              style={{ color: 'rgba(160,170,184,0.55)' }}
              title="Dismiss"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
            </button>
          )}
        </div>

        {isDownloading && (
          <div className="h-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${Math.max(0, Math.min(100, update.percent ?? 0))}%`,
                background: 'linear-gradient(90deg, rgba(139,92,246,0.9), rgba(26,159,255,0.8))',
              }}
            />
          </div>
        )}

        {isReady && (
          <div className="px-4 pb-3 flex justify-end gap-2">
            <button
              onClick={() => setDismissedVersion(update.version || 'ready')}
              className="px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors hover:bg-white/[0.06]"
              style={{ color: 'rgba(160,170,184,0.75)' }}
            >
              Later
            </button>
            <button
              onClick={() => window.api.restartToUpdate()}
              className="px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                color: '#fff',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
              }}
            >
              Restart & Install
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes update-slide-up {
          from { opacity: 0; transform: translateY(16px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}
