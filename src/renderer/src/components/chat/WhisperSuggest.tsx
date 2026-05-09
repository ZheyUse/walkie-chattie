import { useEffect, useRef, useState } from 'react'
import type { Member } from '../../stores/space.store'

interface Props {
  query: string
  members: Member[]
  onSelect: (nickname: string) => void
  onClose: () => void
  onSelectedIndexChange: (index: number) => void
}

export default function WhisperSuggest({ query, members, onSelect, onClose, onSelectedIndexChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Use ref to always have current values (avoid closure staleness)
  const selectedIndexRef = useRef(selectedIndex)
  const onCloseRef = useRef(onClose)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  const queryLower = query.toLowerCase()
  const atAllMatch = 'all'.startsWith(queryLower)

  // Priority 1: Members matching by real nickname (higher priority)
  const nicknameMatches = members.filter(m =>
    m.nickname.toLowerCase().includes(queryLower)
  )

  // Priority 2: Members matching by display_name ONLY (not nickname) (lower priority)
  const displayNameMatches = members.filter(m =>
    !m.nickname.toLowerCase().includes(queryLower) &&
    m.display_name?.toLowerCase().includes(queryLower)
  )

  // Combined with priority ordering
  type ItemEntry = { type: 'member'; member: Member; matchType: 'nickname' | 'display' }
  const combinedItems: ItemEntry[] = [
    ...nicknameMatches.map(m => ({ type: 'member' as const, member: m, matchType: 'nickname' as const })),
    ...displayNameMatches.map(m => ({ type: 'member' as const, member: m, matchType: 'display' as const })),
  ]

  // Full list including @all as virtual first item
  const allItems: Array<{ type: 'all'; label: string } | { type: 'member'; member: Member; matchType: 'nickname' | 'display' }> = []
  if (atAllMatch || queryLower === '') allItems.push({ type: 'all', label: '@all' })
  combinedItems.forEach(item => allItems.push(item))

  // Keep allItems in ref to avoid stale closure in useEffect
  const allItemsRef = useRef(allItems)
  useEffect(() => { allItemsRef.current = allItems }, [allItems])

  useEffect(() => { setSelectedIndex(0) }, [query])

  // Notify parent of index changes for Enter/Tab handling
  useEffect(() => { onSelectedIndexChange(selectedIndex) }, [selectedIndex, onSelectedIndexChange])

  // Global keyboard navigation - use empty deps to run only once on mount
  useEffect(() => {
    console.log('[WhisperSuggest] Effect setup - listener added')
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const idx = selectedIndexRef.current
      const items = allItemsRef.current
      console.log('[WhisperSuggest] Key pressed:', e.key, '| idx:', idx, '| items length:', items.length)
      // Escape closes
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      // Arrow Down navigates down
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => {
          const newIdx = Math.min(i + 1, items.length - 1)
          console.log('[WhisperSuggest] ArrowDown: was', i, 'now', newIdx)
          return newIdx
        })
        return
      }
      // Arrow Up navigates up
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => {
          const newIdx = Math.max(i - 1, 0)
          console.log('[WhisperSuggest] ArrowUp: was', i, 'now', newIdx)
          return newIdx
        })
        return
      }
      // Enter: select currently highlighted item
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        console.log('[WhisperSuggest] Enter pressed! currentIdx:', idx, 'allItemsRef.current length:', allItemsRef.current.length)
        const item = items[idx]
        console.log('[WhisperSuggest] Item at idx:', item)
        if (!item) return
        if (item.type === 'all') {
          console.log('[WhisperSuggest] SELECTING @all')
          onSelectRef.current('__bold__@all')
        } else {
          // Use nickname if matched by nickname, otherwise use display_name
          const nameToSelect = item.matchType === 'display'
            ? item.member.display_name?.trim() || item.member.nickname
            : item.member.nickname
          console.log('[WhisperSuggest] SELECTING member:', nameToSelect)
          onSelectRef.current(nameToSelect)
        }
        return
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return function() {
      console.log('[WhisperSuggest] Effect cleanup - listener removed')
      document.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, []) // Empty deps - run once on mount, cleanup on unmount

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
      else {
        // Use nickname if matched by nickname, otherwise use display_name
        const nameToSelect = item.matchType === 'display'
          ? item.member.display_name?.trim() || item.member.nickname
          : item.member.nickname
        onSelect(nameToSelect)
      }
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
              else {
                // Use nickname if matched by nickname, otherwise use display_name
                const nameToSelect = item.matchType === 'display'
                  ? m!.display_name?.trim() || m!.nickname
                  : m!.nickname
                onSelect(nameToSelect)
              }
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
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-body truncate"
                    style={{ color: i === selectedIndex ? 'rgba(232,234,237,1)' : 'rgba(232,234,237,0.8)' }}
                  >
                    {m!.display_name?.trim() || m!.nickname}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs font-body truncate"
                      style={{ color: 'rgba(232,234,237,0.5)' }}
                    >
                      @{m!.nickname}
                    </span>
                    {item.matchType === 'display' && (
                      <span
                        className="text-[10px] font-body px-1 py-0.5 rounded"
                        style={{
                          background: 'rgba(139,92,246,0.15)',
                          color: 'rgba(139,92,246,0.7)',
                        }}
                      >
                        display name
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  boxShadow: '0 0 4px rgba(139,92,246,0.5)',
                  opacity: i === selectedIndex ? 1 : 0.5,
                  alignSelf: 'center',
                }} />
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}