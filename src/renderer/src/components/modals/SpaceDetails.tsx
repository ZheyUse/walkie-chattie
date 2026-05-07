import 'material-symbols'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useSpaceStore } from '../../stores/space.store'
import { useAuthStore } from '../../stores/auth.store'
import type { Message } from '../../stores/chat.store'
import MediaPreviewModal from '../ui/MediaPreviewModal'

type Tab = 'media' | 'files' | 'links'

function getExpiryLabel(expiry: number | null): string {
  if (!expiry) return 'Until I change it'
  const mins = Math.round((expiry - Date.now()) / 60000)
  if (mins <= 0) return 'Expired'
  if (mins < 60) return `${mins}m left`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h left`
  return `${Math.round(hrs / 24)}d left`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const EXTRACT_URL_REGEX = /(https?:\/\/[^\s]+)/g

export default function SpaceDetails({ onBack }: { onBack: () => void }) {
  const { currentSpace } = useSpaceStore()
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('media')
  const [media, setMedia] = useState<Message[]>([])
  const [files, setFiles] = useState<Message[]>([])
  const [links, setLinks] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'gif'>('image')

  useEffect(() => {
    if (!currentSpace) return
    setLoading(true)
    supabase
      .from('messages')
      .select('*')
      .eq('space_id', currentSpace.id)
      .not('type', 'eq', 'system')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const msgs = data || []
        const withUrls = msgs.filter(m => m.content && EXTRACT_URL_REGEX.test(m.content))
        const withMedia = msgs.filter(m => m.image_url || m.gif_url)

        // Files: treat image_url/GIF attachments as files when they don't have a GIF/IMAGE label
        // For now: only image_url (not gif_url) count as files, GIFs go to media
        const withFiles = msgs.filter(m => {
          // exclude already counted media
          if (m.image_url || m.gif_url) return false
          // consider any message with content that has a numeric/extension as a file hint
          // or just show empty for now since we don't have actual file upload
          return false
        })

        setMedia(msgs.filter(m => !!(m.image_url || m.gif_url)))
        setFiles(withFiles)
        setLinks(msgs.filter(m => !!(m.content && EXTRACT_URL_REGEX.test(m.content))))
        setLoading(false)
      })
  }, [currentSpace])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06] flex-shrink-0"
          style={{ color: 'rgba(232,234,237,0.5)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
        </button>
        <div>
          <h2 className="text-sm font-display font-semibold" style={{ color: 'rgba(232,234,237,0.95)' }}>Space Details</h2>
          <p className="text-[10px] font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>{currentSpace?.name}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
        {(['media', 'files', 'links'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-[11px] font-display font-semibold uppercase tracking-wider transition-colors"
            style={{ color: tab === t ? 'rgba(167,139,250,0.9)' : 'rgba(232,234,237,0.35)', borderBottom: tab === t ? '2px solid rgba(139,92,246,0.6)' : '2px solid transparent' }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px', color: 'rgba(139,92,246,0.5)' }}>progress_activity</span>
          </div>
        ) : tab === 'media' ? (
          media.length === 0 ? (
            <EmptyState icon="image" label="No media shared yet" />
          ) : (
            <div className="p-2 grid grid-cols-3 gap-1">
              {media.map(msg => {
                const src = msg.gif_url || msg.image_url
                if (!src) return null
                const type = msg.gif_url ? 'gif' : 'image'
                return (
                  <div
                    key={msg.id}
                    className="relative aspect-square rounded-lg overflow-hidden block group cursor-pointer"
                    onClick={() => { setPreviewUrl(src); setPreviewType(type) }}
                  >
                    <img
                      src={src}
                      alt="Shared media"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }}>
                      <span className="text-[9px] font-body" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {msg.sender_nickname}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : tab === 'files' ? (
          files.length === 0 ? (
            <EmptyState icon="folder_open" label="No files shared yet" />
          ) : (
            <div className="flex flex-col">
              {files.map(msg => (
                <SpaceFileRow key={msg.id} msg={msg} />
              ))}
            </div>
          )
        ) : (
          links.length === 0 ? (
            <EmptyState icon="link" label="No links shared yet" />
          ) : (
            <div className="flex flex-col">
              {links.map(msg => (
                <SpaceLinkRow key={msg.id} msg={msg} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Media preview modal */}
      <MediaPreviewModal
        open={!!previewUrl}
        url={previewUrl || ''}
        type={previewType}
        onClose={() => setPreviewUrl(null)}
      />
    </div>
  )
}

function SpaceFileRow({ msg }: { msg: Message }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'rgba(139,92,246,0.6)' }}>attach_file</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body truncate" style={{ color: 'rgba(232,234,237,0.8)' }}>{msg.content || 'File'}</p>
        <p className="text-[10px] font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>{msg.sender_nickname} · {formatDate(msg.created_at)}</p>
      </div>
    </div>
  )
}

function SpaceLinkRow({ msg }: { msg: Message }) {
  if (!msg.content) return null
  const urls = msg.content.match(EXTRACT_URL_REGEX) || []
  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <p className="text-[10px] font-body mb-1.5" style={{ color: 'rgba(90,100,120,0.5)' }}>
        {msg.sender_nickname} · {formatDate(msg.created_at)} at {formatTime(msg.created_at)}
      </p>
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition-colors last:mb-0"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px', color: 'rgba(139,92,246,0.5)' }}>link</span>
          <span className="text-xs font-body truncate" style={{ color: 'rgba(167,139,250,0.8)' }}>{url}</span>
          <span className="material-symbols-outlined flex-shrink-0 ml-auto" style={{ fontSize: '12px', color: 'rgba(139,92,246,0.4)' }}>open_in_new</span>
        </a>
      ))}
    </div>
  )
}

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'rgba(139,92,246,0.3)' }}>{icon}</span>
      </div>
      <p className="text-xs font-body" style={{ color: 'rgba(90,100,120,0.5)' }}>{label}</p>
    </div>
  )
}