import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { useSpaceStore } from '../../stores/space.store'
import { useChatStore } from '../../stores/chat.store'
import type { Message } from '../../stores/chat.store'
import Avatar from '../ui/Avatar'

interface Props {
  msg: Message
  showAvatar?: boolean
  showNickname?: boolean
}

function shoutFont(msg: string) {
  if (msg.length < 20) return 'text-2xl font-display font-bold'
  if (msg.length < 50) return 'text-xl font-display font-bold'
  if (msg.length < 100) return 'text-lg font-display font-semibold'
  return 'text-base font-display'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function SendingSpinner() {
  return (
    <div className="flex items-center gap-1">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        className="animate-spin" style={{ color: 'rgba(139,92,246,0.5)' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span className="text-[10px] font-body" style={{ color: 'rgba(139,92,246,0.5)' }}>sending</span>
    </div>
  )
}

function SentIcon() {
  return (
    <div className="flex items-center gap-0.5">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(139,92,246,0.4)' }}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  )
}

function ReceivedIcon() {
  return (
    <div className="flex items-center gap-0.5">
      <svg viewBox="0 0 30 14" width="18" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue">
        <path d="M20 6 9 17l-5-5" />
        <path d="M28 6 17 17" />
      </svg>
    </div>
  )
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      title="Retry sending"
      className="flex items-center justify-center w-5 h-5 rounded-full transition-all hover:bg-red-500/20"
      style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'rgba(239, 68, 68, 0.7)' }}
    >
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    </button>
  )
}

function MessageStatusIndicator({ msg, onRetry }: { msg: Message; onRetry: () => void }) {
  if (msg.status === 'sending') return <SendingSpinner />
  if (msg.status === 'sent') return <SentIcon />
  if (msg.status === 'delivered') return <ReceivedIcon />
  if (msg.status === 'error') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px]" style={{ color: 'rgba(239,68,68,0.7)' }}>Failed</span>
        <RetryButton onRetry={onRetry} />
      </div>
    )
  }
  return null
}

export default function MessageItem({ msg, showAvatar = true, showNickname = true }: Props) {
  const { profile } = useAuthStore()
  const members = useSpaceStore(s => s.members)
  const retryMessage = useChatStore(s => s.retryMessage)
  const [revealStatus, setRevealStatus] = useState(false)
  const msgRowRef = useRef<HTMLDivElement>(null)

  const isOwn = msg.sender_id === profile?.id

  useEffect(() => {
    if (revealStatus) msgRowRef.current?.scrollIntoView({ block: 'nearest' })
  }, [revealStatus])

  if (msg.type === 'system') {
    return (
      <div className='flex justify-center py-1'>
        <span className='text-[11px] font-body italic px-3 py-0.5 rounded-full' style={{ color: 'rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.06)' }}>
          {msg.content}
        </span>
      </div>
    )
  }

  const seenByOthers = (msg.seenBy || []).filter(id => id !== profile?.id && id !== msg.sender_id)
  const seenLabels = seenByOthers.map(id => {
    const m = members.find(m => m.user_id === id)
    return m ? m.nickname : id.slice(0, 6)
  })

  const avatarColor = profile?.id === msg.sender_id ? (profile?.avatar_color || '#8b5cf6') : '#8b5cf6'

  return (
    <div
      ref={msgRowRef}
      className={"px-3 py-1 flex gap-2 items-end group " + (isOwn ? 'flex-row-reverse' : '')}
      style={{ transition: 'all 0.15s ease' }}
    >
      {showAvatar && !isOwn && (
        <Avatar nickname={msg.sender_nickname} color={avatarColor} size="sm" />
      )}
      {!showAvatar && !isOwn && <div className="w-8 flex-shrink-0" />}

      <div className={"flex flex-col gap-0.5 " + (isOwn ? 'items-end' : 'items-start') + ' max-w-[72%]'}>
        {showNickname && !isOwn && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-display font-medium" style={{ color: 'rgba(139,92,246,0.6)' }}>
              {msg.sender_nickname}
            </span>
            <span className="text-[10px] font-body" style={{ color: 'rgba(90,100,120,0.6)' }}>
              {formatTime(msg.created_at)}
            </span>
          </div>
        )}

        <div
          onClick={() => { if (isOwn && msg.status === 'sent') setRevealStatus(v => !v) }}
          className={
            'text-left rounded-xl transition-all duration-150 ' +
            (isOwn && msg.status === 'sent' ? 'cursor-pointer hover:opacity-90' : 'cursor-default')
          }
        >
          <div className="flex flex-col gap-0.5">
            {msg.type === 'shout' ? (
              <div
                className="px-3.5 py-2 rounded-xl rounded-tl-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,101,42,0.18) 0%, rgba(180,50,20,0.1) 100%)',
                  border: '1px solid rgba(232,101,42,0.25)',
                  borderLeft: '3px solid rgba(232,101,42,0.6)',
                }}
              >
                <div
                  className={"text-shout font-display font-bold " + shoutFont(msg.content || '')}
                  style={{ textShadow: '0 0 20px rgba(232,101,42,0.3)' }}
                >
                  {msg.content}
                </div>
              </div>
            ) : msg.type === 'whisper' ? (
              <div
                className="px-3.5 py-2 rounded-xl rounded-tl-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.06) 100%)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderLeft: '3px solid rgba(139,92,246,0.5)',
                }}
              >
                <div style={{ color: 'rgba(167,139,250,0.85)', fontSize: '0.8125rem' }} className="font-body italic">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div
                className={
                  "px-3.5 py-2.5 rounded-xl " +
                  (isOwn
                    ? 'rounded-tr-none'
                    : 'rounded-tl-none')
                }
                style={{
                  background: isOwn
                    ? 'linear-gradient(135deg, rgba(26,159,255,0.15) 0%, rgba(15,70,110,0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid',
                  borderColor: isOwn
                    ? 'rgba(26,159,255,0.2)'
                    : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {msg.gif_url && (
                  <img src={msg.gif_url} alt="GIF" className="max-h-48 rounded-lg object-contain mb-1.5" />
                )}
                {msg.image_url && (
                  <img src={msg.image_url} alt="Image" className="max-h-64 rounded-lg object-contain mb-1.5 cursor-pointer" style={{ opacity: 0.9 }} />
                )}
                {msg.content && (
                  <p className="text-sm font-body whitespace-pre-wrap break-words" style={{ color: 'rgba(232,234,237,0.92)', lineHeight: '1.5' }}>{msg.content}</p>
                )}
              </div>
            )}

            {/* Status indicators */}
            {isOwn && msg.status && msg.status !== 'sent' && (
              <div className='self-end'>
                <MessageStatusIndicator msg={msg} onRetry={() => retryMessage(msg)} />
              </div>
            )}
            {isOwn && msg.status === 'sent' && revealStatus && (
              <div className='self-end'>
                <SentIcon />
              </div>
            )}
          </div>
        </div>

        {/* Seen by */}
        {isOwn && seenLabels.length > 0 && (
          <span className="text-[10px] font-body italic" style={{ color: 'rgba(139,92,246,0.45)' }}>
            seen by {seenLabels.join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}