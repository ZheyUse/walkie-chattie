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
          {/* App logo mark */}
          <div
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden p-1"
            style={{
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 0 40px rgba(139,92,246,0.2), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <svg width="72" height="72" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="authLogoGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e8eaed"/>
                  <stop offset="50%" stopColor="#c4b5fd"/>
                  <stop offset="100%" stopColor="#1a9fff"/>
                </linearGradient>
                <linearGradient id="authLogoGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#e8eaed"/>
                </linearGradient>
              </defs>
              <path fill="url(#authLogoGrad1)" d="M462.05,415.4a158.94,158.94,0,0,1,65.95-44c25.49-9.09,51.8-11.86,78.79-7.39l.63-2c-7.23-4.5-14.3-9.27-21.7-13.46C532.23,318.28,475,307.83,414.13,316.27c-64.14,8.9-117.27,40.32-165.51,81.28-49,41.59-79.3,94.76-94.62,156.78-1.78,7.21-2.86,14.59-4.27,21.89l-2.13,0c-1-19.29-3.28-38.62-2.83-57.88a350,350,0,0,1,34.09-143.62c4.82-10.11,10.48-19.82,15.74-29.71,4.41-8.3,9-17.21,3.14-26s-15.73-8.19-25.19-6.82c-22.93,3.34-42.28,14.39-60.38,28-6.87,5.18-13.28,11-20,16.59,38.86-77,132-140.58,238.08-138.38-27,9.52-51.27,20.38-73,36.41,86.43-29.19,173.31-35.17,260.09-3.16,87.28,32.2,149.32,92.87,192.31,174.78-2.8-11.33-5.09-22.81-8.46-34-19-62.8-55.35-112.38-111.22-147.8-40.3-25.55-82.7-45.94-128.77-58.48-50.59-13.77-100.66-11.67-150.15,5.48a16.06,16.06,0,0,1-5,1.16c16.31-13.16,34.44-23.17,53.38-31.86,39.14-18,80.39-26.17,123.28-26.89,11.74-.2,23.49-.08,35.24-.29a60.33,60.33,0,0,0,11.14-1.16c17.23-3.53,22.2-15.28,13-30.43-11.94-19.65-30.06-32.39-49.51-43.41-8.75-5-18.13-8.83-28.06-13.59C546.08,48.93,647.08,99,695.61,193c-18.76-17.8-39.42-32.78-63.5-43.17C698.56,204.13,742.72,272.65,764,355.52c21.49,83.82,9.36,163.81-30.26,240.53,0-2.3-.06-4.6,0-6.9,1.54-48.55-14.21-91.37-45-128.23-29.17-34.87-66.47-57.88-111.12-67.55-40.61-8.8-78.78-2-113.68,21.15A14.16,14.16,0,0,1,462.05,415.4Z"/>
              <path fill="url(#authLogoGrad2)" d="M624.05,1034.76c-52.37-4.43-101.37-18.63-144.95-48.34-35.56-24.25-60.91-57.41-81.13-95,18.7,16.36,38.38,31.15,60.7,42.31-8.5-7.83-17.21-15.45-25.46-23.54-56.5-55.35-93.89-121.44-111.33-198.67-13.29-58.9-9.41-117,9.36-174.06,5.41-16.46,13.2-32.16,20-48.16.72-1.71,2.11-3.14,4.2-6.14-3.32,25.74-2.15,49.49,4.37,72.8,9.53,34,29.83,61,55.93,84.14C448.28,668.93,486,686.5,529.3,690.67c33.71,3.24,64.76-5.36,92.8-24.5.77-.52,1.64-.91,3-1.64-15.65,22.78-56.2,46.84-91.14,52.55-36.64,6-71.32,0-105.06-16.18,7.69,7.2,15,14.87,23.12,21.51,36,29.34,76.25,49.88,122.26,58.1,67.55,12.07,130.58-1.48,189.27-35.57,43.8-25.43,81.64-58.13,112.62-98.47,32.69-42.55,53.46-90.2,63.1-143.37.84,5.71,1.88,11.39,2.51,17.13,5.33,48.4-1.58,95.47-15.55,141.77a356.6,356.6,0,0,1-38.65,84.72,85,85,0,0,0-8.28,17.51c-3.57,10.62,1.71,19.36,12.54,22.26,11.14,3,21.79.06,32.37-2.79,21.52-5.79,40.28-17.08,58.34-29.72a14,14,0,0,1,5.33-2.47c-28.1,37.67-63.54,66.71-105,88.57-41.81,22-86.67,31.92-133.8,32.74,23.46-8.72,46.21-18.67,66.48-33.79-84.35,32.37-169.41,39.3-254.46,4.74C476.51,809.41,416.76,748.53,379,665.65l-1.94.86c5.49,15.78,10,32,16.64,47.26,29.4,68.16,79.21,116.34,146.19,147.5,37.4,17.4,75.69,31.86,116.54,39.07,39.53,7,78.49,4.63,117.14-5.56a4.35,4.35,0,0,1,3.52.36c-2.62,1.74-5.21,3.52-7.87,5.2-2.94,1.87-5.9,3.73-8.93,5.46C707.19,936.18,649.78,949.16,588.88,948c-8.25-.15-16.51-.32-24.74,0-19.73.73-27.32,13.88-18.62,31.65,7.16,14.61,20,23.6,33,31.86,11.5,7.31,24.2,12.73,36.4,18.94C617.89,1032,621,1033.33,624.05,1034.76Z"/>
              <path fill="url(#authLogoGrad1)" d="M512.37,738.41c14-2.91,27.46-4.91,40.49-8.6,41.92-11.88,73.81-37.81,98.2-73.13,16.65-24.1,29.92-50.26,37.28-78.66,10.08-38.93,3.5-76.11-15.83-111.18-.48-.87-.92-1.76-1.42-2.73,10.25,4.95,29.43,41.8,35.47,61.14A176.17,176.17,0,0,1,713.87,597c-2.56,24.25-10.45,47-21.28,69.55,2.56-1.91,5.16-3.78,7.69-5.74s5.16-3.95,7.62-6.06c55-47,88.29-105.71,98-177.85,5.64-42.07,3.17-83.61-4-125.12-6.16-35.9-14.23-71.25-30.18-104.34-15.79-32.77-37-61.46-64.25-85.62-1.49-1.31-2.89-2.71-5.64-5.32a53.11,53.11,0,0,1,6.09,1.81C770,187.81,819.34,231.55,854.56,290.81c3.43,5.78,6.28,11.91,9.42,17.85,1.52,2.87,2.94,5.8,4.69,8.52,4.47,6.92,10,13.49,18.85,12.82s14.32-7.66,18-15.3c8.86-18.37,11.52-38,11.41-58.19-.06-11.82,0-23.64,0-33.64,36.2,51.37,33.26,227.08-4.46,273.59V423.71l-.66-.27c-.44,3.11-.88,6.21-1.3,9.32s-.82,6.43-1.25,9.64c-8.85,66.63-30.88,128.36-71.41,182.34C789.7,688.86,727.4,732.39,647.64,748c-43.62,8.52-87,5.77-129.55-7.22C516.24,740.18,514.48,739.28,512.37,738.41Z"/>
              <path fill="url(#authLogoGrad2)" d="M551.18,351.12c-4.9,1.25-8,1.92-11,2.81-60.05,17.7-101.58,56.44-127.48,112.65-9.08,19.71-16.86,39.86-18.42,61.95-2.2,31,4.56,59.84,19.49,86.93.58,1,1.19,2.07,2.1,3.66-18.06-11.14-40.37-61.47-43.37-98.79-3.07-38.13,8-72.64,29.62-104.09l-1.75-1.47c-11,8.75-22.51,17-33,26.34-40,35.79-66.11,80.26-79.58,131.9-11.07,42.41-13.33,85.56-7.68,129.17,4.92,37.94,12.78,75.06,27.59,110.5s37.11,65.94,62.74,94.2c4.86,5.35,9.92,10.53,16.36,17.34-5.93-2.84-10.2-4.67-14.26-6.88A414.56,414.56,0,0,1,283,851.53c-23.94-23-44.88-48.22-61.95-76.6-5.76-9.58-10.24-19.92-15.43-29.85-9.74-18.63-25.95-19.53-37.52-1.74-10.77,16.56-16.23,35.23-19.36,54.54-1.79,11-2.71,22.23-4,32.8-9.63-12.16-13.5-91.75-7.56-131.41,6.7-44.79,20.85-86.8,41.57-126.83-1.85,23.38-3.68,46.53-5.52,69.68l2.48.33c1.44-8,2.79-16.07,4.33-24.08,11.17-57.92,33.27-111.16,69.52-157.93,47-60.62,107.88-98.87,183.93-112.21,36.34-6.38,72.57-5.34,108.81.45C544.69,349.05,546.94,349.93,551.18,351.12Z"/>
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