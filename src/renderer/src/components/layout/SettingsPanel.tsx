import 'material-symbols'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth.store'
import { useSpaceStore, type Member } from '../../stores/space.store'
import { useChatStore } from '../../stores/chat.store'
import { debugLog } from '../../lib/debug'
import { toast } from '../../lib/toast'
import Avatar from '../ui/Avatar'
import ContextMeter from '../ui/ContextMeter'
import DeleteSpaceModal from '../modals/DeleteSpaceModal'
import RenameModal from '../modals/RenameModal'
import ResetChatModal from '../modals/ResetChatModal'
import MuteModal from '../modals/MuteModal'
import SpaceDetails from '../modals/SpaceDetails'

const AVATAR_EMOJIS = [
  "🚀", "🛸", "🌌", "⭐", "🌙", "🪐",
  "🔮", "💎", "⚡", "🔥", "🎯", "🎮",
  "🛡️", "🔭", "🌊", "⚔️",
]

function getMuteKey(spaceId: string) { return `space-muted:${spaceId}` }
function getMuteExpiry(spaceId: string): number | null {
  const raw = localStorage.getItem(getMuteKey(spaceId))
  if (!raw) return null
  const expiry = parseInt(raw, 10)
  if (isNaN(expiry)) return null
  if (expiry === 0) return 0 // forever muted
  return expiry
}
function isMuted(spaceId: string) {
  const expiry = getMuteExpiry(spaceId)
  return expiry === 0 || (expiry !== null && expiry > Date.now())
}

