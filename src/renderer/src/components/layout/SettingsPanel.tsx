import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth.store'
import { useSpaceStore, type Member } from '../../stores/space.store'
import { useChatStore } from '../../stores/chat.store'
import Avatar from '../ui/Avatar'
import ContextMeter from '../ui/ContextMeter'

const EMOJIS = [
  "🦅", "🔥", "⚡", "🎮", "🎯", "🎲",
  "🐉", "🌊", "🎸", "🏔️", "🌙", "🚀",
  "💎", "🌈", "🎨", "🎭", "🛸", "🔮",
]

export default function SettingsPanel() {
  const { profile } = useAuthStore()
  const { currentSpace, members, setSpace, setSpaces, spaces, setMembers, onlineUsers } = useSpaceStore()
  const { setMessages, searchQuery, setSearchQuery } = useChatStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [avatarPicker, setAvatarPicker] = useState(false)
  const [avatarInput, setAvatarInput] = useState("")
  const isAdmin = currentSpace?.owner_id === profile?.id

  const onlineMembers = members.filter(m => onlineUsers.has(m.user_id))
  const offlineMembers = members.filter(m => !onlineUsers.has(m.user_id))

  const handleRenameSpace = async () => {
    if (!currentSpace || !nameInput.trim()) return
    await supabase.from('spaces').update({ name: nameInput.trim() }).eq('id', currentSpace.id)
    setSpace({ ...currentSpace, name: nameInput.trim() })
    setSpaces(spaces.map(s => s.id === currentSpace.id ? { ...s, name: nameInput.trim() } : s))
    setRenaming(false)
  }

  const handleChangeAvatar = async (emoji: string) => {
    if (!currentSpace) return
    await supabase.from('spaces').update({ avatar_emoji: emoji }).eq('id', currentSpace.id)
    setSpace({ ...currentSpace, avatar_emoji: emoji })
    setSpaces(spaces.map(s => s.id === currentSpace.id ? { ...s, avatar_emoji: emoji } : s))
    setAvatarPicker(false)
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
    setConfirmReset(false)
  }

  const handleDeleteSpace = async () => {
    if (!currentSpace || !profile) return
    const { data: remain } = await supabase
      .from('space_members').select('space_id')
      .eq('user_id', profile.id).eq('blacklisted', false)
      .neq('space_id', currentSpace.id)

    await supabase.from('spaces').delete().eq('id', currentSpace.id).eq('owner_id', profile.id)

    if (remain && remain.length > 0) {
      const { data: next } = await supabase
        .from('spaces').select('*').eq('id', remain[0].space_id).maybeSingle()
      if (next) setSpace(next)
      else setSpace(null)
    } else {
      setSpace(null)
    }
    setMessages([])
    setConfirmDelete(false)
    setSpaces(spaces.filter(s => s.id !== currentSpace.id))
  }

  const handleLeave = async () => {
    if (!currentSpace || !profile) return
    const { data: remain } = await supabase
      .from('space_members').select('space_id')
      .eq('user_id', profile.id).eq('blacklisted', false)
      .neq('space_id', currentSpace.id)

    await supabase.from('space_members').delete().eq('space_id', currentSpace.id).eq('user_id', profile.id)

    if (remain && remain.length > 0) {
      const { data: next } = await supabase
        .from('spaces').select('*').eq('id', remain[0].space_id).maybeSingle()
      if (next) setSpace(next)
      else setSpace(null)
    } else {
      setSpace(null)
    }
    setMessages([])
    setSpaces(spaces.filter(s => s.id !== currentSpace.id))
  }

  return (
    <div className='w-72 bg-bg-base border-l border-border-lo flex flex-col h-full overflow-hidden'>
      <div className='p-4 border-b border-border-lo'>
        <h2 className='font-display font-bold text-text-hi'>Settings</h2>
        <p className='text-text-lo text-xs mt-0.5'>
          <button onClick={() => { setAvatarPicker(true); setAvatarInput(currentSpace?.avatar_emoji || "") }} className="inline-block hover:opacity-80 text-lg leading-none mr-1">{currentSpace?.avatar_emoji}</button>
          {currentSpace?.name}
          {isAdmin && (
            <button onClick={() => { setRenaming(true); setNameInput(currentSpace?.name || "") }} className="ml-2 text-text-lo hover:text-accent text-xs">rename</button>
          )}
        </p>
      </div>

      {/* Rename inline form */}
      {renaming && (
        <div className='p-4 border-b border-border-lo'>
          <div className="flex gap-2">
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameSpace()}
              className='input-field text-sm flex-1'
              autoFocus
            />
            <button onClick={handleRenameSpace} className='btn-primary text-xs px-2'>Save</button>
            <button onClick={() => setRenaming(false)} className='input-field text-xs px-2'>Cancel</button>
          </div>
        </div>
      )}

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
          {confirmReset ? (
            <div className='flex gap-2'>
              <button onClick={handleResetChat} className='btn-shout text-xs py-1.5 flex-1'>Confirm Reset</button>
              <button onClick={() => setConfirmReset(false)} className='input-field text-xs py-1.5 flex-1'>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className='text-text-lo text-sm hover:text-text-hi text-left'>Reset Chat</button>
          )}

          {confirmDelete ? (
            <div className='flex gap-2'>
              <button onClick={handleDeleteSpace} className='btn-shout text-xs py-1.5 flex-1'>Confirm Delete</button>
              <button onClick={() => setConfirmDelete(false)} className='input-field text-xs py-1.5 flex-1'>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className='text-red-400 text-sm hover:underline text-left'>Delete Space</button>
          )}
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
  )
}