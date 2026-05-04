import { useEffect, useRef } from 'react'
import type { Member } from '../../stores/space.store'

interface Props {
  query: string
  members: Member[]
  onSelect: (nickname: string) => void
  onClose: () => void
  top: number
  left: number
}

export default function WhisperSuggest({ query, members, onSelect, onClose, top, left }: Props) {
  var ref = useRef<HTMLDivElement>(null)
  var filtered = members.filter(function(m) { return m.nickname.toLowerCase().includes(query.toLowerCase()) }).slice(0, 5)

  useEffect(function() {
    var h = function(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return function() { document.removeEventListener('mousedown', h) }
  }, [onClose])

  useEffect(function() {
    function k(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    return function() { document.removeEventListener('keydown', k) }
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div ref={ref}
      className="absolute z-50 w-56 overflow-hidden"
      style={{
        bottom: 'calc(100% + 8px)',
        left: left + 'px',
        background: 'rgba(19,25,41,0.98)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
      }}>
      {filtered.map(function(m, i) {
        return (
          <button
            key={m.user_id}
            onMouseDown={function(e) { e.preventDefault(); onSelect(m.nickname) }}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/[0.04] transition-colors text-left"
            style={{ borderTop: i > 0 ? '1px solid rgba(139,92,246,0.06)' : 'none' }}
          >
            <div className="w-6 h-6 rounded-full text-xs font-display font-bold text-bg-deep flex items-center justify-center flex-shrink-0"
                style={{ background: m.avatar_color }}>
              {(m.nickname[0] || '?').toUpperCase()}</div>
            <span className="text-sm font-body flex-1 truncate" style={{ color: 'rgba(232,234,237,0.8)' }}>{m.nickname}</span>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', boxShadow: '0 0 4px rgba(139,92,246,0.5)' }} />
          </button>
        )
      })}
    </div>
  )
}