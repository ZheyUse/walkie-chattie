# Astra v1.0.5

> A lightweight, dark-themed desktop chat app for real-time spaces.

**Install:** Download `Astra Setup 1.0.5.exe` from the assets below and run it.
**Upgrading:** Astra will prompt you to update automatically on next launch.

---

## What's New

### Google Profile Photos
Avatars throughout the app now show users' actual Google profile photos instead of generated initials:

- **Profile photos everywhere** — The main avatar, message sidebars, members panel, and profile tooltip all now render the user's Google profile picture when available
- **Automatic on first sign-in** — New users have their Google profile photo URL saved automatically on account creation, so it loads instantly across all components
- **Graceful fallback** — Users without a Google profile photo (or with privacy settings enabled) continue to see the color-coded initials avatar they had before
- **Member avatars in messages** — When viewing messages in a space, other members' avatars are resolved from the loaded member list with `getMemberPicture()` lookup, so the most up-to-date photo is always shown
- **Supabase schema update** — A `picture` text column was added to the `profiles` table to persist each user's Google avatar URL

### Full Changelog (since v1.0.4)

| Commit | Change |
|---|---|
| `76b503a` | Add user profile pictures to various components and update profile management |

### Files Changed

| File | Change |
|---|---|
| `Avatar.tsx` | Full rewrite — renders `<img>` when `picture` is set, falls back to gradient initials ring |
| `auth.store.ts` | Added `picture?: string` to `Profile` type |
| `space.store.ts` | Added `picture?: string` to `Member` type + `getMemberPicture()` helper |
| `OnboardingPage.tsx` | Saves `user.user_metadata.picture` on first profile creation |
| `App.tsx` | Fetches `picture` when enriching space members |
| `RoomModal.tsx` | Fetches `picture` when enriching joined-space members |
| `MessageItem.tsx` | Passes `avatarPicture` — from auth store (self) or `getMemberPicture` (others) |
| `MembersPanel.tsx` | Passes `m.picture` on all member entries |
| `SpacePanel.tsx` | Passes `profile?.picture` |
| `ProfileTooltip.tsx` | Passes `profile?.picture` |

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