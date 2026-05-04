import { useState } from "react"

interface PopupData { sender: string; message: string; gifUrl?: string }

function getPopupData(): PopupData {
  try {
    const parts = window.location.hash.split("/")
    if (parts[1] === "popup" && parts[2]) return JSON.parse(decodeURIComponent(parts[2]))
  } catch(e) {}
  return { sender: "?", message: "" }
}

export default function WhisperPopup() {
  const [data] = useState(getPopupData)

  return (
    <div className="h-screen bg-bg-deep flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(26,159,255,0.05) 0%, transparent 60%), #0a0e1a' }}>
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(139,92,246,0.2)',
          background: 'rgba(139,92,246,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Lock/Whisper icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.15)', boxShadow: '0 0 12px rgba(139,92,246,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <span className="font-display font-bold text-2xl uppercase tracking-widest" style={{
            background: 'linear-gradient(90deg, rgba(167,139,250,1) 0%, rgba(139,92,246,1) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>WHISPER</span>
          <span className="font-display text-sm" style={{ color: 'rgba(139,92,246,0.5)' }}>from {data.sender}</span>
        </div>
        <button
          onClick={() => window.api.closePopup()}
          className="text-sm rounded-lg px-3 py-1.5 transition-all duration-150"
          style={{ color: 'rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
        >
          × Dismiss
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div className="relative max-w-lg text-center">
          {/* Glow backdrop */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'rgba(139,92,246,0.06)', filter: 'blur(24px)', transform: 'scale(1.2)' }} />
          <p className="relative font-body text-lg italic leading-relaxed" style={{ color: 'rgba(167,139,250,0.85)' }}>
            "{data.message}"
          </p>
        </div>
        {data.gifUrl && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 0 24px rgba(139,92,246,0.15)' }}>
            <img src={data.gifUrl} alt="GIF" className="max-h-32 object-contain" />
          </div>
        )}
      </div>
    </div>
  )
}