import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth.store'

const AVATAR_COLORS = [
  '#1a9fff', '#e8652a', '#4db35e', '#9b59b6',
  '#e91e8c', '#00bcd4', '#ff5722', '#8bc34a'
]

export default function OnboardingPage() {
  const { user, setProfile } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const checkAvailability = async (name: string) => {
    if (!name.trim() || name.length < 2) return
    setChecking(true)
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', name.trim())
      .maybeSingle()
    setChecking(false)
    return data === null
  }

  const handleChange = async (val: string) => {
    const sanitized = val.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 20)
    setNickname(sanitized)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (sanitized.length < 2) return
      const available = await checkAvailability(sanitized)
      if (available === false) setError('That nickname is already taken.')
    }, 400)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nickname.trim() || nickname.length < 2) {
      setError('Nickname must be at least 2 characters.')
      return
    }
    setSaving(true)
    setError(null)
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    const { data, error: dbError } = await supabase
      .from('profiles')
      .insert({ id: user.id, nickname: nickname.trim(), avatar_color: color })
      .select()
      .single()
    if (dbError) {
      setError(dbError.message.includes('unique') ? 'Nickname already taken.' : dbError.message)
      setSaving(false)
      return
    }
    setProfile(data)
    setSaving(false)
  }

  const isValid = nickname.trim().length >= 2

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
          <div className="text-4xl">👋</div>
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
          <p className="text-text-lo text-xs px-1">{nickname.length}/20 chars</p>
        </div>
        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">{error}</p>
        )}
        <button type="submit" disabled={!isValid || saving} className="btn-primary py-3 text-base disabled:opacity-40">
          {saving ? 'Setting up…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
