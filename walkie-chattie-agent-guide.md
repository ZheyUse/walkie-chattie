# WALKIE-CHATTIE — COMPLETE AGENT BUILD GUIDE
> Full-stack desktop chat app. Steam-dark aesthetic. Google OAuth. Supabase backend. Electron + React + TypeScript.

---

## TABLE OF CONTENTS
1. Product Vision
2. Tech Stack
3. Design System
4. Database Schema
5. Architecture Overview
6. Phase-by-Phase Build Guide (Agent Tasks)
7. File Structure
8. Environment Variables
9. Critical Rules & Gotchas

---

## 1. PRODUCT VISION

**Walkie-Chattie** is a lightweight desktop chat app for small friend/team groups. Think Discord but stripped down to one purpose: fast, fun communication in a shared "Space" (like a server). No fuss, no bloat.

### Core Concepts
- **Space** = a chat room/server. Has an ID, name, avatar, members, and one chat channel.
- **Member** = a Google-authenticated user with a chosen nickname and avatar color.
- **Shout** (`/shout <message>`) = fullscreen popup blast to ALL members in the Space.
- **Whisper** (`/whisper @nickname <message>`) = shout that only the target member sees.
- **Context Window** = a message count/size limiter. When maxed, the Space auto-nukes all chat history to stay within Supabase free tier limits.

### User Flow Summary
```
Launch App
  → Google OAuth Login
    → [First Time] Enter Nickname
      → Room Modal: Join Space (by ID) OR Create Space
        → [Create] Fill form: Room Name + Generated ID + Select Avatar
        → [Join] Enter existing Space ID
    → [Returning] Auto-login → Last Space OR Room Modal
  → Home Dashboard (3-panel layout)
    → Chat, Shout, Whisper, GIF, Image Upload, Settings Panel
```

---

## 2. TECH STACK

| Layer | Technology | Why |
|---|---|---|
| Desktop Shell | **Electron 30+** | Native window, tray, auto-start, popup windows |
| Frontend | **React 18 + TypeScript** | Component model, hooks, type safety |
| Build Tool | **Vite 5** | Fast HMR, ESM, works with Electron |
| Styling | **Tailwind CSS 3** | Utility-first, custom design tokens |
| Backend | **Supabase** | Auth (Google OAuth), Postgres DB, Realtime, Storage |
| GIF Search | **Tenor API v2** (free) | GIF picker — get key at tenor.com/developer |
| Packaging | **Electron Forge** | Cross-platform installers (.exe, .dmg, .AppImage) |
| Persistence | **electron-store** | Save roomId, userId, nickname to disk |
| State | **Zustand** | Lightweight global state (user, space, members) |
| IPC | **Electron contextBridge** | Secure main ↔ renderer communication |

### Install Command
```bash
npm create electron-vite@latest walkie-chattie -- --template react-ts
cd walkie-chattie
npm install @supabase/supabase-js tailwindcss zustand electron-store @electron-forge/cli
npm install -D @types/node
npx tailwindcss init
```

---

## 3. DESIGN SYSTEM

### Philosophy
Steam-dark aesthetic: deep navy shells, electric blue accents, orange-red for shout/danger actions. Industrial typography. Dense but breathable layout.

### Color Tokens (add to tailwind.config.js)
```js
colors: {
  bg: {
    deep:    '#0e1117',   // outermost shell, titlebar
    base:    '#171d25',   // sidebar, panels
    panel:   '#1e2530',   // chat area, modal
    surface: '#252d38',   // input fields, cards
    hover:   '#2a3444',   // hover states
    active:  '#1a9fff18', // selected item bg
  },
  accent:  '#1a9fff',     // primary CTA, links, focus rings
  shout:   '#e8652a',     // shout/whisper actions, danger
  success: '#4db35e',     // online indicator
  text: {
    hi:  '#e8eaed',       // primary text
    md:  '#a0aab8',       // secondary text
    lo:  '#5a6478',       // muted/placeholder
  },
  border: {
    lo: '#ffffff0f',      // subtle dividers
    md: '#ffffff18',      // visible borders
  }
}
```

