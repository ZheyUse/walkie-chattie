# Astra v1.0.9

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.9.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## New Features

### Global Online Status
You now appear online across **all spaces** you're a member of, just like Discord:
- When you're active in one space, members in other shared spaces see you as online
- A global heartbeat keeps your online status updated every 30 seconds
- Status automatically clears when you close the app or sign out

### Cross-Space Shout & Tap Notifications
`/shout` and `/tap` commands now work across different spaces:
- As long as you're a member of the space where the command was fired, you'll receive the notification
- Notifications appear regardless of which space you're currently viewing
- Shout/Tap bubbles show the source space name and icon

### Debug Mode Toggle
Built-in debugging now has an ON/OFF toggle in the Debug window:
- Toggle debug logging on/off from the Debug page (F1)
- When OFF, no debug logs are captured (saves RAM and space)
- State persists across app restarts
- Debug logs are also broadcast to all windows via main process

---

## Bug Fixes

| # | Issue | Fix |
|---|---|---|
| #1 | App appeared offline in other spaces when minimized to tray | Disabled background throttling when minimized — Supabase Realtime WebSocket stays alive |
| #2 | /shout and /tap only worked within the same space | Realtime subscription now listens to ALL spaces user is a member of |
| #3 | Spaces didn't sync across devices when created on another terminal | Added global realtime subscription for space_members changes |
| #4 | New users' avatars didn't display for first message | Added profile fetch fallback when member picture is missing |
| #5 | Mojibake encoding (wrong characters) in ChatInput hint | Fixed UTF-8 encoding for hint text |
| #6 | Reply button didn't focus the textarea | Auto-focuses input when reply is initiated |
| #7 | Messages disappeared when switching spaces and returning | Messages now load newest-first; user sees latest messages on return |
| #8 | Message status (check icon) appeared on all sent messages | Status icon only shows on the latest message sent |
| #9 | Reaction updates triggered loading spinner on messages | Preserved original message status during reaction updates |

---

## Improvements

- **Message loading** — messages load newest-first (newest 100 shown), scroll up for history
- **Presence tracking** — global heartbeat keeps status accurate across all spaces
- **Members panel** — now fetches global online status from database (last_seen_at tracking)
- **Auto-start** — now only enabled in production builds, not in development
- **Debug page** — added message counter debug overlay to track state changes

---

## Database Changes

New columns added to `profiles` table for global online status:
```sql
ALTER TABLE public.profiles ADD COLUMN is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN last_seen_at timestamptz;
CREATE INDEX idx_profiles_is_online ON public.profiles(is_online) WHERE is_online = true;
```

---

## Full Changelog (since v1.0.8)

| Change | Summary |
|---|---|
| Global online status | Users appear online across ALL shared spaces; heartbeat system |
| Background fix | App stays "online" when minimized to tray via disabled throttling |
| Cross-space shouts/taps | Notifications work regardless of current viewing space |
| Space sync | Spaces created on other devices sync automatically |
| Avatar fix | New users' avatars display correctly on first message |
| Reply focus fix | Textarea auto-focuses when reply is clicked |
| Message loading | Newest messages load first; supports pagination |
| Status icon | Check mark only on latest sent message |
| Debug toggle | Enable/disable debug mode with localStorage persistence |

---

## Files Changed

| File | Change |
|---|---|
| `src/main/index.ts` | Background throttling control, debug toggle IPC, auto-start production-only |
| `src/preload/index.ts` | Added setDebugMode and onDebugStateChanged APIs |
| `src/renderer/src/App.tsx` | Online heartbeat, global spaces realtime subscription |
| `src/renderer/src/lib/online-status.ts` | New: global heartbeat management |
| `src/renderer/src/lib/debug.ts` | Debug toggle with localStorage + IPC broadcast |
| `src/renderer/src/pages/DebugPage.tsx` | Toggle ON/OFF button, improved UI |
| `src/renderer/src/components/chat/ChatInput.tsx` | Auto-focus listener for reply |
| `src/renderer/src/components/chat/MessageItem.tsx` | Avatar profile fallback, latest message check |
| `src/renderer/src/components/chat/MessageList.tsx` | Cross-space subscription, newest-first loading, message counter |
| `src/renderer/src/components/layout/MembersPanel.tsx` | Global online status from profiles table |
| `src/renderer/src/stores/chat.store.ts` | Reaction debug logging improvements |
| `src/renderer/src/stores/space.store.ts` | Debug logging for space/member changes |
| `src/renderer/src/env.d.ts` | Added debug API types |
| `supabase/add-message-reactions.sql` | Fixed RLS policy with SECURITY DEFINER function |
| `supabase/global-online-status.sql` | New: is_online and last_seen_at columns |

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