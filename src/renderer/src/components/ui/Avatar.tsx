interface AvatarProps {
  nickname: string
  color?: string
  size?: "sm" | "md" | "lg"
  showStatus?: boolean
  online?: boolean
}

const SZ = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }

function initials(n: string) {
  const p = n.trim().split(/[s_-]+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase()
}

export default function Avatar({ nickname, color = "#1a9fff", size = "md", showStatus = false, online = false }: AvatarProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div className={SZ[size] + " rounded-full flex items-center justify-center font-display font-bold text-bg-deep flex-shrink-0"}
        style={{ backgroundColor: color }}>
        {initials(nickname)}
      </div>
      {showStatus && (
        <div className={"absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-base " + (online ? "bg-success" : "bg-text-lo")} />
      )}
    </div>
  )
}