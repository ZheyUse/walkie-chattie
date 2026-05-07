import { useState, useEffect, useCallback } from 'react'
import 'material-symbols'
import { debugLog } from '../../lib/debug'
import { toast } from '../../lib/toast'

interface Props {
  open: boolean
  url: string
  type: 'image' | 'gif' | 'sticker'
  onClose: () => void
}

export default function MediaPreviewModal({ open, url, type, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (open) {
      debugLog({ source: 'media-preview', message: 'Modal opened', details: { type, url } })
      setLoading(true)
      setError(false)
    }
  }, [open, url, type])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      debugLog({ source: 'media-preview', message: 'Modal closed via ESC key' })
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      debugLog({ source: 'media-preview', message: 'Adding keyboard/overflow listeners' })
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  const handleDownload = async () => {
    if (!url) {
      debugLog({ level: 'error', source: 'media-preview', message: 'Download attempted but URL is empty' })
      return
    }
    debugLog({ source: 'media-preview', message: 'Starting download', details: { url, type } })

    try {
      // Fetch the file as a blob to force download (works for cross-origin too)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      debugLog({ source: 'media-preview', message: 'Fetched media blob, creating download', details: { size: blob.size } })

      const a = document.createElement('a')
      a.href = blobUrl
      const ext = url.includes('.gif') ? 'gif' : url.includes('.webp') ? 'webp' : 'png'
      a.download = `media-${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      debugLog({ source: 'media-preview', message: 'Download triggered successfully' })
      toast(`${type} saved!`)
      onClose()
    } catch (err) {
      debugLog({ level: 'error', source: 'media-preview', message: 'Blob download failed, falling back to window.open', details: { error: String(err) } })
      // Fallback: open in new tab (user can right-click save from there)
      window.open(url, '_blank')
      toast(`${type} opened in browser`)
      onClose()
    }
  }

  if (!open) return null

  const typeIcon = type === 'gif' ? 'gif_box' : type === 'sticker' ? 'sticker' : 'image'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{
          background: 'rgba(5, 8, 18, 0.92)',
          backdropFilter: 'blur(16px)',
        }}
        onClick={() => { debugLog({ source: 'media-preview', message: 'Modal closed via backdrop click' }); onClose() }}
      />

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{
          background: 'linear-gradient(180deg, rgba(5, 8, 18, 0.8) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'rgba(167, 139, 250, 0.9)' }}>
            {typeIcon}
          </span>
          <span className="text-xs font-display font-medium capitalize" style={{ color: 'rgba(196, 181, 253, 0.85)' }}>
            {type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Download button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(139, 92, 246, 0.85)',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}
            title="Download"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>
              download
            </span>
            <span className="text-xs font-display font-semibold" style={{ color: '#fff' }}>
              Download
            </span>
          </button>

          {/* Close button */}
          <button
            onClick={() => { debugLog({ source: 'media-preview', message: 'Modal closed via close button' }); onClose() }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
            title="Close (ESC)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(232, 234, 237, 0.9)' }}>
              close
            </span>
          </button>
        </div>
      </div>

      {/* Media container */}
      <div
        className="relative z-10 flex items-center justify-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'rgba(239, 68, 68, 0.7)' }}>
              broken_image
            </span>
            <p className="text-sm font-body" style={{ color: 'rgba(239, 68, 68, 0.8)' }}>
              Failed to load media
            </p>
          </div>
        ) : (
          <img
            src={url}
            alt={`${type} preview`}
            className="max-w-full max-h-[85vh] object-contain rounded-xl"
            style={{
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              display: loading ? 'none' : 'block',
            }}
            onLoad={() => { debugLog({ source: 'media-preview', message: 'Media loaded successfully' }); setLoading(false) }}
            onError={() => { debugLog({ level: 'error', source: 'media-preview', message: 'Failed to load media', details: { url, type } }); setLoading(false); setError(true) }}
          />
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                borderTopColor: 'rgba(139, 92, 246, 0.9)',
              }}
            >
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px', color: 'rgba(167, 139, 250, 0.9)' }}>
                progress_activity
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}