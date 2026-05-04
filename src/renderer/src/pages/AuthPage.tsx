import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { debugLog } from '../lib/debug'

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
        } else if (accessToken && refreshToken) {
          debugLog({ source: "auth", message: "Setting OAuth token session" })
          const { error: err } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (err) { debugLog({ level: "error", source: "auth", message: "OAuth token session failed", details: err }); setErrorRef.current(err.message) }
        } else { debugLog({ level: "error", source: "auth", message: "OAuth callback had no usable session data" }); setErrorRef.current('No auth session was returned') }
      } catch (err) {
        debugLog({ level: "error", source: "auth", message: "OAuth callback parsing failed", details: err })
        setErrorRef.current(err instanceof Error ? err.message : 'Invalid auth callback')
      } finally { loadingRef.current = false; setLoading(false) }
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
    const redirectTo = window.location.protocol.startsWith('http') ? window.location.origin : window.api.getOAuthRedirectUri()
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true }
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
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-[15%] w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute bottom-[30%] right-[10%] w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(26,159,255,0.05) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite reverse', animationDelay: '-3s' }} />
        {/* Star dots */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: 'rgba(255,255,255,' + (Math.random() * 0.3 + 0.05) + ')',
              animationDuration: (Math.random() * 3 + 2) + 's',
              animationDelay: (Math.random() * 3) + 's',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-5">
          {/* Icon: space communication satellite */}
          <div
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(26,159,255,0.1) 100%)',
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Inner satellite icon */}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2" fill="rgba(139,92,246,0.6)" stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
              <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(139,92,246,0.3)" strokeWidth="1" />
              <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(139,92,246,0.3)" strokeWidth="1" transform="rotate(60 12 12)" />
              <ellipse cx="12" cy="12" rx="10" ry="4" stroke="rgba(139,92,246,0.3)" strokeWidth="1" transform="rotate(120 12 12)" />
            </svg>
          </div>

          {/* Brand name */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-baseline gap-1">
              <span
                className="font-display font-bold text-4xl tracking-widest"
                style={{ background: 'linear-gradient(90deg, #e8eaed 0%, rgba(167,139,250,0.85) 75%, #1a9fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.15em' }}
              >
                WALKIE
              </span>
              <span className="text-text-lo font-bold text-3xl">—</span>
              <span
                className="font-display font-bold text-4xl tracking-widest"
                style={{ background: 'linear-gradient(90deg, #1a9fff 0%, rgba(167,139,250,0.85) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.15em' }}
              >
                CHATTIE
              </span>
            </div>
            <p className="text-sm font-body tracking-wide" style={{ color: 'rgba(160,170,184,0.5)' }}>
              Your crew. Your frequencies.
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