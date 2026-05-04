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

// Animated spinner for "sending" status
function SendingSpinner() {
  return (
    <div className="flex items-center gap-1">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        className="text-text-lo animate-spin" style={{ animation: 'spin 0.8s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span className="text-text-lo text-xs">sending</span>
    </div>
  )
}

// Single checkmark (sent)
function SentIcon() {
  return (
    <div className="flex items-center gap-1">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-lo">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span className="text-text-lo text-xs">sent</span>
    </div>
  )
}

// Double checkmark (received / delivered) — Messenger blue
function ReceivedIcon() {
  return (
    <div className="flex items-center gap-1">
      <svg viewBox="0 0 30 14" width="20" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
        <path d="M20 6 9 17l-5-5" />
        <path d="M28 6 17 17" />
      </svg>
      <span className="text-accent text-xs">Received</span>
    </div>
  )
}

// Retry button for error
function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      title="Retry sending"
      className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all"
    >
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    </button>
  )
}

function MessageStatusIndicator({ msg, onRetry }: { msg: Message; onRetry: () => void }) {
  if (msg.status === 'sending') {
    return <SendingSpinner />
  }
  if (msg.status === 'sent') {
    return <SentIcon />
  }
  if (msg.status === 'delivered') {
    return <ReceivedIcon />
  }
  if (msg.status === 'error') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-red-400 text-xs">Failed</span>
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
  const borderColor = msg.type === 'shout' ? 'border-l-shout' : msg.type === 'whisper' ? 'border-l-purple-500' : ''

  // Scroll the row into view when the sent badge is revealed
  useEffect(() => {
    if (revealStatus) {
      msgRowRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [revealStatus])

  if (msg.type === 'system') {
    return (
      <div className='flex justify-center py-1'>
        <span className='text-text-lo text-xs italic font-body'>{msg.content}</span>
      </div>
    )
  }

  const seenByOthers = (msg.seenBy || [])
    .filter(id => id !== profile?.id && id !== msg.sender_id)
  const seenLabels = seenByOthers.map(id => {
    const m = members.find(m => m.user_id === id)
    return m ? m.nickname : id.slice(0, 6)
  })

  return (
    <div ref={msgRowRef} className={"px-4 py-1 flex gap-3 items-end " + (isOwn ? 'flex-row-reverse' : '')}>
      {showAvatar && !isOwn && (
        <Avatar nickname={msg.sender_nickname} color="#1a9fff" size="sm" />
      )}
      {!showAvatar && !isOwn && <div className="w-8" />}

      <div className={"flex flex-col gap-0.5 " + (isOwn ? 'items-end' : 'items-start') + ' max-w-[70%]'}>
        {showNickname && !isOwn && (
          <span className="text-text-lo text-xs font-body">{msg.sender_nickname} · {formatTime(msg.created_at)}</span>
        )}

        {/* Message bubble — clickable for own sent messages to reveal badge */}
        <button
          onClick={() => { if (isOwn && msg.status === 'sent') setRevealStatus(v => !v) }}
          className={
            'text-left ' +
            (isOwn && msg.status === 'sent' ? 'cursor-pointer' : 'cursor-default')
          }
        >
          <div className="flex flex-col gap-0.5">
            {msg.type === 'shout' ? (
              <div className={'border-l-4 ' + borderColor + ' pl-3 py-1 bg-shout/10 rounded-r-card'}>
                <div className={"text-shout font-display font-bold " + shoutFont(msg.content || '')}>{msg.content}</div>
              </div>
            ) : msg.type === 'whisper' ? (
              <div className="border-l-4 border-l-purple-500 pl-3 py-1 bg-purple-500/10 rounded-r-card">
                <div className="text-purple-300 italic text-sm font-body">{msg.content}</div>
              </div>
            ) : (
              <div className={"bg-bg-surface border border-border-lo rounded-card px-3 py-2 " + (isOwn ? 'rounded-tr-none' : 'rounded-tl-none')}>
                {msg.gif_url && (
                  <img src={msg.gif_url} alt="GIF" className="max-h-48 rounded-lg object-contain mb-1" />
                )}
                {msg.image_url && (
                  <img src={msg.image_url} alt="Image" className="max-h-64 rounded-lg object-contain mb-1 cursor-pointer hover:opacity-90" />
                )}
                {msg.content && (
                  <p className="text-text-hi text-sm font-body whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            )}

            {/* Always-visible status for non-sent states (sending spinner, delivered double-check, error) */}
            {isOwn && msg.status && msg.status !== 'sent' && (
              <div className='self-end'>
                <MessageStatusIndicator msg={msg} onRetry={() => retryMessage(msg)} />
              </div>
            )}

            {/* Click to reveal single checkmark for own 'sent' messages */}
            {isOwn && msg.status === 'sent' && revealStatus && (
              <div className='self-end'>
                <SentIcon />
              </div>
            )}
          </div>
        </button>

        {/* "Seen by" row for own messages with viewers */}
        {isOwn && seenLabels.length > 0 && (
          <span className="text-text-lo/60 text-[11px] font-body italic">
            seen by {seenLabels.join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}