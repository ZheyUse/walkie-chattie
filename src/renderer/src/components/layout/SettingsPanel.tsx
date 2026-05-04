import { useState, useEffect, useRef } from 'react'
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

const EMOJIS = [
  "🦅", "🔥", "⚡", "🎮", "🎯", "🎲",
  "🐉", "🌊", "🎸", "🏔️", "🌙", "🚀",
  "💎", "🌈", "🎨", "🎭", "🛸", "🔮",
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
  const [includeInShout, setIncludeInShout] = useState(() => {
    return localStorage.getItem('include_self_shout') === 'true'
  })
  const [copiedId, setCopiedId] = useState(false)

  // Reset copy-checkmark after 1.5s
  useEffect(() => {
    if (!copiedId) return
    const t = window.setTimeout(() => setCopiedId(false), 1500)
    return () => window.clearTimeout(t)
  }, [copiedId])
  const isAdmin = currentSpace?.owner_id === profile?.id

  const onlineMembers = members.filter(m => onlineUsers.has(m.user_id))
  const offlineMembers = members.filter(m => !onlineUsers.has(m.user_id))

  const handleRenameSpace = async () => {
    if (!currentSpace || !editNameValue.trim()) {
      setEditingName(false)
      return
    }
    if (editNameValue.trim() === currentSpace.name) {
      setEditingName(false)
      return
    }
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
    await supabase.from('space_members').update({ blacklisted: true }).
      eq('space_id', currentSpace.id).eq('user_id', member.user_id)
    setMembers(members.filter(m => m.user_id !== member.user_id))
  }

  const handleResetChat = async () => {
    if (!currentSpace) return
    await supabase.from('messages').delete().eq('space_id', currentSpace.id)
    await supabase.from('spaces').update({ context_window_used: 0 }).eq('id', currentSpace.id)
    setMessages([])
  }

  const handleDeleteSpace = async (): Promise<void> => {
    if (!currentSpace || !profile) {
      debugLog({ level: 'error', source: 'settings', message: 'Nuke space aborted: missing currentSpace or profile' })
      return
    }

    const spaceName = currentSpace.name
    const spaceId = currentSpace.id
    debugLog({ level: 'info', source: 'settings', message: `[nuke] Starting — space "${spaceName}" (${spaceId})`, details: { userId: profile.id } })

    debugLog({ level: 'info', source: 'settings', message: `[nuke] Deleting space_members for ${spaceId}` })
    const membersResult = await supabase.from('space_members').delete().eq('space_id', currentSpace.id)
    if (membersResult.error) {
      debugLog({ level: 'error', source: 'settings', message: `[nuke] Failed to delete space_members`, details: membersResult.error })
      throw membersResult.error
    }
    const memberCount = membersResult.count ?? 0
    debugLog({ level: 'info', source: 'settings', message: `[nuke] space_members deleted (${memberCount} rows)`, details: { spaceId, count: memberCount } })

    debugLog({ level: 'info', source: 'settings', message: `[nuke] Deleting space row ${spaceId}`, details: { ownerId: profile.id, spaceOwnerId: currentSpace.owner_id, match: currentSpace.owner_id === profile.id } })
    const spaceResult = await supabase.from('spaces').delete().eq('id', currentSpace.id).eq('owner_id', profile.id)
    debugLog({ level: 'info', source: 'settings', message: `[nuke] delete response`, details: { spaceResult } })
    if (spaceResult.error) {
      debugLog({ level: 'error', source: 'settings', message: `[nuke] Failed to delete space row`, details: spaceResult.error })
      throw spaceResult.error
    }
    debugLog({ level: 'info', source: 'settings', message: `[nuke] verify step — querying id: ${spaceId}`, details: { verifySpaceId: spaceId, currentSpaceId: currentSpace?.id } })

    const { data: verifyRow } = await supabase.from('spaces').select('id').eq('id', spaceId).maybeSingle()
    debugLog({ level: 'info', source: 'settings', message: `[nuke] verify result`, details: { verifyRow } })
    if (verifyRow) {
      debugLog({
        level: 'error',
        source: 'settings',
        message: `[nuke] Space still exists after delete — likely RLS blocking. Check "spaces" table RLS policies for DELETE as owner.`,
        details: { spaceId, verifyRow },
      })
      throw new Error(`RLS blocked delete of space "${spaceName}" — check DELETE policy on "spaces" table for owner`)
    }

    debugLog({ level: 'success', source: 'settings', message: `[nuke] Space "${spaceName}" nuked successfully`, details: { spaceId } })
  }

  const handleDeleteDone = async () => {
    if (!currentSpace || !profile) {
      setShowNukeModal(false)
      return
    }
    const { data: remain } = await supabase
      .from('space_members').select('space_id')
      .eq('user_id', profile.id).eq('blacklisted', false)
      .neq('space_id', currentSpace.id)

    if (remain && remain.length > 0) {
      const { data: next } = await supabase
        .from('spaces').select('*').eq('id', remain[0].space_id).maybeSingle()
      setSpace(next)
      setSpaces(next ? spaces.filter(s => s.id !== currentSpace.id) : [])
    } else {
      setSpace(null)
      setMessages([])
      setSpaces([])
    }
    setShowNukeModal(false)
  }

  const handleLeave = async () => {
    if (!currentSpace || !profile) return
    // Remove own membership FIRST so there's no orphan
    await supabase.from('space_members').delete().eq('space_id', currentSpace.id).eq('user_id', profile.id)

    const { data: remain } = await supabase
      .from('space_members').select('space_id')
      .eq('user_id', profile.id).eq('blacklisted', false)
      .neq('space_id', currentSpace.id)

    let nextSpace = null
    if (remain && remain.length > 0) {
      const { data: next } = await supabase
        .from('spaces').select('*').eq('id', remain[0].space_id).maybeSingle()
      nextSpace = next
    }
    setSpace(nextSpace)
    setMessages([])
    setSpaces(nextSpace ? spaces.filter(s => s.id !== currentSpace.id) : [])
  }

  return (
    <>
    <div className='w-72 bg-bg-base border-l border-border-lo flex flex-col h-full overflow-hidden'>
      <div className='p-4 border-b border-border-lo'>
        <h2 className='font-display font-bold text-text-hi'>Settings</h2>
        <p className='text-text-lo text-xs mt-0.5 flex items-center gap-1 flex-wrap'>
          <button onClick={() => { setAvatarPicker(true); setAvatarInput(currentSpace?.avatar_emoji || "") }} className="inline-block hover:opacity-80 text-lg leading-none">{currentSpace?.avatar_emoji}</button>
          {/* Space name — double-click to rename */}
          {isAdmin && editingName ? (
            <input
              value={editNameValue}
              onChange={e => setEditNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSpace()
                if (e.key === 'Escape') setEditingName(false)
              }}
              onBlur={() => {
                if (editNameValue.trim() && editNameValue.trim() !== currentSpace?.name) handleRenameSpace()
                else setEditingName(false)
              }}
              autoFocus
              className='input-field text-xs flex-1 min-w-0'
            />
          ) : (
            <span
              onDoubleClick={() => { setEditingName(true); setEditNameValue(currentSpace?.name || '') }}
              className={isAdmin ? 'cursor-pointer hover:text-accent' : ''}
            >{currentSpace?.name}</span>
          )}
          <span className="text-text-lo/50 text-[10px] font-mono ml-1 flex items-center gap-0.5">
            {currentSpace?.id}
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentSpace?.id || '')
                setCopiedId(true)
                toast('Space ID copied to clipboard')
              }}
              title='Copy space ID'
              className='inline-flex items-center text-text-lo hover:text-accent align-middle'
            >
              {copiedId ? (
                <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M20 6 9 17l-5-5' />
                </svg>
              ) : (
                <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <rect width='8' height='4' x='8' y='2' rx='1' ry='1' />
                  <path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' />
                </svg>
              )}
            </button>
          </span>
        </p>
      </div>

      {/* Avatar picker */}
      {avatarPicker && (
        <div className='p-4 border-b border-border-lo'>
          <p className='text-text-lo text-xs mb-2'>
            Current: <span className="text-xl">{currentSpace?.avatar_emoji}</span>
          </p>
          <div className='grid grid-cols-6 gap-1 mb-2'>
            {EMOJIS.map((e, i) => (
              <button key={i}
                onClick={() => handleChangeAvatar(e)}
                className='w-8 h-8 rounded hover:bg-bg-hover flex items-center justify-center text-lg'>
                {e}
              </button>
            ))}
          </div>
          <div className='flex gap-2'>
            <input
              value={avatarInput}
              onChange={e => setAvatarInput(e.target.value)}
              maxLength={2}
              className='input-field text-sm w-16 text-center text-lg'
              placeholder='🙂'
            />
            <button onClick={() => handleChangeAvatar(avatarInput)} className='btn-primary text-xs px-2'>Set</button>
            <button onClick={() => setAvatarPicker(false)} className='input-field text-xs px-2'>Cancel</button>
          </div>
        </div>
      )}

      {/* Chat preferences */}
      <div className='p-4 border-b border-border-lo'>
        <p className='text-text-lo text-xs font-body uppercase tracking-wider mb-2'>Preferences</p>
        <button
          onClick={handleToggleIncludeInShout}
          className='w-full flex items-center justify-between py-1 group'
        >
          <div className='text-left'>
            <p className='text-text-hi text-sm font-body'>Include in shout</p>
            <p className='text-text-lo text-xs'>Receive your own /shout messages</p>
          </div>
          <div className={
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-2 ' +
            (includeInShout ? 'bg-accent' : 'bg-bg-surface border border-border-md')
          }>
            <span className={
              'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ' +
              (includeInShout ? 'translate-x-5' : 'translate-x-0.5')
            } />
          </div>
        </button>
      </div>

      {/* Search */}
      <div className='p-4 border-b border-border-lo'>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder='Search messages...'
          className='input-field text-sm'
        />
      </div>

      {/* Members */}
      <div className='flex-1 overflow-y-auto'>
        {/* Online section */}
        {onlineMembers.length > 0 && (
          <>
            <div className='px-4 py-1.5 text-text-lo text-xs font-body uppercase tracking-wider border-b border-border-lo'>
              Online — {onlineMembers.length}
            </div>
            {onlineMembers.map(m => (
              <div key={m.user_id} className='flex items-center gap-2 px-4 py-2 hover:bg-bg-hover transition-colors'>
                <Avatar nickname={m.nickname} color={m.avatar_color} size='sm' showStatus online />
                <span className='text-text-hi text-sm font-body flex-1 truncate'>{m.nickname}</span>
                {m.role === 'admin' && <span className='text-accent text-xs border border-accent rounded px-1'>admin</span>}
                {isAdmin && m.user_id !== profile?.id && (
                  <button onClick={() => handleBlacklist(m)} className='text-red-400 text-xs hover:underline'>block</button>
                )}
              </div>
            ))}
          </>
        )}
        {/* Offline section */}
        {offlineMembers.length > 0 && (
          <>
            <div className='px-4 py-1.5 text-text-lo text-xs font-body uppercase tracking-wider border-b border-border-lo'>
              Offline — {offlineMembers.length}
            </div>
            {offlineMembers.map(m => (
              <div key={m.user_id} className='flex items-center gap-2 px-4 py-2 hover:bg-bg-hover transition-colors'>
                <Avatar nickname={m.nickname} color={m.avatar_color} size='sm' showStatus />
                <span className='text-text-hi text-sm font-body flex-1 truncate'>{m.nickname}</span>
                {m.role === 'admin' && <span className='text-accent text-xs border border-accent rounded px-1'>admin</span>}
                {isAdmin && m.user_id !== profile?.id && (
                  <button onClick={() => handleBlacklist(m)} className='text-red-400 text-xs hover:underline'>block</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <ContextMeter />

      {/* Admin actions */}
      {isAdmin && (
        <div className='p-4 border-t border-border-lo flex flex-col gap-2'>
          <button onClick={() => setShowResetModal(true)} className='text-text-lo text-sm hover:text-text-hi text-left'>Reset Chat</button>

          <button onClick={() => setShowNukeModal(true)} className='text-red-400 text-sm hover:underline text-left'>Nuke Space</button>
        </div>
      )}

      {/* Member view */}
      {!isAdmin && (
        <div className='p-4 border-t border-border-lo'>
          <button onClick={handleLeave} className='text-red-400 text-sm hover:underline w-full text-left'>
            Leave Space
          </button>
        </div>
      )}
    </div>
    {showNukeModal && (
      <DeleteSpaceModal
        spaceName={currentSpace?.name || ""}
        onConfirm={handleDeleteSpace}
        onDeleted={handleDeleteDone}
        onClose={() => setShowNukeModal(false)}
      />
    )}
    {showResetModal && (
      <ResetChatModal
        spaceName={currentSpace?.name || ""}
        onConfirm={handleResetChat}
        onDone={() => setShowResetModal(false)}
        onClose={() => setShowResetModal(false)}
      />
    )}
    {renameConfirm && (
      <RenameModal
        oldName={renameConfirm.from}
        newName={renameConfirm.to}
        onConfirm={confirmRename}
        onClose={() => { setRenameConfirm(null); setEditingName(false) }}
      />
    )}
    </>
  )
}