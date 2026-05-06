import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import { useAuthStore, type Profile } from "./stores/auth.store"
import { useSpaceStore, type Member, type Space } from "./stores/space.store"
import { useChatStore } from "./stores/chat.store"
import AuthPage from "./pages/AuthPage"
import OnboardingPage from "./pages/OnboardingPage"
import DashboardPage from "./pages/DashboardPage"
import DebugPage from "./pages/DebugPage"
import RoomModal from "./components/modals/RoomModal"
import ToastContainer from "./components/ui/ToastContainer"
import Loader from "./components/ui/Loader"
import InAppNotification from "./components/ui/InAppNotification"
import UpdatePrompt from "./components/ui/UpdatePrompt"
import ShoutPopup from "./components/popups/ShoutPopup"
import TapPopup from "./components/popups/TapPopup"
import BroadcastPopup from "./components/popups/BroadcastPopup"
import { debugLog } from "./lib/debug"
import { useIdleTracker, lastActiveRef, applyPresenceLastActive } from "./lib/presence"
import { initTypingChannel, teardownTypingChannel } from "./lib/typing-channel"
import { assetPath } from "./lib/assets"

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
      }
      debugLog({ source: "auth", message: data ? "Profile loaded" : "Profile missing", details: { userId } })
      setProfile(data ?? null)
    })
    .catch((error) => {
      debugLog({ level: "error", source: "auth", message: "Profile load crashed or was blocked", details: error })
      setProfile(null)
    })
}

function logSpaceMemberSnapshot(message: string, details: {
  requestedSpaceId?: string
  activeSpaceId?: string | null
  userId?: string
  memberships?: unknown
  spaces?: unknown
  rawMembers?: unknown
  profiles?: unknown
  enrichedMembers?: Member[]
  mismatchMembers?: Member[]
  error?: unknown
}) {
  debugLog({
    level: details.error || (details.mismatchMembers?.length ?? 0) > 0 ? "warn" : "info",
    source: "space-members-debug",
    message,
    details: {
      requestedSpaceId: details.requestedSpaceId,
      activeSpaceId: details.activeSpaceId,
      userId: details.userId,
      memberships: details.memberships,
      spaces: details.spaces,
      rawMembers: details.rawMembers,
      profiles: details.profiles,
      enrichedMembers: details.enrichedMembers?.map((m) => ({
        space_id: m.space_id,
        user_id: m.user_id,
        nickname: m.nickname,
        role: m.role,
        joined_at: m.joined_at,
      })),
      mismatchMembers: details.mismatchMembers?.map((m) => ({
        space_id: m.space_id,
        expected_space_id: details.requestedSpaceId,
        user_id: m.user_id,
        nickname: m.nickname,
        role: m.role,
      })),
      error: details.error,
    },
  })
}