### Typography
- **Display / Headings / Names**: `Rajdhani` (Google Fonts) — weight 600, 700
- **Body / UI**: `DM Sans` (Google Fonts) — weight 300, 400, 500
- **Code / IDs**: `JetBrains Mono` — weight 400

### Component Patterns
- Border radius: 4px (inputs/buttons), 8px (cards/panels), 12px (modals)
- Border width: always `1px` (0.5px for very subtle dividers)
- All interactive elements: `transition: all 150ms ease`
- Focus ring: `ring-2 ring-accent/40 outline-none`
- Scrollbars: 4px wide, `bg-bg-hover` thumb, transparent track

---

## 4. DATABASE SCHEMA

Run this SQL in Supabase SQL Editor:

```sql
-- USERS (extended profile on top of Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text not null unique,
  avatar_color text not null default '#1a9fff',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- SPACES (rooms/servers)
create table public.spaces (
  id text primary key,                          -- 10-char generated ID e.g. '1bsd3454aw'
  name text not null,
  avatar_emoji text not null default '🚀',
  owner_id uuid references public.profiles(id) not null,
  context_window_limit int not null default 500, -- max messages before auto-nuke
  context_window_used int not null default 0,
  created_at timestamptz default now()
);
alter table public.spaces enable row level security;
create policy "Members can read their spaces" on public.spaces
  for select using (
    exists (select 1 from public.space_members where space_id = id and user_id = auth.uid())
  );
create policy "Owner can update space" on public.spaces
  for update using (owner_id = auth.uid());
create policy "Authenticated can create spaces" on public.spaces
  for insert with check (auth.uid() = owner_id);

-- SPACE MEMBERS
  create table public.space_members (
    space_id text references public.spaces(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'member')),
    blacklisted boolean not null default false,
    joined_at timestamptz default now(),
    primary key (space_id, user_id)
  );
  alter table public.space_members enable row level security;
  create policy "Members can see other members" on public.space_members
    for select using (
      exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid())
    );
  create policy "Admins can update members" on public.space_members
    for update using (
      exists (select 1 from public.space_members sm where sm.space_id = space_id and sm.user_id = auth.uid() and sm.role = 'admin')
    );
  create policy "Users can insert self" on public.space_members
    for insert with check (user_id = auth.uid());
  create policy "Users can delete self (leave)" on public.space_members
    for delete using (user_id = auth.uid());

-- MESSAGES
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  space_id text references public.spaces(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  sender_nickname text not null,
  type text not null check (type in ('chat', 'shout', 'whisper', 'system')),
  content text,                                 -- text content
  image_url text,                               -- uploaded image URL
  gif_url text,                                 -- Tenor GIF URL
  target_user_id uuid references public.profiles(id), -- whisper target
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Members can read space messages" on public.messages
  for select using (
    exists (
      select 1 from public.space_members
      where space_id = messages.space_id
        and user_id = auth.uid()
        and blacklisted = false
    )
    and (
      type != 'whisper'
      or sender_id = auth.uid()
      or target_user_id = auth.uid()
    )
  );
create policy "Members can insert messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.space_members
      where space_id = messages.space_id
        and user_id = auth.uid()
        and blacklisted = false
    )
  );
create policy "Admins can delete all messages" on public.messages
  for delete using (
    exists (
      select 1 from public.space_members
      where space_id = messages.space_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

-- INDEXES
create index on public.messages (space_id, created_at desc);
create index on public.messages (space_id, type);
create index on public.space_members (user_id);

-- SUPABASE STORAGE (for image attachments)
insert into storage.buckets (id, name, public) values ('space-images', 'space-images', true);
create policy "Anyone can read space images" on storage.objects
  for select using (bucket_id = 'space-images');
create policy "Members can upload images" on storage.objects
  for insert with check (bucket_id = 'space-images' and auth.role() = 'authenticated');

-- FUNCTION: Auto-nuke when context window maxed
create or replace function public.check_context_window()
returns trigger language plpgsql as $$
declare
  space record;
begin
  select * into space from public.spaces where id = NEW.space_id;
  
  -- Increment counter
  update public.spaces
  set context_window_used = context_window_used + 1
  where id = NEW.space_id;
  
  -- Check if limit reached
  if space.context_window_used + 1 >= space.context_window_limit then
    -- Nuke all messages
    delete from public.messages where space_id = NEW.space_id;
    -- Reset counter
    update public.spaces set context_window_used = 0 where id = NEW.space_id;
    -- Insert system message
    insert into public.messages (space_id, sender_id, sender_nickname, type, content)
    values (NEW.space_id, NEW.sender_id, 'System', 'system', '⚡ Context window reached. Chat history has been reset.');
    return null; -- Cancel the original insert (already reset)
  end if;
  
  return NEW;
end;
$$;

create trigger on_message_insert
  before insert on public.messages
  for each row execute function public.check_context_window();
```

