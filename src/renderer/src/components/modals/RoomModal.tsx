import 'material-symbols'
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore, type Space } from "../../stores/space.store"
import CreateSpaceForm from "./CreateSpaceForm"
import { debugLog } from "../../lib/debug"
import { spaceAvatarPath } from "../../lib/spaceAvatars"
import { assetPath } from "../../lib/assets"
import { toast } from "../../lib/toast"

/* ── Pre-computed star positions & properties ── */
function seededRand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000
  return min + ((x - Math.floor(x)) * (max - min))
}
const STAR_DEEP = Array.from({ length: 45 }, (_, i) => {
  const s = i * 137.508
  return {
    x: parseFloat((seededRand(s, 0, 100)).toFixed(1)),
    y: parseFloat((seededRand(s + 1, 0, 100)).toFixed(1)),
    s: parseFloat((seededRand(s + 2, 0.8, 1.5)).toFixed(1)),
    d: parseFloat((seededRand(s + 3, 2, 5)).toFixed(1)),
    dl: parseFloat((seededRand(s + 4, 0, 4)).toFixed(1)),
    o: parseFloat((seededRand(s + 5, 10, 40) / 100).toFixed(2)),
  }
})
const STAR_MID = Array.from({ length: 18 }, (_, i) => {
  const s = i * 198.471
  return {
    x: parseFloat((seededRand(s, 0, 100)).toFixed(1)),
    y: parseFloat((seededRand(s + 1, 0, 100)).toFixed(1)),
    s: parseFloat((seededRand(s + 2, 1.5, 2.5)).toFixed(1)),
    d: parseFloat((seededRand(s + 3, 4, 8)).toFixed(1)),
    dl: parseFloat((seededRand(s + 4, 0, 5)).toFixed(1)),
    o: parseFloat((seededRand(s + 5, 30, 50) / 100).toFixed(2)),
  }
})
const BRIGHT_STARS: [string, string][] = [
  ['12%', '18%'],
  ['78%', '8%'],
  ['88%', '60%'],
  ['25%', '75%'],
  ['60%', '30%'],
  ['5%', '55%'],
]

interface ShootingStarProps {
  delay: number
  top: string
  left: string
  dur: number
}
function ShootingStar({ delay, top, left, dur }: ShootingStarProps) {
  return (
    <div
      className="absolute"
      style={{
        top,
        left,
        width: 100,
        height: 1,
        animation: `shoot ${dur}s ease-in ${delay}s infinite`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to right, transparent 0%, rgba(180,220,255,0.9) 40%, rgba(255,255,255,1) 100%)',
          borderRadius: '50%',
          boxShadow: '0 0 6px 2px rgba(168,210,255,0.6)',
        }}
      />
    </div>
  )
}

interface Props { onClose: () => void; closable?: boolean }