async function loadSpaceMembers(space: Space, setMembers: (m: Member[]) => void) {
  const spaceId = space.id
  debugLog({ source: "space", message: "Loading space members", details: { spaceId } })
  debugLog({
    source: "space-members-debug",
    message: "Space members load started",
    details: {
      requestedSpaceId: spaceId,
      activeSpaceId: useSpaceStore.getState().currentSpace?.id ?? null,
    },
  })
  const { data: members, error: membersError } = await withTimeout(
    supabase
      .from("space_members")
      .select("space_id, user_id, role, joined_at, display_name")
      .eq("space_id", spaceId)
      .eq("blacklisted", false),
      
    "Space members load"
  )

  if (membersError) {
    debugLog({ level: "error", source: "space", message: "Space members load failed", details: membersError })
    logSpaceMemberSnapshot("Space members query failed", {
      requestedSpaceId: spaceId,
      activeSpaceId: useSpaceStore.getState().currentSpace?.id ?? null,
      rawMembers: members,
      error: membersError,
    })
    return
  }

  if (!members) {
    debugLog({ level: "warn", source: "space", message: "Space members response was empty", details: { spaceId } })
    return
  }

  debugLog({
    source: "space-members-debug",
    message: "Space members load returned rows",
    details: {
      requestedSpaceId: spaceId,
      activeSpaceId: useSpaceStore.getState().currentSpace?.id ?? null,
      rawMemberCount: members.length,
      rawMembers: members.map((member) => ({
        space_id: member.space_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
      })),
    },
  })

  const ids = members.map((m) => m.user_id)
  const { data: profiles, error: profilesError } = await withTimeout(
    Promise.resolve(
      supabase
        .from("profiles")
        .select("id, nickname, avatar_color, picture")
        .in("id", ids)
    ),
    "Member profiles load"
  ) as { data: { id: string; nickname: string; avatar_color: string; picture?: string }[] | null; error: unknown }

  if (profilesError) {
    debugLog({ level: "error", source: "space", message: "Member profiles load failed", details: profilesError })
  }

  const enrichedMembers = members.map((m) => ({
    ...m,
    role: m.role === "admin" || m.user_id === space.owner_id ? "admin" : "member",
    nickname: profiles?.find((p) => p.id === m.user_id)?.nickname || "?",
    avatar_color: profiles?.find((p) => p.id === m.user_id)?.avatar_color || "#888",
    picture: profiles?.find((p) => p.id === m.user_id)?.picture,
    display_name: m.display_name ?? null,
  }))
  const mismatchMembers = enrichedMembers.filter((m) => m.space_id !== spaceId)
  const activeSpaceId = useSpaceStore.getState().currentSpace?.id ?? null

  debugLog({
    source: "space-members-debug",
    message: "Space members enriched",
    details: {
      requestedSpaceId: spaceId,
      activeSpaceId,
      enrichedCount: enrichedMembers.length,
      mismatchCount: mismatchMembers.length,
    },
  })

  logSpaceMemberSnapshot("Space members loaded", {
    requestedSpaceId: spaceId,
    activeSpaceId,
    rawMembers: members,
    profiles,
    enrichedMembers,
    mismatchMembers,
  })

  if (mismatchMembers.length > 0) {
    debugLog({
      level: "error",
      source: "space-members-debug",
      message: "BUG DETECTED: Supabase returned members from another space",
      details: {
        requestedSpaceId: spaceId,
        mismatchMembers,
      },
    })
  }

  if (activeSpaceId && activeSpaceId !== spaceId) {
    debugLog({
      level: "warn",
      source: "space-members-debug",
      message: "Ignoring stale member load for inactive space",
      details: { requestedSpaceId: spaceId, activeSpaceId },
    })
    return
  }

  const scopedMembers = enrichedMembers.filter((m) => m.space_id === spaceId)
  debugLog({
    source: "space-members-debug",
    message: "Space members scoped for store",
    details: {
      requestedSpaceId: spaceId,
      activeSpaceId,
      scopedCount: scopedMembers.length,
      scopedMembers: scopedMembers.map((member) => ({
        space_id: member.space_id,
        user_id: member.user_id,
        nickname: member.nickname,
        role: member.role,
      })),
    },
  })
  setMembers(scopedMembers)
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
        .select("space_id, user_id, role, joined_at")
        .eq("user_id", userId)
        .eq("blacklisted", false)
    ),
    "Existing space membership load"
  ) as { data: Pick<Member, "space_id" | "user_id" | "role" | "joined_at">[] | null; error: unknown }

  if (membershipsError) {
    debugLog({ level: "error", source: "space", message: "Existing space membership load failed", details: membershipsError })
    setSpace(null)
    setMembers([])
    setSpaces([])
    return
  }

  if (!memberships || memberships.length === 0) {
    debugLog({ source: "space", message: "No existing space found for user", details: { userId } })
    logSpaceMemberSnapshot("User has no space memberships", { userId, memberships })
    setSpace(null)
    setMembers([])
    setSpaces([])
    return
  }

  const spaceIds = [...new Set(memberships.map((m) => m.space_id))]
  logSpaceMemberSnapshot("User memberships loaded", { userId, memberships })
  const { data: allSpaces, error: spacesError } = await withTimeout(
    Promise.resolve(supabase.from("spaces").select("*").in("id", spaceIds)),
    "All spaces load"
  ) as { data: Space[] | null; error: unknown }

  if (spacesError) {
    debugLog({ level: "error", source: "space", message: "All spaces load failed", details: spacesError })
    logSpaceMemberSnapshot("Spaces load failed for user memberships", {
      userId,
      memberships,
      error: spacesError,
    })
    setSpace(null)
    setMembers([])
    setSpaces([])
    return
  }

  logSpaceMemberSnapshot("Spaces loaded for user memberships", {
    userId,
    memberships,
    spaces: allSpaces,
  })

  const lastActiveSpaceId = typeof window !== 'undefined' ? localStorage.getItem('lastActiveSpaceId') : null

  // Prefer last active space; fall back to first membership
  const preferredSpaceId = lastActiveSpaceId && allSpaces?.find((s) => s.id === lastActiveSpaceId)
    ? lastActiveSpaceId
    : memberships[0]?.space_id ?? null

  const space = allSpaces?.find((s) => s.id === preferredSpaceId) ?? null

  if (!space) {
    debugLog({ level: "warn", source: "space", message: "Membership pointed to missing spaces", details: { userId, spaceIds } })
    logSpaceMemberSnapshot("BUG DETECTED: Membership pointed to missing spaces", {
      userId,
      memberships,
      spaces: allSpaces,
    })
    setSpace(null)
    setMembers([])
    setSpaces([])
    return
  }

  debugLog({
    source: "space",
    message: "Existing space loaded",
    details: { spaceId: space.id, name: space.name },
  })
  setSpace(space)
  setSpaces(allSpaces ?? [])
  await loadSpaceMembers(space, setMembers)
}

