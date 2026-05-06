import 'material-symbols'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import Avatar from './Avatar'
import { debugLog } from '../../lib/debug'

interface Props { top: number; left: number; onClose: () => void; onRequestLogout: () => void; avatarRef?: React.RefObject<HTMLDivElement | null> }

export default function ProfileTooltip({ top, left, onClose, onRequestLogout, avatarRef }: Props) {
  const { profile, user } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)
  const isAvatarClick = (el: HTMLElement) => avatarRef?.current?.contains(el) ?? false

  debugLog({ source: "profile-tooltip", message: "tooltip mounted — opened", details: { top, left, hasAvatarRef: !!avatarRef?.current } })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement
      const isInsideTooltip = ref.current && ref.current.contains(targetEl)
      const isAvatar = isAvatarClick(targetEl)
      debugLog({
        source: "profile-tooltip",
        message: isInsideTooltip ? "mousedown inside tooltip — ignoring" : isAvatar ? "mousedown on avatar — NOT closing tooltip" : "mousedown OUTSIDE tooltip — calling onClose",
        details: { target: targetEl.tagName, isInsideTooltip, isAvatar },
      })
      if (isInsideTooltip) return
      if (isAvatar) return
      window.dispatchEvent(new CustomEvent('ui:tooltip-closing'))
      onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [onClose])

  return (
    <div
      ref={ref}
      onClick={e => e.stopPropagation()}
      className="fixed z-50 w-60 bg-bg-panel border border-border-md rounded-card shadow-2xl overflow-hidden flex flex-col"
      style={{ top, left }}
    >
        {/* Banner */}
        <div className="h-16 bg-accent/40" />

        {/* Avatar — overlaps banner */}
        <div className="px-3 -mt-6 mb-2 flex items-end justify-between">
          <div className="ring-4 ring-bg-panel rounded-full">
            <Avatar nickname={profile?.nickname || '?'} picture={profile?.picture} color={profile?.avatar_color} size="md" />
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
              debugLog({ source: "profile-tooltip", message: "logout clicked — firing onRequestLogout", details: { target: (e.target as HTMLElement)?.tagName } })
              onRequestLogout()
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