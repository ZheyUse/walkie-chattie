import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import { generateId } from "../../lib/id-gen"

const EMOJIS = ["rocket","fire","zap","gamepad","dart","d6","eagle","dragon","water","guitar","mountain","moon"]
const EMOJIS_DISPLAY = [
  String.fromCodePoint(0x1F680), String.fromCodePoint(0x1F525), String.fromCodePoint(0x26A1),
  String.fromCodePoint(0x1F3AE), String.fromCodePoint(0x1F3AF), String.fromCodePoint(0x1F3B2),
  String.fromCodePoint(0x1F985), String.fromCodePoint(0x1F409), String.fromCodePoint(0x1F30A),
  String.fromCodePoint(0x1F3B8), String.fromCodePoint(0x1F3D4), String.fromCodePoint(0x1F319),
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

    const emoji = EMOJIS_DISPLAY[emojiIdx]

    const space = {
      id: spaceId,
      name: name.trim(),
      avatar_emoji: emoji,
      owner_id: user.id,
      context_window_limit: 12000,
      context_window_used: 0,
    }

    const { error: spaceErr } = await supabase
      .from("spaces").insert(space)

    if (spaceErr) {
      setError(spaceErr.message || "Failed to create Space.")
      setLoading(false)
      return
    }

    const { error: memberErr } = await supabase
      .from("space_members").insert({ space_id: spaceId, user_id: user.id, role: "admin" })

    if (memberErr) {
      setError(memberErr.message)
      setLoading(false)
      return
    }

    setSpace(space)
    setJoinOrCreateModalOpen(false)

    // Refresh all spaces to include the newly created one
    if (user) {
      const { data: memberships } = await supabase
        .from("space_members").select("space_id").eq("user_id", user.id).eq("blacklisted", false)
      if (memberships && memberships.length > 0) {
        const spaceIds = memberships.map((m: { space_id: string }) => m.space_id)
        const { data: allSpaces } = await supabase.from("spaces").select("*").in("id", spaceIds)
        setSpaces(allSpaces ?? [])
      }
    }

    setMembers([{
      user_id: user.id,
      nickname: profile.nickname,
      avatar_color: profile.avatar_color,
      role: "admin",
      joined_at: new Date().toISOString(),
    }])

    setLoading(false)
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-4">
      {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">{error}</p>}

      <div>
        <label className="block text-text-md text-xs mb-1 font-body">Space Name</label>
        <input value={name} onChange={e => setName(e.target.value.slice(0, 30))}
          maxLength={30} placeholder="e.g. Gaming Crew"
          className="input-field" />
        <p className="text-text-lo text-xs mt-1">{name.length}/30</p>
      </div>

      <div>
        <label className="block text-text-md text-xs mb-1.5 font-body">Space ID</label>
        <div className="input-field font-mono text-text-md">{spaceId}</div>
      </div>

      <div>
        <label className="block text-text-md text-xs mb-2 font-body">Avatar</label>
        <div className="grid grid-cols-6 gap-2">
          {EMOJIS_DISPLAY.map((e, i) => (
            <button key={i} type="button" onClick={() => setEmojiIdx(i)}
              className={"text-xl w-9 h-9 rounded-card flex items-center justify-center transition-all " +
                       (emojiIdx === i ? "bg-accent/20 ring-2 ring-accent" : "bg-bg-surface hover:bg-bg-hover")}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={!name.trim() || loading}
        className="btn-primary disabled:opacity-40">
        {loading ? "Creating..." : "Create Space"}
      </button>
    </form>
  )
}