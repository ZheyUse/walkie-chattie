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

/* ── Pre-computed star positions & properties ── */
function seededRand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000
  return min + ((x - Math.floor(x)) * (max - min))
}
const STAR_DEEP = Array.from({ length: 45 }, (_, i) => {
  const s = i * 137.508
  return {
    x: parseFloat((seededRand(s, 0, 100)).toFixed(1)),
    y: parseFloat((seededRand(s + 1, 0, 100)).toFixed(1)),
    s: parseFloat((seededRand(s + 2, 0.8, 1.5)).toFixed(1)),
    d: parseFloat((seededRand(s + 3, 2, 5)).toFixed(1)),
    dl: parseFloat((seededRand(s + 4, 0, 4)).toFixed(1)),
    o: parseFloat((seededRand(s + 5, 10, 40) / 100).toFixed(2)),
  }
})
const STAR_MID = Array.from({ length: 18 }, (_, i) => {
  const s = i * 198.471
  return {
    x: parseFloat((seededRand(s, 0, 100)).toFixed(1)),
    y: parseFloat((seededRand(s + 1, 0, 100)).toFixed(1)),
    s: parseFloat((seededRand(s + 2, 1.5, 2.5)).toFixed(1)),
    d: parseFloat((seededRand(s + 3, 4, 8)).toFixed(1)),
    dl: parseFloat((seededRand(s + 4, 0, 5)).toFixed(1)),
    o: parseFloat((seededRand(s + 5, 30, 50) / 100).toFixed(2)),
  }
})
const BRIGHT_STARS: [string, string][] = [
  ['12%', '18%'],
  ['78%', '8%'],
  ['88%', '60%'],
  ['25%', '75%'],
  ['60%', '30%'],
  ['5%', '55%'],
]

interface ShootingStarProps {
  delay: number
  top: string
  left: string
  dur: number
}
function ShootingStar({ delay, top, left, dur }: ShootingStarProps) {
  return (
    <div
      className="absolute"
      style={{
        top,
        left,
        width: 100,
        height: 1,
        animation: `shoot ${dur}s ease-in ${delay}s infinite`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to right, transparent 0%, rgba(180,220,255,0.9) 40%, rgba(255,255,255,1) 100%)',
          borderRadius: '50%',
          boxShadow: '0 0 6px 2px rgba(168,210,255,0.6)',
        }}
      />
    </div>
  )
}

