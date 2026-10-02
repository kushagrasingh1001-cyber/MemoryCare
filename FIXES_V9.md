# MemoryCare — v9 fix release

This release fixes the four problems reported with the prototype app and adds the
two requested North East languages.

---

## 1. "I log in with the caregiver ID and it opens the patient side"

**Cause.** `AuthContext` subscribed to the profile document inside
`onAuthStateChanged` but never unsubscribed it, and `Root`/`Login` redirected
based on whatever profile object happened to be in state — including a stale one
from the previous account. Nothing waited for the new profile read to finish.

**Fix.**

* `src/context/AuthContext.jsx` — every listener is tied to the current `uid` and
  torn down when the account changes. A stale snapshot from a previous account can
  no longer be written to state. A 10-second timeout guarantees the UI never hangs
  on "Loading…".
* `src/services/authService.js` — new `loginAndResolve(email, password)` signs in
  and then reads the profile document once, so the redirect uses the **role stored
  in Firestore**.
* `src/routes/ProtectedRoute.jsx` — always waits for auth *and* profile loading
  before redirecting, and re-checks the role.
* `src/App.jsx` — `/` (Root) shows a loading state instead of guessing, and a user
  with no profile document gets a recovery screen instead of a wrong dashboard.
* Sign-in errors are now human sentences ("Email or password is incorrect…")
  instead of raw Firebase codes, and **Forgot password?** was added.

## 2. "I cannot remove a caregiver from the patient side"

**Cause.** The Family page was read-only and `firestore.rules` had no rule that
allowed a caregiver to be removed.

**Fix.**

* `src/pages/patient/FamilyPage.jsx` — rewritten: invite code with copy/share,
  caregiver counter, member cards, and a **Remove caregiver** button with a
  confirmation dialog.
* `src/services/authService.js` — `removeCaregiverFromGroup()` (patient) and
  `leaveGroup()` (caregiver leaves by themselves) run in transactions.
* `firestore.rules` — membership is now derived from the **group document**
  (`caregiverUids`), so removal revokes access instantly. The patient may remove
  caregivers; a caregiver may remove only themselves; a removed caregiver may
  rejoin with the invite code (the rules verify the code by comparing it with the
  code echoed in `lastJoin`, so a guessed group id is not enough).
* `src/components/AccountRecovery.jsx` — if a caregiver was removed (or left),
  they now see a clear explanation with a *rejoin with invite code* form instead
  of a permissions error.

## 3. "Data is not sent to / received from the ESP32 pager"

**Cause.** The old code asked Bluetooth for one hard-coded service/characteristic
pair (`fff0`/`fff1`) and always used `writeValueWithResponse`. A hand-written or
example ESP32 sketch advertises different UUIDs, only supports
write-without-response, or needs small fixed-size writes — the connection
succeeded and then nothing arrived. There was also no way to see what happened.

**Fix.**

* `src/services/pagerLink.js` — new transport that:
  * scans with *Show all Bluetooth devices* (or MemoryCare-name filter),
  * enumerates every service/characteristic and picks the first writable one,
    preferring `fff1`, Nordic UART and HM-10 UUIDs,
  * falls back between write-with-response and write-without-response,
  * writes in 20-byte chunks with a 28 ms gap and retries
    "GATT operation already in progress",
  * subscribes to notifications and can read the characteristic, so the pager can
    answer back,
  * can also talk over **Web Serial (USB cable)** when Bluetooth is blocked.
* `src/pages/caregiver/PagerManagement.jsx` — rewritten with a **Connection &
  diagnostics** panel showing the discovered services, the chosen characteristic
  and a live send/receive console, plus *Test connection*, *Read data from pager*
  and a progress indicator while syncing (`Sent 12 of 18 chunks`).
* `src/services/pagerProtocol.js` — protocol builder/parser (`MCV1` lines, chunking,
  line reassembly).
* `hardware/MemoryCarePager/MemoryCarePager.ino` — **new, ready-to-flash ESP32
  sketch** that implements exactly this protocol (BLE `fff0/fff1/fff2`, flash
  storage, UP/DOWN/SELECT menu, optional SSD1306, USB-serial commands,
  `SAVED`/`CLEARED`/`DATA` replies).
