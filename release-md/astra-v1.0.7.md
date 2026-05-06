# Astra v1.0.7

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.7.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## What's New

### Updater Behavior Fix
The auto-updater was tweaked to put the renderer fully in control of the update flow:

- **Auto-download disabled** —`autoUpdater.autoDownload = false` prevents electron-updater from silently downloading updates in the background. This ensures the user-initiated "Update" button is the only trigger for downloads, matching the 3-phase UI flow (banner → progress bar → restart)
- **Manual check replaces_notify** — Switched from `checkForUpdatesAndNotify()` to `checkForUpdates()`. The former implicitly triggers electron-updater's built-in "update available" dialog which would conflict with Astra's custom `UpdatePrompt` UI. The renderer now owns the full notification → download → restart sequence

---

## Full Changelog (since v1.0.6)

| Commit | Change |
|---|---|
| `fafafaf` | Modify auto-updater to disable auto-download and adjust update check behavior |

### Files Changed

| File | Change |
|---|---|
| `src/main/index.ts` | Set `autoUpdater.autoDownload = false`; replace `checkForUpdatesAndNotify()` with `checkForUpdates()` |

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