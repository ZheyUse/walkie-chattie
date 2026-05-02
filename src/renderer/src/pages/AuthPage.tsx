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
        const searchParams = callbackUrl.searchParams
        const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''))
        const code = searchParams.get('code')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (code) {
          debugLog({ source: "auth", message: "Exchanging OAuth code for session" })
          const { error: err } = await supabase.auth.exchangeCodeForSession(code)
          if (err) {
            debugLog({ level: "error", source: "auth", message: "OAuth code exchange failed", details: err })
            setErrorRef.current(err.message)
          }
        } else if (accessToken && refreshToken) {
          debugLog({ source: "auth", message: "Setting OAuth token session" })
          const { error: err } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          if (err) {
            debugLog({ level: "error", source: "auth", message: "OAuth token session failed", details: err })
            setErrorRef.current(err.message)
          }
        } else {
          debugLog({ level: "error", source: "auth", message: "OAuth callback had no usable session data" })
          setErrorRef.current('No auth session was returned')
        }
      } catch (err) {
        debugLog({ level: "error", source: "auth", message: "OAuth callback parsing failed", details: err })
        setErrorRef.current(err instanceof Error ? err.message : 'Invalid auth callback')
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    }
    const onClose = () => {
      if (loadingRef.current) {
        debugLog({ level: "warn", source: "auth", message: "OAuth flow cancelled while loading" })
        setErrorRef.current('Auth cancelled')
      }
    }

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
    if (oauthError) {
      debugLog({ level: "error", source: "auth", message: "Google OAuth URL request failed", details: oauthError })
      setError(oauthError.message)
      setLoading(false)
      return
    }
    if (!data.url) {
      debugLog({ level: "error", source: "auth", message: "Google OAuth did not return a URL" })
      setError('No auth URL returned')
      setLoading(false)
      return
    }
    debugLog({ source: "auth", message: "Opening Google OAuth in system browser", details: { redirectTo } })
    window.api.openSystemBrowser(data.url)
  }

  return (
    <div className="h-screen bg-bg-deep flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-bg-panel border border-border-md flex items-center justify-center text-4xl shadow-lg shadow-accent/10">
            📻
          </div>
          <h1 className="font-display font-bold text-4xl text-text-hi tracking-wide">
            WALKIE<span className="text-accent">-</span>CHATTIE
          </h1>
          <p className="text-text-lo text-sm font-body">
            Chat with your crew. No servers, no subscriptions.
          </p>
        </div>
        <div className="bg-bg-panel border border-border-md rounded-modal p-8 w-80 flex flex-col gap-5 shadow-2xl">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-3 py-3 text-base disabled:opacity-50"
          >
            {loading ? <Spinner /> : <><GoogleIcon />Continue with Google</>}
          </button>
          {error && (
            <p className="text-red-400 text-xs text-center bg-red-400/10 border border-red-400/20 rounded-input px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <p className="text-text-lo text-xs">By continuing, you agree to our Terms of Service</p>
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
