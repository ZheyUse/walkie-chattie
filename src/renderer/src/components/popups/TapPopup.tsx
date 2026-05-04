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
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: 'transparent' }}
      onClick={() => window.api.closePopup()}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: '80vw',
          height: '80vh',
          background: '#0c0a18',
          border: '2px solid rgba(139,92,246,0.35)',
          borderRadius: '16px',
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
              <path d="M12 22c1.5 0 2-1 2-2.5S13.5 15 12 15s-2 2.5-2 2.5S10.5 22 12 22z"/>
              <path d="M12 15C9 15 7 12 7 9c0-1.5.5-3 2-4 .5-.5 1-.5 2-.5 1.5 0 3 1 3 3 0-2 1.5-3 3-3s3 .5 3 2c0 2-3 4-3 6"/>
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