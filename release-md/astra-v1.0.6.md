# Astra v1.0.6

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.6.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## What's New

### Active Space Persistence
Astra now remembers which space you were last viewing:

- **Active space survives restarts** — When you restart or refresh the app, Astra automatically opens the last space you were in, instead of always defaulting to the first one
- **Per-action tracking** — `lastActiveSpaceId` is written to localStorage on space switch, join, create, leave, and space deletion
- **Smart fallback** — If the saved space no longer exists (deleted or left), it gracefully falls back to your next available space

### Modal UI Refresh
The destructive-action modals got a full visual redesign:

- **Replaced all emoji with material-symbols** — Delete Space: `warning` → `sync` → `check_circle`. Reset Chat: `warning` → `sync` → `check_circle`
- **Consistent gradient styling** — Both modals now use the app's purple gradient accent (`linear-gradient(135deg, #8b5cf6, #6d28d9)`) for a unified look
- **3-phase state machine** — Each modal flows through: confirm (warning icon) → loading (spinning sync) → done (checkmark) with clear disabled/enabled states
- **Shared `IconContainer` component** — Extracted icon wrapper pattern for consistent appearance across both modals

### Versioned Build Output
The app now organizes installer builds into versioned folders:

- **Each release is self-contained** — `out/make/1.0.6/` contains this version's assets exclusively
- **No more overwritten installers** — Previous version's `setup.exe` is preserved under its own folder
- **Blockmap support** — Differential updates via blockmaps are now enabled for faster downloads on incremental releases

### Auto-Scroll on Initial Load
Fixed the message list not scrolling to the latest message on app launch or refresh:

- **Reliable first-load scroll** — Messages now snap then smoothly animate to the bottom immediately when the space loads
- **Two-pass scroll technique** — First a synchronous scroll ensures `scrollHeight` is resolved, then a smooth scroll runs on top for the visual animation
- **Correct ref guards** — Both `isAtBottomRef` and `autoScrollRef` are set before scrolling to prevent race conditions with the realtime subscription

---

## Full Changelog (since v1.0.5)

| Commit | Change |
|---|---|
| `643cd40` | Implement auto-update feature with download and status tracking |
| `6321347` | Implement last active space tracking with localStorage updates |
| — | *(working tree)* Auto-scroll fix with two-pass scroll technique |

### Files Changed

| File | Change |
|---|---|
| `package.json` | Version bump to `1.0.6`; `directories.output` now writes to `out/make/${version}` |
| `App.tsx` | `loadExistingSpace` picks `lastActiveSpaceId` from localStorage before defaulting to first space |
| `SpacePanel.tsx` | Writes `lastActiveSpaceId` to localStorage on space click |
| `RoomModal.tsx` | Writes `lastActiveSpaceId` to localStorage after joining a space |
| `CreateSpaceForm.tsx` | Writes `lastActiveSpaceId` to localStorage after creating a space |
| `SettingsPanel.tsx` | Updates `lastActiveSpaceId` after deleting/leaving a space |
| `DeleteSpaceModal.tsx` | Full rewrite with material-symbols icons and 3-phase flow |
| `ResetChatModal.tsx` | Full rewrite with material-symbols icons and 3-phase flow |
| `MessageList.tsx` | Two-pass scroll in initial-load useEffect for reliable auto-scroll |

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