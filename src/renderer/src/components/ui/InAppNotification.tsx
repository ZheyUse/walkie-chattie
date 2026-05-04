import 'material-symbols'
import { useState, useEffect, useRef, useCallback } from 'react'
import { onInAppNotification, type NotificationItem } from '../../lib/notifications'

const MAX_VISIBLE = 4
const AUTO_DISMISS_MS = 5000

function ProgressBar({ active }: { active: boolean }) {
  return (
    <div className='absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden' style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className='h-full rounded-r-xl transition-none'
        style={{
          background: 'linear-gradient(90deg, rgba(139,92,246,0.6), rgba(139,92,246,0.3))',
          animation: active ? `drain-bar ${AUTO_DISMISS_MS}ms linear forwards` : 'none',
        }}
      />
      <style>{`
        @keyframes drain-bar {
          from { width: 100% }
          to { width: 0% }
        }
      `}</style>
    </div>
  )
}

export default function InAppNotification() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [pausedId, setPausedId] = useState<number | null>(null)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
    clearTimeout(timersRef.current.get(id))
    timersRef.current.delete(id)
  }, [])

  useEffect(() => {
    const unsub = onInAppNotification((item) => {
      setItems(prev => {
        const next = [...prev, item]
        return next.slice(-MAX_VISIBLE)
      })

      // Auto-dismiss (pauses while hovered)
      const timer = setTimeout(() => remove(item.id), AUTO_DISMISS_MS)
      timersRef.current.set(item.id, timer)
    })
    return unsub
  }, [remove])

  if (items.length === 0) return null

  return (
    <div
      className='fixed bottom-6 right-6 z-[100] flex flex-col gap-2'
      onMouseLeave={() => setPausedId(null)}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className='relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer overflow-hidden'
          style={{
            width: '320px',
            background: 'rgba(19,25,41,0.97)',
            border: '1px solid rgba(139,92,246,0.18)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)',
            backdropFilter: 'blur(24px)',
            animation: 'slide-in-right 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          onClick={() => remove(item.id)}
          onMouseEnter={() => {
            setPausedId(item.id)
            const timer = timersRef.current.get(item.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(item.id)
            }
          }}
          onMouseLeave={() => {
            const current = timersRef.current.get(item.id)
            if (current) return
            const t = setTimeout(() => remove(item.id), AUTO_DISMISS_MS)
            timersRef.current.set(item.id, t)
            setPausedId(null)
          }}
        >
          <ProgressBar active={pausedId !== item.id} />

          {/* Avatar */}
          <div
            className='w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0'
            style={{
              background: `linear-gradient(135deg, ${item.avatarColor || '#8b5cf6'}dd, ${item.avatarColor || '#8b5cf6'}88)`,
              boxShadow: `0 0 8px ${item.avatarColor || '#8b5cf6'}44`,
            }}
          >
            <span
              className='font-display font-bold text-xs'
              style={{
                background: `linear-gradient(135deg, ${item.avatarColor || '#8b5cf6'}ff, ${item.avatarColor || '#8b5cf6'}cc)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {item.avatarInitials || 'WC'}
            </span>
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-display font-semibold leading-tight' style={{ color: 'rgba(232,234,237,0.95)' }}>
              {item.title}
            </p>
            <p className='text-xs font-body leading-tight mt-0.5 truncate' style={{ color: 'rgba(139,92,246,0.7)' }}>
              {item.body}
            </p>
          </div>

          {/* Dismiss */}
          <button
            className='flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
            style={{ color: 'rgba(90,100,120,0.5)' }}
            onClick={(e) => { e.stopPropagation(); remove(item.id) }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(24px) }
          to { opacity: 1; transform: translateX(0) }
        }
      `}</style>
    </div>
  )
}