import { useEffect, useRef, useState } from 'react'
import type { Member } from '../../stores/space.store'

interface Props {
  query: string
  members: Member[]
  onSelect: (nickname: string) => void
  onClose: () => void
}

export default function WhisperSuggest({ query, members, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const queryLower = query.toLowerCase()
  const atAllMatch = 'all'.startsWith(queryLower)

  const filtered = members.filter(function(m) {
    const displayName = (m.display_name?.trim() || m.nickname).toLowerCase()
    return displayName.includes(queryLower)
  })

  // Full list including @all as virtual first item
  const allItems: Array<{ type: 'all'; label: string } | { type: 'member'; member: Member }> = []
  if (atAllMatch || queryLower === '') allItems.push({ type: 'all', label: '@all' })
  filtered.forEach(m => allItems.push({ type: 'member', member: m }))

  useEffect(() => { setSelectedIndex(0) }, [query])

  // Close on click outside
  useEffect(function() {
    var h = function(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return function() { document.removeEventListener('mousedown', h) }
  }, [onClose])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    const count = allItems.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, count - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    }
    // Tab is handled by ChatInput — do NOT handle here
    if (e.key === 'Tab') return
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      const item = allItems[selectedIndex]
      if (!item) return
      if (item.type === 'all') onSelect('__bold__@all')
      else onSelect(item.member.display_name?.trim() || item.member.nickname)
    }
  }

  if (allItems.length === 0) return null

  return (
    <div ref={ref}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 156,
        marginBottom: 8,
        zIndex: 50,
        width: 'max-content',
        minWidth: '16rem',
        maxWidth: '18rem',
        background: 'rgba(19,25,41,0.98)',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
      }}
      onKeyDown={handleKeyDown}
    >
      {allItems.map(function(item, i) {
        const isAll = item.type === 'all'
        const m = isAll ? null : item.member
        return (
          <button
            key={isAll ? '__all__' : m!.user_id}
            onMouseDown={function(e) {
              e.preventDefault()
              if (isAll) onSelect('__bold__@all')
              else onSelect(m!.display_name?.trim() || m!.nickname)
            }}
            onMouseEnter={() => setSelectedIndex(i)}
            className="w-full px-3 py-2 flex items-center gap-2 transition-colors text-left"
            style={{
              borderTop: i > 0 ? '1px solid rgba(139,92,246,0.06)' : 'none',
              background: i === selectedIndex ? 'rgba(139,92,246,0.18)' : 'transparent',
            }}
          >
            {isAll ? (
              <>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-[10px]"
                  style={{ background: 'rgba(34,197,94,0.2)', color: 'rgba(34,197,94,0.8)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  @
                </div>
                <span className="text-sm font-display font-bold flex-1" style={{ color: 'rgba(34,197,94,0.9)' }}>
                  all
                </span>
                <span className="text-[10px] font-body px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: 'rgba(34,197,94,0.6)' }}>
                  mentions everyone
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full text-xs font-display font-bold text-bg-deep flex items-center justify-center flex-shrink-0"
                  style={{ background: m!.avatar_color }}>
                  {(m!.nickname[0] || '?').toUpperCase()}</div>
                <span
                  className="text-sm font-body flex-1 truncate"
                  style={{ color: i === selectedIndex ? 'rgba(232,234,237,1)' : 'rgba(232,234,237,0.8)' }}
                >
                  {m!.display_name?.trim() || m!.nickname}
                </span>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  boxShadow: '0 0 4px rgba(139,92,246,0.5)',
                  opacity: i === selectedIndex ? 1 : 0.5,
                }} />
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}