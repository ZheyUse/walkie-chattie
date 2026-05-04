import { useState, useEffect } from "react"

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

export default function ShoutPopup() {
  const [data] = useState(getPopupData)
  const spaceName = data.spaceName || 'Space'
  const spaceIcon = data.spaceIcon || '📢'

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden relative"
      style={{ background: 'rgba(10,13,24,0.97)' }}
      onClick={() => window.api.closePopup()}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(232,101,42,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs leading-none border flex-shrink-0"
          style={{
            borderColor: 'rgba(232,101,42,0.3)',
            background: 'rgba(232,101,42,0.1)',
            color: 'rgba(232,101,42,0.8)',
          }}
        >
          {spaceIcon}
        </div>
        <span
          className="font-display font-bold text-sm tracking-wide"
          style={{ color: 'rgba(232,234,237,0.6)' }}
        >
          {spaceName}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'rgba(232,101,42,0.5)', boxShadow: '0 0 6px rgba(232,101,42,0.5)' }}
          />
          <span className="font-display text-xs uppercase tracking-widest" style={{ color: 'rgba(232,101,42,0.8)' }}>
            Shout
          </span>
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="font-display font-bold text-center leading-tight"
          style={{
            fontSize: 'clamp(24px, 5vw, 56px)',
            color: 'rgba(232,234,237,0.95)',
            maxWidth: '800px',
          }}
        >
          {data.message}
        </p>

        {data.gifUrl && (
          <div className="mt-8 rounded-xl overflow-hidden pointer-events-auto" style={{ border: '1px solid rgba(232,101,42,0.2)' }}>
            <img src={data.gifUrl} alt="GIF" className="max-h-48 object-contain" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 flex flex-col items-center gap-1 px-6 pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-body text-sm" style={{ color: 'rgba(232,101,42,0.5)' }}>
          — {data.sender}
        </span>
        <span className="font-body text-xs" style={{ color: 'rgba(232,101,42,0.3)' }}>
          Press anywhere to close
        </span>
      </div>
    </div>
  )
}