export default function RoomModal({ onClose, closable = false }: Props) {
  const [tab, setTab] = useState<"join" | "create">("join")

  const handleClose = () => {
    if (closable) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 15% 20%, rgba(139,92,246,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(26,159,255,0.08) 0%, transparent 55%), #0a0e1a'
      }}
    >
      {/* ── Cosmic background layer ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Orbital rings */}
        <div className="absolute rounded-full" style={{ width: 640, height: 640, top: '50%', left: '50%', marginTop: -320, marginLeft: -320, background: 'radial-gradient(circle, transparent 45%, rgba(139,92,246,0.04) 55%, transparent 65%)', animation: 'orbit-glow 24s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ width: 900, height: 900, top: '50%', left: '50%', marginTop: -450, marginLeft: -450, background: 'radial-gradient(circle, transparent 48%, rgba(26,159,255,0.025) 52%, transparent 60%)', animation: 'orbit-glow 36s ease-in-out infinite reverse' }} />

        {/* Nebula wisps */}
        <div className="absolute rounded-full" style={{ width: 480, height: 320, top: '5%', left: '-5%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 50%, transparent 70%)', filter: 'blur(24px)', animation: 'drift-a 22s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ width: 560, height: 380, bottom: '0%', right: '-8%', background: 'radial-gradient(ellipse, rgba(26,159,255,0.07) 0%, rgba(26,159,255,0.02) 45%, transparent 65%)', filter: 'blur(28px)', animation: 'drift-b 30s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ width: 700, height: 500, top: '50%', left: '50%', marginTop: -250, marginLeft: -350, background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, rgba(75,0,130,0.02) 40%, transparent 70%)', filter: 'blur(40px)', animation: 'drift-a 18s ease-in-out infinite' }} />

        {/* Star layer 1 */}
        {STAR_DEEP.map((s, i) => (
          <div key={`s1-${i}`} className="absolute rounded-full" style={{ width: s.s + 'px', height: s.s + 'px', left: s.x + '%', top: s.y + '%', background: `rgba(220,230,255,${s.o})`, animation: `twinkle-fast ${s.d}s ease-in-out ${s.dl}s infinite` }} />
        ))}

        {/* Star layer 2 */}
        {STAR_MID.map((s, i) => (
          <div key={`s2-${i}`} className="absolute rounded-full" style={{ width: s.s + 'px', height: s.s + 'px', left: s.x + '%', top: s.y + '%', background: `rgba(220,235,255,${s.o})`, boxShadow: `0 0 ${s.s}px 0 rgba(180,210,255,0.15)`, animation: `twinkle-slow ${s.d}s ease-in-out ${s.dl}s infinite` }} />
        ))}

        {/* Bright accent stars */}
        {BRIGHT_STARS.map((pos, i) => (
          <div key={`s3-${i}`} className="absolute rounded-full" style={{ width: '2px', height: '2px', left: pos[0], top: pos[1], background: '#c8d8ff', boxShadow: '0 0 6px 2px rgba(168,208,255,0.5), 0 0 14px 4px rgba(139,92,246,0.2)', animation: `twinkle-slow ${3 + i * 0.8}s ease-in-out ${i}s infinite` }} />
        ))}

        {/* Shooting stars */}
        <ShootingStar delay={0} top="8%" left="75%" dur={1.4} />
        <ShootingStar delay={6} top="15%" left="90%" dur={1.8} />
        <ShootingStar delay={12} top="5%" left="60%" dur={1.2} />
        <ShootingStar delay={22} top="20%" left="82%" dur={1.6} />
        <ShootingStar delay={35} top="3%" left="70%" dur={1.5} />

        {/* Cosmic dust */}
        <div style={{ position: 'absolute', width: 120, height: 80, top: '30%', left: '5%', background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(12px)', animation: 'dust-drift 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 160, height: 100, top: '55%', right: '8%', background: 'radial-gradient(ellipse, rgba(26,159,255,0.1) 0%, transparent 70%)', filter: 'blur(14px)', animation: 'dust-drift 18s ease-in-out infinite reverse' }} />

        {/* Planet with ring */}
        <div style={{ position: 'absolute', width: 90, height: 90, top: '10%', right: '12%', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(139,92,246,0.15), rgba(80,30,180,0.08) 60%, transparent 80%)', boxShadow: '0 0 30px 8px rgba(139,92,246,0.06)' }} />
        <div style={{ position: 'absolute', width: 140, height: 36, top: 'calc(10% + 45px - 18px)', right: 'calc(12% + 45px - 70px)', borderRadius: '50%', border: '1px solid rgba(168,130,255,0.18)', animation: 'ring-shimmer 6s ease-in-out infinite' }} />
      </div>

      {/* Close button */}
      {closable && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <span className="material-symbols-outlined text-sm" style={{ color: 'rgba(160,170,184,0.7)' }}>close</span>
        </button>
      )}

      {/* Main content card */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden p-1"
            style={{
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={assetPath("resources/icons/icon-128.png")}
              alt="Astra"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <span
              className="font-title font-bold text-4xl tracking-widest"
              style={{ background: 'linear-gradient(90deg, #e8eaed 0%, rgba(167,139,250,0.85) 75%, #1a9fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.2em' }}
            >
              ASTRA
            </span>
            <p className="text-sm font-body tracking-wide" style={{ color: 'rgba(160,170,184,0.6)' }}>
              Join a Space or create your own
            </p>
          </div>
        </div>

        {/* Content card */}
        <div
          className="bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden w-80"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Tab switcher */}
          <div className="flex gap-1 m-4 mb-0 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setTab("join")}
              className="flex-1 py-2 text-sm rounded-lg font-display font-semibold transition-all duration-200"
              style={tab === "join"
                ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.3))', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }
                : { color: 'rgba(160,170,184,0.6)', background: 'transparent' }
              }>
              Join
            </button>
            <button onClick={() => setTab("create")}
              className="flex-1 py-2 text-sm rounded-lg font-display font-semibold transition-all duration-200"
              style={tab === "create"
                ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.3))', color: '#fff', boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }
                : { color: 'rgba(160,170,184,0.6)', background: 'transparent' }
              }>
              Create
            </button>
          </div>

          <div className="p-6 pt-4">
            {tab === "join" ? <JoinView onJoined={onClose} /> : <CreateSpaceForm />}
          </div>
        </div>
      </div>
    </div>
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
          toast("Join failed — ask the admin to re-invite you.")
          setJoiningSpace(false)
          return
        }

        const { error: retryErr } = await supabase.from("space_members").insert(insertPayload)
        if (retryErr) {
          debugLog({ level: "error", source: "room-modal", message: "Join retry failed", details: retryErr })
          toast("Join failed — ask the admin to re-invite you.")
          setJoiningSpace(false)
          return
        }
      } else {
        toast("Join failed — please try again.")
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
            className="w-full px-4 py-3 rounded-xl text-sm font-display tracking-wide transition-all duration-200 outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(232,234,237,0.9)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }} />
        </div>
        <button type="submit" disabled={spaceId.trim().length < 4 || loading}
          className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
          style={{
            background: 'rgba(139,92,246,0.2)',
            border: '1px solid rgba(139,92,246,0.3)',
            color: 'rgba(232,234,237,0.95)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(139,92,246,0.15)',
            cursor: spaceId.trim().length < 4 || loading ? 'default' : 'pointer',
          }}>
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <span className="material-symbols-outlined text-base">search</span>
          )}
          {loading ? "Looking up..." : "Join Space"}
        </button>
      </form>

      {/* Not found overlay */}
      {notFound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(5,8,18,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setNotFound(false)} />
          <div
            className="relative z-10 bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden w-80 p-8 flex flex-col items-center gap-4"
            style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
          >
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
        </div>
      )}

      {/* Preview space overlay */}
      {previewSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(5,8,18,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setPreviewSpace(null)} />
          <div
            className="relative z-10 bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden w-80 p-8 flex flex-col items-center gap-4"
            style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
          >
            <img
              className="w-14 h-14 object-contain"
              src={spaceAvatarPath(previewSpace?.avatar_emoji ?? 'avatar-rocket.svg')}
              alt={previewSpace?.name ?? 'space'}
            />
            <div className="text-center">
              <h3 className="font-title font-bold text-base" style={{ color: 'rgba(232,234,237,0.95)' }}>{previewSpace?.name}</h3>
              <p className="text-xs mt-1 font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>Ready to enter?</p>
            </div>
            <button onClick={handleConfirmJoin} disabled={joiningSpace}
              className="w-full relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
              style={{
                background: joiningSpace ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: 'rgba(232,234,237,0.95)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(139,92,246,0.15)',
              }}>
              {joiningSpace ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <span className="material-symbols-outlined text-base">rocket_launch</span>
              )}
              {joiningSpace ? "Entering..." : "Enter Space"}
            </button>
            <button onClick={() => setPreviewSpace(null)}
              className="text-xs font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
