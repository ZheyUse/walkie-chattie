# Astra v1.0.3

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.3.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## What's New

### Members & Presence
- **Member filtering** — Search and filter the member list by nickname in the Members panel. Online/offline status is clearer and updates in real time
- **Enhanced member logging** — Detailed logging for join/leave/kick events to help troubleshoot presence issues

### UI & Experience
- **Custom space avatars** — Spaces can now use custom SVG avatars in addition to emoji icons, with examples and customization guide added to the README
- **Update prompt component** — When a new release is available, users see a non-intrusive prompt in the loading screen to install it
- **Loading screen improvements** — Refreshed loading screen with better animations and clear app branding

### System Messages
- **Join/leave notifications** — When a member joins or leaves a space, all members see a system message in chat (e.g. "Zhey joined the space")
- **Improved member refresh** — Member list updates more reliably after space changes and reconnections

### Authentication
- **OAuth redirect improvements** — Google OAuth flow now uses a redirect-based approach for cleaner session handling
- **Updated icon resources** — App icon and branding assets refreshed to match the Astra identity

### Security & Maintenance
- **`.gitignore` hardening** — Added `client_secret*.json` to prevent accidental exposure of OAuth credentials in the future
- Sensitive credential files (`.env`, `client_secret*.json`) are now properly excluded from the repository
- Previous leaked credentials should be rotated in the Google Cloud Console and Supabase dashboard

---

## Full Changelog (since v1.0.1)

| Commit | Change |
|---|---|
| `c8bb442` | Enhance space member management with detailed logging and member filtering |
| `ae92437` | Remove sensitive credential files |
| `b98f479` | Add client_secret.json pattern to .gitignore |
| `53953de` | Add space avatars section to README with SVG examples |
| `154b9f4` | Rewrite README with clearer app description and UX details |
| `173f772` | Add update prompt component, enhance loading screen |
| `0501066` | Update app version to 1.0.2, add system messages for join/leave |
| `7246ec7` | Add OAuth redirect functionality, update icon resources |

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