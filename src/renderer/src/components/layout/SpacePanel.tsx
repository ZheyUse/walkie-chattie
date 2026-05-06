import 'material-symbols'
import { useEffect, useState, useRef } from "react"
import { useSpaceStore } from "../../stores/space.store"
import { useAuthStore } from "../../stores/auth.store"
import Avatar from "../ui/Avatar"
import ProfileTooltip from "../ui/ProfileTooltip"
import ConfirmLogoutModal from "../modals/ConfirmLogoutModal"
import { debugLog } from "../../lib/debug"
import { spaceAvatarPath } from "../../lib/spaceAvatars"

export default function SpacePanel() {
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const spaces = useSpaceStore(s => s.spaces)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setJoinOrCreateModalOpen = useSpaceStore(s => s.setJoinOrCreateModalOpen)
  const profile = useAuthStore(s => s.profile)
  const signOut = useAuthStore(s => s.signOut)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const handleTooltipClosing = () => {
      debugLog({ source: "space-panel", message: "tooltip-closing event — setting suppressClickRef=true", details: {} })
      suppressClickRef.current = true
    }
    window.addEventListener('ui:tooltip-closing', handleTooltipClosing)
    return () => window.removeEventListener('ui:tooltip-closing', handleTooltipClosing)
  }, [])

  // Capture-phase click listener — fires BEFORE React's onClick (bubble phase).
  // This intercepts the closing-click and sets suppress before React processes it.
  useEffect(() => {
    const el = avatarRef.current
    if (!el) return
    const captureClick = (e: Event) => {
      debugLog({ source: "space-panel", message: "capture-phase click on avatar", details: { suppressBefore: suppressClickRef.current } })
      if (suppressClickRef.current) {
        e.stopPropagation()
        e.preventDefault()
        debugLog({ source: "space-panel", level: "error", message: "capture click BLOCKED — preventDefault+stopPropagation", details: {} })
      }
    }
    el.addEventListener('click', captureClick, true)
    return () => el.removeEventListener('click', captureClick, true)
  }, [])

  useEffect(() => {
    debugLog({ source: "space-panel", level: "warn", message: `tooltipOpen changed → ${tooltipOpen}`, details: {} })
    if (!tooltipOpen) {
      debugLog({ source: "space-panel", message: "tooltip closed — resetting suppressClickRef in 500ms", details: {} })
      window.setTimeout(() => {
        suppressClickRef.current = false
        debugLog({ source: "space-panel", message: "suppressClickRef reset to false — avatar clicks unblocked", details: {} })
      }, 500)
    }
  }, [tooltipOpen])

  const handleAvatarClick = () => {
    if (suppressClickRef.current) {
      debugLog({ source: "space-panel", level: "error", message: "handleAvatarClick BLOCKED — suppressClickRef is true (tooltip closing in progress)", details: {} })
      return
    }
    debugLog({ source: "space-panel", message: "handleAvatarClick fired — processing toggle", details: {} })
    if (avatarRef.current) {
      const r = avatarRef.current.getBoundingClientRect()
      const panelHeight = 300
      const gap = 12
      setTooltipPos({ top: Math.max(8, r.bottom - panelHeight), left: r.right + gap })
    }
    setTooltipOpen(prev => {
      const next = !prev
      debugLog({
        source: "space-panel",
        level: next ? "info" : "warn",
        message: next ? "handleAvatarClick → opening tooltip" : "handleAvatarClick → closing tooltip",
        details: { currentState: prev, nextState: next },
      })
      return next
    })
  }

  return (
    <>
      <div
        className="w-[64px] flex flex-col items-center py-3 gap-2 relative"
        style={{
          background: 'linear-gradient(180deg, rgba(26, 159, 255, 0.03) 0%, transparent 100%)',
          borderRight: '1px solid rgba(139, 92, 246, 0.08)',
        }}
      >
      {/* Active space orb */}
      {currentSpace && (
        <SpaceOrb
          avatarImg={currentSpace.avatar_emoji}
          name={currentSpace.name}
          active
          hovered={hoveredSpaceId === currentSpace.id}
          onMouseEnter={() => setHoveredSpaceId(currentSpace.id)}
          onMouseLeave={() => setHoveredSpaceId(null)}
          onClick={() => {}}
          tooltip={currentSpace.name}
        />
      )}

      {/* Divider */}
      <div className="w-8 h-px my-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.15), transparent)' }} />

      {/* Other spaces */}
      {spaces.filter(s => s.id !== currentSpace?.id).map(space => (
        <SpaceOrb
          key={space.id}
          avatarImg={space.avatar_emoji}
          name={space.name}
          active={false}
          hovered={hoveredSpaceId === space.id}
          onMouseEnter={() => setHoveredSpaceId(space.id)}
          onMouseLeave={() => setHoveredSpaceId(null)}
          onClick={() => { setSpace(space); localStorage.setItem('lastActiveSpaceId', space.id) }}
          tooltip={space.name}
        />
      ))}

      {/* Add space orb */}
      <button
        onClick={() => setJoinOrCreateModalOpen(true)}
        title="Join or Create Space"
        className="group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 hover:scale-105"
        style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
        onMouseEnter={e => {
          setHoveredSpaceId('add')
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.15)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(139, 92, 246, 0.2)'
        }}
        onMouseLeave={e => {
          setHoveredSpaceId(null)
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(139, 92, 246, 0.08)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'rgba(139,92,246,0.7)' }}>add</span>
      </button>

      <div className="mt-auto" />

      {/* Profile footer */}
      <div ref={avatarRef} onClick={handleAvatarClick} className="cursor-pointer mt-1 rounded-xl p-0.5 transition-all duration-200 hover:bg-white/[0.06]">
        <Avatar nickname={profile?.nickname || "?"} picture={profile?.picture} color={profile?.avatar_color || "#8b5cf6"} size="sm" />
      </div>
      {tooltipOpen && (
        <ProfileTooltip
          avatarRef={avatarRef}
          onClose={() => setTooltipOpen(false)}
          top={tooltipPos.top}
          left={tooltipPos.left}
          onRequestLogout={() => {
            setTooltipOpen(false)
            window.setTimeout(() => setShowLogoutConfirm(true), 0)
          }}
        />
      )}
      </div>

      {showLogoutConfirm && (
        <ConfirmLogoutModal
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={async () => {
            await signOut()
            setShowLogoutConfirm(false)
          }}
        />
      )}
    </>
  )
}

