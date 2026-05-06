# Astra v1.0.2 | Space Lifecycle

> Members now announce themselves when they enter and say goodbye when they leave.

**Install:** Download `Astra Setup 1.0.2.exe` from the assets below and run it.

---

## What's New

### Join and Leave System Messages

When someone joins or leaves a space, a styled system message appears in the chat. Messages are randomly selected from themed pools:

**Joining:**
> `{name} breached the room` - `{name} slipped through the airlock` - `{name} warped into the space` - `{name} entered orbit` - `{name} spawned in` - `{name} kicked the door open` - `{name} just landed`

**Leaving:**
> `{name} slipped out of the airlock` - `{name} vanished from comms` - `{name} disconnected from orbit` - `{name} blinked off the radar` - `{name} drifted into deep space` - `{name} powered down their signal`

These fire automatically when you join a space, and whenever another member leaves or gets kicked.

### System Message Visual Refresh

System messages now render as styled pill cards with a space-themed icon, gradient background, and a pulsing activity dot - visually distinct from regular chat messages.

### Live Members Panel

The members panel now subscribes to `space_members` changes in real-time. When someone joins or leaves, the member list updates immediately. A 250ms debounce keeps network use efficient.

### /tap Validation Fix

Attempting `/tap @unknownuser message` now shows a toast error instead of silently failing:
> Member "unknownuser" not found
> *Use /tap @username message*

### Version Badge in Title Bar

The title bar now shows `v1.0.2` so you always know which build you are running.

### OAuth Redirect Fix

The OAuth callback URI now resolves to `astra://login-callback` in production builds and to `localhost` in development - fixing sign-in in the packaged app.

### Branding

Tagline updated to **"Your crew. Your Space."**

---

## Upgrading

Already-installed users will be notified of this update on next launch. Otherwise download from the **Assets** section below.

---

## Feedback and Issues

github.com/ZheyUse/walkie-chattie/issues

---

*Built with Electron - React - Supabase - Tailwind CSS*
