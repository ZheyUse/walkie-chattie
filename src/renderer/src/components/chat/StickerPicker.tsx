import { useState, useEffect, useRef, useCallback } from 'react'

const STICKER_CATEGORIES: Record<string, { emoji: string; label: string }[]> = {
  'Cosmic': [
    { emoji: '🚀', label: 'rocket' }, { emoji: '🛸', label: 'ufo' }, { emoji: '🪐', label: 'planet' },
    { emoji: '⭐', label: 'star' }, { emoji: '🌌', label: 'galaxy' }, { emoji: '🌙', label: 'moon' },
    { emoji: '💫', label: 'sparkle' }, { emoji: '✨', label: 'glitter' }, { emoji: '🔭', label: 'telescope' },
    { emoji: '🛰️', label: 'satellite' }, { emoji: '☄️', label: 'comet' }, { emoji: '🌠', label: 'meteor' },
    { emoji: '👽', label: 'alien' }, { emoji: '👾', label: 'retro alien' }, { emoji: '🤖', label: 'robot' },
    { emoji: '🔮', label: 'crystal' }, { emoji: '💎', label: 'gem' }, { emoji: '⚡', label: 'energy' },
  ],
  'Reactions': [
    { emoji: '🔥', label: 'fire' }, { emoji: '💯', label: '100' }, { emoji: '😂', label: 'laugh' },
    { emoji: '❤️', label: 'heart' }, { emoji: '🎉', label: 'party' }, { emoji: '💀', label: 'dead' },
    { emoji: '👀', label: 'eyes' }, { emoji: '🙌', label: 'hands' }, { emoji: '🤔', label: 'think' },
    { emoji: '😤', label: 'angry' }, { emoji: '😎', label: 'cool' }, { emoji: '😭', label: 'cry' },
    { emoji: '🥳', label: 'celebrate' }, { emoji: '😱', label: 'shock' }, { emoji: '🫶', label: 'respect' },
    { emoji: '🤝', label: 'deal' }, { emoji: '👏', label: 'clap' }, { emoji: '😌', label: 'relief' },
  ],
  'Objects': [
    { emoji: '💎', label: 'diamond' }, { emoji: '🔮', label: 'crystal ball' }, { emoji: '🎯', label: 'target' },
    { emoji: '🎮', label: 'gamepad' }, { emoji: '🎲', label: 'dice' }, { emoji: '🎸', label: 'guitar' },
    { emoji: '🎤', label: 'mic' }, { emoji: '🎧', label: 'headphones' }, { emoji: '📱', label: 'phone' },
    { emoji: '💻', label: 'laptop' }, { emoji: '⌚', label: 'watch' }, { emoji: '🔑', label: 'key' },
    { emoji: '🛡️', label: 'shield' }, { emoji: '⚔️', label: 'swords' }, { emoji: '🏆', label: 'trophy' },
    { emoji: '👑', label: 'crown' }, { emoji: '📡', label: 'antenna' }, { emoji: '💰', label: 'money' },
  ],
}

const ALL_STICKERS = [...new Set(Object.values(STICKER_CATEGORIES).flat())]

export default function StickerPicker({ onClose, onInsert }: { onClose: () => void; onInsert: (emoji: string) => void }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  const [activeCategory, setActiveCategory] = useState('Cosmic')

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl"
      style={{
        width: '300px',
        background: 'linear-gradient(135deg, rgba(19,25,41,0.98) 0%, rgba(13,17,27,0.98) 100%)',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.05)',
      }}
    >
      {/* Search */}
      <div className="p-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(90,100,120,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search stickers..."
            className="input-field text-sm pl-8"
            style={{ paddingLeft: '2rem' }}
          />
        </div>
      </div>

      {/* Category tabs */}
      {!q.trim() && (
        <div className="flex gap-1 px-2 pt-2 pb-0">
          {Object.keys(STICKER_CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all duration-150"
              style={{
                background: activeCategory === cat ? 'rgba(139,92,246,0.2)' : 'transparent',
                color: activeCategory === cat ? 'rgba(167,139,250,0.9)' : 'rgba(90,100,120,0.5)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="max-h-56 overflow-y-auto p-2">
        {q.trim() ? (
          <div className="grid grid-cols-6 gap-0.5">
            {ALL_STICKERS.filter(s => s.label.toLowerCase().includes(q.toLowerCase())).map((s) => (
              <button
                key={s.emoji}
                onClick={() => { onInsert(s.emoji); onClose() }}
                className="aspect-square flex flex-col items-center justify-center rounded-lg transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                title={s.label}
              >
                <span className="text-lg leading-none">{s.emoji}</span>
              </button>
            ))}
            {ALL_STICKERS.filter(s => s.label.toLowerCase().includes(q.toLowerCase())).length === 0 && (
              <div className="col-span-6 text-center text-xs py-4" style={{ color: 'rgba(90,100,120,0.4)' }}>
                No stickers found
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Category header */}
            <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5 px-1" style={{ color: 'rgba(139,92,246,0.4)' }}>
              {activeCategory}
            </div>
            <div className="grid grid-cols-6 gap-0.5">
              {[...new Map((STICKER_CATEGORIES[activeCategory] || []).map(s => [s.emoji, s])).values()].map((s) => (
                <button
                  key={s.emoji}
                  onClick={() => { onInsert(s.emoji); onClose() }}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg transition-all duration-150 hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid transparent' }}
                  title={s.label}
                >
                  <span className="text-lg leading-none">{s.emoji}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function insertSticker(textarea: HTMLTextAreaElement | null, emoji: string) {
  if (!textarea) return
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const val = textarea.value
  const next = val.slice(0, start) + emoji + ' ' + val.slice(end)
  nativeInputValueSetter?.call(textarea, next)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.selectionStart = textarea.selectionEnd = start + emoji.length + 1
}