---

## 5. ARCHITECTURE OVERVIEW

```
src/
├── main/                          ← Electron Main Process
│   ├── main.ts                    ← App init, BrowserWindow, Tray, auto-start
│   ├── ipc.ts                     ← All ipcMain handlers
│   └── windows/
│       ├── shout.ts               ← Shout popup window creator
│       └── whisper.ts             ← Whisper popup window creator
│
├── preload/
│   └── preload.ts                 ← contextBridge API (window.api)
│
└── renderer/                      ← React App
    ├── main.tsx                   ← React root
    ├── App.tsx                    ← Router: Auth → Onboarding → Dashboard
    │
    ├── stores/
    │   ├── auth.store.ts          ← Zustand: user, profile, session
    │   ├── space.store.ts         ← Zustand: current space, members
    │   └── chat.store.ts          ← Zustand: messages, loading states
    │
    ├── lib/
    │   ├── supabase.ts            ← Supabase client singleton
    │   ├── tenor.ts               ← Tenor GIF API wrapper
    │   └── id-gen.ts              ← 10-char room ID generator
    │
    ├── pages/
    │   ├── AuthPage.tsx           ← Google OAuth login screen
    │   ├── OnboardingPage.tsx     ← Nickname setup (first-time only)
    │   └── DashboardPage.tsx      ← Main 3-panel layout
    │
    ├── components/
    │   ├── modals/
    │   │   ├── RoomModal.tsx      ← Join/Create space modal
    │   │   └── CreateSpaceForm.tsx
    │   │
    │   ├── layout/
    │   │   ├── TitleBar.tsx       ← Custom drag titlebar
    │   │   ├── SpacePanel.tsx     ← Left: space icon + profile at bottom
    │   │   ├── ChatArea.tsx       ← Middle: message list + input
    │   │   └── SettingsPanel.tsx  ← Right: collapsible settings/info
    │   │
    │   ├── chat/
    │   │   ├── MessageList.tsx    ← Virtualized message feed
    │   │   ├── MessageItem.tsx    ← Single message: chat/shout/whisper/system
    │   │   ├── ChatInput.tsx      ← Textarea, /command detection, mentions
    │   │   ├── GifPicker.tsx      ← Tenor GIF search modal
    │   │   ├── ImagePreview.tsx   ← Drag-drop / file image preview
    │   │   └── WhisperSuggest.tsx ← @mention autocomplete dropdown
    │   │
    │   ├── popups/
    │   │   ├── ShoutPopup.tsx     ← Full-screen shout overlay window
    │   │   └── WhisperPopup.tsx   ← Targeted whisper popup window
    │   │
    │   └── ui/
    │       ├── Avatar.tsx         ← Color-coded initials avatar
    │       ├── ProfileTooltip.tsx ← Bottom-left profile click tooltip
    │       └── ContextMeter.tsx   ← Context window usage bar
```

---

## 6. PHASE-BY-PHASE BUILD GUIDE

---

### PHASE 0 — Scaffold & Config

**Goal:** Working Electron + React + TypeScript + Tailwind dev environment.

```bash
npm create electron-vite@latest walkie-chattie -- --template react-ts
cd walkie-chattie
npm install @supabase/supabase-js zustand electron-store tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms
npx tailwindcss init -p
```

**tailwind.config.js** — add the color tokens from Section 3 under `theme.extend.colors`.

**vite.config.ts** — ensure `renderer` process can access env vars:
```ts
define: {
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  'import.meta.env.VITE_TENOR_KEY': JSON.stringify(process.env.VITE_TENOR_KEY),
}
```

