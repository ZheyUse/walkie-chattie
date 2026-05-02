import { useSpaceStore } from "../../stores/space.store"
import { useAuthStore } from "../../stores/auth.store"

function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-text-lo inline-block"
      style={{
        animation: `typingBounce 1.2s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
      }}
    />
  )
}

export default function TypingIndicator() {
  const typingUsers = useSpaceStore(s => s.typingUsers)
  const members = useSpaceStore(s => s.members)
  const user = useAuthStore(s => s.user)

  // Filter out self and turn IDs into nicknames
  const names = members
    .filter(m => m.user_id !== user?.id && typingUsers.has(m.user_id))
    .map(m => m.nickname)

  if (names.length === 0) return null

  let label: string
  if (names.length === 1) {
    label = `${names[0]} is typing...`
  } else if (names.length === 2) {
    label = `${names[0]} and ${names[1]} are typing...`
  } else {
    label = `${names.length}+ are typing...`
  }

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      <div className="px-4 py-1.5 flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 h-4">
          <TypingDot delay={0} />
          <TypingDot delay={160} />
          <TypingDot delay={320} />
        </div>
        <span className="text-text-lo text-xs italic">{label}</span>
      </div>
    </>
  )
}