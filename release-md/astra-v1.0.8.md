# Astra v1.0.8

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.8.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## New Features

### Message Replies
Reply directly to any message with Discord-style reply UX:
- Click the reply button on any message to quote and respond
- Replies render inline with a left accent border and quoted content
- Backed by Supabase (`message_replies` table) with realtime sync — all members see replies as they're sent

### Message Reactions
Express yourself with emoji reactions on any message:
- Hover any message and click the reaction icon to add an emoji
- Reactions display as a compact row below the message content
- Now saved to Supabase (`message_reactions` table) and synced in realtime — reactions are visible to everyone

### User Presence & Status
The members panel tracks and displays real-time user status:
- **Online** (green) — user is active
- **Busy** (red) — user is marked busy
- **Offline** (gray) — user has gone idle or disconnected
Presence is tracked via a new `presence.ts` utility and syncs across all clients

### Member Display Names
Members can now be identified by a display name in addition to their nickname:
- Display names appear in the members panel, whisper suggest, and chat messages
- WhisperSuggest now filters by display name or nickname as you type

### Space Backgrounds
Chat spaces now render an atmospheric, visually rich background that makes each space feel distinct from the rest of the app shell.

### Onboarding Visual Overhaul
The onboarding page received a full visual refresh:
- Animated cosmic background with pre-computed stars, radial gradients, and nebula effects
- Periodic shooting star animations for ambient motion
- Updated glass morphism form styles and button feedback with loading states
- Fresh app icon (`icon2.svg`) for improved branding

### Typing Indicator Redesign
The typing indicator is now a floating pill that sits at the top of the chat area — more visible, less intrusive, with animated dots.

---

## Bug Fixes

| # | Issue | Fix |
|---|---|---|
| #6 | Reply button was non-functional | Reply UX fully implemented with Supabase-backed persistence |
| #8 | Reactions were client-side only — not stored in Supabase, not visible to others | Reactions now persist to `message_reactions` table with realtime subscriptions |
| #9 | Members panel had unresolved bugs | Fixed member management issues; improved realtime sync; status badges now accurate |

---

## Improvements

- **Message list** — messages now auto-scroll and update in realtime with reactions/replies
- **ChatInput** — handles reply context and reaction picker integration
- **MembersPanel** — real-time member join/leave events, status badge display
- **WhisperSuggest** — filters by display name or nickname
- **Supabase schema** — three new migrations for reactions, replies, and member display name fields
- **TypingIndicator** — redesigned as a floating pill style

---

## Full Changelog (since v1.0.7)

| Commit | Summary |
|---|---|
| `378e627` | Message replies, reactions (Supabase + realtime), presence/status, display names, typing indicator redesign |
| `f7dbfe6` | OnboardingPage cosmic background, shooting stars, icon update |

---

## Files Changed

| File | Change |
|---|---|
| `src/renderer/src/App.tsx` | Wired SpaceBackground, presence tracking, icon update |
| `src/renderer/src/components/chat/ChatInput.tsx` | Reply context, reaction picker support |
| `src/renderer/src/components/chat/MessageItem.tsx` | Reply quotes, reaction display and action buttons |
| `src/renderer/src/components/chat/MessageList.tsx` | Realtime sub for reactions and replies |
| `src/renderer/src/components/chat/TypingIndicator.tsx` | Floating pill redesign |
| `src/renderer/src/components/chat/WhisperSuggest.tsx` | Filter by display name |
| `src/renderer/src/components/layout/MembersPanel.tsx` | Status badges, realtime sync |
| `src/renderer/src/components/layout/SettingsPanel.tsx` | Minor improvements |
| `src/renderer/src/components/modals/RoomModal.tsx` | UX improvements for new features |
| `src/renderer/src/components/modals/CreateSpaceForm.tsx` | Minor styling tweaks |
| `src/renderer/src/components/ui/Avatar.tsx` | Display name support |
| `src/renderer/src/components/ui/SpaceBackground.tsx` | New: atmospheric space background component |
| `src/renderer/src/lib/presence.ts` | New: presence tracking utility |
| `src/renderer/src/pages/OnboardingPage.tsx` | Full visual overhaul with cosmic background |
| `src/renderer/src/stores/chat.store.ts` | Reply and reaction state |
| `src/renderer/src/stores/space.store.ts` | Presence sync |
| `src/renderer/public/resources/icons/icon2.svg` | New app icon |
| `supabase/add-message-reactions.sql` | New: reactions table |
| `supabase/add-message-replies.sql` | New: replies table |
| `supabase/add-space-member-fields.sql` | New: display name fields |

---

## Known Limitations

- Desktop app only — no mobile or web version
- GIF/Sticker picker requires `VITE_GIPHY_KEY` and `VITE_TENOR_KEY` to be configured
- Auto-update requires a GitHub Release to be created before clients can check for updates

---

## Installing / Updating

If Astra is already installed, it will automatically check for updates on launch and prompt you to install. Otherwise, download the installer from the **Assets** section below.

---

## Feedback & Issues

Report bugs or feature requests at: [github.com/ZheyUse/walkie-chattie/issues](https://github.com/ZheyUse/walkie-chattie/issues)

---

*Built with Electron · React · Supabase · Tailwind CSS*