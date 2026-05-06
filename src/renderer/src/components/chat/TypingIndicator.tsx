import { useSpaceStore } from "../../stores/space.store"
import { useAuthStore } from "../../stores/auth.store"

function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full inline-block"
      style={{
        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
        animation: `typingBounce 1.2s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
        boxShadow: '0 0 4px rgba(139,92,246,0.4)',
      }}
    />
  )
}

export default function TypingIndicator() {
  const typingUsers = useSpaceStore(s => s.typingUsers)
  const members = useSpaceStore(s => s.members)
  const user = useAuthStore(s => s.user)

  const names = members
    .filter(m => m.user_id !== user?.id && typingUsers.has(m.user_id))
    .map(m => m.nickname)

  if (names.length === 0) return null

  let label: string
  if (names.length === 1) label = `${names[0]} is typing`
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing`
  else label = `${names.length} people are typing`

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
      {/* Outer wrapper — no layout impact, just anchors the absolute child */}
      <div className="relative h-4 px-4">
        {/* Floating pill — absolute, floats above the chat input */}
        <div
          className="absolute bottom-full right-0 mb-1 flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{
            background: 'rgba(20, 26, 46, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center gap-0.5 h-4">
            <TypingDot delay={0} />
            <TypingDot delay={160} />
            <TypingDot delay={320} />
          </div>
          <span className="text-xs italic" style={{ color: 'rgba(139,92,246,0.6)' }}>{label}</span>
        </div>
      </div>
    </>
  )
}
