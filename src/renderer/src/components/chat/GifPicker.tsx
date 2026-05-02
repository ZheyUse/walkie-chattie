import { useState, useEffect, useRef } from 'react'
import { searchGifs, getTrendingGifs, type TenorGif } from '../../lib/tenor'
import { useChatStore } from '../../stores/chat.store'

interface Props { onClose: () => void }

export default function GifPicker({ onClose }: Props) {
  var _a = useState(''), q = _a[0], setQ = _a[1]
  var _b = useState([]), gifs = _b[0], setGifs = _b[1]
  var _c = useState(true), loading = _c[0], setLoading = _c[1]
  var debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  var setPendingGif = useChatStore(s => s.setPendingGif)

  useEffect(function() {
    getTrendingGifs(20).then(function(g) { setGifs(g); setLoading(false) })
  }, [])

  useEffect(function() {
    if (!q.trim()) { getTrendingGifs(20).then(function(g) { setGifs(g); setLoading(false) }); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(function() {
      setLoading(true)
      searchGifs(q, 20).then(function(g) { setGifs(g); setLoading(false) })
    }, 300)
    return function() { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  var select = function(g: TenorGif) {
    setPendingGif(g.url, g.preview || g.url)
    onClose()
  }

  useEffect(function() {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return function() { document.removeEventListener('keydown', h) }
  }, [onClose])

  return (
    <div className='absolute bottom-calc(100% + 8px) z-50 bg-bg-panel border border-border-md rounded-card shadow-2xl w-80 overflow-hidden'
         style={{ bottom: 'calc(100% + 8px)', left: '0' }}>
      <div className='p-2 border-b border-border-lo'>
        <input
          value={q}
          onChange={function(e) { setQ(e.target.value) }}
          placeholder='Search GIFs...'
          className='input-field text-sm'
          autoFocus
        />
      </div>
      <div className='grid grid-cols-2 gap-1 p-2 max-h-64 overflow-y-auto'>
        {loading && <div className='col-span-2 text-center text-text-lo text-xs py-4'>Searching...</div>}
        {gifs.map(function(g) {
          return <img key={g.id} src={g.preview || g.url} alt={g.title}
            onClick={function() { select(g) }}
            className='w-full aspect-square object-cover rounded cursor-pointer hover:ring-2 hover:ring-accent transition-all' />
        })}
        {!loading && gifs.length === 0 && <div className='col-span-2 text-center text-text-lo text-xs py-4'>No results</div>}
      </div>
    </div>
  )
}