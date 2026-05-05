# Astra

**Astra** is a lightweight, dark-themed desktop chat application built with Electron. It connects friends through real-time spaces, combining the intimacy of group DMs with the visibility of server chat — minus the bloat.

Think of it like a faster, cleaner alternative to Discord for small circles: no roles, no channels, no bots. Just spaces, people, and chat.

---

## Features

### Core Chat
- **Multi-space messaging** — Create or join spaces; each space has its own chat history and member list
- **Real-time sync** — Messages propagate to all online members instantly via Supabase Realtime subscriptions
- **Infinite scroll** — Loads older messages on demand, 100 per page
- **Message status** — Sent/delivered indicators on each message bubble

### Rich Input
- **Emoji picker** — Browse and insert emojis into any message
- **GIF search** — Search and attach GIFs via GIPHY and Tenor simultaneously in a split view
- **Sticker search** — Find and attach stickers via GIPHY
- **Image sharing** — Drag-and-drop images directly into the chat (also works via file picker)
- **@mention members** — Type anything after `@` to get autocomplete suggestions from the online member list
- **Typing indicator** — See when others in the space are composing a message

### Space Alert System
| Command | Description | Who sees it | Behavior |
|---|---|---|---|
| `/shout` | Fullscreen popup to entire space | All members in the space | Alert sound, urgent styling, auto-dismisses in 12s |
| `/tap` | Fullscreen popup to a specific user | One targeted member | Tap sound, private styling, auto-dismisses in 8s |
| `/all` | `@all` mention — picks everyone | All members in the space | Broadcast sound, mentions everyone, auto-dismisses in 12s |

All three use real-time database inserts that trigger push to all connected clients simultaneously, regardless of whether their window is focused. The popup appears as a fullscreen overlay.

### Notifications
- **Smart dual-path notifications** — If the app window is focused, shows an in-app toast banner. If minimized or backgrounded, fires an OS native notification
- **Sound effects** — Separate sounds for: incoming message, sent message, shout alert, tap alert
- **@mention override** — When you mute a space, `@yourusername` mentions still fire a notification (like Discord). Other notifications are silenced until unmuted
- **Mute modal** — Mute a space for: 15 minutes, 1 hour, 24 hours, or indefinitely
- **/shout and /tap ring through** — These popups fire even on muted spaces (they bypass the mute flag entirely)

### Members & Presence
- **Members panel** — Slides in from the right to show all online/offline members in the current space
- **Online status dots** — Each member's avatar shows their online state
- **Avatars** — Auto-assigned color avatar on signup, customizable per space
- **Tooltip profiles** — Hover over a member's avatar to see their full name

### Space Management
- **Create space** — Pick a name and one of 20 SVG icon avatars for the space
- **Rename space** — Change the space name
- **Delete space** — Remove the space and its chat history
- **Change avatar** — Swap the space icon at any time
- **Kick member** — Admins can remove any member from a space
- **Reset chat** — Wipe a space's message history with confirmation
- **Leave space** — Exit a space you no longer want

### UI & UX
- **Steam-dark palette** — Deep space navy backgrounds with violet and amber accents
- **Custom frameless titlebar** — Drag to move, minimize/maximize/close buttons
- **System tray** — Tray icon with right-click menu (Open Astra, Quit); clicking toggles the window visibility
- **Persistent login** — Session persists across restarts; auto-login on boot
- **Debug window** — Press `F1` to open the built-in debug console, which logs all renderer and main-process events with timestamps and search/filter capability

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Electron 41 |
| Frontend | React 18, TypeScript 5 |
| Styling | Tailwind CSS 3 |
| State management | Zustand 5 |
| Backend / Realtime | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (Google OAuth) |
| GIF search | GIPHY API + Tenor API |
| Icons | Material Symbols (Outlined, Rounded) |
| Build tooling | electron-vite + electron-builder |
| Installer | NSIS (Windows) |
| Auto-update | electron-updater |
| Image processing | sharp, canvas, convert-svg-to-png |

---

## Auto-Update System

Astra uses **electron-updater** (part of the `electron-updater` package) to automatically deliver updates to users from GitHub Releases — no manual download pages required.

### How It Works End-to-End

```
You build new version (npm run make)
  → produces updated installer: Astra Setup X.X.X.exe
  → electron-builder also generates latest.yml:
      version: X.X.X
      files:
        - url: Astra-Setup-X.X.X.exe
          sha512: <checksum>
      releaseDate: <timestamp>
  → you upload both files to a GitHub Release

On each user machine:
  App launches (hidden to tray at startup)
    → main process: setupAutoUpdater() runs
    → electron-updater checks GitHub Releases API:
        GET https://api.github.com/repos/ZheyUse/walkie-chattie/releases/latest
    → finds latest.yml → compares version to current install
    → if newer version available:
        - emits "update-available" → UI shows "Update available"
        - downloads .exe in background (emits "download-progress")
        - once downloaded: emits "update-downloaded" → UI shows "Restart to update"
        - user clicks "Restart to update" → main process calls quitAndInstall()
        → Electron quits and re-launches with the new installer applied
```

