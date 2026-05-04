import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import { useAuthStore, type Profile } from "./stores/auth.store"
import { useSpaceStore, type Member, type Space } from "./stores/space.store"
import AuthPage from "./pages/AuthPage"
import OnboardingPage from "./pages/OnboardingPage"
import DashboardPage from "./pages/DashboardPage"
import DebugPage from "./pages/DebugPage"
import RoomModal from "./components/modals/RoomModal"
import ToastContainer from "./components/ui/ToastContainer"
import ShoutPopup from "./components/popups/ShoutPopup"
import WhisperPopup from "./components/popups/WhisperPopup"
import { debugLog } from "./lib/debug"
import { initTypingChannel, teardownTypingChannel } from "./lib/typing-channel"

function withTimeout<T>(promise: Promise<T>, label: string, ms = 8000): Promise<T> {
  let timeoutId: number | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })
}

function loadProfile(userId: string, setProfile: (p: Profile | null) => void) {
  debugLog({ source: "auth", message: "Loading user profile", details: { userId } })
  withTimeout(
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    "Profile load"
  )
    .then(({ data, error }) => {
      if (error) {
        debugLog({ level: "error", source: "auth", message: "Profile load failed", details: error })
      } else {
        debugLog({ source: "auth", message: data ? "Profile loaded" : "Profile missing", details: { userId } })
      }
      setProfile(data ?? null)
    })
    .catch((error) => {
      debugLog({ level: "error", source: "auth", message: "Profile load crashed or was blocked", details: error })
      setProfile(null)
    })
}

async function loadSpaceMembers(spaceId: string, setMembers: (m: Member[]) => void) {
  debugLog({ source: "space", message: "Loading space members", details: { spaceId } })
  const { data: members, error: membersError } = await withTimeout(
    supabase
      .from("space_members")
      .select("user_id, role, joined_at")
      .eq("space_id", spaceId),
    "Space members load"
  )

  if (membersError) {
    debugLog({ level: "error", source: "space", message: "Space members load failed", details: membersError })
    return
  }

  if (!members) {
    debugLog({ level: "warn", source: "space", message: "Space members response was empty", details: { spaceId } })
    return
  }

  const ids = members.map((m) => m.user_id)
  const { data: profiles, error: profilesError } = await withTimeout(
    supabase
      .from("profiles")
      .select("id, nickname, avatar_color")
      .in("id", ids),
    "Member profiles load"
  )

  if (profilesError) {
    debugLog({ level: "error", source: "space", message: "Member profiles load failed", details: profilesError })
  }

  setMembers(members.map((m) => ({
    ...m,
    nickname: profiles?.find((p) => p.id === m.user_id)?.nickname || "?",
    avatar_color: profiles?.find((p) => p.id === m.user_id)?.avatar_color || "#888",
  })))
}

async function loadExistingSpace(
  userId: string,
  setSpace: (s: Space | null) => void,
  setMembers: (m: Member[]) => void,
  setSpaces: (s: Space[]) => void
) {
  debugLog({ source: "space", message: "Loading existing space membership", details: { userId } })
  const { data: memberships, error: membershipsError } = await withTimeout(
    Promise.resolve(
      supabase
        .from("space_members")
        .select("space_id")
        .eq("user_id", userId)
        .eq("blacklisted", false)
        .order("joined_at", { ascending: true })
    ),
    "Existing space membership load"
  ) as { data: unknown[] | null; error: unknown }

  if (membershipsError) {
    debugLog({ level: "error", source: "space", message: "Existing space membership load failed", details: membershipsError })
    setSpace(null)
    setMembers([])
    return
  }

  if (!memberships || memberships.length === 0) {
    debugLog({ source: "space", message: "No existing space found for user", details: { userId } })
    setSpace(null)
    setMembers([])
    setSpaces([])
    return
  }

  const mostRecentSpaceId = (memberships[0] as { space_id: string }).space_id

  const { data: space, error: spaceError } = await withTimeout(
    Promise.resolve(
      supabase
        .from("spaces")
        .select("*")
        .eq("id", mostRecentSpaceId)
        .maybeSingle()
    ),
    "Existing space load"
  ) as { data: Space | null; error: unknown }

  if (spaceError) {
    debugLog({ level: "error", source: "space", message: "Existing space load failed", details: spaceError })
  }

  if (!space) {
    debugLog({ level: "warn", source: "space", message: "Membership pointed to a missing space", details: mostRecentSpaceId })
    setSpace(null)
    setMembers([])
    setSpaces([])
    return
  }

  const spaceIds = (memberships as { space_id: string }[]).map((m) => m.space_id)
  const { data: allSpaces } = await withTimeout(
    Promise.resolve(supabase.from("spaces").select("*").in("id", spaceIds)),
    "All spaces load"
  ) as { data: Space[] | null; error: unknown }

  debugLog({ source: "space", message: "Existing space loaded", details: { spaceId: space.id, name: space.name } })
  setSpace(space)
  setSpaces(allSpaces ?? [])
  await loadSpaceMembers(space.id, setMembers)
}

