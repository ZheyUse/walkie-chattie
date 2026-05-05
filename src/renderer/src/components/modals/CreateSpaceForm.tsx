import 'material-symbols'
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import { generateId } from "../../lib/id-gen"
import { debugLog } from "../../lib/debug"

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
    debugLog({ source: "create-space", message: "Create button clicked", details: { hasUser: Boolean(user), hasProfile: Boolean(profile), name: name.trim() } })
    if (!user || !profile || !name.trim()) {
      debugLog({ level: "error", source: "create-space", message: "Create aborted: user, profile, or name missing", details: { hasUser: Boolean(user), hasProfile: Boolean(profile), nameLength: name.trim().length } })
      return
    }
    setLoading(true)
    setError("")

    const emoji = AVATAR_EMOJIS[emojiIdx]
    const space = { id: spaceId, name: name.trim(), avatar_emoji: emoji, owner_id: user.id, context_window_limit: 12000, context_window_used: 0 }
    debugLog({ source: "create-space", message: "Inserting space", details: { spaceId, name: name.trim(), emoji } })
    const { error: spaceErr } = await supabase.from("spaces").insert(space)
    if (spaceErr) {
      debugLog({ level: "error", source: "create-space", message: "Failed to create space", details: spaceErr })
      setError(spaceErr.message || "Failed to create Space.")
      setLoading(false)
      return
    }

    debugLog({ source: "create-space", message: "Space created, inserting member record", details: { spaceId } })
    const { error: memberErr } = await supabase.from("space_members").insert({ space_id: spaceId, user_id: user.id, role: "admin" })
    if (memberErr) {
      debugLog({ level: "error", source: "create-space", message: "Failed to insert space member", details: memberErr })
      setError(memberErr.message)
      setLoading(false)
      return
    }

    debugLog({ source: "create-space", message: "Create space success", details: { spaceId, spaceName: name.trim() } })
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
        <p className="text-[10px] mt-1 font-body" style={{ color: 'rgba(90,100,120,0.4)' }}>{name.length}/30</p>
      </div>

      <div>
        <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Space ID</label>
        <div className="px-3 py-2 rounded-xl font-display font-body text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(139,92,246,0.5)' }}>
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
          <span className="material-symbols-outlined spin-icon" style={{ fontSize: '16px' }}>sync</span>
        ) : null}
        {loading ? "Creating..." : "Create Space"}
      </button>
    </form>
  )
}