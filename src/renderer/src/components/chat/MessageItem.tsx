import type { Message } from '../../stores/chat.store'
import { useAuthStore } from '../../stores/auth.store'
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

export default function MessageItem({ msg, showAvatar = true, showNickname = true }: Props) {
  const { profile } = useAuthStore()

  if (msg.type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-text-lo text-xs italic font-body">{msg.content}</span>
      </div>
    )
  }

  const isOwn = msg.sender_id === profile?.id
  const borderColor = msg.type === 'shout' ? 'border-l-shout' : msg.type === 'whisper' ? 'border-l-purple-500' : ''

  return (
    <div className={"px-4 py-1 flex gap-3 items-end " + (isOwn ? 'flex-row-reverse' : '')}>
      {showAvatar && !isOwn && (
        <Avatar nickname={msg.sender_nickname} color="#1a9fff" size="sm" />
      )}
      {!showAvatar && !isOwn && <div className="w-8" />}

      <div className={"flex flex-col gap-0.5 " + (isOwn ? 'items-end' : 'items-start') + ' max-w-[70%]'}>
        {showNickname && !isOwn && (
          <span className="text-text-lo text-xs font-body">{msg.sender_nickname} · {formatTime(msg.created_at)}</span>
        )}

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
      </div>
    </div>
  )
}