**src/lib/supabase.ts:**
```ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

✅ Checkpoint: `npm run dev` opens a blank Electron window.

---

### PHASE 1 — Google OAuth

**Supabase Dashboard steps (manual):**
1. Go to Authentication → Providers → Google → Enable
2. Add your Google OAuth client ID + secret (create at console.cloud.google.com)
3. Set redirect URL: `http://localhost:5174` for dev, and your production URL
4. In Google Console, add `http://localhost:5174` and your Supabase callback URL to authorized origins

**src/pages/AuthPage.tsx:**
- Full-screen dark background with Walkie-Chattie logo centered
- Single "Continue with Google" button
- On click: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
- Listen for auth state: `supabase.auth.onAuthStateChange((event, session) => { ... })`

**src/App.tsx routing logic:**
```
session === null          → <AuthPage />
session + no profile      → <OnboardingPage />
session + profile + space → <DashboardPage />
session + profile + !space→ <RoomModal />
```

**electron-store** — On session establish, save `{ userId, email }` to disk so next launch auto-restores. On logout, clear store.

✅ Checkpoint: Clicking Google opens OAuth flow. On return, session exists in Supabase.

---

### PHASE 2 — Onboarding & Room Modal

**src/pages/OnboardingPage.tsx (first-time users only):**
- Dark modal centered on screen
- Large app logo at top
- Single field: "Choose your nickname" (max 20 chars, alphanumeric + dots/underscores)
- Validate uniqueness against `profiles` table (debounced check)
- On submit: `INSERT INTO profiles (id, nickname, avatar_color)` — assign a random accent color from a preset palette (8 options)
- Save nickname to `electron-store`

**src/components/modals/RoomModal.tsx:**

Two views toggled by tab: **Join** and **Create**.

**Join view:**
- Input: Space ID (10 chars)
- Button: "JOIN SPACE"
- On submit: Query `spaces` where `id = input`. If exists and not blacklisted → insert into `space_members` → navigate to Dashboard. If not found → show error.

**Create view (src/components/modals/CreateSpaceForm.tsx):**
- Generated ID field (auto-generated 10-char alphanumeric, with "regenerate" icon button)
  - Generation: `Math.random().toString(36).substring(2, 12)`
- Space Name input (max 30 chars)
- Avatar picker: grid of 12 emoji options (🚀🔥⚡🎮🎯🎲🦅🐉🌊🎸🏔️🌙)
  - Selected emoji shows with accent ring
- "CREATE SPACE" button
- On submit:
  1. INSERT into `spaces` (id, name, avatar_emoji, owner_id)
  2. INSERT into `space_members` (space_id, user_id, role: 'admin')
  3. Navigate to Dashboard

✅ Checkpoint: Can create a space, see it in Supabase, and another user can join by ID.

---

### PHASE 3 — Dashboard Layout

