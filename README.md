# MemoryCare

MemoryCare is an elderly-friendly cognitive assistance platform for dementia care. The hackathon build combines a simple patient PWA with a shared caregiver dashboard, cognitive training, reminders, activity monitoring, multilingual voice assistance, adaptive difficulty, and demo-level offline synchronization.

## Core model

One **Patient Group** contains exactly one patient and up to four linked caregivers (maximum five users). The patient creates the group and receives an invite code. Caregivers join with that code. All linked caregivers read the same Firestore data, so reminder state, activity, game performance and alert acknowledgements update in real time.

## Tech stack

React + Vite, React Router, Tailwind CSS, Firebase Authentication, Cloud Firestore, Firebase Cloud Functions v2, Firebase Cloud Messaging, Recharts, Dexie/IndexedDB, i18next, and the browser Web Speech API.

## Main features

- Patient/caregiver role authentication and secure group linking.
- Patient `lastActiveTimestamp` updated on app activity.
- Hourly backend inactivity check; after 24 hours, linked caregivers receive an FCM check-in alert. A cooldown prevents hourly repeat spam.
- Shared caregiver dashboard with patient status, cognitive trends, reminders and alert history.
- Three patient games: Memory Match, Odd One Out and Daily Routine Sequencing.
- Rule-based adaptive difficulty using the rolling average of the last five sessions: >=80% raises the level, <40% lowers it, otherwise it stays unchanged (levels 1–5).
- Medicine, hydration and appointment reminders. Pending reminders that remain unacknowledged for 15 minutes are marked missed and caregivers are notified.
- English/Hindi translation files and Web Speech API narration; localization is structured to add Assamese, Khasi, Manipuri and other NER languages later.
- Game sessions save to IndexedDB first and sync to Firestore when connectivity returns.

## Setup

1. Install Node.js 20+ and Firebase CLI.
2. Copy `.env.example` to `.env` and add your Firebase web-app values and FCM VAPID key.
3. In Firebase Console enable Email/Password Authentication, Firestore, Cloud Messaging, Functions and Hosting.
4. Run `npm install` in the project root.
5. Run `npm install` inside `functions/`.
6. Deploy backend/rules/indexes with `firebase deploy --only functions,firestore`.
7. Run the frontend with `npm run dev`.
8. For production: `npm run build` then `firebase deploy --only hosting`.

> Scheduled Cloud Functions require the Firebase project/billing configuration needed by Firebase/Google Cloud for scheduled functions.

## Routes

`/signup/patient`, `/signup/caregiver`, `/join`, `/patient/home`, `/patient/games/:gameType`, `/patient/reminders`, `/caregiver/dashboard`, `/caregiver/reminders`, `/caregiver/history`.

## Demo flow

Create a patient account and note the invite code. Create one or more caregiver accounts with that code. Play a game as the patient and watch the caregiver dashboard update. Create a reminder from the caregiver route and acknowledge it from the patient route. For offline demo, disable Wi-Fi, play a game, reconnect, and the IndexedDB session will sync to Firestore.

## Adaptive-AI pitch paragraph

MemoryCare uses a rule-based adaptive AI layer that continuously personalizes cognitive exercises from the patient's recent performance. After each session, it evaluates the rolling accuracy of the last five sessions for that cognitive domain and adjusts difficulty within safe limits: sustained high performance increases challenge, while low performance reduces complexity to avoid frustration. This creates a personalized feedback loop without requiring a large clinical dataset during the prototype stage. Post-hackathon, the same session data pipeline can support development and validation of a trained ML model using appropriately consented real-world data.

## Architecture diagram description

Place **Patient PWA** on the left and **Caregiver Dashboard** on the right. In the center place a large **Firebase** block containing Authentication, Cloud Firestore, Cloud Functions and Firebase Cloud Messaging. Draw bidirectional arrows from both apps to Firebase. Under the Patient PWA add an **Offline Layer (Dexie / IndexedDB)**: game sessions write locally first, then a Sync Service uploads them to Firestore when connectivity returns. Between the patient games and Firestore show the **Adaptive Difficulty Engine**, which reads recent game-session accuracy and writes the next per-game difficulty level. From Cloud Functions draw outgoing FCM arrows to both apps: patient reminder notifications and caregiver inactivity/missed-reminder alerts. Inside Firestore show the shared Patient Group model: **1 Patient + up to 4 Caregivers**, with users, groups, reminders, activity logs, game sessions and alerts. This illustrates the complete flow: **Patient App ↔ Firebase ↔ Caregiver App**, with offline synchronization and adaptive difficulty as supporting layers.

## Important prototype note

MemoryCare is an assistive hackathon prototype, not a medical diagnostic system. Inactivity and missed-reminder alerts are check-in signals and should not be interpreted as proof of a medical emergency.