function getPopupType(): "shout" | "whisper" | null {
  try {
    const hash = window.location.hash
    const parts = hash.split("/")
    if (parts[1] === "popup" && parts[2]) {
      const d = JSON.parse(decodeURIComponent(parts[2]))
      return d.popupType || null
    }
  } catch(e) {}
  return null
}

function getLoadingReasons({
  loading,
  ready,
  user,
  spacesReady,
  profile,
  currentSpace,
}: {
  loading: boolean
  ready: boolean
  user: unknown
  spacesReady: boolean
  profile: unknown
  currentSpace: unknown
}) {
  const reasons: string[] = []
  if (loading) reasons.push("auth/profile store is still loading")
  if (!ready) reasons.push("initial auth session check has not finished")
  if (user && !spacesReady) reasons.push("space lookup has not finished")
  if (user && !profile && !loading) reasons.push("user is signed in but profile is missing")
  if (user && spacesReady && !currentSpace) reasons.push("user is signed in but no space is selected")
  return reasons
}

export default function App() {
  const isBrowserOAuthRelay = !window.api && window.location.hash.includes('access_token')
  const isDebugRoute = window.location.hash === "#/debug"
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  const setSession = useAuthStore(s => s.setSession)
  const setProfile = useAuthStore(s => s.setProfile)
  const profile = useAuthStore(s => s.profile)
  const currentSpace = useSpaceStore(s => s.currentSpace)
  const setSpace = useSpaceStore(s => s.setSpace)
  const setSpaces = useSpaceStore(s => s.setSpaces)
  const setMembers = useSpaceStore(s => s.setMembers)
  const joinOrCreateModalOpen = useSpaceStore(s => s.joinOrCreateModalOpen)
  const setJoinOrCreateModalOpen = useSpaceStore(s => s.setJoinOrCreateModalOpen)
  const [ready, setReady] = useState(false)
  const [spacesReady, setSpacesReady] = useState(false)
  const [popupType] = useState(getPopupType())

  useEffect(() => {
    if (isDebugRoute) {
      debugLog({ source: "app", message: "Debug route opened; skipping app auth bootstrap" })
      setReady(true)
      return
    }

    debugLog({ source: "app", message: "App bootstrapped", details: { hash: window.location.hash } })
    if (isBrowserOAuthRelay) {
      debugLog({ source: "auth", message: "Browser OAuth relay detected" })
      window.location.href = `walkie-chattie://login-callback${window.location.hash}`
      setReady(true)
      return
    }

    // Check for OAuth tokens in URL fragment FIRST before assuming we're logged out
    const parseOAuthFragment = (): Promise<boolean> => {
      const hash = window.location.hash
      if (!hash.includes('access_token')) return Promise.resolve(false)
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (!accessToken || !refreshToken) return Promise.resolve(false)
      debugLog({ source: "auth", message: "OAuth access token found in URL fragment" })
      return withTimeout(
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
        "OAuth fragment setSession"
      )
        .then(({ error }) => {
          if (error) {
            debugLog({ level: "error", source: "auth", message: "OAuth fragment session restore failed", details: error })
            return null
          }

          return withTimeout(supabase.auth.getUser(), "OAuth fragment getUser")
        })
        .then((result) => {
          if (!result) return false

          const { data: { user }, error } = result
          if (!user && !error) {
            debugLog({ level: "warn", source: "auth", message: "OAuth fragment did not return a user" })
            return false
          }

          if (error) {
            debugLog({ level: "error", source: "auth", message: "OAuth fragment user lookup failed", details: error })
            return false
          }

          if (user) {
            debugLog({ source: "auth", message: "OAuth fragment session restored", details: { userId: user.id } })
            // Don't call loadProfile here — setSession triggers onAuthStateChange which handles it
            setSession({ access_token: accessToken, refresh_token: refreshToken, expires_in: 3600, token_type: 'bearer', user })
            history.replaceState(null, '', window.location.pathname)
            return true
          }
          return false
        })
        .catch((error) => {
          debugLog({ level: "error", source: "auth", message: "OAuth fragment handling failed or timed out", details: error })
          return false
        })
    }

    parseOAuthFragment().then((foundToken) => {
      // Only check storage if we didn't get a token from the fragment
      if (!foundToken) {
        debugLog({ source: "auth", message: "Checking stored Supabase session" })
        withTimeout(supabase.auth.getSession(), "Stored Supabase session check").then(({ data: { session }, error }) => {
          if (error) {
            debugLog({ level: "error", source: "auth", message: "Stored Supabase session check failed", details: error })
            setProfile(null)
            setSpace(null)
            setMembers([])
            setSpacesReady(true)
            return
          }

          if (session) {
            debugLog({ source: "auth", message: "Stored Supabase session found", details: { userId: session.user.id } })
            setSession(session)
            loadProfile(session.user.id, setProfile)
          } else {
            debugLog({ source: "auth", message: "No stored Supabase session" })
            setProfile(null)
            setSpace(null)
            setMembers([])
            setSpacesReady(true)
          }
        }).catch((error) => {
          debugLog({ level: "error", source: "auth", message: "Stored Supabase session check crashed, was blocked, or timed out", details: error })
          setProfile(null)
          setSpace(null)
          setMembers([])
          setSpacesReady(true)
        })
      }
      setReady(true)
    }).catch((error) => {
      debugLog({ level: "error", source: "auth", message: "Initial auth bootstrap crashed", details: error })
      setProfile(null)
      setSpace(null)
      setMembers([])
      setSpacesReady(true)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      debugLog({ source: "auth", message: "Auth state changed", details: { signedIn: Boolean(session?.user), userId: session?.user?.id } })
      setSession(session)
      if (session?.user) {
        if (ready) {
          // Only reset space state if we've already bootstrapped — avoid races
          // during initial setup where setSpacesReady(true) from the auth flow
          // would get stomped by this callback firing synchronously.
          setSpacesReady(false)
        }
        loadProfile(session.user.id, setProfile)
      } else {
        setProfile(null)
        setSpace(null)
        setMembers([])
        setSpacesReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!ready) return

    if (!user) {
      setSpace(null)
      setMembers([])
      setSpacesReady(true)
      return
    }

    let cancelled = false
    let done = false
    setSpacesReady(false)

    withTimeout(
      loadExistingSpace(user.id, setSpace, setMembers, setSpaces),
      "Existing space lookup",
      10000
    ).finally(() => {
      cancelled = true
      if (!done) { done = true; setSpacesReady(true) }
    }).catch((error) => {
      debugLog({ level: "error", source: "space", message: "Existing space lookup crashed", details: error })
      if (!done) { done = true; setSpacesReady(true) }
    })

    // Absolute last-resort: if the promise race never settles, force-exit the loading screen.
    const safetyTimeout = window.setTimeout(() => {
      if (!done) {
        done = true
        debugLog({ level: "error", source: "space", message: "Space lookup safety timeout fired — forcing spacesReady=true" })
        setSpacesReady(true)
      }
    }, 12000)

    return () => {
      cancelled = true
      window.clearTimeout(safetyTimeout)
    }
  }, [ready, user?.id])

  // Real-time presence + typing: track online users and who is currently typing
  useEffect(() => {
    if (!currentSpace || !user) return

    const channelName = `space-presence:${currentSpace.id}`
    const channel = supabase.channel(channelName)

    const syncOnlineUsers = () => {
      if (!useSpaceStore.getState().currentSpace) return
      const allOnline = channel.presenceState()
      const ids = Object.values(allOnline)
        .flat()
        .map((s) => (s as unknown as { user_id: string }).user_id)
        .filter(Boolean)
      useSpaceStore.getState().setOnlineUsers(new Set(ids))
    }

    const setTyping = (userId: string) => {
      const current = useSpaceStore.getState().typingUsers
      useSpaceStore.getState().setTypingUsers(new Set([...current, userId]))
    }

    const clearTyping = (userId: string) => {
      const current = useSpaceStore.getState().typingUsers
      const next = new Set(current)
      next.delete(userId)
      useSpaceStore.getState().setTypingUsers(next)
    }

    channel
      .on("presence", { event: "sync" }, syncOnlineUsers)
      .on("presence", { event: "join" }, ({ key, currentPresences }) => {
        syncOnlineUsers()
      })
      .on("presence", { event: "leave" }, ({ key, currentPresences }) => {
        syncOnlineUsers()
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const uid = (payload.payload as unknown as { user_id: string }).user_id
        if (uid === user.id) return // don't track self
        setTyping(uid)
        // Auto-remove after 4s
        window.setTimeout(() => clearTyping(uid), 4000)
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const uid = (payload.payload as unknown as { user_id: string }).user_id
        clearTyping(uid)
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return
        await channel.track({ user_id: user.id })
      })

    return () => {
      supabase.removeChannel(channel)
      useSpaceStore.getState().setOnlineUsers(new Set())
      useSpaceStore.getState().setTypingUsers(new Set())
      teardownTypingChannel()
    }
  }, [currentSpace?.id, user?.id])

  // Init typing channel when space changes
  useEffect(() => {
    if (!currentSpace || !user) return
    initTypingChannel(currentSpace.id, user.id)
    return () => teardownTypingChannel()
  }, [currentSpace?.id, user?.id])

  const loadingReasons = getLoadingReasons({ loading, ready, user, spacesReady, profile, currentSpace })
  const isLoadingScreen = loading || !ready || (user && !spacesReady)

  useEffect(() => {
    if (isDebugRoute) return
    if (!isLoadingScreen) return

    debugLog({
      level: "warn",
      source: "app",
      message: "Loading screen is active",
      details: {
        reasons: loadingReasons,
        state: {
          loading,
          ready,
          hasUser: Boolean(user),
          hasProfile: Boolean(profile),
          hasCurrentSpace: Boolean(currentSpace),
          spacesReady,
        },
      },
    })

    const timeout = window.setTimeout(() => {
      debugLog({
        level: "error",
        source: "app",
        message: "App is still stuck on Loading after 5 seconds",
        details: {
          likelyReason: loadingReasons[0] || "Unknown loading gate",
          reasons: loadingReasons,
          state: {
            loading,
            ready,
            hasUser: Boolean(user),
            hasProfile: Boolean(profile),
            hasCurrentSpace: Boolean(currentSpace),
            spacesReady,
          },
        },
      })
    }, 5000)

    return () => window.clearTimeout(timeout)
  }, [isLoadingScreen, loading, ready, Boolean(user), Boolean(profile), Boolean(currentSpace), spacesReady, loadingReasons.join("|")])

  if (isBrowserOAuthRelay) {
    return <div className="h-screen bg-bg-deep flex items-center justify-center">
      <div className="text-accent font-display text-xl animate-pulse">Returning to Walkie-Chattie...</div>
    </div>
  }

  if (isDebugRoute) return <DebugPage />
  if (popupType === "shout") return <ShoutPopup />
  if (popupType === "whisper") return <WhisperPopup />

  if (isLoadingScreen) {
    return <div className="h-screen bg-bg-deep flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-accent font-display text-xl animate-pulse">Loading...</div>
        {loadingReasons[0] && (
          <div className="text-text-lo text-xs max-w-md text-center">
            Waiting because {loadingReasons[0]}. Press F1 for Debug Mode.
          </div>
        )}
      </div>
    </div>
  }

  if (!user) return <AuthPage />
  if (!currentSpace) return <RoomModal onClose={() => setJoinOrCreateModalOpen(false)} closable={false} />
  if (joinOrCreateModalOpen) return <RoomModal onClose={() => setJoinOrCreateModalOpen(false)} closable={true} />
  if (!profile) return <OnboardingPage />
  return (
    <>
      <DashboardPage />
      <ToastContainer />
    </>
  )
}
