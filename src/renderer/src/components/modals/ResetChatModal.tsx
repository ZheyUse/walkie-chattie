import { useState } from "react"
import Modal from "../ui/Modal"

interface Props {
  spaceName: string
  onConfirm: () => Promise<void>
  onDone: () => void
  onClose: () => void
}

export default function ResetChatModal({ spaceName, onConfirm, onDone, onClose }: Props) {
  const [phase, setPhase] = useState<"confirm" | "loading" | "done">("confirm")

  const handleReset = async () => {
    setPhase("loading")
    try {
      await onConfirm()
    } catch {
      // stay on loading
    }
    setPhase("done")
  }

  return (
    <Modal open onClose={onClose} closable size="lg">
      <div className="flex flex-col items-center text-center py-2">
        {phase === "confirm" && (
          <>
            <div className="text-5xl mb-3">🗑️</div>
            <p className="text-shout font-display font-extrabold text-base mb-1">WARNING!!!</p>
            <p className="text-text-hi font-display font-bold text-base mb-6">
              All messages in<br /><span className="text-accent">{spaceName}</span><br />will be erased!!!
            </p>
            <div className="flex gap-2 w-full mt-1">
              <button onClick={onClose} className="flex-1 btn-primary text-sm py-2">Cancel</button>
              <button onClick={handleReset} className="flex-1 btn-shout text-sm py-2">Reset</button>
            </div>
          </>
        )}

        {phase === "loading" && (
          <>
            <div className="text-5xl mb-3 animate-pulse">🧹</div>
            <p className="text-shout font-display font-bold text-lg mb-4">Clearing messages...</p>
            <div className="w-full h-1 rounded-full bg-bg-surface overflow-hidden">
              <div className="h-full bg-shout animate-pulse w-full" />
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            <div className="text-5xl mb-3">✨</div>
            <p className="text-shout font-display font-bold text-lg mb-1">Space: {spaceName}</p>
            <p className="text-shout font-display font-extrabold text-xl mb-6">chat has been reset!</p>
            <button onClick={onDone} className="btn-primary text-sm py-2 px-8">OK</button>
          </>
        )}
      </div>
    </Modal>
  )
}