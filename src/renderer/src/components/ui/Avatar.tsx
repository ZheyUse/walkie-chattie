interface AvatarProps {
  nickname: string
  picture?: string
  color?: string
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
  online?: boolean
  status?: "online" | "busy" | "dnd" | "offline"
}

const SZ = {
  sm: {
    outer: "w-8 h-8",
    inner: "w-7 h-7 text-[10px]",
    dot: "w-2.5 h-2.5 border-[1.5px]",
    img: "w-[26px] h-[26px]",
    ring: "group-sm",
  },
  md: {
    outer: "w-10 h-10",
    inner: "w-9 h-9 text-xs",
    dot: "w-3 h-3 border-2",
    img: "w-[34px] h-[34px]",
    ring: "group-md",
  },
  lg: {
    outer: "w-14 h-14",
    inner: "w-[52px] h-[52px] text-base",
    dot: "w-3.5 h-3.5 border-2",
    img: "w-[48px] h-[48px]",
    ring: "group-lg",
  },
}

function initials(n: string) {
  const p = n.trim().split(/[\s_-]+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase()
}

export default function Avatar({
  nickname,
  picture,
  color = "#8b5cf6",
  size = "md",
  showStatus = false,
  online = false,
  status,
}: AvatarProps) {
  const s = SZ[size]
  const hasPicture = Boolean(picture)
  const resolvedStatus = status ?? (online ? "online" : "offline")

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      {/* Gradient ring container */}
      <div
        className={`${s.outer} rounded-full flex items-center justify-center`}
        style={{
          background: hasPicture
            ? undefined
            : `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)`,
          boxShadow: `0 0 0 1.5px rgba(0,0,0,0.3)${hasPicture ? "" : `, 0 0 8px ${color}44`}`,
        }}
      >
        {/* Inner dark circle behind image/initials */}
        <div
          className={`${s.inner} rounded-full flex items-center justify-center overflow-hidden`}
          style={{ background: 'rgba(10, 14, 26, 0.9)' }}
        >
          {hasPicture ? (
            <img
              src={picture}
              alt={nickname}
              className={`${s.img} rounded-full object-cover`}
            />
          ) : (
            <span
              className="font-display font-bold"
              style={{
                background: `linear-gradient(135deg, ${color}ff 0%, ${color}cc 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {initials(nickname)}
            </span>
          )}
        </div>
      </div>

      {/* Status dot */}
      {showStatus && resolvedStatus !== "offline" && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-bg-base overflow-hidden flex items-center justify-center`}
          style={{
            background: resolvedStatus === "busy"
              ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
              : resolvedStatus === "dnd"
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22c55e, #4ade80)',
            boxShadow: resolvedStatus === "online"
              ? '0 0 6px #22c55e88'
              : resolvedStatus === "busy" || resolvedStatus === "dnd"
              ? '0 0 6px #f59e0b44'
              : 'none',
          }}
        >
          {resolvedStatus === "busy" && (
            <span className="material-symbols-outlined" style={{ fontSize: `${parseInt(s.dot)/2 + 1}px`, color: '#1c1410', lineHeight: 1 }}>bedtime</span>
          )}
          {resolvedStatus === "dnd" && (
            <span className="material-symbols-outlined" style={{ fontSize: `${parseInt(s.dot)/2}px`, color: '#fff', lineHeight: 1 }}>do_not_disturb_on</span>
          )}
        </div>
      )}
      {showStatus && resolvedStatus === "offline" && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-bg-base`}
          style={{ background: 'rgba(90,100,120,0.5)' }}
        />
      )}
    </div>
  )
}