* `docs/PAGER_PROTOCOL.md` and `hardware/README.md` — wiring, flashing and
  troubleshooting.

> If you want your existing sketch to keep working, tick *Show all Bluetooth
> devices* and open the diagnostics panel: it shows which characteristic was found
> and what was sent.

## 4. Assamese (অসমীয়া) and Manipuri (মৈতৈলোন্) languages

* `src/translations/as.json` and `src/translations/mni.json` — full key sets
  (375 keys each) covering every screen, plus localised game content: the Bihu /
  Lai Haraoba word lists and the tea-making routine.
* `src/components/LanguageToggle.jsx` — a proper 4-language picker
  (English / हिन्दी / অসমীয়া / মৈতৈলোন্) that remembers the choice and can
  auto-detect the browser language.
* `src/hooks/useVoiceNarration.js` — speech now uses `as-IN` / `mni-IN` with
  Bengali/Hindi/English fallbacks, so voice narration works for the new languages.
* `docs/translation-review.md` — list of strings that should be checked by a
  native speaker (they are best-effort, not professionally reviewed).

## Other fixes and improvements found while testing

| Area | Fix |
|---|---|
| `index.html` | Had **no `<meta viewport>`**, no title, no favicon or manifest — mobile layout was broken. Now a full document + PWA manifest + SVG icon. |
| Blank screens | Added `ErrorBoundary` (a broken screen shows a reload button instead of a white page). |
| Forgot password | Added password reset on the login screen. |
| Profile recovery | If the profile document is missing (signup interrupted), the user gets a screen that can restore a patient profile or rejoin as a caregiver. |
| Memory Game accuracy | Was `pairs / (tries + 1)`; now the correct `pairsFound / tries`. |
| Games | No longer reload the whole page to play again; level changes are explained in the current language; word/routine content is localised. |
| Reminders | Patient can tap **Remind me in 10 minutes** (snooze) instead of only "Done". |
| Caregiver reminders | Validates the date/time, offers *In 10 minutes / In 1 hour* quick picks, and shows real error messages. |
| Memory Gallery | Caregivers can delete a memory; the patient carousel no longer breaks after a deletion; empty/oversized photo messages are clear; the caregiver no longer sees a stray empty-state card. |
| Patient status card | No longer depends on `placehold.co` (offline-friendly initials avatar) and shows the "not a medical diagnosis" note. |
| Dashboard | Duplicate "Cognitive Performance" line removed from the chart, reminder log shows times + status pills, alerts show who acknowledged, sign-out/language switch available in the header. |
| Navigation | Added a Gallery tab (5 tabs) and translation-ready labels. |
| Offline | Game sessions still write to IndexedDB first, then sync; the caregiver dashboard no longer crashes when a query fails offline. |

---

## Deploying these changes

1. **Rules (required for caregiver removal):**
   `firebase deploy --only firestore:rules`
2. **Frontend:** `npm install` → `npm run build` → `firebase deploy --only hosting`
3. **Pager:** flash `hardware/MemoryCarePager/MemoryCarePager.ino` with the
   Arduino IDE (ESP32 Dev Module), then use *Connect Pager* → *Sync / Replace
   Pager Data* in the app.
4. Cloud Functions are unchanged, but if you already deployed them they keep
   working (`firebase deploy --only functions` only if you want to redeploy).

## Testing checklist

- [ ] Sign in as a caregiver → lands on `/caregiver/dashboard` (never on the patient home).
- [ ] Sign in as a patient → lands on `/patient/home`.
- [ ] Switch language to অসমীয়া / মৈতৈলোন্ and reload → the choice is remembered.
- [ ] Patient → Family → Remove a caregiver → that caregiver's device immediately
      shows the "no longer in this care space" screen, and their account can rejoin
      with the invite code.
- [ ] Caregiver → Pager Management → Connect Pager → Sync → the pager screen shows
      the new routine; "Read data from pager" prints the stored lines in the console.
- [ ] Switch the pager off/on → data is still there (flash storage).
