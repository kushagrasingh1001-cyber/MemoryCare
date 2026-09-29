# MemoryCare Spark Mode

This variant removes the Cloud Functions dependency from patient/caregiver signup so the core hackathon app can be tested on Firebase Spark.

## Works on Spark
- Email/password authentication
- Patient account + group creation
- Invite code creation
- Up to four caregiver joins
- Firestore realtime dashboard data
- Games, adaptive difficulty, Dexie offline session sync
- Caregiver-created reminder records
- English/Hindi and browser speech features

## Deferred until Blaze/backend deployment
- Hourly 24-hour inactivity checks
- Server-scheduled reminder delivery / automatic missed-after-15-min processing
- Server FCM fan-out

## Important
The Spark-mode rules deliberately allow a newly authenticated account with no user profile to read a group during the invite-code join transaction. This is acceptable for a hackathon/demo, but the Cloud Functions version is the recommended production architecture.

After replacing your local files with this variant, redeploy rules:

    firebase deploy --only firestore

Then restart Vite:

    npm run dev
