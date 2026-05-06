import 'material-symbols'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore } from '../../stores/chat.store'
import type { Message } from '../../stores/chat.store'
import Avatar from '../ui/Avatar'
import { toast } from '../../lib/toast'

interface Props {
  msg: Message
  showAvatar?: boolean
  showNickname?: boolean
  showTimestamp?: boolean
}

const QUICK_REACTIONS = ['❤️', '😂', '😢']

function shoutFont(msg: string) {
  if (msg.length < 20) return 'text-2xl font-display font-bold'
  if (msg.length < 50) return 'text-xl font-display font-bold'
  if (msg.length < 100) return 'text-lg font-display font-semibold'
  return 'text-base font-display'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function systemMessageIcon(content: string | null) {
  const text = (content || '').toLowerCase()
  if (text.includes('airlock')) return 'sensor_door'
  if (text.includes('left') || text.includes('exited')) return 'logout'
  if (text.includes('vanished') || text.includes('void')) return 'blur_on'
  if (text.includes('disconnected') || text.includes('powered down')) return 'power_settings_new'
  if (text.includes('drifted')) return 'air'
  if (text.includes('bailed')) return 'directions_run'
  if (text.includes('radar')) return 'radar'
  if (text.includes('orbit')) return 'orbit'
  if (text.includes('spawned')) return 'joystick'
  if (text.includes('landed')) return 'rocket_launch'
  if (text.includes('door')) return 'door_open'
  if (text.includes('phased') || text.includes('warped')) return 'auto_awesome'
  if (text.includes('deck')) return 'explore'
  return 'rocket_launch'
}

const EMOJI_PICKER_EMOJIS = [
  '😀','😂','😍','🥳','🤔','😅','😭','😎','🥺','🤣',
  '👍','👎','👏','🙌','💯','🔥','✨','🎉','💔','🙏',
  '😮','😱','🤯','😈','💀','🙈','💬','👀','⭐','🚀',
]


function renderContent(text: string) {
  // Split by both @mentions and URLs
  const parts: (string | React.ReactNode)[] = []
  const combinedRegex = /(@\S+|https?:\/\/\S+)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  combinedRegex.lastIndex = 0
  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith('@')) {
      const name = token.slice(1)
      const isAll = name.toLowerCase() === 'all'
      parts.push(
        <span
          key={match.index}
          className={isAll ? 'font-bold' : 'font-bold'}
          style={{ color: isAll ? 'rgba(34,197,94,0.95)' : 'rgba(167,139,250,0.9)' }}
        >
          @{name}
        </span>
      )
    } else {
      // URL
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noreferrer"
          className="hover:underline transition-colors"
          style={{ color: 'rgba(167,139,250,0.85)' }}
          title={token}
        >
          {token}
        </a>
      )
    }
    lastIndex = combinedRegex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function ActionBarTooltip({ label, flipUp = false, children }: { label: string; flipUp?: boolean; children: React.ReactNode }) {
  return (
    <div className='group/s relative'>
      {children}
      <div className={'absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-display font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover/s:opacity-100 transition-opacity z-50 ' + (flipUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5')}
        style={{ background: 'rgba(9,11,20,0.95)', color: 'rgba(232,234,237,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {label}
      </div>
    </div>
  )
}

export default function MessageItem({ msg, showAvatar = true, showNickname = true, showTimestamp = false }: Props) {
  const { profile } = useAuthStore()
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const retryMessage = useChatStore(s => s.retryMessage)
  const toggleReaction = useChatStore(s => s.toggleReaction)
  const setEditingMessage = useChatStore(s => s.setEditingMessage)
  const removeMessage = useChatStore(s => s.removeMessage)

  const [hovered, setHovered] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const [nearTop, setNearTop] = useState(false)

  const isOwn = msg.sender_id === profile?.id

  useEffect(() => {
    if (!showMoreMenu && !showEmojiPicker) return
    function handleClick(e: MouseEvent) {
      // Don't close if clicking the More button itself (its onClick handles the toggle)
      if (moreBtnRef.current?.contains(e.target as Node)) return
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false)
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMoreMenu, showEmojiPicker])

  useEffect(() => {
    function recalc() {
      const el = rowRef.current
      if (!el) return
      const list = el.closest('.overflow-y-auto') as HTMLElement | null
      if (!list) { setNearTop(false); return }
      const listRect = list.getBoundingClientRect()
      const rowRect = el.getBoundingClientRect()
      const scrollableHeight = list.scrollHeight
      if (scrollableHeight === 0) { setNearTop(false); return }
      const rowMidY = rowRect.top - listRect.top + list.scrollTop + rowRect.height / 2
      const positionRatio = rowMidY / scrollableHeight
      setNearTop(positionRatio < 0.20)
    }

    recalc()

    // Keep nearTop live while menu/picker is open so toggling works correctly after scrolling
    if (!showMoreMenu && !showEmojiPicker) return
    const list = (rowRef.current?.closest('.overflow-y-auto') as HTMLElement | null)
    list?.addEventListener('scroll', recalc, { passive: true })
    return () => list?.removeEventListener('scroll', recalc)
  }, [showMoreMenu, showEmojiPicker])

  const handleQuickReaction = (emoji: string) => {
    if (!profile) return
    toggleReaction(msg.id, emoji, profile.id)
  }

  const handleEdit = () => {
    if (!isOwn || msg.type === 'system') return
    setEditingMessage(msg)
    toast('Editing message')
    setShowMoreMenu(false)
  }

  const handleDelete = async () => {
    setShowMoreMenu(false)
    removeMessage(msg.id)
    await import('../../lib/supabase').then(({ supabase }) =>
      supabase.from('messages').delete().eq('id', msg.id)
    )
    toast('Message deleted')
  }

  const handleCopyText = () => {
    if (msg.content) navigator.clipboard.writeText(msg.content)
    toast('Text copied to clipboard')
    setShowMoreMenu(false)
  }

  const renderBubble = () => {
    if (msg.type === 'shout') {
      return (
        <div
          onClick={() => {
            if (!profile) return
            window.api.showShout({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined, spaceName: currentSpace?.name, spaceIcon: currentSpace?.avatar_emoji })
          }}
          className='px-3.5 py-2 rounded-xl rounded-tl-none cursor-pointer hover:opacity-90'
          style={{ background: 'linear-gradient(135deg, rgba(232,101,42,0.18) 0%, rgba(180,50,20,0.1) 100%)', border: '1px solid rgba(232,101,42,0.25)', borderLeft: '3px solid rgba(232,101,42,0.6)' }}
        >
          <div className={"text-shout font-display font-bold " + shoutFont(msg.content || '')} style={{ textShadow: '0 0 20px rgba(232,101,42,0.3)' }}>{msg.content}</div>
        </div>
      )
    }
    if (msg.type === 'whisper' || msg.type === 'tap') {
      return (
        <div
          onClick={() => {
            if (!profile) return
            window.api.showTap({ sender: msg.sender_nickname, message: msg.content || '', gifUrl: msg.gif_url || undefined })
          }}
          className='px-3.5 py-2 rounded-xl rounded-tl-none cursor-pointer hover:opacity-90'
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.06) 100%)', border: '1px solid rgba(139,92,246,0.2)', borderLeft: '3px solid rgba(139,92,246,0.5)' }}
        >
          <div style={{ color: 'rgba(167,139,250,0.85)', fontSize: '0.8125rem' }} className='font-body italic line-clamp-3'>{msg.content}</div>
        </div>
      )
    }
    return (
      <div
        className='px-3.5 py-2.5 rounded-xl rounded-tl-none'
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
      >
        {msg.gif_url && <img src={msg.gif_url} alt='GIF' className='max-h-48 rounded-lg object-contain mb-1.5' />}
        {msg.image_url && <img src={msg.image_url} alt='Image' className='max-h-64 rounded-lg object-contain mb-1.5 cursor-pointer' style={{ opacity: 0.9 }} />}
        {msg.content && <p className='text-sm font-body whitespace-pre-wrap break-words leading-relaxed' style={{ color: 'rgba(232,234,237,0.92)' }}>{renderContent(msg.content)}</p>}
      </div>
    )
  }

  if (msg.type === 'system') {
    return (
      <div className='flex justify-center py-2 px-3'>
        <div
          className='group flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-[1.02]'
          style={{
            color: 'rgba(232,234,237,0.82)',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(26,159,255,0.08))',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 6px 24px rgba(139,92,246,0.08)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '13px', color: 'rgba(167,139,250,0.85)' }}
          >
            {systemMessageIcon(msg.content)}
          </span>
          <span className='text-[11px] font-display font-semibold tracking-wide'>
            {msg.content}
          </span>
          <span
            className='w-1.5 h-1.5 rounded-full animate-pulse'
            style={{ background: 'rgba(26,159,255,0.8)', boxShadow: '0 0 8px rgba(26,159,255,0.6)' }}
          />
        </div>
      </div>
    )
  }

  const avatarColor = profile?.id === msg.sender_id ? (profile?.avatar_color || '#8b5cf6') : '#8b5cf6'
  const avatarPicture = profile?.id === msg.sender_id
    ? profile?.picture
    : useSpaceStore.getState().getMemberPicture(msg.sender_id)

  return (
    <div
      ref={rowRef}
      className='relative flex gap-3 px-2 py-1 hover:bg-white/[0.02] group'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className='flex-shrink-0' style={{ width: '40px', paddingTop: '2px' }}>
        {showAvatar ? (
          <Avatar nickname={msg.sender_nickname} picture={avatarPicture} color={avatarColor} size='md' />
        ) : (
          <div style={{ width: '40px' }} />
        )}
      </div>

      {/* Main column */}
      <div className='flex-1 min-w-0'>
        {/* Header: username + timestamp */}
        {(showNickname || showTimestamp) && (
          <div className='flex items-baseline gap-2 mb-0.5'>
            {showNickname && (
              <span className='text-sm font-display font-semibold' style={{ color: 'rgba(232,234,237,0.95)' }}>
                {msg.sender_nickname}
              </span>
            )}
            {showTimestamp && (
              <span className='text-[11px] font-body' style={{ color: 'rgba(90,100,120,0.6)' }}>
                {formatTime(msg.created_at)}
              </span>
            )}
          </div>
        )}

        {/* Bubble row */}
        <div className='flex items-start gap-2'>
          <div>{renderBubble()}</div>

          {/* Own message status */}
          {isOwn && msg.status && (
            <div className='flex-shrink-0 flex items-center gap-px' style={{ paddingTop: '8px' }}>
              {msg.status === 'sending' && (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.5)' }}>progress_activity</span>
              )}
              {msg.status === 'sent' && (
                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.4)' }}>check</span>
              )}
              {msg.status === 'delivered' && (
                <div className='flex items-center gap-px'>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.4)' }}>check</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'rgba(139,92,246,0.4)' }}>check</span>
                </div>
              )}
              {msg.status === 'error' && (
                <div className='flex items-center gap-1'>
                  <span className='text-[10px]' style={{ color: 'rgba(239,68,68,0.7)' }}>Failed</span>
                  <button
                    onClick={() => retryMessage(msg)}
                    title='Retry'
                    className='w-5 h-5 rounded-full flex items-center justify-center'
                    style={{ background: 'rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.7)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>refresh</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reaction counts */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-1'>
            {msg.reactions.map(r => {
              const reacted = r.userIds.includes(profile?.id || '')
              return (
                <button
                  key={r.emoji}
                  onClick={() => handleQuickReaction(r.emoji)}
                  className='flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors cursor-pointer'
                  style={{
                    background: reacted ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                    border: reacted ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    color: reacted ? 'rgba(167,139,250,0.9)' : 'rgba(232,234,237,0.7)',
                  }}
                >
                  <span>{r.emoji}</span>
                  <span className='font-body text-[11px]'>{r.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Action bar — absolutely positioned top-right, transitions in on hover */}
      <div
        className='absolute flex items-center gap-0.5'
        style={{
          right: '8px',
          top: showNickname || showTimestamp ? '0' : '4px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: hovered || showMoreMenu || showEmojiPicker ? 'auto' : 'none',
        }}
      >
        {/* Quick reactions */}
        {QUICK_REACTIONS.map(emoji => {
          const reaction = msg.reactions?.find(r => r.emoji === emoji)
          const reacted = reaction?.userIds.includes(profile?.id || '')
          return (
            <ActionBarTooltip key={emoji} label='Add reaction' flipUp={!nearTop}>
              <button
                onClick={() => handleQuickReaction(emoji)}
                className='w-7 h-7 rounded-lg flex items-center justify-center text-[14px] transition-all hover:scale-110 cursor-pointer'
                style={{ background: reacted ? 'rgba(255,255,255,0.15)' : 'rgba(9,11,20,0.6)', backdropFilter: 'blur(8px)', border: reacted ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)' }}
              >
                {emoji}
              </button>
            </ActionBarTooltip>
          )
        })}

        {/* Add reaction */}
        <div className='relative'>
          <ActionBarTooltip label='Add reaction' flipUp={!nearTop}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(v => !v); setShowMoreMenu(false) }}
              className='w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer'
              style={{ background: 'rgba(9,11,20,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,234,237,0.5)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_reaction</span>
            </button>
          </ActionBarTooltip>
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className='absolute right-0 top-full mt-1 p-2 rounded-xl z-50'
              style={{ background: 'rgba(20,22,35,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '192px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className='grid grid-cols-6 gap-1'>
                {EMOJI_PICKER_EMOJIS.map(emoji => {
                  const reaction = msg.reactions?.find(r => r.emoji === emoji)
                  const reacted = reaction?.userIds.includes(profile?.id || '')
                  return (
                    <button
                      key={emoji}
                      onClick={() => { handleQuickReaction(emoji); setShowEmojiPicker(false) }}
                      className='w-7 h-7 rounded-lg flex items-center justify-center text-[15px] hover:bg-white/[0.08] transition-colors cursor-pointer'
                      style={{ background: reacted ? 'rgba(139,92,246,0.2)' : 'transparent' }}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reply (others) / Edit (own) */}
        {!isOwn ? (
          <ActionBarTooltip label='Reply' flipUp={!nearTop}>
            <button
              className='w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer'
              style={{ background: 'rgba(9,11,20,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,234,237,0.5)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>reply</span>
            </button>
          </ActionBarTooltip>
        ) : (
          <ActionBarTooltip label='Edit' flipUp={!nearTop}>
            <button
              onClick={handleEdit}
              className='w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer'
              style={{ background: 'rgba(9,11,20,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,234,237,0.5)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
            </button>
          </ActionBarTooltip>
        )}

        {/* More menu (own messages) */}
        {isOwn && (
          <div className='relative'>
            <ActionBarTooltip label='More' flipUp={!nearTop}>
              <button
                ref={moreBtnRef}
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu(v => !v) }}
                className='w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer'
                style={{ background: 'rgba(9,11,20,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,234,237,0.5)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>more_horiz</span>
              </button>
            </ActionBarTooltip>
            {showMoreMenu && (
              <div
                ref={moreMenuRef}
                className={'absolute right-0 rounded-xl py-1 z-50 ' + (nearTop ? 'top-full mt-1' : 'bottom-full mb-1')}
                style={{ background: 'rgba(20,22,35,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '160px' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={handleEdit}
                  className='w-full flex items-center gap-2.5 px-3 py-2 text-sm font-body transition-colors cursor-pointer'
                  style={{ color: 'rgba(232,234,237,0.8)', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>edit</span>
                  <span className='whitespace-nowrap'>Edit Message</span>
                </button>
                <button
                  onClick={handleCopyText}
                  className='w-full flex items-center gap-2.5 px-3 py-2 text-sm font-body transition-colors cursor-pointer'
                  style={{ color: 'rgba(232,234,237,0.8)', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>content_copy</span>
                  <span className='whitespace-nowrap'>Copy Text</span>
                </button>
                <div className='my-1 mx-2' style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                <button
                  onClick={handleDelete}
                  className='w-full flex items-center gap-2.5 px-3 py-2 text-sm font-body transition-colors cursor-pointer'
                  style={{ color: 'rgba(239,68,68,0.7)', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>delete</span>
                  <span className='whitespace-nowrap'>Delete Message</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
