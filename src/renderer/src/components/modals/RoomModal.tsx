import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore } from "../../stores/space.store"
import Modal from "../ui/Modal"
import CreateSpaceForm from "./CreateSpaceForm"

interface Props { onClose: () => void; closable?: boolean }

export default function RoomModal({ onClose, closable = false }: Props) {
  const [tab, setTab] = useState<"join" | "create">("join")

  return (
    <Modal open onClose={onClose} closable={closable} size="lg">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(26,159,255,0.08) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 0 24px rgba(139,92,246,0.15)',
          }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2" fill="rgba(139,92,246,0.5)" stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(139,92,246,0.3)" strokeWidth="1" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(139,92,246,0.3)" strokeWidth="1" transform="rotate(120 12 12)" />
          </svg>
        </div>
        <h2 className="font-display font-bold text-lg tracking-wide" style={{ color: 'rgba(232,234,237,0.9)' }}>WALKIE—CHATTIE</h2>
        <p className="text-sm font-body mt-1" style={{ color: 'rgba(90,100,120,0.6)' }}>Join a Space or create your own</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => setTab("join")}
          className="flex-1 py-2 text-sm rounded-lg font-display font-semibold transition-all duration-200"
          style={tab === "join"
            ? { background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.35)' }
            : { color: 'rgba(160,170,184,0.6)', background: 'transparent' }
          }>
          Join
        </button>
        <button onClick={() => setTab("create")}
          className="flex-1 py-2 text-sm rounded-lg font-display font-semibold transition-all duration-200"
          style={tab === "create"
            ? { background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(139,92,246,0.35)' }
            : { color: 'rgba(160,170,184,0.6)', background: 'transparent' }
          }>
          Create
        </button>
      </div>
      {tab === "join" ? <JoinView onJoined={onClose} /> : <CreateSpaceForm />}
    </Modal>
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

    const { data: space, error: spaceErr } = await supabase.from("spaces").select("*").eq("id", spaceId.trim()).maybeSingle()
    if (spaceErr || !space) { setError("Space not found."); setLoading(false); return }

    const { error: memberErr } = await supabase.from("space_members").insert({ space_id: spaceId.trim(), user_id: user.id })
    if (memberErr) { if (memberErr.message.includes("unique")) setError("Already a member of this Space."); else setError(memberErr.message); setLoading(false); return }

    setSpace(space)
    onJoined()

    const { data: memberships } = await supabase.from("space_members").select("space_id").eq("user_id", user.id).eq("blacklisted", false)
    if (memberships && memberships.length > 0) {
      const ids = memberships.map((m: { space_id: string }) => m.space_id)
      const { data: allSpaces } = await supabase.from("spaces").select("*").in("id", ids)
      setSpaces(allSpaces ?? [])
    }

    const { data: members } = await supabase.from("space_members").select("user_id, role, joined_at").eq("space_id", spaceId.trim())
    if (members) {
      const ids = members.map(m => m.user_id)
      const { data: profiles } = await supabase.from("profiles").select("id, nickname, avatar_color").in("id", ids)
      const enriched = members.map(m => ({
        ...m,
        nickname: profiles?.find(p => p.id === m.user_id)?.nickname || "?",
        avatar_color: profiles?.find(p => p.id === m.user_id)?.avatar_color || "#888",
      }))
      setMembers(enriched)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Space ID</label>
        <input value={spaceId} onChange={e => setSpaceId(e.target.value)}
          maxLength={10} placeholder="e.g. 1bsd3454aw"
          className="input-field font-mono" style={{ fontFamily: 'var(--font-mono, monospace)' }} />
      </div>
      <button type="submit" disabled={spaceId.trim().length < 4 || loading}
        className="w-full relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
          cursor: spaceId.trim().length < 4 || loading ? 'default' : 'pointer',
        }}>
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
        ) : null}
        {loading ? "Joining..." : "Join Space"}
      </button>
      {error && (
        <p className="text-xs text-center" style={{ color: 'rgba(239,68,68,0.7)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '8px 12px' }}>
          {error}
        </p>
      )}
    </form>
  )
}