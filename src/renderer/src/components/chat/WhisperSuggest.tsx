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
    function k(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', k)
    return function() { document.removeEventListener('keydown', k) }
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div ref={ref}
      className='absolute z-50 bg-bg-panel border border-border-md rounded-card shadow-2xl w-56 overflow-hidden'
      style={{ bottom: 'calc(100% + 8px)', left: left + 'px' }}>
      {filtered.map(function(m) {
        return (
          <button
            key={m.user_id}
            onMouseDown={function(e) { e.preventDefault(); onSelect(m.nickname) }}
            className='w-full px-3 py-2 flex items-center gap-2 hover:bg-bg-hover transition-colors text-left'
          >
            <div className='w-6 h-6 rounded-full text-xs font-display font-bold text-bg-deep flex items-center justify-center flex-shrink-0'
                style={{ backgroundColor: m.avatar_color }}>
              {(m.nickname[0] || '?').toUpperCase()}</div>
            <span className='text-text-hi text-sm font-body flex-1 truncate'>{m.nickname}</span>
            <div className='w-2 h-2 rounded-full bg-success' />
          </button>
        )
      })}
    </div>
  )
}