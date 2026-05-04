import { useState, useEffect, useRef } from 'react'
import { searchStickers, getTrendingStickers, type GiphyGif } from '../../lib/giphy'
import { useChatStore } from '../../stores/chat.store'

export default function StickerPicker({ onClose }: { onClose: () => void }) {
  const setPendingGif = useChatStore(s => s.setPendingGif)
  const [q, setQ] = useState('')
  const [stickers, setStickers] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    getTrendingStickers(20).then(s => { setStickers(s); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      getTrendingStickers(20).then(s => { setStickers(s); setLoading(false) })
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      searchStickers(q, 20).then(s => { setStickers(s); setLoading(false) })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  function select(s: GiphyGif) {
    setPendingGif(s.url, s.preview || s.url)
    onClose()
  }

  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const accent = '139,92,246'

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl"
      style={{
        width: '300px',
        background: 'rgba(15,18,28,0.97)',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div className="p-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search GIPHY stickers..."
          className="input-field text-sm"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-1 p-2 max-h-64 overflow-y-auto">
        {loading && <div className="col-span-2 text-center text-xs py-4" style={{ color: `rgba(${accent},0.4)` }}>Searching...</div>}
        {stickers.map(s => (
          <img
            key={s.id}
            src={s.preview || s.url}
            alt={s.title}
            onClick={() => select(s)}
            className="w-full aspect-square object-cover rounded cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all"
          />
        ))}
        {!loading && stickers.length === 0 && (
          <div className="col-span-2 text-center text-xs py-4" style={{ color: 'rgba(90,100,120,0.4)' }}>No results</div>
        )}
      </div>
    </div>
  )
}