**src/pages/DashboardPage.tsx** — 3-column CSS Grid:
```css
grid-template-columns: 64px 1fr auto
grid-template-rows: 38px 1fr
```
- Column 1 (64px): Space icon panel (like Discord's server rail)
- Column 2 (flex): Chat area
- Column 3 (0px or 280px, animated): Settings panel — toggled by a settings icon button in the chat header

**src/components/layout/TitleBar.tsx:**
- `height: 38px`, `-webkit-app-region: drag`
- Left: app logo + title "WALKIE-CHATTIE"
- Center: current Space name + emoji avatar
- Right: online member count dot + window control buttons (close/min/max)
- Close button hides window (does NOT quit — quit only via tray)

**src/components/layout/SpacePanel.tsx (left 64px column):**
- Space avatar emoji button (large, centered, shows tooltip with space name on hover)
- A thin separator line
- At the very bottom: user's own avatar circle (initials + color)
  - On click: opens `ProfileTooltip` (positioned above, tooltip style)

**ProfileTooltip** (tooltip, not a modal):
- Shows: nickname, email (small, muted)
- "Change Nickname" button → inline input replace
- "Logout" button → `supabase.auth.signOut()` + clear electron-store

**src/components/layout/SettingsPanel.tsx (right collapsible):**
Renders different content based on user role:

**Admin view:**
- Rename Space (inline input)
- Change Space Avatar (emoji picker)
- Members list with "Blacklist" button per member
- Reset Chat (nuke all messages manually, confirm dialog)
- Search Conversations (text input → filters message list)
- Context Window meter (usage bar + count)
- Delete Space (red, confirm dialog)

**Member view:**
- Search Conversations
- Members list (read-only)
- Context Window meter
- Leave Space (confirm dialog)

✅ Checkpoint: 3-panel layout renders. Settings panel animates open/close. Profile tooltip appears.

---

### PHASE 4 — Chat System

**src/components/chat/MessageList.tsx:**
- Fetch last 100 messages for current space on mount: `SELECT * FROM messages WHERE space_id = ? ORDER BY created_at ASC LIMIT 100`
- Subscribe to Supabase Realtime: `supabase.channel('space:{id}').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'space_id=eq.{id}' }, handler)`
- Auto-scroll to bottom on new message
- Group consecutive messages from the same sender (no repeated avatar/name if < 5 min gap)
- Render `<MessageItem>` per message

**src/components/chat/MessageItem.tsx — render rules:**

| type | Render style |
|---|---|
| `chat` | Normal: avatar + name + text/image/gif |
| `shout` | Orange-left-border card, SHOUT badge, large text (scales with length) |
| `whisper` | Purple-left-border card, WHISPER badge, italic, only visible to sender + target |
| `system` | Centered, muted italic text |

**Shout text scaling:**
```ts
const shoutFontSize = (msg: string) => {
  if (msg.length < 20) return 'text-2xl'
  if (msg.length < 50) return 'text-xl'
  if (msg.length < 100) return 'text-lg'
  return 'text-base'
}
```

GIFs in messages: render as `<img>` with `max-h-48 rounded-lg object-contain`.
Images in messages: render with lightbox click-to-expand.

**src/components/chat/ChatInput.tsx:**

Features:
- `<textarea>` — max 4 rows before overflow-y scroll
- Drag & drop images onto the textarea area → preview appears above input
- File icon button → `<input type="file" accept="image/*">` → preview
- GIF icon button → opens `<GifPicker>`
- Send button (or Enter key — Shift+Enter for newline)

Command detection (on every keystroke):
```ts
const detectCommand = (val: string) => {
  if (val.startsWith('/shout ')) return 'shout'
  if (val.startsWith('/whisper ')) return 'whisper'
  return 'chat'
}
```

When `type === 'whisper'` and user has typed `@`:
- Extract everything after `@` as search query
- Filter current space members by nickname match
- Show `<WhisperSuggest>` dropdown

**src/components/chat/WhisperSuggest.tsx:**
- Appears above the input (absolute positioned)
- Shows filtered member list: avatar + nickname
- Click or arrow-key + Enter to select → fills `@nickname` in input
- Dismiss on Escape or click-outside
- Discord-style: each item shows online status dot

**Sending a message:**
```ts
// Chat
INSERT INTO messages (space_id, sender_id, sender_nickname, type, content, image_url, gif_url)

// Shout
INSERT INTO messages (..., type: 'shout', content: message)
// → All clients receive via Realtime → trigger shout popup on all windows

// Whisper  
INSERT INTO messages (..., type: 'whisper', content: message, target_user_id: targetId)
// → Only sender + target see it (enforced by RLS)
// → Target receives whisper popup via Realtime if they're online

// Image
1. Upload to Supabase Storage: supabase.storage.from('space-images').upload(path, file)
2. Get public URL
3. INSERT message with image_url set
```

✅ Checkpoint: Multiple users in same space see each other's messages in real time. /shout and /whisper commands parse correctly.

---

### PHASE 5 — Shout & Whisper Popups

Both popups are separate Electron `BrowserWindow` instances opened by the main process via IPC.

**src/preload/preload.ts — expose IPC bridge:**
```ts
contextBridge.exposeInMainWorld('api', {
  showShout: (data: { sender: string, message: string, gifUrl?: string }) =>
    ipcRenderer.send('show-shout', data),
  showWhisper: (data: { sender: string, message: string, gifUrl?: string }) =>
    ipcRenderer.send('show-whisper', data),
})
```

**Triggering from renderer:**
```ts
// In Realtime subscription handler
if (msg.type === 'shout') {
  window.api.showShout({ sender: msg.sender_nickname, message: msg.content, gifUrl: msg.gif_url })
}
if (msg.type === 'whisper' && msg.target_user_id === currentUserId) {
  window.api.showWhisper({ sender: msg.sender_nickname, message: msg.content, gifUrl: msg.gif_url })
}
```

**src/main/ipc.ts:**
```ts
ipcMain.on('show-shout', (_, data) => {
  const win = new BrowserWindow({
    width: 500, height: 260,
    alwaysOnTop: true, frame: false, transparent: true,
    skipTaskbar: true, resizable: false,
    webPreferences: { preload: PRELOAD_PATH }
  })
  win.center()
  win.loadURL(`${RENDERER_URL}#/shout?data=${encodeURIComponent(JSON.stringify(data))}`)
  // Auto-close after 8 seconds if not dismissed
  setTimeout(() => { if (!win.isDestroyed()) win.close() }, 8000)
})
```

**src/components/popups/ShoutPopup.tsx:**
- Full-window orange gradient header with 📢 SHOUT label + sender name
- Big message text (scales with length — same formula as chat)
- If `gifUrl` present: animated GIF displayed below text
- Single "Dismiss" button at bottom
- Slide-in animation on mount

**src/components/popups/WhisperPopup.tsx:**
- Same structure but purple/violet header with 🤫 WHISPER label
- More subtle, slightly smaller (400×220)

✅ Checkpoint: `/shout Hey!` blasts a popup on ALL connected machines. `/whisper @Maya hey` shows popup only on Maya's screen.

---

### PHASE 6 — GIF Picker (Tenor API)

**Get Tenor API key:** https://tenor.com/developer (free, takes 2 min)

**src/lib/tenor.ts:**
```ts
const TENOR_KEY = import.meta.env.VITE_TENOR_KEY
const BASE = 'https://tenor.googleapis.com/v2'

