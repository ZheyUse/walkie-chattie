import 'material-symbols'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import Avatar from './Avatar'

interface Props { top: number; left: number; onClose: () => void; onRequestLogout?: () => void }

export default function ProfileTooltip({ top, left, onClose, onRequestLogout }: Props) {
  const { profile, user } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)
  const requestLogout = typeof onRequestLogout === 'function'
    ? onRequestLogout
    : () => window.dispatchEvent(new CustomEvent('ui:logout-request'))

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    // Delay so the click that opened it doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 w-60 bg-bg-panel border border-border-md rounded-card shadow-2xl overflow-hidden flex flex-col"
      style={{ top, left }}
    >
        {/* Banner */}
        <div className="h-16 bg-accent/40" />

        {/* Avatar — overlaps banner */}
        <div className="px-3 -mt-6 mb-2 flex items-end justify-between">
          <div className="ring-4 ring-bg-panel rounded-full">
            <Avatar nickname={profile?.nickname || '?'} color={profile?.avatar_color} size="md" />
          </div>
        </div>

        {/* Name + email */}
        <div className="px-3 pb-3">
          <p className="font-display font-semibold text-text-hi text-sm truncate">
            {profile?.nickname || 'You'}
          </p>
          <p className="text-text-lo text-xs truncate">{user?.email}</p>
        </div>

        <div className="mx-3 h-px bg-border-lo" />

        {/* Actions */}
        <div className="p-1.5 flex flex-col gap-0.5">
          <button
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-md hover:bg-accent hover:text-white transition-colors text-left"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_circle</span>
            Edit Profile
          </button>

          <button
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-md hover:bg-accent hover:text-white transition-colors text-left"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings</span>
            Settings
          </button>

          <div className="mx-1 my-0.5 h-px bg-border-lo" />

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              requestLogout()
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors text-left"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
            Log Out
          </button>
        </div>
    </div>
  )
}