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

const AVATAR_EMOJIS = [
  "🚀", "🛸", "🌌", "⭐", "🌙", "🪐",
  "🔮", "💎", "⚡", "🔥", "🎯", "🎮",
  "🛡️", "🔭", "🌊", "⚔️",
]

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
                <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6 9 17l-5-5' /></svg>
              ) : (
                <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
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
          <button onClick={handleToggleIncludeInShout} className="w-full flex items-center justify-between py-1.5 group">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-body" style={{ color: 'rgba(232,234,237,0.8)' }}>Include in shout</p>
              </div>
            </div>
            <div className={"relative inline-flex h-5 w-9 items-center rounded-full transition-all flex-shrink-0 " + (includeInShout ? 'shadow-glow-purple' : '')} style={{ background: includeInShout ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.08)' }}>
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-white" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transform: includeInShout ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(90,100,120,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="input-field text-sm pl-8" style={{ paddingLeft: '2rem' }} />
          </div>
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto">
          {onlineMembers.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] font-body uppercase tracking-wider flex items-center gap-1.5" style={{ borderBottom: '1px solid rgba(139,92,246,0.06)', color: 'rgba(139,92,246,0.5)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(139,92,246,0.6)', boxShadow: '0 0 6px rgba(139,92,246,0.5)' }} />
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset Chat
            </button>
            <button
              onClick={() => setShowNukeModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body transition-all hover:bg-red-500/5 text-left"
              style={{ color: 'rgba(239,68,68,0.45)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Leave Space
            </button>
          </div>
        )}
      </div>

      {showNukeModal && <DeleteSpaceModal spaceName={currentSpace?.name || ""} onConfirm={handleDeleteSpace} onDeleted={handleDeleteDone} onClose={() => setShowNukeModal(false)} />}
      {showResetModal && <ResetChatModal spaceName={currentSpace?.name || ""} onConfirm={handleResetChat} onDone={() => setShowResetModal(false)} onClose={() => setShowResetModal(false)} />}
      {renameConfirm && <RenameModal oldName={renameConfirm.from} newName={renameConfirm.to} onConfirm={confirmRename} onClose={() => { setRenameConfirm(null); setEditingName(false) }} />}
    </>
  )
}