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
    if (tooltipOpen) {
      setTooltipOpen(false)
      return
    }
    const r = avatarRef.current.getBoundingClientRect()
    const panelWidth = 240
    const panelHeight = 300 // approx height of your ProfileTooltip
    const gap = 12

    const left = r.right + gap                    // right of the sidebar
    const top = r.bottom - panelHeight            // bottom-aligned with avatar

    setTooltipPos({ top: Math.max(8, top), left })
    setTooltipOpen(true)
  }

  return (
    <div className="w-16 bg-bg-base border-r border-border-lo flex flex-col items-center py-3 gap-3">
      {/* Active space at top */}
      {currentSpace && (
        <div className="relative group">
          <button
            title={currentSpace.name}
            onClick={() => {/* already active */ }}
            onMouseEnter={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setHoveredSpaceId(currentSpace.id)
            }}
            onMouseLeave={() => setHoveredSpaceId(null)}
            className="w-12 h-12 rounded-xl bg-accent/20 border-2 border-accent flex items-center justify-center text-2xl transition-all">
            {currentSpace.avatar_emoji}
          </button>
          {hoveredSpaceId === currentSpace.id && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none">
              <div className="bg-bg-panel border border-border-md rounded-card shadow-2xl px-3 py-2 whitespace-nowrap">
                <p className="text-text-hi text-sm font-display font-semibold">{currentSpace.name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-8 h-px bg-border-lo" />

      {/* Other spaces */}
      {spaces.filter(s => s.id !== currentSpace?.id).map(space => (
        <div key={space.id} className="relative group">
          <button
            onClick={() => setSpace(space)}
            onMouseEnter={(e) => setHoveredSpaceId(space.id)}
            onMouseLeave={() => setHoveredSpaceId(null)}
            className="w-12 h-12 rounded-xl bg-bg-panel border border-border-md flex items-center justify-center text-2xl hover:rounded-lg transition-all hover:ring-2 hover:ring-accent/50">
            {space.avatar_emoji}
          </button>
          {hoveredSpaceId === space.id && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none">
              <div className="bg-bg-panel border border-border-md rounded-card shadow-2xl px-3 py-2 whitespace-nowrap">
                <p className="text-text-hi text-sm font-display font-semibold">{space.name}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add space button */}
      <button
        onClick={() => setJoinOrCreateModalOpen(true)}
        title="Join or Create Space"
        className="w-12 h-12 rounded-xl bg-bg-surface border border-border-md flex items-center justify-center text-2xl hover:rounded-lg transition-all hover:ring-2 hover:ring-accent/50 hover:text-accent">
        +
      </button>

      <div className="mt-auto" />

      {/* Profile footer */}
      <div ref={avatarRef} onClick={handleAvatarClick} className="cursor-pointer mt-1">
        <Avatar nickname={profile?.nickname || "?"} color={profile?.avatar_color || "#1a9fff"} size="sm" />
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