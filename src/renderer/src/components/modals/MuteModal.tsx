import 'material-symbols'
import { useState } from 'react'

interface Option {
  label: string
  value: string
}

const OPTIONS: Option[] = [
  { label: 'For 15 minutes', value: '15m' },
  { label: 'For 1 hour', value: '1h' },
  { label: 'For 24 hours', value: '24h' },
  { label: 'Until I change it', value: 'forever' },
]

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[360px] rounded-2xl p-5"
        style={{ background: 'rgba(20,22,35,0.98)', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

interface Props {
  spaceName: string
  onConfirm: (value: string) => void
  onClose: () => void
}

export default function MuteModal({ spaceName, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(OPTIONS[0].value)

  const selectedLabel = OPTIONS.find(o => o.value === selected)?.label || ''

  return (
    <Modal onClose={onClose}>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
        style={{ color: 'rgba(232,234,237,0.4)' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
      </button>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'rgba(239,68,68,0.7)' }}>notifications_off</span>
        </div>
        <div>
          <h3 className="text-sm font-display font-semibold" style={{ color: 'rgba(232,234,237,0.95)' }}>Mute notifications</h3>
          <p className="text-[11px] font-body" style={{ color: 'rgba(232,234,237,0.5)' }}>{spaceName}</p>
        </div>
      </div>

      <p className="text-xs font-body mb-3" style={{ color: 'rgba(232,234,237,0.6)' }}>
        You'll still receive /shout and /tap notifications even when muted.
      </p>

      <div className="flex flex-col gap-1 mb-5">
        {OPTIONS.map(opt => (
          <label
            key={opt.value}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
            style={{ background: selected === opt.value ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)', border: selected === opt.value ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent' }}
          >
            <input
              type="radio"
              name="mute-duration"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="sr-only"
            />
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: `2px solid ${selected === opt.value ? 'rgba(139,92,246,0.8)' : 'rgba(232,234,237,0.2)'}` }}
            >
              {selected === opt.value && (
                <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(139,92,246,0.8)' }} />
              )}
            </div>
            <span className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.85)' }}>{opt.label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-sm font-display font-semibold transition-colors hover:bg-white/[0.06]"
          style={{ color: 'rgba(232,234,237,0.6)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(selected); onClose() }}
          className="flex-1 py-2 rounded-xl text-sm font-display font-semibold transition-all"
          style={{ background: 'rgba(139,92,246,0.2)', color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(139,92,246,0.3)' }}
        >
          Mute ({selectedLabel})
        </button>
      </div>
    </Modal>
  )
}