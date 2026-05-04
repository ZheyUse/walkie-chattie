interface AvatarProps {
  nickname: string
  color?: string
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
  online?: boolean
}

const SZ = {
  sm: { outer: "w-8 h-8", inner: "w-7 h-7 text-[10px]", dot: "w-2.5 h-2.5 border-[1.5px]" },
  md: { outer: "w-10 h-10", inner: "w-9 h-9 text-xs", dot: "w-3 h-3 border-2" },
  lg: { outer: "w-14 h-14", inner: "w-[52px] h-[52px] text-base", dot: "w-3.5 h-3.5 border-2" },
}

function initials(n: string) {
  const p = n.trim().split(/[\s_-]+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase()
}

export default function Avatar({ nickname, color = "#8b5cf6", size = "md", showStatus = false, online = false }: AvatarProps) {
  const s = SZ[size]
  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      {/* Gradient ring */}
      <div
        className={`${s.outer} rounded-full flex items-center justify-center`}
        style={{
          background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)`,
          boxShadow: `0 0 0 1.5px rgba(0,0,0,0.3), 0 0 8px ${color}44`,
        }}
      >
        {/* Inner circle with dark background */}
        <div
          className={`${s.inner} rounded-full flex items-center justify-center`}
          style={{ background: 'rgba(10, 14, 26, 0.9)' }}
        >
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
        </div>
      </div>

      {/* Status dot */}
      {showStatus && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-bg-base`}
          style={{
            background: online
              ? `linear-gradient(135deg, #22c55e, #4ade80)`
              : 'rgba(90,100,120,0.5)',
            boxShadow: online ? `0 0 6px #22c55e88` : 'none',
          }}
        />
      )}
    </div>
  )
}