function AvailabilityBadge({ status }: { status: 'idle' | 'checking' | 'available' | 'taken' }) {
  if (status === 'idle') return null

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '12px', color: 'rgba(139,92,246,0.7)' }}>sync</span>
        <span className="text-xs" style={{ color: 'rgba(139,92,246,0.7)' }}>Checking…</span>
      </div>
    )
  }

  const taken = status === 'taken'
  const color = taken ? 'rgba(239,68,68,0.85)' : 'rgba(74,197,94,0.9)'
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
    <div
      className="h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 15% 20%, rgba(139,92,246,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(26,159,255,0.08) 0%, transparent 55%), #0a0e1a' }}
    >
      {/* ── Deep background layer — mirrors AuthPage ── */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Rotating orbital rings */}
        <div
          className="absolute rounded-full"
          style={{
            width: 640,
            height: 640,
            top: '50%',
            left: '50%',
            marginTop: -320,
            marginLeft: -320,
            background: 'radial-gradient(circle, transparent 45%, rgba(139,92,246,0.04) 55%, transparent 65%)',
            animation: 'orbit-glow 24s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 900,
            height: 900,
            top: '50%',
            left: '50%',
            marginTop: -450,
            marginLeft: -450,
            background: 'radial-gradient(circle, transparent 48%, rgba(26,159,255,0.025) 52%, transparent 60%)',
            animation: 'orbit-glow 36s ease-in-out infinite reverse',
          }}
        />

        {/* Nebula wisps — purple */}
        <div
          className="absolute rounded-full"
          style={{
            width: 480,
            height: 320,
            top: '5%',
            left: '-5%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 50%, transparent 70%)',
            filter: 'blur(24px)',
            animation: 'drift-a 22s ease-in-out infinite',
          }}
        />
        {/* Nebula wisps — deep blue */}
        <div
          className="absolute rounded-full"
          style={{
            width: 560,
            height: 380,
            bottom: '0%',
            right: '-8%',
            background: 'radial-gradient(ellipse, rgba(26,159,255,0.07) 0%, rgba(26,159,255,0.02) 45%, transparent 65%)',
            filter: 'blur(28px)',
            animation: 'drift-b 30s ease-in-out infinite',
          }}
        />
        {/* Center nebula tint */}
        <div
          className="absolute rounded-full"
          style={{
            width: 700,
            height: 500,
            top: '50%',
            left: '50%',
            marginTop: -250,
            marginLeft: -350,
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.04) 0%, rgba(75,0,130,0.02) 40%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'drift-a 18s ease-in-out infinite',
          }}
        />

        {/* Star layer 1: small fast-twinkle */}
        {STAR_DEEP.map((s, i) => (
          <div
            key={`s1-${i}`}
            className="absolute rounded-full"
            style={{
              width: s.s + 'px',
              height: s.s + 'px',
              left: s.x + '%',
              top: s.y + '%',
              background: `rgba(220,230,255,${s.o})`,
              animation: `twinkle-fast ${s.d}s ease-in-out ${s.dl}s infinite`,
            }}
          />
        ))}

        {/* Star layer 2: medium slow-twinkle */}
        {STAR_MID.map((s, i) => (
          <div
            key={`s2-${i}`}
            className="absolute rounded-full"
            style={{
              width: s.s + 'px',
              height: s.s + 'px',
              left: s.x + '%',
              top: s.y + '%',
              background: `rgba(220,235,255,${s.o})`,
              boxShadow: `0 0 ${s.s}px 0 rgba(180,210,255,0.15)`,
              animation: `twinkle-slow ${s.d}s ease-in-out ${s.dl}s infinite`,
            }}
          />
        ))}

        {/* Star layer 3: bright accent glow stars */}
        {BRIGHT_STARS.map((pos, i) => (
          <div
            key={`s3-${i}`}
            className="absolute rounded-full"
            style={{
              width: '2px',
              height: '2px',
              left: pos[0],
              top: pos[1],
              background: '#c8d8ff',
              boxShadow: '0 0 6px 2px rgba(168,208,255,0.5), 0 0 14px 4px rgba(139,92,246,0.2)',
              animation: `twinkle-slow ${3 + i * 0.8}s ease-in-out ${i}s infinite`,
            }}
          />
        ))}

        {/* Shooting stars */}
        <ShootingStar delay={0}   top="8%"  left="75%" dur={1.4} />
        <ShootingStar delay={6}   top="15%" left="90%" dur={1.8} />
        <ShootingStar delay={12}  top="5%"  left="60%" dur={1.2} />
        <ShootingStar delay={22}  top="20%" left="82%" dur={1.6} />
        <ShootingStar delay={35}  top="3%"  left="70%" dur={1.5} />

        {/* Cosmic dust clouds */}
        <div
          style={{
            position: 'absolute',
            width: 120,
            height: 80,
            top: '30%',
            left: '5%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)',
            filter: 'blur(12px)',
            animation: 'dust-drift 14s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 160,
            height: 100,
            top: '55%',
            right: '8%',
            background: 'radial-gradient(ellipse, rgba(26,159,255,0.1) 0%, transparent 70%)',
            filter: 'blur(14px)',
            animation: 'dust-drift 18s ease-in-out infinite reverse',
          }}
        />

        {/* Faint planet with ring top-right */}
        <div
          style={{
            position: 'absolute',
            width: 90,
            height: 90,
            top: '10%',
            right: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(139,92,246,0.15), rgba(80,30,180,0.08) 60%, transparent 80%)',
            boxShadow: '0 0 30px 8px rgba(139,92,246,0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 140,
            height: 36,
            top: 'calc(10% + 45px - 18px)',
            right: 'calc(12% + 45px - 70px)',
            borderRadius: '50%',
            border: '1px solid rgba(168,130,255,0.18)',
            animation: 'ring-shimmer 6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Onboarding card — glass morphism style */}
      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden p-1"
            style={{
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={assetPath("resources/icons/icon-128.png")}
              alt="Astra"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-1">
              <span
                className="font-title font-bold text-4xl tracking-widest"
                style={{ background: 'linear-gradient(90deg, #e8eaed 0%, rgba(167,139,250,0.85) 75%, #1a9fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.2em' }}
              >
                ASTRA
              </span>
            </div>
            <p className="text-sm font-body tracking-wide" style={{ color: 'rgba(160,170,184,0.6)' }}>
              Choose your nickname
            </p>
          </div>
        </div>

        {/* Onboarding card */}
        <div
          className="bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden w-80"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="p-8 flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={nickname}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="e.g. Nova_42"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm font-display tracking-wide transition-all duration-200 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(232,234,237,0.9)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              />

              <div className="flex items-center justify-between px-1 pt-1">
                <AvailabilityBadge status={availStatus} />
                <span className="text-text-lo text-xs">{nickname.length}/20</span>
              </div>
            </div>

            {error && (
              <div
                className="text-xs text-center px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'rgba(239,68,68,0.8)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!isValid || saving}
              className="relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
              style={{
                background: availStatus === 'available' ? 'linear-gradient(135deg, rgba(74,197,94,0.15), rgba(139,92,246,0.15))' : 'rgba(139,92,246,0.2)',
                border: availStatus === 'available' ? '1px solid rgba(74,197,94,0.3)' : '1px solid rgba(139,92,246,0.3)',
                color: 'rgba(232,234,237,0.95)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Setting up…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                  Continue
                </>
              )}
            </button>

            <p className="text-[10px] text-center" style={{ color: 'rgba(90,100,120,0.5)' }}>
              This is how others see you in Spaces
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