### Release Lifecycle

1. **Bump version** — Change `version` in `package.json` (e.g., `1.0.0` → `1.0.1`)
2. **Build** — Run `npm run make` (or `make:dir` for unpacked output)
3. **Attach installer** — Head to GitHub → Releases → Draft new release → attach `Astra Setup X.X.X.exe` from `out/make/`
4. **Publish** — Release is live; electron-updater on all user machines will detect it within their next check cycle

> **For private repositories:** Pass your Personal Access Token at build time so electron-builder can authenticate against the GitHub API.
> ```powershell
> $env:GH_TOKEN="ghp_YOUR_TOKEN_HERE"; npm run make
> ```
> Store this token in a GitHub Actions secret (`GH_TOKEN`) if using CI, and reference it as `${{ secrets.GH_TOKEN }}` in your workflow.

### Auto-Start on Boot

Astra registers itself in Windows login items via `app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })`. On system boot, the app launches in the background (main window hidden), connects to Supabase Realtime, and begins receiving `/shout`, `/tap`, and `/all` notifications — exactly like Epic Games or Riot Vanguard.

---

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A Google OAuth app in the Google Cloud Console
- GIPHY API key (free tier at [developers.giphy.com](https://developers.giphy.com))
- Tenor API key (free tier at [tenor.com/developer](https://tenor.com/developer))
- (Optional) GitHub Personal Access Token for publishing to a private repo

### Environment Variables

Create `.env` in the project root:

```env
# Supabase — from your Supabase project settings → API
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Giphy — from developers.giphy.com/dashboard
VITE_GIPHY_KEY=your_giphy_api_key

# Tenor — from developers.google.com/tenor
VITE_TENOR_KEY=your_tenor_api_key
```

> **Security note:** These are public env vars (`VITE_`) exposed in the renderer at build time. Use Supabase Row Level Security (RLS) policies to protect any sensitive data at the database level — this is standard Supabase architecture.

### Supabase Database Setup

Create the following tables in your Supabase SQL editor:

```sql
-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  avatar_color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Spaces (chat rooms)
CREATE TABLE spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT 'avatar-rocket.svg',
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Space memberships
CREATE TABLE space_members (
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

-- Chat messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  image_url TEXT,
  gif_url TEXT,
  type TEXT DEFAULT 'message', -- 'message', 'shout', 'tap'
  recipient_id UUID REFERENCES profiles(id), -- for /tap only
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Enable Realtime** for `spaces`, `space_members`, and `messages` tables in Supabase Dashboard → Database → Replication.

**Enable Row Level Security** and add policies so users can only read/write their own data.

### Development

```bash
# Install dependencies
npm install

# Start in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Package into installer
npm run make
```

> On first run, `npm run dev` will prompt Supabase to open your browser for OAuth login. After that, the session persists inside the app's storage.

### Building the Installer

```bash
# Full installer (recommended for distribution)
npm run make

# Portable unpacked build (faster, no installer)
npm run make:dir
```

Both commands output to `out/make/`. The NSIS installer (`Astra Setup X.X.X.exe`) is what you upload to GitHub Releases.

---

## Project Structure

```
src/
├── main/
│   └── index.ts          # Electron main process: IPC, auto-updater, tray, deep-link
├── preload/
│   └── index.ts          # Secure context bridge (api exposed to renderer)
└── renderer/
    └── src/
        ├── main.tsx              # React entry point
        ├── App.tsx               # Router (react-router-dom)
        ├── pages/
        │   ├── AuthPage.tsx      # Login screen
        │   ├── OnboardingPage.tsx # First-run nickname setup
        │   ├── DashboardPage.tsx  # Main layout shell
        │   └── DebugPage.tsx      # F1 debug console window
        ├── components/
        │   ├── layout/           # SpacePanel, ChatArea, SettingsPanel, MembersPanel, TitleBar
        │   ├── chat/              # MessageList, MessageItem, ChatInput, EmojiPicker, GifPicker, etc.
        │   ├── popups/            # ShoutPopup, TapPopup, BroadcastPopup (fullscreen OS overlays)
        │   ├── modals/            # CreateSpaceForm, RenameModal, MuteModal, SpaceDetails, etc.
        │   └── ui/                # Toast, Avatar, Modal, Loader, ContextMeter
        └── lib/
            ├── supabase.ts       # Supabase client
            ├── spaceAvatars.ts   # SVG avatar filenames and paths
            ├── notifications.ts  # Smart notification dispatch
            ├── sounds.ts         # Audio playback (messages, shout, tap, notification)
            ├── giphy.ts          # GIPHY search API client
            ├── tenor.ts          # Tenor search API client
            ├── typing-channel.ts # Realtime typing presence
            ├── debug.ts          # Centralized debug logging
            └── chat-refs.ts      # Ref registry for message DOM access
```

---

## Custom URL Protocol

Astra registers the `astra://` deep-link protocol on install. It is used exclusively for OAuth callbacks from Google:

```
astra://login-callback?code=...&state=...
```

This handles the browser → app handoff after a successful Google sign-in.