export default function SettingsPanel() {
  const { profile } = useAuthStore()
  const { currentSpace, members, setSpace, setSpaces, spaces, setMembers, onlineUsers } = useSpaceStore()
  const { setMessages, searchQuery, setSearchQuery } = useChatStore()
  const [showNukeModal, setShowNukeModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [renameConfirm, setRenameConfirm] = useState<{ from: string; to: string } | null>(null)
  const [avatarPicker, setAvatarPicker] = useState(false)
  const [avatarInput, setAvatarInput] = useState("")
  const [includeInShout, setIncludeInShout] = useState(() => localStorage.getItem('include_self_shout') === 'true')
  const [copiedId, setCopiedId] = useState(false)
  const [showMuteModal, setShowMuteModal] = useState(false)
  const [showSpaceDetails, setShowSpaceDetails] = useState(false)
  const [muteState, setMuteState] = useState(() => !!currentSpace && isMuted(currentSpace.id))

  const isMutedNow = muteState

  useEffect(() => {
    if (!copiedId) return
    const t = window.setTimeout(() => setCopiedId(false), 1500)
    return () => window.clearTimeout(t)
  }, [copiedId])

  const isAdmin = currentSpace?.owner_id === profile?.id
  const onlineMembers = members.filter(m => onlineUsers.has(m.user_id))
  const offlineMembers = members.filter(m => !onlineUsers.has(m.user_id))

  const handleRenameSpace = async () => {
    if (!currentSpace || !editNameValue.trim()) { setEditingName(false); return }
    if (editNameValue.trim() === currentSpace.name) { setEditingName(false); return }
    setRenameConfirm({ from: currentSpace.name, to: editNameValue.trim() })
  }

  const confirmRename = async () => {
    if (!currentSpace || !editNameValue.trim()) return
    await supabase.from('spaces').update({ name: editNameValue.trim() }).eq('id', currentSpace.id)
    setSpace({ ...currentSpace, name: editNameValue.trim() })
    setSpaces(spaces.map(s => s.id === currentSpace.id ? { ...s, name: editNameValue.trim() } : s))
    setEditingName(false)
    setRenameConfirm(null)
  }

  const handleChangeAvatar = async (emoji: string) => {
    if (!currentSpace) return
    await supabase.from('spaces').update({ avatar_emoji: emoji }).eq('id', currentSpace.id)
    setSpace({ ...currentSpace, avatar_emoji: emoji })
    setSpaces(spaces.map(s => s.id === currentSpace.id ? { ...s, avatar_emoji: emoji } : s))
    setAvatarPicker(false)
  }

  const handleToggleIncludeInShout = () => {
    const next = !includeInShout
    setIncludeInShout(next)
    localStorage.setItem('include_self_shout', String(next))
  }

  const handleMute = (value: string) => {
    localStorage.setItem(getMuteKey(currentSpace!.id), value === 'forever' ? '0' : String(Date.now() + (
      value === '15m' ? 15 * 60 * 1000 :
      value === '1h' ? 60 * 60 * 1000 :
      value === '24h' ? 24 * 60 * 60 * 1000 : 0
    )))
    setMuteState(true)
    toast(`Notifications muted for ${currentSpace?.name}`)
  }

  const handleUnmute = () => {
    localStorage.removeItem(getMuteKey(currentSpace!.id))
    setMuteState(false)
    toast(`Notifications unmuted`)
  }

  const handleBlacklist = async (member: Member) => {
    if (!currentSpace) return
    await supabase.from('space_members').update({ blacklisted: true }).eq('space_id', currentSpace.id).eq('user_id', member.user_id)
    setMembers(members.filter(m => m.user_id !== member.user_id))
  }

  const handleResetChat = async () => {
    if (!currentSpace) return
    await supabase.from('messages').delete().eq('space_id', currentSpace.id)
    await supabase.from('spaces').update({ context_window_used: 0 }).eq('id', currentSpace.id)
    setMessages([])
  }

  const handleDeleteSpace = async (): Promise<void> => {
    if (!currentSpace || !profile) { debugLog({ level: 'error', source: 'settings', message: 'Nuke space aborted' }); return }
    const spaceName = currentSpace.name; const spaceId = currentSpace.id
    debugLog({ level: 'info', source: 'settings', message: `[nuke] Starting "${spaceName}" (${spaceId})`, details: { userId: profile.id } })
    debugLog({ level: 'info', source: 'settings', message: `[nuke] Deleting space_members for ${spaceId}` })
    const membersResult = await supabase.from('space_members').delete().eq('space_id', currentSpace.id)
    if (membersResult.error) { debugLog({ level: 'error', source: 'settings', message: `[nuke] Failed space_members`, details: membersResult.error }); throw membersResult.error }
    debugLog({ level: 'info', source: 'settings', message: `[nuke] Deleting space row ${spaceId}` })
    const spaceResult = await supabase.from('spaces').delete().eq('id', currentSpace.id).eq('owner_id', profile.id)
    if (spaceResult.error) { debugLog({ level: 'error', source: 'settings', message: `[nuke] Failed space row`, details: spaceResult.error }); throw spaceResult.error }
    const { data: verifyRow } = await supabase.from('spaces').select('id').eq('id', spaceId).maybeSingle()
    if (verifyRow) { debugLog({ level: 'error', source: 'settings', message: `[nuke] RLS blocked delete` }); throw new Error(`RLS blocked delete`) }
    debugLog({ level: 'success', source: 'settings', message: `[nuke] "${spaceName}" nuked` })
  }

  const handleDeleteDone = async () => {
    if (!currentSpace || !profile) { setShowNukeModal(false); return }
    const { data: remain } = await supabase.from('space_members').select('space_id').eq('user_id', profile.id).eq('blacklisted', false).neq('space_id', currentSpace.id)
    if (remain && remain.length > 0) {
      const { data: next } = await supabase.from('spaces').select('*').eq('id', remain[0].space_id).maybeSingle()
      setSpace(next); setSpaces(next ? spaces.filter(s => s.id !== currentSpace.id) : [])
    } else { setSpace(null); setMessages([]); setSpaces([]) }
    setShowNukeModal(false)
  }

  const handleLeave = async () => {
    if (!currentSpace || !profile) return
    await supabase.from('space_members').delete().eq('space_id', currentSpace.id).eq('user_id', profile.id)
    const { data: remain } = await supabase.from('space_members').select('space_id').eq('user_id', profile.id).eq('blacklisted', false).neq('space_id', currentSpace.id)
    let nextSpace = null
    if (remain && remain.length > 0) { const { data: next } = await supabase.from('spaces').select('*').eq('id', remain[0].space_id).maybeSingle(); nextSpace = next }
    setSpace(nextSpace); setMessages([])
    setSpaces(nextSpace ? spaces.filter(s => s.id !== currentSpace.id) : [])
  }

  return (
    <>
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(13,17,27,0.8) 0%, rgba(9,12,22,0.9) 100%)',
          borderLeft: '1px solid rgba(139,92,246,0.1)',
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-sm tracking-wider" style={{ color: 'rgba(232,234,237,0.9)' }}>Settings</h2>
            {/* Space avatar quick picker */}
            <button
              onClick={() => { setAvatarPicker(!avatarPicker); setAvatarInput(currentSpace?.avatar_emoji || "") }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all duration-150 hover:scale-105"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)' }}
            >
              {currentSpace?.avatar_emoji}
            </button>
          </div>

          {/* Space name — click to edit */}
          <div className="flex items-center gap-2">
            {isAdmin && editingName ? (
              <input
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameSpace(); if (e.key === 'Escape') setEditingName(false) }}
                onBlur={() => { if (editNameValue.trim() && editNameValue.trim() !== currentSpace?.name) handleRenameSpace(); else setEditingName(false) }}
                autoFocus
                className="input-field text-sm flex-1 min-w-0 font-display font-semibold"
              />
            ) : (
              <span
                onClick={() => isAdmin && setEditingName(true)}
                className={"text-sm font-display font-semibold leading-none " + (isAdmin ? 'cursor-pointer hover:text-accent-purple' : '')}
                style={{ color: 'rgba(232,234,237,0.9)' }}
              >
                {currentSpace?.name}
              </span>
            )}
          </div>

          {/* Space ID */}
          <div className="flex items-center gap-1 mt-1">
            <span className="font-body text-[10px]" style={{ color: 'rgba(90,100,120,0.5)' }}>{currentSpace?.id?.slice(0, 8)}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(currentSpace?.id || ''); setCopiedId(true); toast('Space ID copied') }}
              className="flex items-center transition-colors"
              style={{ color: 'rgba(139,92,246,0.35)' }}
            >
              {copiedId ? (
                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>content_copy</span>
              )}
            </button>
          </div>
        </div>

        {/* Avatar picker */}
        {avatarPicker && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
            <p className="text-[10px] font-body uppercase tracking-wider mb-2" style={{ color: 'rgba(90,100,120,0.5)' }}>Choose an avatar</p>
            <div className="grid grid-cols-8 gap-1 mb-2">
              {AVATAR_EMOJIS.map((e, i) => (
                <button
                  key={i}
                  onClick={() => handleChangeAvatar(e)}
                  className="aspect-square rounded-lg flex items-center justify-center text-base transition-all duration-150 hover:scale-110"
                  style={{
                    background: currentSpace?.avatar_emoji === e ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                    border: currentSpace?.avatar_emoji === e ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={avatarInput} onChange={e => setAvatarInput(e.target.value)} maxLength={2}
                className="input-field text-sm w-14 text-center text-base" placeholder="🙂" />
              <button onClick={() => handleChangeAvatar(avatarInput)} className="btn-ghost text-xs px-2 font-display font-semibold">Set</button>
              <button onClick={() => setAvatarPicker(false)} className="btn-ghost text-xs px-2 text-text-lo">×</button>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
          <p className="text-[10px] font-body uppercase tracking-wider mb-2" style={{ color: 'rgba(90,100,120,0.4)' }}>Preferences</p>

          {/* Mute toggle — show Mute when unmuted, Unmute when muted */}
          {isMutedNow ? (
            <button onClick={handleUnmute} className="w-full flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(251,191,36,0.8)' }}>notifications_off</span>
                </div>
                <p className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.8)' }}>
                  Unmute {currentSpace?.name}
                </p>
              </div>
            </button>
          ) : (
            <button onClick={() => setShowMuteModal(true)} className="w-full flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.6)' }}>notifications</span>
                </div>
                <p className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.8)' }}>
                  Mute {currentSpace?.name}
                </p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'rgba(90,100,120,0.4)' }}>chevron_right</span>
            </button>
          )}

          {/* Include in shout */}
          <button onClick={handleToggleIncludeInShout} className="w-full flex items-center justify-between py-1.5 group">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.6)' }}>campaign</span>
              </div>
              <div>
                <p className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.8)' }}>Include in shout</p>
              </div>
            </div>
            <div className={"relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 " + (includeInShout ? 'shadow-glow-purple' : '')} style={{ background: includeInShout ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.08)' }}>
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-white" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transform: includeInShout ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
            </div>
          </button>

          {/* View space details */}
          <button onClick={() => setShowSpaceDetails(true)} className="w-full flex items-center justify-between py-1.5 group">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.6)' }}>info</span>
              </div>
              <div>
                <p className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.8)' }}>View all media, Files, Links</p>
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'rgba(90,100,120,0.4)' }}>chevron_right</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: '12px', color: 'rgba(90,100,120,0.4)' }}>search</span>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="input-field text-sm pl-8" style={{ paddingLeft: '2rem' }} />
          </div>
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto">
          {onlineMembers.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] font-body uppercase tracking-wider flex items-center gap-1.5" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)', color: 'rgba(34,197,94,0.7)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(34,197,94,0.8)', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
                Online — {onlineMembers.length}
              </div>
              {onlineMembers.map(m => (
                <div key={m.user_id} className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.03]">
                  <Avatar nickname={m.nickname} color={m.avatar_color} size="sm" showStatus online />
                  <span className="text-sm font-body flex-1 truncate" style={{ color: 'rgba(232,234,237,0.8)' }}>{m.nickname}</span>
                  {m.role === 'admin' && (
                    <span className="text-[9px] font-body uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(139,92,246,0.12)', color: 'rgba(139,92,246,0.7)', border: '1px solid rgba(139,92,246,0.2)' }}>admin</span>
                  )}
                  {isAdmin && m.user_id !== profile?.id && (
                    <button onClick={() => handleBlacklist(m)} className="text-[10px] font-body transition-colors" style={{ color: 'rgba(239,68,68,0.5)' }}>block</button>
                  )}
                </div>
              ))}
            </>
          )}
          {offlineMembers.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] font-body uppercase tracking-wider" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)', color: 'rgba(90,100,120,0.4)' }}>
                Offline — {offlineMembers.length}
              </div>
              {offlineMembers.map(m => (
                <div key={m.user_id} className="flex items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.03]">
                  <Avatar nickname={m.nickname} color={m.avatar_color} size="sm" showStatus />
                  <span className="text-sm font-body flex-1 truncate" style={{ color: 'rgba(232,234,237,0.55)' }}>{m.nickname}</span>
                  {m.role === 'admin' && (
                    <span className="text-[9px] font-body uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(139,92,246,0.08)', color: 'rgba(139,92,246,0.4)', border: '1px solid rgba(139,92,246,0.1)' }}>admin</span>
                  )}
                  {isAdmin && m.user_id !== profile?.id && (
                    <button onClick={() => handleBlacklist(m)} className="text-[10px] font-body transition-colors" style={{ color: 'rgba(239,68,68,0.35)' }}>block</button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <ContextMeter />

        {/* Admin actions */}
        {isAdmin && (
          <div className="p-3 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(139,92,246,0.08)' }}>
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body transition-all hover:bg-white/[0.04] text-left"
              style={{ color: 'rgba(232,234,237,0.4)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
              Reset Chat
            </button>
            <button
              onClick={() => setShowNukeModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body transition-all hover:bg-red-500/5 text-left"
              style={{ color: 'rgba(239,68,68,0.45)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'inherit' }}>delete_forever</span>
              Nuke Space
            </button>
          </div>
        )}

        {!isAdmin && (
          <div className="p-3" style={{ borderTop: '1px solid rgba(139,92,246,0.08)' }}>
            <button
              onClick={handleLeave}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-body transition-all hover:bg-red-500/5 text-center"
              style={{ color: 'rgba(239,68,68,0.45)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'inherit' }}>logout</span>
              Leave Space
            </button>
          </div>
        )}
      </div>

      {/* Space Details overlay */}
      {showSpaceDetails && (
        <div className="absolute inset-0 z-10" style={{ background: 'rgba(11,14,24,0.97)' }}>
          <SpaceDetails onBack={() => setShowSpaceDetails(false)} />
        </div>
      )}

      {showNukeModal && <DeleteSpaceModal spaceName={currentSpace?.name || ""} onConfirm={handleDeleteSpace} onDeleted={handleDeleteDone} onClose={() => setShowNukeModal(false)} />}
      {showResetModal && <ResetChatModal spaceName={currentSpace?.name || ""} onConfirm={handleResetChat} onDone={() => setShowResetModal(false)} onClose={() => setShowResetModal(false)} />}
      {showMuteModal && <MuteModal spaceName={currentSpace?.name || ""} onConfirm={handleMute} onClose={() => setShowMuteModal(false)} />}
      {renameConfirm && <RenameModal oldName={renameConfirm.from} newName={renameConfirm.to} onConfirm={confirmRename} onClose={() => { setRenameConfirm(null); setEditingName(false) }} />}
    </>
  )
}