export const searchGifs = async (query: string, limit = 20) => {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=${limit}&media_filter=gif`)
  const data = await res.json()
  return data.results as TenorResult[]
}

export const trendingGifs = async (limit = 20) => {
  const res = await fetch(`${BASE}/featured?key=${TENOR_KEY}&limit=${limit}&media_filter=gif`)
  const data = await res.json()
  return data.results as TenorResult[]
}
```

**src/components/chat/GifPicker.tsx:**
- Opens as a panel above the input (not a modal — stays in flow)
- Search input at top (debounced 300ms)
- On empty: shows trending GIFs
- Grid of GIF thumbnails (2-col, square aspect, lazy-loaded)
- Click a GIF → sets `pendingGif` in input state → shows preview chip above textarea
- Can combine GIF + text message (GIF + message text sent together)
- Dismiss: click outside or press Escape

✅ Checkpoint: GIF picker opens, search works, selected GIF appears as preview and sends with message.

---

### PHASE 7 — Image Attachments

**Drag & Drop:**
```ts
// On the chat input wrapper div:
onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
onDragLeave={() => setDragging(false)}
onDrop={(e) => {
  e.preventDefault()
  setDragging(false)
  const file = e.dataTransfer.files[0]
  if (file?.type.startsWith('image/')) setPendingImage(file)
}}
```

**File button:**
```ts
<input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
  onChange={(e) => setPendingImage(e.target.files?.[0] ?? null)} />
<button onClick={() => fileRef.current?.click()}>📎</button>
```

**Preview:** Show thumbnail above textarea with an ✕ remove button.

**Upload on send:**
```ts
const uploadImage = async (file: File, spaceId: string) => {
  const ext = file.name.split('.').pop()
  const path = `${spaceId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('space-images').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('space-images').getPublicUrl(path)
  return data.publicUrl
}
```

✅ Checkpoint: Drag an image onto the input. Preview shows. Send it. Image appears in chat for all members.

---

### PHASE 8 — Context Window Limiter

The database trigger (Phase 4 SQL) handles auto-nuke server-side. The client shows the meter:

**src/components/ui/ContextMeter.tsx:**
```tsx
// Subscribe to spaces table for context_window_used changes
const percent = (used / limit) * 100
const color = percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-accent'

return (
  <div className="px-4 py-3 border-t border-border-lo">
    <div className="flex justify-between text-xs text-text-lo mb-1.5">
      <span>Context Window</span>
      <span>{used} / {limit} messages</span>
    </div>
    <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
    </div>
    {percent > 90 && (
      <p className="text-xs text-red-400 mt-1.5">⚠️ Chat will auto-reset soon</p>
    )}
  </div>
)
```

Subscribe to real-time updates on the `spaces` table for `context_window_used` changes so the meter updates live.

✅ Checkpoint: Send 500 messages (lower the limit for testing). Chat nukes. System message appears. Meter resets.

---

### PHASE 9 — System Tray & Auto-Start

**src/main/main.ts:**
```ts
// Create tray
const tray = new Tray(path.join(__dirname, 'assets/tray-icon.png')) // 16x16 or 32x32 PNG
tray.setToolTip('Walkie-Chattie')
tray.setContextMenu(Menu.buildFromTemplate([
  { label: 'Open Walkie-Chattie', click: () => mainWindow.show() },
  { type: 'separator' },
  { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } }
]))
tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show())

