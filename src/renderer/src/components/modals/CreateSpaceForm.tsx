import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import { generateId } from "../../lib/id-gen"

const AVATAR_EMOJIS = [
  "🚀", "🛸", "🌌", "⭐", "🌙", "🪐",
  "🔮", "💎", "⚡", "🔥", "🎯", "🎮",
  "🛡️", "🔭", "🌊", "⚔️",
]

export default function CreateSpaceForm() {
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setSpaces = useSpaceStore(s => s.setSpaces)
  const setMembers = useSpaceStore(s => s.setMembers)
  const setJoinOrCreateModalOpen = useSpaceStore(s => s.setJoinOrCreateModalOpen)

  const [name, setName] = useState("")
  const [spaceId] = useState(generateId())
  const [emojiIdx, setEmojiIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile || !name.trim()) return
    setLoading(true)
    setError("")

    const emoji = AVATAR_EMOJIS[emojiIdx]
    const space = { id: spaceId, name: name.trim(), avatar_emoji: emoji, owner_id: user.id, context_window_limit: 12000, context_window_used: 0 }
    const { error: spaceErr } = await supabase.from("spaces").insert(space)
    if (spaceErr) { setError(spaceErr.message || "Failed to create Space."); setLoading(false); return }

    const { error: memberErr } = await supabase.from("space_members").insert({ space_id: spaceId, user_id: user.id, role: "admin" })
    if (memberErr) { setError(memberErr.message); setLoading(false); return }

    setSpace(space)
    setJoinOrCreateModalOpen(false)

    if (user) {
      const { data: memberships } = await supabase.from("space_members").select("space_id").eq("user_id", user.id).eq("blacklisted", false)
      if (memberships && memberships.length > 0) {
        const spaceIds = memberships.map((m: { space_id: string }) => m.space_id)
        const { data: allSpaces } = await supabase.from("spaces").select("*").in("id", spaceIds)
        setSpaces(allSpaces ?? [])
      }
    }
    setMembers([{ user_id: user.id, nickname: profile.nickname, avatar_color: profile.avatar_color, role: "admin", joined_at: new Date().toISOString() }])
    setLoading(false)
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-4">
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'rgba(239,68,68,0.7)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>{error}</p>
      )}

      <div>
        <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Space Name</label>
        <input value={name} onChange={e => setName(e.target.value.slice(0, 30))}
          maxLength={30} placeholder="e.g. Mission Control"
          className="input-field" />
        <p className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(90,100,120,0.4)' }}>{name.length}/30</p>
      </div>

      <div>
        <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Space ID</label>
        <div className="px-3 py-2 rounded-xl font-display font-mono text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(139,92,246,0.5)' }}>
          {spaceId}
        </div>
      </div>

      <div>
        <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Avatar</label>
        <div className="grid grid-cols-8 gap-1">
          {AVATAR_EMOJIS.map((e, i) => (
            <button key={i} type="button" onClick={() => setEmojiIdx(i)}
              className="aspect-square rounded-lg flex items-center justify-center text-base transition-all duration-150 hover:scale-110"
              style={{
                background: emojiIdx === i ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: emojiIdx === i ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent',
              }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={!name.trim() || loading}
        className="w-full relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
        style={{
          background: name.trim() && !loading ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.08)',
          color: '#fff',
          boxShadow: name.trim() && !loading ? '0 4px 16px rgba(139,92,246,0.35)' : 'none',
          cursor: !name.trim() || loading ? 'default' : 'pointer',
        }}>
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
        ) : null}
        {loading ? "Creating..." : "Create Space"}
      </button>
    </form>
  )
}