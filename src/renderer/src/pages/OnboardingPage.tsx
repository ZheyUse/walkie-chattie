import 'material-symbols'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth.store'
import { debugLog } from '../lib/debug'
import { assetPath } from '../lib/assets'

const AVATAR_COLORS = [
  '#1a9fff', '#e8652a', '#4db35e', '#9b59b6',
  '#e91e8c', '#00bcd4', '#ff5722', '#8bc34a'
]

function AvailabilityBadge({ status }: { status: 'idle' | 'checking' | 'available' | 'taken' }) {
  if (status === 'idle') return null

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '12px', color: 'rgba(139,92,246,0.5)' }}>sync</span>
        <span className="text-xs" style={{ color: 'rgba(139,92,246,0.5)' }}>Checking…</span>
      </div>
    )
  }

  const taken = status === 'taken'
  const color = taken ? 'rgba(239,68,68,0.75)' : 'rgba(74,197,94,0.8)'
  const label = taken ? 'Nickname taken' : 'Nickname available'

  return (
    <div className="flex items-center gap-1.5">
      {taken ? (
        <span className="material-symbols-outlined" style={{ fontSize: '12px', color }}>cancel</span>
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: '12px', color }}>check_circle</span>
      )}
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  )
}

export default function OnboardingPage() {
  const { user, setProfile } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [availStatus, setAvailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleChange = async (val: string) => {
    setError(null)
    setAvailStatus('idle')
    const sanitized = val.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 20)
    setNickname(sanitized)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (sanitized.length < 2) return
    debounceRef.current = setTimeout(async () => {
      setAvailStatus('checking')
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', sanitized.trim())
        .maybeSingle()
      setAvailStatus(data === null ? 'available' : 'taken')
      if (data !== null) setError('That nickname is already taken.')
    }, 400)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nickname.trim() || nickname.length < 2) {
      debugLog({ level: "warn", source: "onboarding", message: "Submit validation failed", details: { hasUser: Boolean(user), nicknameLength: nickname.length } })
      setError('Nickname must be at least 2 characters.')
      return
    }
    setSaving(true)
    setError(null)
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    debugLog({ source: "onboarding", message: "Inserting profile", details: { nickname: nickname.trim(), color } })
    const { data, error: dbError } = await supabase
      .from('profiles')
      .insert({ id: user.id, nickname: nickname.trim(), avatar_color: color, picture: user.user_metadata?.picture ?? null })
      .select()
      .single()
    if (dbError) {
      debugLog({ level: "error", source: "onboarding", message: "Profile insert failed", details: dbError })
      setError(dbError.message.includes('unique') ? 'Nickname already taken.' : dbError.message)
      setSaving(false)
      return
    }
    debugLog({ source: "onboarding", message: "Profile created successfully", details: { profileId: data.id, nickname: data.nickname } })
    setProfile(data)
    setSaving(false)
  }

  const isValid = nickname.trim().length >= 2 && availStatus !== 'taken'

  return (
    <div className="h-screen bg-bg-deep flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>
      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-bg-panel border border-border-md rounded-modal p-8 w-80 flex flex-col gap-6 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-2">
          <img src={assetPath("resources/icons/icon2.svg")} alt="Logo" className="w-16 h-16" />
          <h2 className="font-display font-bold text-xl text-text-hi">Choose your nickname</h2>
          <p className="text-text-lo text-xs text-center">This is how others see you in Spaces</p>
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={nickname}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g. Nova_42"
            maxLength={20}
            autoFocus
            className="input-field"
          />
          {/* Character count */}
          <p className="text-text-lo text-xs px-1">{nickname.length}/20 chars</p>

          {/* Availability badge — shown when user has typed enough */}
          {nickname.length >= 2 && (
            <AvailabilityBadge status={availStatus} />
          )}
        </div>
        {error && availStatus === 'taken' && !saving && (
          <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">{error}</p>
        )}
        <button type="submit" disabled={!isValid || saving} className="btn-primary py-3 text-base text-white disabled:opacity-40">
          {saving ? 'Setting up…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
