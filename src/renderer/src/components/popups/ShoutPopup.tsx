import { useState } from "react"

interface PopupData { sender: string; message: string; gifUrl?: string }

function getPopupData(): PopupData {
  try {
    const parts = window.location.hash.split("/")
    if (parts[1] === "popup" && parts[2]) return JSON.parse(decodeURIComponent(parts[2]))
  } catch(e) {}
  return { sender: "?", message: "" }
}

function getScale(len: number) {
  if (len < 20) return 36
  if (len < 50) return 28
  if (len < 100) return 22
  return 18
}

export default function ShoutPopup() {
  const [data] = useState(getPopupData)
  const fontSize = getScale(data.message?.length || 0)

  return (
    <div className="h-screen bg-bg-deep flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(232,101,42,0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 100%, rgba(139,92,246,0.05) 0%, transparent 60%), #0a0e1a' }}>
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(232,101,42,0.2)',
          background: 'rgba(232,101,42,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Megaphone icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(232,101,42,0.15)', boxShadow: '0 0 12px rgba(232,101,42,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,101,42,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 18-5v12L3 13v-2z"/>
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
            </svg>
          </div>
          <span className="font-display font-bold text-2xl uppercase tracking-widest" style={{
            background: 'linear-gradient(90deg, #f97316 0%, #e8652a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>SHOUT</span>
          <span className="font-display text-sm" style={{ color: 'rgba(232,101,42,0.5)' }}>from {data.sender}</span>
        </div>
        <button
          onClick={() => window.api.closePopup()}
          className="text-sm rounded-lg px-3 py-1.5 transition-all duration-150"
          style={{ color: 'rgba(232,101,42,0.5)', background: 'rgba(232,101,42,0.08)', border: '1px solid rgba(232,101,42,0.15)' }}
        >
          × Dismiss
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div className="relative max-w-2xl text-center">
          {/* Glow backdrop */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'rgba(232,101,42,0.06)', filter: 'blur(32px)', transform: 'scale(1.2)' }} />
          <p
            className="relative font-display font-bold leading-tight"
            style={{
              fontSize: fontSize + 'px',
              background: 'linear-gradient(135deg, #f97316 0%, #e8652a 50%, #dc2626 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 16px rgba(232,101,42,0.5))',
            }}
          >
            {data.message}
          </p>
        </div>
        {data.gifUrl && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(232,101,42,0.2)', boxShadow: '0 0 24px rgba(232,101,42,0.15)' }}>
            <img src={data.gifUrl} alt="GIF" className="max-h-40 object-contain" />
          </div>
        )}
      </div>
    </div>
  )
}