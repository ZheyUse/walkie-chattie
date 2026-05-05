import { useState, useEffect } from "react"
import { playSound } from '../../lib/sounds'

interface PopupData {
  sender: string
  message: string
  gifUrl?: string
  spaceName?: string
  spaceIcon?: string
}

function getPopupData(): PopupData {
  try {
    const parts = window.location.hash.split("/")
    if (parts[1] === "popup" && parts[2]) return JSON.parse(decodeURIComponent(parts[2]))
  } catch(e) {}
  return { sender: "?", message: "" }
}

function getShoutFontSize(message: string) {
  const len = message.length
  if (len <= 10) return "10vw"
  if (len <= 25) return "7.5vw"
  if (len <= 50) return "5.5vw"
  if (len <= 90) return "4.2vw"
  if (len <= 140) return "3.2vw"
  return "2.5vw"
}

export default function ShoutPopup() {
  const [data] = useState(getPopupData)
  const spaceName = data.spaceName || 'Space'
  const spaceIcon = data.spaceIcon || '📢'
  const [countdown, setCountdown] = useState(5)

  // Play shout sound on mount
  useEffect(() => { playSound('shout') }, [])

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
      id="shout-popup"
      className="h-screen w-screen"
      style={{ background: '#0a0c14' }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
          border: '2px solid rgba(232,101,42,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-8 py-5"
          style={{ borderBottom: '1px solid rgba(232,101,42,0.15)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(232,101,42,0.1)',
              border: '1px solid rgba(232,101,42,0.3)',
              color: 'rgba(232,234,237,0.9)',
              fontSize: '16px',
            }}
          >
            {spaceIcon}
          </div>
          <span
            className="font-display font-bold text-base tracking-wide"
            style={{ color: 'rgba(232,234,237,0.6)' }}
          >
            {spaceName}
          </span>
          <div className="ml-auto flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'rgba(232,101,42,0.7)', boxShadow: '0 0 8px rgba(232,101,42,0.7)' }}
            />
            <span className="font-display text-sm uppercase tracking-widest" style={{ color: 'rgba(232,101,42,0.8)' }}>
              Shout
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-16 overflow-hidden">
          <p
            className="font-display font-black text-center leading-none"
            style={{
              fontSize: getShoutFontSize(data.message),
              color: 'rgba(232,234,237,0.97)',
              maxWidth: '92%',
              letterSpacing: '-0.02em',
              wordBreak: 'break-word',
            }}
          >
            {data.message}
          </p>

          {data.gifUrl && (
            <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(232,101,42,0.2)' }}>
              <img src={data.gifUrl} alt="GIF" className="max-h-64 object-contain" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{ borderTop: '1px solid rgba(232,101,42,0.15)' }}
        >
          <span className="font-body text-sm" style={{ color: 'rgba(232,101,42,0.4)' }}>
            Auto-closes in {countdown}s · Click anywhere to dismiss
          </span>
          <span className="font-display text-base font-medium" style={{ color: 'rgba(232,101,42,0.7)' }}>
            — {data.sender}
          </span>
        </div>
      </div>
    </div>
  )
}