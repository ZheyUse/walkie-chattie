# Astra v1.0.0 — Initial Release

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.0.exe` from the assets below and run it.

---

## What's New

### Core Chat Experience
- **Multi-space messaging** — Create or join spaces, each with its own history and member list
- **Real-time sync** — Messages arrive instantly for all online members via Supabase Realtime
- **Infinite scroll** — Scrolls back through messages on demand, 100 per page
- **Message status** — Sent/delivered indicators on every message bubble

### Rich Messaging
- **Emoji picker** — Browse and insert any emoji directly into your message
- **GIF search** — Search across GIPHY and Tenor simultaneously in a split picker view
- **Sticker search** — Find and send stickers via GIPHY
- **Image sharing** — Drag and drop images into chat, or use the file picker
- **@mention autocomplete** — Type `@` to see and select from the space's member list

### Space Alert System
Three standout features that make Astra feel alive:

| Command | Description |
|---|---|
| `/shout` | Fullscreen popup that alerts everyone in the space with a loud sound and urgent orange styling |
| `/tap` | A private fullscreen popup sent to a single user — purple styling, softer feel, auto-dismisses in 8s |
| `/all` | Broadcasts to the entire space with a `@all` mention, green styling, auto-dismisses in 12s |

All three work over Supabase Realtime and will fire on recipients' screens even if the app is running in the background.

### Smart Notifications
- **Focused vs. background** — If the app window is open, notifications show as in-app toasts. If it's minimized or in the tray, an OS native notification fires instead
- **@mention override** — Mute a space and normal messages go silent. But if anyone tags `@yourusername`, you still get notified — the one exception, just like Discord
- **Separate sounds** — A unique sound for incoming messages, outgoing messages, shouts, and taps
- **Per-space mute** — Mute a space for 15 minutes, 1 hour, 24 hours, or until you manually unmute it

### Members & Presence
- **Online/offline member list** — See who's currently in the space with their avatar and status dot
- **Avatar initials** — Color-coded avatar circles with your initial shown on top
- **Profile tooltips** — Hover over any member's avatar to see their full display name

### Space Management
- **Create a space** — Pick a name and any of 20 custom SVG icon avatars
- **Rename, re-icon, or delete** a space
- **Kick members** — Space admins can remove anyone
- **Reset chat history** — Wipe a space's messages with a confirmation step
- **Change your personal avatar** at any time from settings

### System Integration
- **System tray** — Right-click the tray icon to open the app or quit; single-click toggles the window visibility
- **Auto-start on boot** — Astra registers itself to launch on Windows startup (hidden in the background, like Epic Games or Riot)
- **Frameless titlebar** — Custom draggable chrome with minimize, maximize, and close buttons
- **Deep-link OAuth** — Google sign-in completes via `astra://` protocol, no browser tab left open

---

## Known Limitations

- Desktop app only — no mobile or web version at launch
- GIF and sticker picker requires `VITE_GIPHY_KEY` and `VITE_TENOR_KEY` to be configured
- Auto-update from GitHub requires a GitHub Release to be created before clients can check for updates

---

## Installing / Updating

If you already have Astra installed, it will automatically check for updates on launch and offer to install this release. Otherwise, download the installer from the **Assets** section below.

---

## Feedback & Issues

Report bugs or feature requests at: [github.com/ZheyUse/walkie-chattie/issues](https://github.com/ZheyUse/walkie-chattie/issues)

---

*Built with Electron · React · Supabase · Tailwind CSS*