import { useState } from "react"

interface Props {
  spaceName: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function DeleteSpaceModal({ spaceName, onConfirm, onClose }: Props) {
  const [phase, setPhase] = useState<"confirm" | "loading" | "nuked">("confirm")

  const handleNuke = async () => {
    setPhase("loading")
    try {
      await onConfirm()
    } finally {
      setPhase("nuked")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm" onClick={phase === "confirm" ? onClose : undefined} />
      <div className="relative z-10 bg-bg-panel border border-border-md rounded-modal p-6 w-80 shadow-2xl flex flex-col items-center text-center">
        {phase === "confirm" && (
          <>
            <div className="text-5xl mb-3">☢️</div>
            <p className="text-shout font-display font-extrabold text-base mb-1">WARNING!!!</p>
            <p className="text-text-hi font-display font-bold text-base mb-6">
              Space: {spaceName}
              <br />
              will be nuked!!!
            </p>

            <div className="flex gap-2 w-full">
              <button onClick={onClose} className="flex-1 btn-primary text-sm py-2">
                Cancel
              </button>
              <button onClick={handleNuke} className="flex-1 btn-shout text-sm py-2">
                Nuke it
              </button>
            </div>
          </>
        )}

        {phase === "loading" && (
          <>
            <div className="text-5xl mb-3 animate-pulse">💥</div>
            <p className="text-shout font-display font-bold text-lg mb-4">Nuking...</p>
            <div className="w-full h-1 rounded-full bg-bg-surface overflow-hidden">
              <div className="h-full bg-shout animate-pulse w-full" />
            </div>
          </>
        )}

        {phase === "nuked" && (
          <>
            <div className="text-5xl mb-3">💥</div>
            <p className="text-shout font-display font-bold text-lg mb-1">
              Space: {spaceName}
            </p>
            <p className="text-shout font-display font-extrabold text-xl mb-6">has been nuked!!!</p>

            <button onClick={onClose} className="btn-primary text-sm py-2 px-8">
              OK
            </button>
          </>
        )}
      </div>
    </div>
  )
}