# Astra v1.0.10

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.10.exe` from the assets below and run it.
**Upgrading:** Click the version number in the titlebar to manually check for updates, or wait for the auto-update prompt.

---

## New Features

### Images in Shout & Tap Popups
`/shout` and `/tap` commands now display attached images:
- Images are shown with a loading spinner while they load
- GIFs and Stickers continue to work as before
- Images display below the message text in the popup

### Manual Update Check from Titlebar
Click the version number (`v1.x.x`) in the titlebar to manually check for updates:
- No need to restart the app to see if there's a new update
- Toast notifications show the result:
  - "Checking for new updates..." (when clicked)
  - "No new updates available" (if current)
  - "New update available: v{x.x.x}" (if update found)

### Admin: Change Member Nicknames
Admins can now change other members' display names:
- Usage: `/nickname @username <newname>`
- Example: `/nickname @johny CoolGuy123`
- Toast confirmation: "johny's nickname changed to 'CoolGuy123'"
- Non-admins can still change their own nickname with `/nickname <newname>`

### Informational /tap "Offline" Toast
When sending a `/tap` to someone who's shown as offline:
- Toast shows "@username is Offline" (informational only)
- The tap is **still sent** — they'll receive it if reachable
- This prevents bugs in presence status from blocking valid messages

---

## Bug Fixes

| # | Issue | Fix |
|---|---|---|
| #1 | Auto-scroll didn't work when entering app or switching spaces | Combined scroll effect with `messages.length` + `currentSpace.id` dependencies; scrolls to latest message on initial load and space switch |
| #2 | Users showed as "Busy" when they were actually offline (PC shutdown/crash) | Added stale heartbeat check: users with `lastSeen` > 2 minutes are marked offline |
| #3 | Images weren't included in shout/tap popups | Added `imageUrl` parameter to popup data; displayed in ShoutPopup and TapPopup |
| #4 | Clicking saved shout/tap message didn't show the image | Added `imageUrl` in click-to-replay handlers (MessageItem and MessageList) |
| #5 | Image loading was too fast before upload completed | Added loading spinner animation in popups |
| #6 | Presence-based offline detection was buggy | Informational toasts don't block message delivery |

---

## Improvements

- **Debug logging enhanced** for auto-scroll, status detection, and presence tracking
- **Better offline detection** using stale heartbeat threshold (2 minutes)
- **`pagehide` event handler** for more reliable offline status on app close
- **Auto-cleanup update cache** — downloaded installers are deleted after successful installation
- **Loading animations** for images in shout/tap popups
- **Enhanced status debug logs** show actual timestamps and thresholds

---

## Files Changed

| File | Change |
|---|---|
| `src/preload/index.ts` | Added `checkForUpdates` API, added `imageUrl` to `PopupData` type |
| `src/main/index.ts` | Added `check-for-updates` IPC handler, enhanced `before-quit` logging, auto-cleanup of downloaded installers |
| `src/renderer/src/components/layout/TitleBar.tsx` | Interactive version button with hover effects and click-to-check-updates |
| `src/renderer/src/components/chat/ChatInput.tsx` | Added `imageUrl` to showShout/showTap, `/nickname` admin support, `/tap` offline toast |
| `src/renderer/src/components/chat/MessageItem.tsx` | Added `imageUrl` to shout/tap click handlers |
| `src/renderer/src/components/chat/MessageList.tsx` | Added `imageUrl` to realtime shout/tap handlers, fixed auto-scroll logic |
| `src/renderer/src/components/popups/ShoutPopup.tsx` | Added `imageUrl` display with loading spinner |
| `src/renderer/src/components/popups/TapPopup.tsx` | Added `imageUrl` display with loading spinner |
| `src/renderer/src/components/layout/MembersPanel.tsx` | Added stale heartbeat check for offline detection |
| `src/renderer/src/App.tsx` | Added `pagehide` event handler for offline detection |
| `src/renderer/src/lib/online-status.ts` | Enhanced debug logging for heartbeat and status changes |
| `src/renderer/src/env.d.ts` | Added `checkForUpdates` type definition |

**New Files:**
| File | Purpose |
|---|---|
| `src/renderer/src/components/ui/MediaPreviewModal.tsx` | Full-screen media preview modal with download functionality |
| `src/renderer/src/lib/online-status.ts` | Global online status management with heartbeat |

---

## Full Changelog (since v1.0.9)

| Change | Summary |
|---|---|
| Images in shout/tap | Attached images now display in popup with loading animation |
| Manual update check | Click version in titlebar to check for updates |
| Admin nickname change | `/nickname @username <newname>` for admins |
| Auto-scroll fix | Scrolls to bottom on space enter/switch |
| Offline vs Busy fix | Users with stale heartbeats (>2 min) now show offline |
| Tap offline toast | Informational toast doesn't block message delivery |
| Media preview modal | Full-screen preview for images in chat |

---

## Known Limitations

- Desktop app only — no mobile or web version
- GIF/Sticker picker requires `VITE_GIPHY_KEY` and `VITE_TENOR_KEY` to be configured
- Auto-update requires a GitHub Release to be created before clients can check for updates

---

## Installing / Updating

**Automatic:** Astra will prompt you when a new update is available.

**Manual:** Click the version number (`v{x.x.x}`) in the titlebar to trigger a manual update check.

**Or:** Download the installer from the **Assets** section below.

---

## Feedback & Issues

Report bugs or feature requests at: [github.com/ZheyUse/walkie-chattie/issues](https://github.com/ZheyUse/walkie-chattie/issues)

---

*Built with Electron · React · Supabase · Tailwind CSS*