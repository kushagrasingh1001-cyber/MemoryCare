# Translation review notes (Assamese & Manipuri)

Assamese (`as`) and Manipuri (`mni`, Bengali script) were added in this change
because MemoryCare is built for North East India. The strings are written to be
simple and natural, but **they have not been reviewed by native speakers yet**.
Please have someone check the list below before a public launch.

## High priority (shown on medical / emergency screens)

| Key | English | Current Assamese | Current Manipuri |
|---|---|---|---|
| `typeMedicine` | Medicine | ঔষধ | হীদাক |
| `typeHydration` | Hydration | পানী | ঈশিং |
| `pagerEmergency` | Emergency information | আপদকালীন তথ্য | ইমার্জেন্সি ইরম্দ |
| `reminderScheduled` | Reminder scheduled for the patient. | ৰোগীৰ বাবে মনত পেলোৱা নিৰ্ধাৰণ হ'ল। | নাতনাগীদমক নিংশিংহনবা সেমখ্রে। |
| `errInvalidInviteCode` | That invite code is not valid. | এই ইনভাইট ক'ড শুদ্ধ নহয়। | ইনভাইট কোড অসি মপুং তৌদে। |
| `removedBody` | Caregiver removed notice | … | … |

## Terms that were deliberately borrowed

Manipuri frequently borrows English technical nouns, so these are transliterated
rather than translated:

`কেয়ারগিভার` (caregiver), `পেজার` (pager), `ব্লুটুথ`, `সেভ তৌ` (save),
`কেন্সেল তৌ` (cancel), `ডিলিট তৌ` (delete), `একুরেসি` (accuracy),
`লেবেল` (level), `ইমার্জেন্সি` (emergency).

If the reviewer prefers native terms (for example মশিং লৈনবা for caregiver),
only `src/translations/mni.json` needs to change — every screen reads from it.

## Script choice

Manipuri is currently written in **Bengali script**, which is the most widely read
form in Manipur today and keeps the layout consistent with Assamese and Hindi.
Meitei Mayek (`ꯃꯤꯇꯩ ꯃꯌꯦꯛ`) can be added later as a second locale
(`mni-Mtei`) without touching any component code: add a JSON file, register it in
`src/i18n.js` and it appears in the language picker automatically.

## How to review

1. Run the app (`npm run dev`).
2. Open the language menu (top right) and switch between
   English / हिन्दी / অসমীয়া / মৈতৈলোন্.
3. Walk through: login → patient home → games → reminders → family → gallery,
   and the caregiver dashboard → pager management.
4. Any string can be corrected directly in `src/translations/<lang>.json`.
