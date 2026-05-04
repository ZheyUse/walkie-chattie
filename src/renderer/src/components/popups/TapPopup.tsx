import { useState, useEffect } from "react"

interface PopupData { sender: string; message: string; gifUrl?: string }

function getPopupData(): PopupData {
  try {
    const parts = window.location.hash.split("/")
    if (parts[1] === "popup" && parts[2]) return JSON.parse(decodeURIComponent(parts[2]))
  } catch(e) {}
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

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c - 1), 1000)
    const close = setTimeout(() => window.api.closePopup(), 5000)
    return () => { clearInterval(tick); clearTimeout(close) }
  }, [])

  return (
    <div
      className="h-screen w-screen"
      style={{ background: '#0a0c14' }}
      onClick={() => window.api.closePopup()}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v0"/>
              <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/>
              <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/>
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
            </svg>
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

          {data.gifUrl && (
            <div className="mt-10 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.2)' }}>
              <img src={data.gifUrl} alt="GIF" className="max-h-64 object-contain" />
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