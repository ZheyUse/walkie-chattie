# Astra v1.0.4

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.4.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## What's New

### Update Experience Overhaul
The update system has been redesigned for clarity and user control:

- **Three-phase update flow** — "Astra v1.0.X is available" banner → floating progress bar → restart modal. No more confusing state blending
- **Floating progress bar** — Appears at the bottom-right when an update is downloading. Shows real-time download progress with MB counter (e.g. `350.2 / 1300.5 MB`) and percentage
- **Collapsible bubble** — The progress bar can be collapsed to a minimal pill (56px wide) to get it out of the way, then expanded again. No close button — it stays visible until the download finishes
- **Restart-only modal** — Once downloaded, a clean modal appears with a single "Restart Astra Now" button. No cancel/dismiss — the update is mandatory and straightforward
- **Detailed progress tracking** — Download progress now exposes `transferred` and `total` bytes from the underlying updater, giving users accurate size information

### Full Changelog (since v1.0.3)

| Commit | Change |
|---|---|
| `5f96696` | Enhance update process with detailed progress tracking and UI improvements |

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