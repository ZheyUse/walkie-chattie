import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { debugLog } from '../lib/debug'
import { assetPath } from '../lib/assets'
import { getOAuthRedirectUri } from '../lib/oauthRedirect'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadingRef = useRef(false)
  loadingRef.current = loading
  const setErrorRef = useRef(setError)
  setErrorRef.current = setError

  useEffect(() => {
    const onCallback = async (url: string) => {
      debugLog({ source: "auth", message: "OAuth callback received", details: { hasUrl: Boolean(url) } })
      loadingRef.current = true
      setLoading(true)
      setErrorRef.current(null)
      let shouldCloseOAuthWindow = false
      try {
        const callbackUrl = new URL(url)
        const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''))
        const code = callbackUrl.searchParams.get('code')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (code) {
          debugLog({ source: "auth", message: "Exchanging OAuth code for session" })
          const { error: err } = await supabase.auth.exchangeCodeForSession(code)
          if (err) { debugLog({ level: "error", source: "auth", message: "OAuth code exchange failed", details: err }); setErrorRef.current(err.message) }
          else shouldCloseOAuthWindow = true
        } else if (accessToken && refreshToken) {
          debugLog({ source: "auth", message: "Setting OAuth token session" })
          const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (err) { debugLog({ level: "error", source: "auth", message: "OAuth token session failed", details: err }); setErrorRef.current(err.message) }
          else shouldCloseOAuthWindow = true
        } else { debugLog({ level: "error", source: "auth", message: "OAuth callback had no usable session data" }); setErrorRef.current('No auth session was returned') }
      } catch (err) {
        debugLog({ level: "error", source: "auth", message: "OAuth callback parsing failed", details: err })
        setErrorRef.current(err instanceof Error ? err.message : 'Invalid auth callback')
      } finally {
        loadingRef.current = false
        setLoading(false)
        if (shouldCloseOAuthWindow) {
          window.api.closeOAuthBrowser()
        }
      }
    }
    const onClose = () => { if (loadingRef.current) { debugLog({ level: "warn", source: "auth", message: "OAuth flow cancelled while loading" }); setErrorRef.current('Auth cancelled') } }
    window.api.onOAuthCallback(onCallback)
    window.api.onOAuthClosed(onClose)
    return () => {}
  }, [])

  const handleGoogleLogin = async () => {
    debugLog({ source: "auth", message: "Google login clicked" })
    setLoading(true)
    setError(null)
    const redirectTo = getOAuthRedirectUri()
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      }
    })
    if (oauthError) { debugLog({ level: "error", source: "auth", message: "Google OAuth URL request failed", details: oauthError }); setError(oauthError.message); setLoading(false); return }
    if (!data.url) { debugLog({ level: "error", source: "auth", message: "Google OAuth did not return a URL" }); setError('No auth URL returned'); setLoading(false); return }
    debugLog({ source: "auth", message: "Opening Google OAuth in system browser", details: { redirectTo } })
    window.api.openSystemBrowser(data.url)
  }

  return (
    <div
      className="h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 15% 20%, rgba(139,92,246,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(26,159,255,0.08) 0%, transparent 55%), #0a0e1a' }}
    >
      {/* ── Deep background layer ── */}
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

        {/* ── Star layer 1: small fast-twinkle (deep field) ── */}
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

        {/* ── Star layer 2: medium slow-twinkle (mid field) ── */}
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

        {/* ── Star layer 3: bright accent glow stars ── */}
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

        {/* ── Shooting stars ── */}
        <ShootingStar delay={0}   top="8%"  left="75%" dur={1.4} />
        <ShootingStar delay={6}   top="15%" left="90%" dur={1.8} />
        <ShootingStar delay={12}  top="5%"  left="60%" dur={1.2} />
        <ShootingStar delay={22}  top="20%" left="82%" dur={1.6} />
        <ShootingStar delay={35}  top="3%"  left="70%" dur={1.5} />

        {/* ── Cosmic dust clouds ── */}
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

        {/* ── Faint planet with ring top-right ── */}
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

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-5">
          {/* App logo mark */}
          <div
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden p-1"
            style={{
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={assetPath("resources/icons/icon-128.png")}
              alt="Pulsar"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Brand name */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-1">
              <span
                className="font-title font-bold text-4xl tracking-widest"
                style={{ background: 'linear-gradient(90deg, #e8eaed 0%, rgba(167,139,250,0.85) 75%, #1a9fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.2em' }}
              >
                ASTRA
              </span>
            </div>
            <p className="text-sm font-body tracking-wide" style={{ color: 'rgba(160,170,184,0.5)' }}>
              Your crew. Your Space.
            </p>
          </div>
        </div>

        {/* Login card */}
        <div
          className="bg-white/[0.03] backdrop-blur-xl rounded-2xl overflow-hidden w-80"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="p-8 flex flex-col gap-5">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="relative flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold font-display tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(232,234,237,0.9)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {error && (
              <div
                className="text-xs text-center px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: 'rgba(239,68,68,0.7)',
                }}
              >
                {error}
              </div>
            )}

            {/* Decorative divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)' }} />
              <span className="text-[10px] font-body" style={{ color: 'rgba(90,100,120,0.4)' }}>secured</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)' }} />
            </div>
          </div>
        </div>

        <p className="text-[11px] font-body" style={{ color: 'rgba(90,100,120,0.35)' }}>
          By continuing, you agree to our terms of service
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

/* ── Pre-computed star positions & properties ── */
// Seed-based pseudo-random for consistent render across mounts
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

/* ── Shooting star component ── */
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
