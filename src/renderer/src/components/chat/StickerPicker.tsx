import { useState, useEffect, useRef, useCallback } from 'react'

// Emoji-combo "stickers" — simple and fun replacements for real sticker packs
const STICKER_CATEGORIES: Record<string, { emoji: string; label: string }[]> = {
  'Reactions': [
    { emoji: '🔥', label: 'fire' }, { emoji: '💯', label: '100' }, { emoji: '😂', label: 'laugh' },
    { emoji: '❤️', label: 'heart' }, { emoji: '🎉', label: 'party' }, { emoji: '💀', label: 'dead' },
    { emoji: '👀', label: 'eyes' }, { emoji: '🙌', label: 'hands' }, { emoji: '🤔', label: 'think' },
    { emoji: '😤', label: 'angry' }, { emoji: '🥺', label: 'plead' }, { emoji: '😎', label: 'cool' },
    { emoji: '😭', label: 'cry' }, { emoji: '😳', label: 'blush' }, { emoji: '🤫', label: 'shh' },
    { emoji: '💅', label: 'no care' }, { emoji: '😱', label: 'shock' }, { emoji: '🥳', label: 'celebrate' },
  ],
  'Animals': [
    { emoji: '🐶', label: 'dog' }, { emoji: '🐱', label: 'cat' }, { emoji: '🐭', label: 'mouse' },
    { emoji: '🦊', label: 'fox' }, { emoji: '🐻', label: 'bear' }, { emoji: '🐼', label: 'panda' },
    { emoji: '🐨', label: 'koala' }, { emoji: '🦁', label: 'lion' }, { emoji: '🐯', label: 'tiger' },
    { emoji: '🐸', label: 'frog' }, { emoji: '🐵', label: 'monkey' }, { emoji: '🦄', label: 'unicorn' },
    { emoji: '🐰', label: 'rabbit' }, { emoji: '🐷', label: 'pig' }, { emoji: '🐸', label: 'frog' },
    { emoji: '🦋', label: 'butterfly' }, { emoji: '🐢', label: 'turtle' }, { emoji: '🦎', label: 'lizard' },
  ],
  'Sports': [
    { emoji: '⚽', label: 'soccer' }, { emoji: '🏀', label: 'basketball' }, { emoji: '🏈', label: 'football' },
    { emoji: '🎾', label: 'tennis' }, { emoji: '⚾', label: 'baseball' }, { emoji: '🏐', label: 'volleyball' },
    { emoji: '🏏', label: 'cricket' }, { emoji: '🎱', label: 'pool' }, { emoji: '🏓', label: 'ping pong' },
    { emoji: '🥊', label: 'boxing' }, { emoji: '⛳', label: 'golf' }, { emoji: '🏊', label: 'swimming' },
    { emoji: '🚴', label: 'cycling' }, { emoji: '🏋️', label: 'weights' }, { emoji: '🤸', label: 'gymnastics' },
    { emoji: '⛷️', label: 'skiing' }, { emoji: '🏌️', label: 'golf swing' }, { emoji: '🎯', label: 'bullseye' },
  ],
  'Objects': [
    { emoji: '🎁', label: 'gift' }, { emoji: '🎈', label: 'balloon' }, { emoji: '🎀', label: 'ribbon' },
    { emoji: '🏆', label: 'trophy' }, { emoji: '🥇', label: 'gold medal' }, { emoji: '👑', label: 'crown' },
    { emoji: '💎', label: 'diamond' }, { emoji: '🔮', label: 'crystal ball' }, { emoji: '🎯', label: 'target' },
    { emoji: '🎮', label: 'gamepad' }, { emoji: '🕹️', label: 'joystick' }, { emoji: '🎲', label: 'dice' },
    { emoji: '🎸', label: 'guitar' }, { emoji: '🎤', label: 'mic' }, { emoji: '🎧', label: 'headphones' },
    { emoji: '📱', label: 'phone' }, { emoji: '💻', label: 'laptop' }, { emoji: '⌚', label: 'watch' },
  ],
}

const ALL_STICKERS = Object.values(STICKER_CATEGORIES).flat()

interface Props {
  onClose: () => void
  onInsert: (emoji: string) => void
}

export default function StickerPicker({ onClose, onInsert }: Props) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  return (
    <div
      className="absolute z-50 bg-bg-panel border border-border-md rounded-card shadow-2xl w-80 overflow-hidden"
      style={{ bottom: 'calc(100% + 8px)', left: 0 }}
    >
      <div className="p-2 border-b border-border-lo">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search stickers..."
          className="input-field text-sm"
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-2">
        {q.trim() ? (
          <div className="grid grid-cols-4 gap-1">
            {ALL_STICKERS.filter(s =>
              s.label.toLowerCase().includes(q.toLowerCase())
            ).map((s) => (
              <button
                key={s.emoji + s.label}
                onClick={() => { onInsert(s.emoji); onClose() }}
                className="aspect-square flex flex-col items-center justify-center rounded-lg hover:bg-bg-hover transition-colors text-2xl"
                title={s.label}
              >
                {s.emoji}
              </button>
            ))}
            {ALL_STICKERS.filter(s => s.label.toLowerCase().includes(q.toLowerCase())).length === 0 && (
              <div className="col-span-4 text-center text-text-lo text-xs py-4">No stickers found</div>
            )}
          </div>
        ) : (
          Object.entries(STICKER_CATEGORIES).map(([cat, stickers]) => (
            <div key={cat} className="mb-3">
              <p className="text-text-lo text-xs font-body uppercase tracking-wider mb-1 px-1">{cat}</p>
              <div className="grid grid-cols-6 gap-0.5">
                {stickers.map((s) => (
                  <button
                    key={s.emoji + s.label}
                    onClick={() => { onInsert(s.emoji); onClose() }}
                    className="aspect-square flex items-center justify-center rounded hover:bg-bg-hover transition-colors text-xl"
                    title={s.label}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
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