// Prevent close — hide to tray instead
mainWindow.on('close', (e) => {
  if (!app.isQuitting) {
    e.preventDefault()
    mainWindow.hide()
  }
})

// Auto-start on login
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true  // starts minimized to tray
})
```

✅ Checkpoint: Close window → stays in tray. Restart PC → app launches silently to tray, auto-reconnects.

---

### PHASE 10 — Search Conversations

**Settings panel search input:**
```ts
// Filter the displayed messages in MessageList
const [searchQuery, setSearchQuery] = useState('')

const filteredMessages = useMemo(() => {
  if (!searchQuery.trim()) return messages
  const q = searchQuery.toLowerCase()
  return messages.filter(m =>
    m.content?.toLowerCase().includes(q) ||
    m.sender_nickname.toLowerCase().includes(q)
  )
}, [messages, searchQuery])
```

Highlight matching text in rendered messages using a simple wrap:
```ts
const highlight = (text: string, query: string) => {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? `<mark class="bg-accent/30 text-text-hi rounded px-0.5">${p}</mark>`
      : p
  ).join('')
}
```

✅ Checkpoint: Type in search → messages filter and highlight in real time.

---

### PHASE 11 — Packaging & Distribution

**package.json forge config:**
```json
{
  "config": {
    "forge": {
      "packagerConfig": {
        "name": "Walkie-Chattie",
        "icon": "./assets/icon",
        "appBundleId": "com.yourname.walkie-chattie"
      },
      "makers": [
        { "name": "@electron-forge/maker-squirrel", "config": { "name": "walkie_chattie" } },
        { "name": "@electron-forge/maker-dmg" },
        { "name": "@electron-forge/maker-appimage" }
      ]
    }
  }
}
```

Required assets:
- `assets/icon.ico` (Windows — 256x256)
- `assets/icon.icns` (macOS — 512x512)
- `assets/icon.png` (Linux — 512x512)
- `assets/tray-icon.png` (all — 32x32, transparent bg)

```bash
npm run make
# Outputs to: out/make/
```

✅ Checkpoint: `.exe` installs, runs, auto-starts, and friends can join your Space.

---

## 7. ENVIRONMENT VARIABLES

**`.env` file (never commit this):**
```env
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_TENOR_KEY=your-tenor-api-key
```

**Supabase Dashboard config needed:**
- Authentication → URL Configuration → Site URL: `http://localhost:5174` (dev)
- Authentication → Redirect URLs: add `http://localhost:5174/**`
- Authentication → Providers → Google: enable, add client ID + secret

---

## 8. COMPLETE FILE STRUCTURE

