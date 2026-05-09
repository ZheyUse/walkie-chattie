# Astra v1.0.11

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.11.exe` from the assets below and run it.
**Upgrading:** Click the version number in the titlebar to manually check for updates, or wait for the auto-update prompt.

---

## New Features

### @mention & /command Keyboard Navigation
Type `@username` or `/command` and use **Up/Down arrows** to navigate suggestions, then press **Enter** or **Tab** to select:
- The currently highlighted item is selected (not always the first one)
- Shows which match type ("nickname" vs "display name") in the suggestion list

### Loading State When Switching Spaces
When switching between spaces, you'll now see an animated loading indicator:
- Custom animated logo during message fetch
- "Loading messages..." text below
- No more confusing "No messages yet" flash during loading

### Ctrl+V Image Paste
You can now paste screenshots directly into the chat:
- Copy an image to clipboard
- Press `Ctrl+V` in the chat input
- Image is attached and ready to send

### Attachments Work Without Text in /shout
`/shout` with only images, GIFs, or stickers now works:
- `/shout`, `/tap`, and `/all` commands validate that some content exists
- Shows toast: "Use /shout <message>" if no text AND no attachment
- Attachments alone are valid message content

### Debug Mode Auto-Enabled in Development
When running in development (`npm run dev`):
- Debug window (F1) is automatically enabled
- No need to manually toggle debug mode
- Production builds default to disabled

---

## Bug Fixes

| # | Issue | Fix |
|---|---|---|
| #1 | /tap used display_name instead of nickname, causing "Member not found" | Now correctly uses nickname for matching |
| #2 | /shout/tap with only attachments showed "null" in message list | Images/GIFs now display correctly in message list |
| #3 | Enter/Tab on @mention always selected @all instead of highlighted | Now uses `selectedMentionIndex` to select actual highlighted item |
| #4 | /nickname changes reverted on space switch | Fixed space_members storage issue |
| #5 | App auto-start didn't scroll to latest message | Improved scroll timing with 100ms delay and Loader state |
| #6 | Last active space not restored on restart | Now saves `lastActiveSpaceId` during space load |

---

## Improvements

- **Better scroll timing** — Uses 100ms delay instead of 50ms for reliable DOM rendering
- **Enhanced debug logging** — Synced between main process and renderer
- **Improved status checks** — `isUserOnline()` function for reliable online status via database
- **Cleaner debug log output** — Removed noisy status logs from MembersPanel

---

## Files Changed

| File | Change |
|---|---|
| `src/main/index.ts` | Debug mode defaults to enabled in dev, auto-cleanup of Update cache |
| `src/preload/index.ts` | Added `getDebugState` IPC handler |
| `src/renderer/src/App.tsx` | Fixed `ready` state timing, saves `lastActiveSpaceId` on load |
| `src/renderer/src/components/chat/ChatInput.tsx` | Ctrl+V paste, Enter key fixes, /shout empty validation |
| `src/renderer/src/components/chat/MessageItem.tsx` | GIF/Image display in shout/wire messages |
| `src/renderer/src/components/chat/MessageList.tsx` | Loading state with Loader, improved scroll timing |
| `src/renderer/src/components/chat/WhisperSuggest.tsx` | Arrow key navigation, selected index tracking |
| `src/renderer/src/components/layout/MembersPanel.tsx` | Reduced debug log noise |
| `src/renderer/src/env.d.ts` | Added `getDebugState` type definition |
| `src/renderer/src/lib/debug.ts` | Defaults to enabled in dev mode, syncs from main process |
| `src/renderer/src/lib/online-status.ts` | Added `isUserOnline()` function for reliable status checks |

---

## Full Changelog (since v1.0.10)

| Change | Summary |
|---|---|
| @mention keyboard nav | Up/Down + Enter/Tab selects highlighted item |
| Loading state | Animated Loader during space switches |
| Ctrl+V paste | Paste images directly into chat |
| /shout with attachments | Works with image/GIF/sticker only |
| @Tap nickname fix | Uses nickname instead of display_name |
| @Shout/tap display fix | Images show in message list |
| Last active space | Restored on app restart |
| Auto-scroll on startup | Fixed timing issues |
| Debug auto-enabled | F1 debug enabled in dev mode |

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