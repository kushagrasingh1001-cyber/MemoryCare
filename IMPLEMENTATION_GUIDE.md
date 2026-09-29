# MemoryCare Implementation Guide

## File map

- `src/firebase/firebase.js` — Firebase client initialization.
- `src/context/AuthContext.jsx` — live authenticated user/profile state.
- `src/services/authService.js` — patient/caregiver signup and login.
- `src/services/activityService.js` — last-active and activity logs.
- `src/services/difficulty.js` — reusable adaptive-difficulty rule.
- `src/offline/*` — Dexie storage and Firestore sync.
- `src/hooks/useVoiceNarration.js` — TTS and browser speech input helper.
- `src/translations/*` — English/Hindi strings.
- `src/components/ui/*` — reusable accessible UI primitives.
- `src/games/*` — three cognitive games and shared session saver.
- `src/pages/patient/*` — patient-facing routes.
- `src/pages/caregiver/*` — shared real-time caregiver routes.
- `functions/index.js` — secure group creation/join, 24-hour inactivity checker and reminder scheduler.
- `firestore.rules` — client access rules; group membership mutations are server-only.

## Before first run

Create a Firebase project and Web App. Enable Email/Password Authentication. Create Firestore. Add the web config to `.env`. For browser push, create a Web Push certificate and put its public VAPID key in `.env`. Deploy Functions, rules and indexes before testing multi-user behavior.

## Integration decisions

Group membership is changed only by callable Cloud Functions; clients cannot edit `groups` or invite-code documents. This avoids the insecure client-side invite redemption problem. Caregiver screens use `onSnapshot`, so all caregivers receive the same live Firestore state. Game session IDs are UUIDs and are reused during offline sync, which makes the upload idempotent and avoids duplicate sessions. The 24-hour inactivity function has a 24-hour alert cooldown. Reminder processing runs every five minutes, sends due push notifications, and marks still-pending reminders missed once the 15-minute grace period has elapsed.

## Hackathon simplifications

The routine game uses tap-to-order rather than drag-and-drop because it is simpler for elderly users. Web Speech API support varies by browser; Chrome/Edge are the safest demo targets. Browser FCM also requires the standard Firebase messaging service worker for background notifications; add your Firebase config to `public/firebase-messaging-sw.js` before demonstrating background push. The frontend full-screen reminder works when the PWA is open, while FCM handles push delivery when supported.