interface SpaceOrbProps {
  avatarImg: string
  name: string
  active: boolean
  hovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
  tooltip: string
}

function SpaceOrb({ avatarImg, name, active, hovered, onMouseEnter, onMouseLeave, onClick, tooltip }: SpaceOrbProps) {
  const glowColor = active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(26, 159, 255, 0.25)'
  const borderColor = active
    ? 'rgba(139, 92, 246, 0.5)'
    : hovered
    ? 'rgba(139, 92, 246, 0.3)'
    : 'rgba(255,255,255,0.08)'

  return (
    <div className="relative group">
      <button
        title={tooltip}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 hover:scale-105"
        style={{
          background: active
            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(26, 159, 255, 0.15) 100%)'
            : hovered
            ? 'rgba(26, 159, 255, 0.12)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${borderColor}`,
          boxShadow: hovered || active
            ? `0 0 16px 0 ${glowColor}, 0 4px 12px rgba(0,0,0,0.3)`
            : 'none',
        }}
      >
        {/* Inner orb gradient */}
        <div
          className="absolute inset-0 rounded-[10px] pointer-events-none"
          style={{
            background: active
              ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.1) 0%, transparent 60%)'
              : hovered
              ? 'radial-gradient(circle at 35% 35%, rgba(139,92,246,0.08) 0%, transparent 60%)'
              : 'none',
          }}
        />
        <img className="relative z-10 w-6 h-6 object-contain" src={spaceAvatarPath(avatarImg)} alt={name} />
      </button>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none">
          <div
            className="px-2.5 py-1.5 rounded-lg whitespace-nowrap"
            style={{
              background: 'rgba(20, 26, 46, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-text-hi text-xs font-display font-semibold">{name}</p>
            {active && <p className="text-accent-purple text-[10px] font-body">active</p>}
          </div>
        </div>
      )}
    </div>
  )
}