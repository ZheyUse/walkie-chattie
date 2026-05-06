import 'material-symbols'
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore, type Space } from "../../stores/space.store"
import Modal from "../ui/Modal"
import CreateSpaceForm from "./CreateSpaceForm"
import { debugLog } from "../../lib/debug"
import { spaceAvatarPath } from "../../lib/spaceAvatars"
import { assetPath } from "../../lib/assets"
import { toast } from "../../lib/toast"

interface Props { onClose: () => void; closable?: boolean }

export default function RoomModal({ onClose, closable = false }: Props) {
  const [tab, setTab] = useState<"join" | "create">("join")

  return (
    <Modal open onClose={onClose} closable={closable} size="lg">
      {/* Header */}
      <div className="text-center mb-6 pt-4">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(26,159,255,0.08) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 0 24px rgba(139,92,246,0.15)',
          }}>
          <img src={assetPath("resources/icons/icon.svg")} alt="Logo" className="w-10 h-10" />
        </div>
        <h2 className="font-title font-bold text-lg tracking-wide" style={{ color: 'rgba(232,234,237,0.9)' }}>ASTRA</h2>
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

const JOIN_MESSAGES = [
  "{name} breached the room",
  "{name} slipped through the airlock",
  "{name} warped into the space",
  "{name} entered orbit",
  "{name} spawned in",
  "{name} joined the space",
  "{name} kicked the door open",
  "{name} just landed",
  "{name} phased into the channel",
  "{name} is now on deck",
]

function randomJoinMessage(name: string) {
  const template = JOIN_MESSAGES[Math.floor(Math.random() * JOIN_MESSAGES.length)]
  return template.replace("{name}", name)
}

