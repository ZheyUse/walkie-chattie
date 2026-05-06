import 'material-symbols'
import { useState } from 'react'
import Modal from '../ui/Modal'

interface Props {
  spaceName: string
  onConfirm: () => Promise<void>
  onDeleted: () => void
  onClose: () => void
}

function IconContainer({ icon, danger }: { icon: string; danger?: boolean }) {
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
      style={{
        background: danger
          ? 'linear-gradient(135deg, rgba(232,101,42,0.2), rgba(232,101,42,0.08))'
          : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(26,159,255,0.1))',
        border: `1px solid ${danger ? 'rgba(232,101,42,0.25)' : 'rgba(139,92,246,0.2)'}`,
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '32px', color: danger ? 'rgba(232,101,42,0.85)' : 'rgba(167,139,250,0.85)' }}
      >
        {icon}
      </span>
    </div>
  )
}

export default function DeleteSpaceModal({ spaceName, onConfirm, onDeleted, onClose }: Props) {
  const [phase, setPhase] = useState<'confirm' | 'loading' | 'nuked'>('confirm')

  const handleNuke = async () => {
    setPhase('loading')
    try {
      await onConfirm()
    } catch {
      // stay on loading, user can close manually
    }
    setPhase('nuked')
  }

  return (
    <Modal open size="md">
      <div className="flex flex-col items-center text-center px-2 py-4">

        {phase === 'confirm' && (
          <>
            <IconContainer icon="warning" danger />
            <p className="text-shout font-display font-extrabold text-sm tracking-wider uppercase mb-1">Destructive Action</p>
            <p className="text-text-hi font-display font-bold text-base mb-1">
              Nuke space
            </p>
            <p className="text-text-lo font-body text-sm mb-6">
              <span className="text-shout font-semibold">{spaceName}</span> will be permanently nuked along with all messages and members.
            </p>
            <p className="text-text-lo text-xs mb-5 px-2" style={{ color: 'rgba(160,170,184,0.5)' }}>
              This action cannot be undone.
            </p>
            <div className="flex gap-2 w-full mt-1">
              <button onClick={onClose} className="flex-1 btn-primary text-sm py-2.5">Cancel</button>
              <button onClick={handleNuke} className="flex-1 text-sm py-2.5 font-display font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                style={{ background: 'linear-gradient(135deg, #e8652a, #c54d1a)', boxShadow: '0 4px 16px rgba(232,101,42,0.3)' }}>
                Nuke Space
              </button>
            </div>
          </>
        )}

        {phase === 'loading' && (
          <>
            <IconContainer icon="sync" danger />
            <p className="text-shout font-display font-bold text-base mb-2">Nuking space...</p>
            <p className="text-text-lo font-body text-xs mb-5" style={{ color: 'rgba(160,170,184,0.5)' }}>
              Removing members and all data
            </p>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #e8652a, #c54d1a)', animation: 'loading-bar 1.5s ease-in-out infinite' }}
              />
            </div>
          </>
        )}

        {phase === 'nuked' && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(77,179,94,0.2), rgba(77,179,94,0.08))',
                border: '1px solid rgba(77,179,94,0.25)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgba(77,179,94,0.85)' }}>
                check_circle
              </span>
            </div>
            <p className="text-text-hi font-display font-bold text-base mb-1">{spaceName}</p>
            <p className="text-success font-display font-extrabold text-lg mb-6">has been nuked</p>
            <button onClick={onDeleted} className="btn-primary text-sm py-2 px-8">Done</button>
          </>
        )}
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 100%; }
        }
      `}</style>
    </Modal>
  )
}