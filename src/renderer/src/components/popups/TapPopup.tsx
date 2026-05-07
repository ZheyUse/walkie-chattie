import 'material-symbols'
import { useState, useEffect } from "react"
import { playSound } from '../../lib/sounds'
import { debugLog } from '../../lib/debug'

interface PopupData { sender: string; message: string; gifUrl?: string; imageUrl?: string }

function getPopupData(): PopupData {
  try {
    const parts = window.location.hash.split("/")
    if (parts[1] === "popup" && parts[2]) {
      const data = JSON.parse(decodeURIComponent(parts[2]))
      debugLog({ source: "tap-popup", message: "[SUCCESS] PopupData parsed", details: { hasImageUrl: !!data.imageUrl, imageUrl: data.imageUrl, hasGifUrl: !!data.gifUrl, gifUrl: data.gifUrl } })
      return data
    }
  } catch(e) {
    debugLog({ level: "error", source: "tap-popup", message: "[ERROR] Failed to parse PopupData", details: e })
  }
  return { sender: "?", message: "" }
}

function getTapFontSize(message: string) {
  const len = message.length
  if (len <= 20) return "4.5vw"
  if (len <= 50) return "3.2vw"
  if (len <= 100) return "2.4vw"
  return "1.8vw"
}

export default function TapPopup() {
  const [data] = useState(getPopupData)
  const [countdown, setCountdown] = useState(5)
  const [imageLoading, setImageLoading] = useState(!!(data.imageUrl || data.gifUrl))

  const handleImageLoad = () => setImageLoading(false)

  // Play tap sound on mount
  useEffect(() => { playSound('tap') }, [])

  // Close on click anywhere in the popup
  useEffect(() => {
    function handleClick() {
      window.api.closePopup()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c - 1), 1000)
    const close = setTimeout(() => window.api.closePopup(), 5000)
    return () => { clearInterval(tick); clearTimeout(close) }
  }, [])

  return (
    <div
      id="tap-popup"
      className="h-screen w-screen"
      style={{ background: '#0a0c14' }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
          border: '2px solid rgba(139,92,246,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-8 py-5"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(167,139,250,0.85)' }}>lock</span>
          </div>
          <span className="font-display font-bold text-base uppercase tracking-widest" style={{ color: 'rgba(167,139,250,0.8)' }}>
            Tap
          </span>
          <div className="ml-auto flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'rgba(139,92,246,0.7)', boxShadow: '0 0 8px rgba(139,92,246,0.7)' }}
            />
            <span className="font-display text-sm" style={{ color: 'rgba(139,92,246,0.6)' }}>
              From {data.sender}
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-16 overflow-hidden">
          <p
            className="font-body text-center leading-relaxed"
            style={{
              fontSize: getTapFontSize(data.message),
              color: 'rgba(167,139,250,0.93)',
              fontStyle: 'italic',
              maxWidth: '92%',
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            }}
          >
            {data.message}
          </p>

          {data.imageUrl && (
            <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
              {imageLoading && (
                <div className="w-full h-64 flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.05)' }}>
                  <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'transparent' }} />
                </div>
              )}
              <img src={data.imageUrl} alt="Image" className="max-h-64 object-contain" style={{ display: imageLoading ? 'none' : 'block' }} onLoad={handleImageLoad} />
            </div>
          )}

          {data.gifUrl && (
            <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
              {imageLoading && (
                <div className="w-full h-64 flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.05)' }}>
                  <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(139,92,246,0.3)', borderTopColor: 'transparent' }} />
                </div>
              )}
              <img src={data.gifUrl} alt="GIF" className="max-h-64 object-contain" style={{ display: imageLoading ? 'none' : 'block' }} onLoad={handleImageLoad} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}
        >
          <span className="font-body text-sm" style={{ color: 'rgba(139,92,246,0.4)' }}>
            Auto-closes in {countdown}s · Click anywhere to dismiss
          </span>
          <span className="font-display text-base font-medium" style={{ color: 'rgba(139,92,246,0.7)' }}>
            — {data.sender}
          </span>
        </div>
      </div>
    </div>
  )
}