function getPopupType(): "shout" | "tap" | "broadcast" | null {
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
  useIdleTracker(user?.id ?? "")
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
      window.location.href = `astra://login-callback${window.location.hash}`
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
            // Don't call loadProfile here â€” setSession triggers onAuthStateChange which handles it
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
      const prevUserId = useAuthStore.getState().user?.id
      const userChanged = session?.user?.id !== prevUserId
      setSession(session)
      if (session?.user) {
        if (ready) {
          setSpacesReady(false)
        }
        // Only reload profile if the user actually changed AND no profile exists yet.
        // This covers: (1) first sign-in with no profile yet â†’ load it
        //               (2) same-user token refresh â†’ skip it to avoid wiping a profile
        //                  that was just set (e.g. during onboarding)
        //               (3) same-user but no profile yet â†’ load it
        const existingProfile = useAuthStore.getState().profile
        if (userChanged || !existingProfile) {
          loadProfile(session.user.id, setProfile)
        } else {
          debugLog({ source: "auth", message: "Skipping profile load â€” same user with existing profile" })
        }
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
        debugLog({ level: "error", source: "space", message: "Space lookup safety timeout fired â€” forcing spacesReady=true" })
        setSpacesReady(true)
      }
    }, 12000)

    return () => {
      cancelled = true
      window.clearTimeout(safetyTimeout)
    }
  }, [ready, user?.id])

  useEffect(() => {
    if (!ready || !user || !window.api) return
    window.api.closeOAuthBrowser()
  }, [ready, user?.id])

  // Real-time presence + typing: track online users and who is currently typing
  useEffect(() => {
    if (!currentSpace || !user) return

    const channelName = `space-presence:${currentSpace.id}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: user.id } }
    })

    let presenceRefreshTimer: ReturnType<typeof window.setTimeout> | null = null
    const refreshMembersFromPresence = (reason: string, details?: unknown) => {
      if (presenceRefreshTimer) window.clearTimeout(presenceRefreshTimer)
      presenceRefreshTimer = window.setTimeout(() => {
        const activeSpace = useSpaceStore.getState().currentSpace
        if (!activeSpace || activeSpace.id !== currentSpace.id) return
        debugLog({ source: "space-realtime", message: `Presence refresh: ${reason}`, details })
        loadSpaceMembers(activeSpace, useSpaceStore.getState().setMembers).catch((error) => {
          debugLog({ level: "error", source: "space-realtime", message: "Presence member refresh failed", details: error })
        })
      }, 250)
    }

    const syncOnlineUsers = () => {
      if (!useSpaceStore.getState().currentSpace) return
      const allOnline = channel.presenceState()
      const ids: string[] = []
      Object.values(allOnline).flat().forEach((s) => {
        const state = s as unknown as { user_id: string; last_active?: number }
        if (state.user_id) {
          ids.push(state.user_id)
          if (state.last_active) applyPresenceLastActive(state.user_id, state.last_active)
          else lastActiveRef[state.user_id] = Date.now()
        }
      })
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
        if (Array.isArray(currentPresences) && currentPresences.length > 0) {
          const state = currentPresences[0] as unknown as { last_active?: number }
          if (state.last_active) applyPresenceLastActive(key, state.last_active)
        }
        refreshMembersFromPresence("join", { key, currentPresences })
      })
      .on("presence", { event: "leave" }, ({ key, currentPresences }) => {
        syncOnlineUsers()
        if (Array.isArray(currentPresences) && currentPresences.length > 0) {
          const state = currentPresences[0] as unknown as { last_active?: number }
          if (state.last_active) applyPresenceLastActive(key, state.last_active)
        }
        refreshMembersFromPresence("leave", { key, currentPresences })
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
      .on("broadcast", { event: "room_rename" }, (payload) => {
        const p = payload.payload as unknown as { name: string }
        if (p.name && useSpaceStore.getState().currentSpace?.id === currentSpace.id) {
          useSpaceStore.getState().updateSpaceName(p.name)
          debugLog({ source: 'space-realtime', message: 'Space renamed via broadcast', details: { newName: p.name } })
        }
      })
      .on("broadcast", { event: "chat_reset" }, (payload) => {
        const p = payload.payload as unknown as { spaceId: string }
        if (p.spaceId === currentSpace.id) {
          useChatStore.getState().setMessages([])
          debugLog({ source: 'space-realtime', message: 'Chat reset received via broadcast' })
        }
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return
        // Track with last_active for idle detection across clients
        await channel.track({ user_id: user.id, last_active: lastActiveRef[user.id] || Date.now() })
      })

    // Re-sync last_active to presence every 5 min so other clients keep busy/online accurate
    const presenceTrackInterval = setInterval(() => {
      channel.track({ user_id: user.id, last_active: lastActiveRef[user.id] || Date.now() })
    }, 5 * 60_000)

    return () => {
      clearInterval(presenceTrackInterval)
      if (presenceRefreshTimer) window.clearTimeout(presenceRefreshTimer)
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

  // Load members when switching spaces.
  useEffect(() => {
    if (!currentSpace || !user) return
    debugLog({
      source: "space-members-debug",
      message: "Space switch triggered member load",
      details: { spaceId: currentSpace.id, userId: user.id },
    })
    loadSpaceMembers(currentSpace, useSpaceStore.getState().setMembers).catch((error) => {
      debugLog({ level: "error", source: "space", message: "Space member load failed", details: error })
    })
  }, [currentSpace?.id, user?.id])

  // Keep the members panel live when someone joins, leaves, or gets kicked.
  useEffect(() => {
    if (!currentSpace || !user) return

    let refreshTimer: ReturnType<typeof window.setTimeout> | null = null
    const refreshMembers = (reason: string, details?: unknown) => {
      debugLog({ source: "space-realtime", message: `Refreshing members: ${reason}`, details })
      if (refreshTimer) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        const space = useSpaceStore.getState().currentSpace
        if (!space || space.id !== currentSpace.id) return
        loadSpaceMembers(space, useSpaceStore.getState().setMembers).catch((error) => {
          debugLog({ level: "error", source: "space-realtime", message: "Member refresh failed", details: error })
        })
      }, 250)
    }

    const channel = supabase
      .channel(`space-members:${currentSpace.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "space_members",
        filter: `space_id=eq.${currentSpace.id}`,
      }, (payload) => {
        refreshMembers(payload.eventType, payload)
      })
      .subscribe((status) => {
        debugLog({ source: "space-realtime", message: "Members subscription status", details: { status, spaceId: currentSpace.id } })
      })

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer)
      supabase.removeChannel(channel)
    }
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
      <div className="flex flex-col items-center gap-4">
        <img src={assetPath("resources/icons/icon.svg")} alt="Astra" className="w-16 h-16" />
        <div className="text-accent font-title text-xl animate-pulse">Returning to Astra...</div>
      </div>
    </div>
  }

  if (isDebugRoute) return <DebugPage />
  if (popupType === "shout") return <ShoutPopup />
  if (popupType === "tap") return <TapPopup />
  if (popupType === "broadcast") return <BroadcastPopup />

  if (isLoadingScreen) {
    return (
      <>
        <div className="h-screen bg-bg-deep flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <Loader />
            <div className="text-accent font-display text-xl animate-pulse">Loading...</div>
            {loadingReasons[0] && (
              <div className="text-text-lo text-xs max-w-md text-center">
                Waiting because {loadingReasons[0]}.
              </div>
            )}
          </div>
        </div>
        <UpdatePrompt />
      </>
    )
  }

  if (!user) return <><AuthPage /><UpdatePrompt /></>
  if (!profile) return <><OnboardingPage /><UpdatePrompt /></>
  if (!currentSpace) return <><RoomModal onClose={() => setJoinOrCreateModalOpen(false)} closable={false} /><UpdatePrompt /></>
  if (joinOrCreateModalOpen) return <><RoomModal onClose={() => setJoinOrCreateModalOpen(false)} closable={true} /><UpdatePrompt /></>
  return (
    <>
      <DashboardPage />
      <ToastContainer />
      <InAppNotification />
      <UpdatePrompt />
    </>
  )
}
