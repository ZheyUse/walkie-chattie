import { useEffect, useState } from "react"
import { useAuthStore } from "../../stores/auth.store"
import { useSpaceStore, type Member } from "../../stores/space.store"
import { supabase } from "../../lib/supabase"
import { debugLog } from "../../lib/debug"
import { getOnlineStatus } from "../../lib/presence"
import { toast } from "../../lib/toast"
import Avatar from "../ui/Avatar"

export default function MembersPanel() {
  const { profile } = useAuthStore()
  const { currentSpace, members, onlineUsers, setMembers } = useSpaceStore()

  const isAdmin = currentSpace?.owner_id === profile?.id
  const [blockLoading, setBlockLoading] = useState<string | null>(null)
  const wrongSpaceMembers = currentSpace ? members.filter(m => m.space_id !== currentSpace.id) : []
  const wrongSpaceMembersKey = wrongSpaceMembers.map(m => `${m.space_id}:${m.user_id}`).join("|")
  useEffect(() => {
    if (!currentSpace || wrongSpaceMembers.length === 0) return
    debugLog({
      level: "error",
      source: "space-members-debug",
      message: "BUG DETECTED: MembersPanel received members from another space",
      details: {
        activeSpaceId: currentSpace.id,
        wrongSpaceMembers: wrongSpaceMembers.map(m => ({
          space_id: m.space_id,
          user_id: m.user_id,
          nickname: m.nickname,
          role: m.role,
        })),
      },
    })
  }, [currentSpace?.id, wrongSpaceMembersKey])

  const visibleMembers = currentSpace ? members.filter(m => m.space_id === currentSpace.id) : []
  const getDisplayName = (member: Member) => member.display_name?.trim() || member.nickname

  const getStatus = (member: Member) => {
    const baseStatus = getOnlineStatus(member.user_id, onlineUsers)
    if (baseStatus === 'offline') return 'offline'
    if (!currentSpace) return baseStatus
    // DND: space is muted for this app instance
    const muteExpiryRaw = localStorage.getItem(`space-muted:${currentSpace.id}`)
    if (muteExpiryRaw) {
      const expiry = parseInt(muteExpiryRaw, 10)
      if (expiry === 0 || (expiry !== null && expiry > Date.now())) {
        return 'dnd'
      }
    }
    // Show dnd if this user is the one who muted (their own mute is active)
    if (member.user_id === profile?.id) {
      const ownMuteRaw = localStorage.getItem(`space-muted:${currentSpace.id}`)
      if (ownMuteRaw) {
        const expiry = parseInt(ownMuteRaw, 10)
        if (expiry === 0 || (expiry !== null && expiry > Date.now())) {
          return 'dnd'
        }
      }
    }
    return baseStatus // 'online' or 'busy'
  }

  const onlineMembers = visibleMembers.filter(m => onlineUsers.has(m.user_id))
  const offlineMembers = visibleMembers.filter(m => !onlineUsers.has(m.user_id))
  const handleBlacklist = async (member: Member) => {
    if (!currentSpace) return
    const displayName = member.display_name?.trim() || member.nickname
    const confirmed = window.confirm(`Block "${displayName}"? They will be removed from the space.`)
    if (!confirmed) return
    setBlockLoading(member.user_id)
    const { error } = await supabase
      .from('space_members')
      .update({ blacklisted: true })
      .eq('space_id', currentSpace.id)
      .eq('user_id', member.user_id)
    setBlockLoading(null)
    if (error) {
      debugLog({ level: "error", source: "space-members", message: "Failed to blacklist member", details: error })
      toast('Failed to block member. Try again.')
      return
    }
    setMembers(members.filter(m => !(m.space_id === currentSpace.id && m.user_id === member.user_id)))
    toast(`${displayName} has been blocked`)
  }

  return (
    <div
      className="w-56 flex-shrink-0 overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, rgba(13, 17, 27, 0.6) 0%, rgba(9, 12, 22, 0.85) 100%)',
        borderLeft: '1px solid rgba(139,92,246,0.1)',
      }}
    >
      {isAdmin && (
        <div
          className="px-3 py-2 text-[10px] font-body uppercase tracking-wider flex items-center gap-1.5"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.06)', color: 'rgba(139,92,246,0.75)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.9)', boxShadow: '0 0 6px rgba(139,92,246,0.6)' }}
          />
          You own this space
        </div>
      )}
      {onlineMembers.length > 0 && (
        <>
          <div
            className="px-3 py-2 text-[10px] font-body uppercase tracking-wider flex items-center gap-1.5"
            style={{ borderBottom: '1px solid rgba(139,92,246,0.06)', color: 'rgba(34,197,94,0.7)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'rgba(34,197,94,0.8)', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }}
            />
            Online - {onlineMembers.length}
          </div>
          {onlineMembers.map(m => (
            <div key={m.user_id} className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.03]">
              <Avatar nickname={getDisplayName(m)} picture={m.picture} color={m.avatar_color} size="sm" showStatus status={getStatus(m)} />
              <span className="text-sm font-body flex-1 truncate" style={{ color: 'rgba(232,234,237,0.8)' }}>{getDisplayName(m)}</span>
              {m.role === 'admin' && (
                <span
                  className="text-[9px] font-body uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(139,92,246,0.12)', color: 'rgba(139,92,246,0.7)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  admin
                </span>
              )}
              {isAdmin && m.user_id !== profile?.id && (
                <button
                  onClick={() => handleBlacklist(m)}
                  disabled={blockLoading === m.user_id}
                  className="text-[10px] font-body transition-colors disabled:opacity-40"
                  style={{ color: 'rgba(239,68,68,0.5)' }}
                >
                  {blockLoading === m.user_id ? 'blocking...' : 'block'}
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {offlineMembers.length > 0 && (
        <>
          <div
            className="px-3 py-2 text-[10px] font-body uppercase tracking-wider"
            style={{ borderBottom: '1px solid rgba(139,92,246,0.06)', color: 'rgba(90,100,120,0.4)' }}
          >
            Offline - {offlineMembers.length}
          </div>
          {offlineMembers.map(m => (
            <div key={m.user_id} className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.03]">
              <Avatar nickname={getDisplayName(m)} picture={m.picture} color={m.avatar_color} size="sm" showStatus status={getStatus(m)} />
              <span className="text-sm font-body flex-1 truncate" style={{ color: 'rgba(232,234,237,0.55)' }}>{getDisplayName(m)}</span>
              {m.role === 'admin' && (
                <span
                  className="text-[9px] font-body uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(139,92,246,0.08)', color: 'rgba(139,92,246,0.4)', border: '1px solid rgba(139,92,246,0.1)' }}
                >
                  admin
                </span>
              )}
              {isAdmin && m.user_id !== profile?.id && (
                <button
                  onClick={() => handleBlacklist(m)}
                  disabled={blockLoading === m.user_id}
                  className="text-[10px] font-body transition-colors disabled:opacity-40"
                  style={{ color: 'rgba(239,68,68,0.35)' }}
                >
                  {blockLoading === m.user_id ? 'blocking...' : 'block'}
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