```
walkie-chattie/
├── .env
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── electron.vite.config.ts
├── assets/
│   ├── icon.ico
│   ├── icon.icns
│   ├── icon.png
│   └── tray-icon.png
└── src/
    ├── main/
    │   ├── main.ts
    │   └── ipc.ts
    ├── preload/
    │   └── preload.ts
    └── renderer/
        ├── index.html
        ├── main.tsx
        ├── App.tsx
        ├── stores/
        │   ├── auth.store.ts
        │   ├── space.store.ts
        │   └── chat.store.ts
        ├── lib/
        │   ├── supabase.ts
        │   ├── tenor.ts
        │   └── id-gen.ts
        ├── pages/
        │   ├── AuthPage.tsx
        │   ├── OnboardingPage.tsx
        │   └── DashboardPage.tsx
        ├── components/
        │   ├── modals/
        │   │   ├── RoomModal.tsx
        │   │   └── CreateSpaceForm.tsx
        │   ├── layout/
        │   │   ├── TitleBar.tsx
        │   │   ├── SpacePanel.tsx
        │   │   ├── ChatArea.tsx
        │   │   └── SettingsPanel.tsx
        │   ├── chat/
        │   │   ├── MessageList.tsx
        │   │   ├── MessageItem.tsx
        │   │   ├── ChatInput.tsx
        │   │   ├── GifPicker.tsx
        │   │   ├── ImagePreview.tsx
        │   │   └── WhisperSuggest.tsx
        │   ├── popups/
        │   │   ├── ShoutPopup.tsx
        │   │   └── WhisperPopup.tsx
        │   └── ui/
        │       ├── Avatar.tsx
        │       ├── ProfileTooltip.tsx
        │       └── ContextMeter.tsx
        └── styles/
            └── globals.css
```

---

## 9. CRITICAL RULES & GOTCHAS

### Electron
- **Never use `app.quit()` on window close** — use `win.hide()` and only quit via tray menu
- **Preload scripts are required** for any `ipcRenderer` usage — never enable `nodeIntegration: true` in renderer
- **Shout/Whisper windows** must load the renderer URL with a hash route (`#/shout`) so they render the popup component
- **Auto-start `openAsHidden: true`** so the app doesn't flash a window on PC startup

### Supabase
- **RLS is critical** — whispers MUST be filtered at the DB level (target_user_id check in policy), not just the client
- **Realtime subscriptions** must be cleaned up on component unmount to prevent memory leaks
- **Storage bucket** must be set to `public: true` so image URLs work without auth tokens
- **Context window trigger** runs BEFORE insert — if limit hit, it deletes all messages and returns NULL (cancels the triggering insert). The system message is inserted fresh by the trigger itself.

### React / IPC
- **Zustand stores** should NOT hold Supabase subscription refs — manage those in useEffect hooks in components
- **WhisperSuggest** dropdown: use `onMouseDown` (not `onClick`) on suggestion items to prevent the textarea `onBlur` from closing the dropdown before the click registers
- **GIF picker** position: use `position: absolute; bottom: calc(100% + 8px)` above the input bar, not a portal, to avoid z-index issues in Electron

### Tenor API
- Free tier: 300 requests/min — more than enough for this use case
- Always use `media_filter=gif` to get smaller file sizes
- Cache trending GIFs for 5 minutes client-side to reduce API calls

### Context Window
- For testing: set `context_window_limit = 10` in Supabase, send 10 messages, verify nuke
- The meter should subscribe to `spaces` table Realtime so all clients update simultaneously
- Admin can manually reset via Settings panel → calls `DELETE FROM messages WHERE space_id = ?` + `UPDATE spaces SET context_window_used = 0`

---

## BUILD ORDER SUMMARY

```
Phase 0  → Scaffold + Tailwind + Vite config
Phase 1  → Google OAuth + session management  
Phase 2  → Onboarding nickname + Room modal (Join/Create)
Phase 3  → Dashboard 3-panel layout + Tray + TitleBar
Phase 4  → Chat: messages, Realtime, /shout /whisper parsing
Phase 5  → Shout + Whisper popup windows (IPC)
Phase 6  → GIF picker (Tenor API)
Phase 7  → Image drag-drop + file upload (Supabase Storage)
Phase 8  → Context window meter + auto-nuke trigger
Phase 9  → System Tray + auto-start on login
Phase 10 → Search conversations in Settings panel
Phase 11 → Package + distribute (Electron Forge)
```

**Estimated build time with an AI coding agent:** 2–4 days of focused sessions, one phase per session.

---

*Walkie-Chattie — Built for the crew. No servers, no subscriptions, just a room.*
