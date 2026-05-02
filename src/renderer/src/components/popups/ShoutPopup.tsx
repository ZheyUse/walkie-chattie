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
  if (len < 20) return "text-2xl"
  if (len < 50) return "text-xl"
  if (len < 100) return "text-lg"
  return "text-base"
}

export default function ShoutPopup() {
  const [data] = useState(getPopupData)
  const scale = getScale(data.message?.length || 0)

  return (
    <div className="h-screen bg-bg-deep flex flex-col overflow-hidden">
      <div className="bg-shout px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white text-2xl uppercase tracking-wider">SHOUT</span>
          <span className="text-white/80 font-display text-sm">from {data.sender}</span>
        </div>
        <button onClick={() => window.api.closePopup()}
          className="text-white/70 hover:text-white text-sm rounded px-2 py-1 hover:bg-white/10">
          Dismiss
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
        <p className={"font-display font-bold text-shout " + scale}>{data.message}</p>
        {data.gifUrl && <img src={data.gifUrl} alt="GIF" className="max-h-40 rounded-lg object-contain" />}
      </div>
    </div>
  )
}