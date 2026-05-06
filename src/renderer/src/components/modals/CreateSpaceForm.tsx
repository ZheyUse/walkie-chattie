import 'material-symbols'
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import { generateId } from "../../lib/id-gen"
import { debugLog } from "../../lib/debug"
import { SPACE_AVATARS, spaceAvatarPath } from "../../lib/spaceAvatars"

export default function CreateSpaceForm() {
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setSpaces = useSpaceStore(s => s.setSpaces)
  const setMembers = useSpaceStore(s => s.setMembers)
  const setJoinOrCreateModalOpen = useSpaceStore(s => s.setJoinOrCreateModalOpen)

  const [name, setName] = useState("")
  const [spaceId] = useState(generateId())
  const [selectedIdx, setSelectedIdx] = useState(0)
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

    const selectedAvatar = SPACE_AVATARS[selectedIdx].filename
    const space = { id: spaceId, name: name.trim(), avatar_emoji: selectedAvatar, owner_id: user.id, context_window_limit: 12000, context_window_used: 0 }
    debugLog({ source: "create-space", message: "Inserting space", details: { spaceId, name: name.trim(), selectedAvatar } })
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

    debugLog({
      source: "space-members-debug",
      message: "Create space success with owner membership",
      details: {
        space: { id: spaceId, name: name.trim(), owner_id: user.id },
        space_members: [{ space_id: spaceId, user_id: user.id, role: "admin" }],
      },
    })
    setSpace(space)
    localStorage.setItem('lastActiveSpaceId', spaceId)
    setJoinOrCreateModalOpen(false)

    if (user) {
      const { data: memberships } = await supabase.from("space_members").select("space_id").eq("user_id", user.id).eq("blacklisted", false)
      if (memberships && memberships.length > 0) {
        const spaceIds = memberships.map((m: { space_id: string }) => m.space_id)
        const { data: allSpaces } = await supabase.from("spaces").select("*").in("id", spaceIds)
        setSpaces(allSpaces ?? [])
      }
    }
    setMembers([{
      space_id: spaceId,
      user_id: user.id,
      nickname: profile.nickname,
      display_name: null,
      avatar_color: profile.avatar_color,
      role: "admin",
      joined_at: new Date().toISOString(),
    }])
    setLoading(false)
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-4">
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'rgba(239,68,68,0.8)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>
      )}

      <div>
        <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Space Name</label>
        <input value={name} onChange={e => setName(e.target.value.slice(0, 30))}
          maxLength={30} placeholder="e.g. Mission Control"
          className="w-full px-4 py-3 rounded-xl text-sm font-display tracking-wide transition-all duration-200 outline-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(232,234,237,0.9)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }} />
        <p className="text-[10px] mt-1 font-body px-1" style={{ color: 'rgba(90,100,120,0.5)' }}>{name.length}/30</p>
      </div>

      <div>
        <label className="block text-xs mb-2 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Avatar</label>
        <div className="grid grid-cols-5 gap-2">
          {SPACE_AVATARS.map((a, i) => (
            <button key={i} type="button" onClick={() => setSelectedIdx(i)}
              className="aspect-square rounded-xl flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                background: selectedIdx === i ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                border: selectedIdx === i ? '2px solid rgba(139,92,246,0.6)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: selectedIdx === i ? '0 0 12px rgba(139,92,246,0.2)' : 'none',
              }}>
              <img
                src={spaceAvatarPath(a.filename)}
                alt={a.label}
                className="w-10 h-10 object-contain"
              />
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={!name.trim() || loading}
        className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
        style={{
          background: name.trim() && !loading ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)',
          border: name.trim() && !loading ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(232,234,237,0.95)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          cursor: !name.trim() || loading ? 'default' : 'pointer',
        }}>
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <span className="material-symbols-outlined text-base">add_circle</span>
        )}
        {loading ? "Creating..." : "Create Space"}
      </button>
    </form>
  )
}
