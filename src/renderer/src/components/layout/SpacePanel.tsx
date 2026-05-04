import { useState, useRef } from "react"
import { useSpaceStore } from "../../stores/space.store"
import { useAuthStore } from "../../stores/auth.store"
import Avatar from "../ui/Avatar"
import ProfileTooltip from "../ui/ProfileTooltip"

export default function SpacePanel() {
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const spaces = useSpaceStore(s => s.spaces)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setJoinOrCreateModalOpen = useSpaceStore(s => s.setJoinOrCreateModalOpen)
  const profile = useAuthStore(s => s.profile)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  const handleAvatarClick = () => {
    if (!avatarRef.current) return
    if (tooltipOpen) { setTooltipOpen(false); return }
    const r = avatarRef.current.getBoundingClientRect()
    const panelHeight = 300
    const gap = 12
    const left = r.right + gap
    const top = Math.max(8, r.bottom - panelHeight)
    setTooltipPos({ top, left })
    setTooltipOpen(true)
  }

  return (
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
          emoji={currentSpace.avatar_emoji}
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
          emoji={space.avatar_emoji}
          name={space.name}
          active={false}
          hovered={hoveredSpaceId === space.id}
          onMouseEnter={() => setHoveredSpaceId(space.id)}
          onMouseLeave={() => setHoveredSpaceId(null)}
          onClick={() => setSpace(space)}
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5v14" />
        </svg>
      </button>

      <div className="mt-auto" />

      {/* Profile footer */}
      <div ref={avatarRef} onClick={handleAvatarClick} className="cursor-pointer mt-1 rounded-xl p-0.5 transition-all duration-200 hover:bg-white/[0.06]">
        <Avatar nickname={profile?.nickname || "?"} color={profile?.avatar_color || "#8b5cf6"} size="sm" />
      </div>
      {tooltipOpen && (
        <ProfileTooltip
          onClose={() => setTooltipOpen(false)}
          top={tooltipPos.top}
          left={tooltipPos.left}
        />
      )}
    </div>
  )
}

interface SpaceOrbProps {
  emoji: string
  name: string
  active: boolean
  hovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
  tooltip: string
}

function SpaceOrb({ emoji, name, active, hovered, onMouseEnter, onMouseLeave, onClick, tooltip }: SpaceOrbProps) {
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
        <span className="relative z-10 text-lg leading-none drop-shadow-lg">{emoji}</span>
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