import { useEffect, useRef, useState } from 'react'
interface Command {
  id: string
  label: string
  description: string
}
const COMMANDS: Command[] = [
  { id: 'shout', label: '/shout', description: 'Broadcast to the entire space' },
  { id: 'tap', label: '/tap', description: 'Tap a user to send a private shout' },
  { id: 'kick', label: '/kick', description: 'Remove a member from this space (admin only)' },
  { id: 'all', label: '/all', description: 'Mention everyone in the space' },
  { id: 'nickname', label: '/nickname', description: 'Set your display name for this space' },
]
interface Props {
  query: string
  onSelect: (command: string) => void
  onClose: () => void
}
export default function CommandSuggest({ query, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const filtered = COMMANDS.filter((c) =>
    c.id.toLowerCase().startsWith(query.toLowerCase())
  )
  useEffect(() => { setSelectedIndex(0) }, [query])
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return function () { document.removeEventListener('mousedown', h) }
  }, [onClose])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        if (filtered[selectedIndex]) onSelect(filtered[selectedIndex].label)
      }
    }
    document.addEventListener('keydown', k)
    return function () { document.removeEventListener('keydown', k) }
  }, [filtered, selectedIndex, onSelect, onClose])
  if (filtered.length === 0) return null
  return (
    <div
      ref={ref}
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
    >
      {filtered.map(function (cmd, i) {
        return (
          <button
            key={cmd.id}
            onMouseDown={function (e) { e.preventDefault(); onSelect(cmd.label) }}
            onMouseEnter={() => setSelectedIndex(i)}
            className="w-full px-3 py-2 flex flex-col gap-0.5 transition-colors text-left"
            style={{
              borderTop: i > 0 ? '1px solid rgba(139,92,246,0.06)' : 'none',
              background: i === selectedIndex ? 'rgba(139,92,246,0.18)' : 'transparent',
            }}
          >
            <span
              className="text-sm font-body"
              style={{ color: i === selectedIndex ? 'rgba(232,234,237,1)' : 'rgba(232,234,237,0.8)' }}
            >
              {cmd.label}
            </span>
            <span
              className="text-xs font-body"
              style={{ color: i === selectedIndex ? 'rgba(196,181,253,0.9)' : 'rgba(139,92,246,0.6)' }}
            >
              {cmd.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}