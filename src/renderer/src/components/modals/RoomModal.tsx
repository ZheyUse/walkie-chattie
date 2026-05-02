import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import CreateSpaceForm from "./CreateSpaceForm"

interface Props { onClose: () => void; closable?: boolean }

export default function RoomModal({ onClose, closable = false }: Props) {
  const [tab, setTab] = useState<"join" | "create">("join")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={"absolute inset-0 bg-bg-deep/80 backdrop-blur-sm" + (closable ? " cursor-pointer" : "")}
        onClick={closable ? onClose : undefined}
      />
      <div className="relative z-10 bg-bg-panel border border-border-md rounded-modal p-6 w-96 shadow-2xl">
        {closable && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded text-text-lo hover:text-text-hi hover:bg-bg-hover flex items-center justify-center transition-colors"
            title="Close"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
        <div className="text-center mb-5">
          <div className="text-4xl mb-1">Walkie-Chattie</div>
          <p className="text-text-lo text-sm font-body">Join a Space or create a new one</p>
        </div>
        <div className="flex gap-1 mb-5 bg-bg-surface rounded-input p-1">
          <button onClick={() => setTab("join")}
            className={"flex-1 py-1.5 text-sm rounded-input font-display font-semibold transition-all " + (tab === "join" ? "bg-accent text-bg-deep" : "text-text-md hover:text-text-hi")}>
            Join
          </button>
          <button onClick={() => setTab("create")}
            className={"flex-1 py-1.5 text-sm rounded-input font-display font-semibold transition-all " + (tab === "create" ? "bg-accent text-bg-deep" : "text-text-md hover:text-text-hi")}>
            Create
          </button>
        </div>
        {tab === "join" ? <JoinView onJoined={onClose} /> : <CreateSpaceForm />}
      </div>
    </div>
  )
}

interface JoinViewProps { onJoined: () => void }

function JoinView({ onJoined }: JoinViewProps) {
  const [spaceId, setSpaceId] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setSpaces = useSpaceStore(s => s.setSpaces)
  const setMembers = useSpaceStore(s => s.setMembers)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setLoading(true)
    setError("")

    const { data: space, error: spaceErr } = await supabase
      .from("spaces").select("*").eq("id", spaceId.trim()).maybeSingle()

    if (spaceErr || !space) {
      setError("Space not found.")
      setLoading(false)
      return
    }

    const { error: memberErr } = await supabase
      .from("space_members").insert({ space_id: spaceId.trim(), user_id: user.id })

    if (memberErr) {
      if (memberErr.message.includes("unique")) setError("Already a member of this Space.")
      else setError(memberErr.message)
      setLoading(false)
      return
    }

    setSpace(space)
    onJoined()

    // Refresh all spaces to include the newly joined one
    const { data: memberships } = await supabase
      .from("space_members").select("space_id").eq("user_id", user.id).eq("blacklisted", false)
    if (memberships && memberships.length > 0) {
      const ids = memberships.map((m: { space_id: string }) => m.space_id)
      const { data: allSpaces } = await supabase.from("spaces").select("*").in("id", ids)
      setSpaces(allSpaces ?? [])
    }

    const { data: members } = await supabase
      .from("space_members").select("user_id, role, joined_at").eq("space_id", spaceId.trim())

    if (members) {
      const ids = members.map((m) => m.user_id)
      const { data: profiles } = await supabase.from("profiles").select("id, nickname, avatar_color").in("id", ids)
      const enriched = members.map((m) => ({
        ...m,
        nickname: profiles?.find((p) => p.id === m.user_id)?.nickname || "?",
        avatar_color: profiles?.find((p) => p.id === m.user_id)?.avatar_color || "#888",
      }))
      setMembers(enriched)
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-4">
      <div>
        <label className="block text-text-md text-xs mb-1.5 font-body">Space ID</label>
        <input value={spaceId} onChange={e => setSpaceId(e.target.value)}
          maxLength={10} placeholder="e.g. 1bsd3454aw"
          className="input-field font-mono" />
      </div>
      <button type="submit" disabled={spaceId.trim().length < 4 || loading}
        className="btn-primary disabled:opacity-40">
        {loading ? "Joining..." : "Join Space"}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </form>
  )
}