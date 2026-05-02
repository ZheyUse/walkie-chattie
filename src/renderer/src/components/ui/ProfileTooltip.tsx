import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import Avatar from './Avatar'

interface Props { top: number; left: number; onClose: () => void }

export default function ProfileTooltip({ top, left, onClose }: Props) {
  const { profile, user, signOut } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)

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
          <svg className="w-4 h-4 opacity-70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          Edit Profile
        </button>

        <button
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-md hover:bg-accent hover:text-white transition-colors text-left"
        >
          <svg className="w-4 h-4 opacity-70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          Settings
        </button>

        <div className="mx-1 my-0.5 h-px bg-border-lo" />

        <button
          onClick={async () => { await signOut(); onClose() }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors text-left"
        >
          <svg className="w-4 h-4 opacity-70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          Log Out
        </button>
      </div>
    </div>
  )
}