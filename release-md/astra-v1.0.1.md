# Astra v1.0.1 — Hotfix Release

> Fixes Google sign-in in packaged builds and improves auto-start behavior.

**Install:** Download `Astra Setup 1.0.1.exe` from the assets below and run it.

---

## What's Fixed

### Google Sign-In Now Works in the Installed App

The previous build had a broken OAuth flow — Google login would fail silently when installed via the `.exe`. This release moves Google sign-in from an embedded `BrowserWindow` to the **system default browser**, which resolves the issue entirely. Sign-in now works correctly both in development and in the packaged installer.

### Smarter Background Launch

When Astra launches automatically on Windows boot, it now correctly detects whether it was opened by the OS login manager vs. manually opened by the user. This means:

- **Auto-booted on startup** → window stays hidden, app runs in the background and receives `/shout`, `/tap`, and `/all` notifications
- **Manually opened** → window shows as normal

Previously the window would incorrectly flash open on every boot.

### Icon Path Consolidation

All icon file references (tray icon, window icon) are now handled by a single `getIconPath()` helper function. This prevents icon loading bugs in different build environments and makes the code easier to maintain.

### Window Focus Fix

The `showMainWindow()` helper now properly restores a minimized window before showing it, so clicking "Open Astra" from the tray while the app is minimized brings it correctly back to the foreground.

---

## Upgrading

If you have Astra v1.0.0 installed, you can either:
- **Auto-update** — The app will detect v1.0.1 on next launch and offer to update automatically
- **Manual update** — Download `Astra Setup 1.0.1.exe` from this release and run it (it will update your existing installation in place)

---

## Feedback & Issues

Report bugs or feature requests at: [github.com/ZheyUse/walkie-chattie/issues](https://github.com/ZheyUse/walkie-chattie/issues)

---

*Built with Electron · React · Supabase · Tailwind CSS*