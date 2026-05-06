# Bug Tracker

## Realtime Sync
2. Member panel does not update in realtime when users join a room
3. Room rename by admin does not propagate in realtime
8. Reactions are client-side only — not stored in Supabase, not visible to others

## Member Panel (prioritize)
1. After `/kick` or leaving a space, users cannot rejoin using the space ID
7. Add space nickname (per-space display name, like Discord server nickname) using /nickname [feature]
9. Member panel has multiple unresolved bugs — needs full audit
13. Add three user statuses: Online, Offline, Busy [feature]

## Messaging & Commands
4. Auto-scroll to latest message only works for the local sender, not for incoming messages
5. Commands (`/shout`, `/tap`, `/kick`) trigger even when not at the start of input — should be treated as plain text unless the command is the first character
6. Reply button is non-functional — implement Discord-style reply UX
10. Attaching a GIF, sticker, or image requires clicking the textarea and pressing Enter to send
12. `/shout` and `/tap` fail when recipient is "offline" but app is still running in the system tray — clarify if tray = reachable 

when internet is active

## Stability
11. Messages disappear intermittently when switching between spaces and returning — likely a stale cache or subscription cleanup issue