function JoinView({ onJoined }: JoinViewProps) {
  const [spaceId, setSpaceId] = useState("")
  const [loading, setLoading] = useState(false)
  const [previewSpace, setPreviewSpace] = useState<Space | null>(null)
  const [joiningSpace, setJoiningSpace] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setSpaces = useSpaceStore(s => s.setSpaces)
  const setMembers = useSpaceStore(s => s.setMembers)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    debugLog({ source: "room-modal", message: "Join button clicked", details: { hasUser: Boolean(user), hasProfile: Boolean(profile), spaceId: spaceId.trim() } })
    if (!user || !profile) {
      debugLog({ level: "error", source: "room-modal", message: "Join aborted: user or profile missing", details: { hasUser: Boolean(user), hasProfile: Boolean(profile) } })
      return
    }
    setLoading(true)
    setNotFound(false)

    debugLog({ source: "room-modal", message: "Looking up space", details: { spaceId: spaceId.trim() } })
    const { data: space, error } = await supabase.from("spaces").select("*").eq("id", spaceId.trim()).maybeSingle()

    if (error) {
      debugLog({ level: "error", source: "room-modal", message: "Space lookup failed", details: { spaceId: spaceId.trim(), error } })
      setNotFound(true)
      setLoading(false)
      return
    }

    if (!space) {
      debugLog({ level: "error", source: "room-modal", message: "Space not found", details: { spaceId: spaceId.trim() } })
      setNotFound(true)
      setLoading(false)
      return
    }

    debugLog({ source: "room-modal", message: "Space found, showing preview", details: { spaceId: space.id, spaceName: space.name } })
    setPreviewSpace(space)
    setLoading(false)
  }

  const handleConfirmJoin = async () => {
    if (!previewSpace || !user) return
    setJoiningSpace(true)

    const insertPayload = { space_id: previewSpace.id, user_id: user.id, role: "member", blacklisted: false }
    const { error: memberErr } = await supabase.from("space_members").insert(insertPayload)
    if (memberErr) {
      debugLog({ level: "error", source: "room-modal", message: "Failed to insert space member", details: memberErr })

      if (memberErr.message.includes("unique")) {
        debugLog({ level: "warn", source: "room-modal", message: "Join hit existing membership; attempting cleanup", details: { spaceId: previewSpace.id, userId: user.id } })
        const { error: cleanupErr } = await supabase
          .from("space_members")
          .delete()
          .eq("space_id", previewSpace.id)
          .eq("user_id", user.id)

        if (cleanupErr) {
          debugLog({ level: "error", source: "room-modal", message: "Membership cleanup failed", details: cleanupErr })
          toast("Join failed â€” ask the admin to re-invite you.")
          setJoiningSpace(false)
          return
        }

        const { error: retryErr } = await supabase.from("space_members").insert(insertPayload)
        if (retryErr) {
          debugLog({ level: "error", source: "room-modal", message: "Join retry failed", details: retryErr })
          toast("Join failed â€” ask the admin to re-invite you.")
          setJoiningSpace(false)
          return
        }
      } else {
        toast("Join failed â€” please try again.")
        setJoiningSpace(false)
        return
      }
    }

    const joinLine = randomJoinMessage(profile?.nickname || "Someone")
    supabase.from("messages").insert({
      space_id: previewSpace.id,
      sender_id: user.id,
      sender_nickname: profile?.nickname || "Someone",
      type: "system",
      content: joinLine,
    }).then(({ error }) => {
      if (error) debugLog({ level: "warn", source: "room-modal", message: "Join system message failed", details: error })
    })

    debugLog({
      source: "space-members-debug",
      message: "Joined space successfully with membership row",
      details: {
        space: { id: previewSpace.id, name: previewSpace.name, owner_id: previewSpace.owner_id },
        space_members: [{ space_id: previewSpace.id, user_id: user.id, role: "member" }],
      },
    })
    setSpace(previewSpace)
    localStorage.setItem('lastActiveSpaceId', previewSpace.id)

    const { data: memberships } = await supabase.from("space_members").select("space_id").eq("user_id", user.id).eq("blacklisted", false)
    if (memberships && memberships.length > 0) {
      const ids = memberships.map((m: { space_id: string }) => m.space_id)
      const { data: allSpaces } = await supabase.from("spaces").select("*").in("id", ids)
      setSpaces(allSpaces ?? [])
    }

    const { data: members, error: membersError } = await supabase
      .from("space_members")
      .select("space_id, user_id, role, joined_at, display_name")
      .eq("space_id", previewSpace.id)
      .eq("blacklisted", false)
    if (membersError) {
      debugLog({
        level: "error",
        source: "space-members-debug",
        message: "Joined space member reload failed",
        details: { requestedSpaceId: previewSpace.id, error: membersError },
      })
    }
    if (members) {
      const ids = members.map(m => m.user_id)
      const { data: profiles } = await supabase.from("profiles").select("id, nickname, avatar_color, picture").in("id", ids)
      const enriched = members.map(m => ({
        ...m,
        role: m.role === "admin" || m.user_id === previewSpace.owner_id ? "admin" : "member",
        nickname: profiles?.find(p => p.id === m.user_id)?.nickname || "?",
        avatar_color: profiles?.find(p => p.id === m.user_id)?.avatar_color || "#888",
        picture: profiles?.find(p => p.id === m.user_id)?.picture,
        display_name: m.display_name ?? null,
          }))
      const mismatchMembers = enriched.filter(m => m.space_id !== previewSpace.id)
      debugLog({
        level: mismatchMembers.length > 0 ? "error" : "info",
        source: "space-members-debug",
        message: mismatchMembers.length > 0
          ? "BUG DETECTED: Joined space member reload returned another space"
          : "Joined space members loaded",
        details: {
          requestedSpaceId: previewSpace.id,
          rawMembers: members,
          profiles,
          enrichedMembers: enriched.map(m => ({
            space_id: m.space_id,
            user_id: m.user_id,
            nickname: m.nickname,
            role: m.role,
            joined_at: m.joined_at,
          })),
          mismatchMembers,
        },
      })
      setMembers(enriched.filter(m => m.space_id === previewSpace.id))
    }

    setJoiningSpace(false)
    setPreviewSpace(null)
    onJoined()
  }

  return (
    <>
      <form onSubmit={handleLookup} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs mb-1.5 font-body" style={{ color: 'rgba(160,170,184,0.7)' }}>Space ID</label>
          <input value={spaceId} onChange={e => setSpaceId(e.target.value)}
            maxLength={10} placeholder="e.g. 1bsd3454aw"
            className="input-field font-body" />
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
            <span className="material-symbols-outlined spin-icon" style={{ fontSize: '16px' }}>sync</span>
          ) : null}
          {loading ? "Looking up..." : "Join Space"}
        </button>
      </form>

      <Modal open={notFound} onClose={() => setNotFound(false)} size="sm">
        <div className="flex flex-col items-center gap-4 p-2">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'rgba(239,68,68,0.7)' }}>search_off</span>
          </div>
          <div className="text-center">
            <h3 className="font-title font-bold text-base" style={{ color: 'rgba(232,234,237,0.9)' }}>Space not Found!</h3>
            <p className="text-sm mt-1 font-body" style={{ color: 'rgba(90,100,120,0.6)' }}>Check the Space ID and try again.</p>
          </div>
          <button onClick={() => setNotFound(false)}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(232,234,237,0.9)' }}>
            Try Again
          </button>
        </div>
      </Modal>

      <Modal open={previewSpace !== null} onClose={() => setPreviewSpace(null)} size="sm">
        <div className="flex flex-col items-center gap-4 p-2">
          <img
              className="w-12 h-12 object-contain"
              src={spaceAvatarPath(previewSpace?.avatar_emoji ?? 'avatar-rocket.svg')}
              alt={previewSpace?.name ?? 'space'}
            />
          <div className="text-center">
            <h3 className="font-title font-bold text-base" style={{ color: 'rgba(232,234,237,0.95)' }}>{previewSpace?.name}</h3>
            <p className="text-xs mt-1 font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>Ready to enter?</p>
          </div>
          <button onClick={handleConfirmJoin} disabled={joiningSpace}
            className="w-full relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            style={{
              background: joiningSpace ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
            }}>
            {joiningSpace ? (
              <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>sync</span>
            ) : null}
            {joiningSpace ? "Entering..." : "Enter Space"}
          </button>
          <button onClick={() => setPreviewSpace(null)}
            className="text-xs font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>
            Cancel
          </button>
        </div>
      </Modal>
    </>
  )
}
