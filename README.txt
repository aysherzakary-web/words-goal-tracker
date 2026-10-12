WORDS GOAL TRACKER V5 — GROUP CONNECTION + OFFLINE-FIRST FOUNDATION

This version keeps the local writing library and solo timer, improves app-shell caching, and adds Supabase account sign-in, shared group creation/joining, invitation links, and shared daily word-count progress.

IMPORTANT SETUP
1. These files use the Supabase project URL and publishable key configured in app.js. Publishable keys are intended for client-side use. Never place a database password, secret key, or service_role key in this app.
2. The SQL setup for wgt_profiles, wgt_groups, wgt_group_members, and the wgt_* RPC functions must already have run successfully in the Supabase SQL Editor.
3. In Supabase Authentication > URL Configuration, set Site URL to https://aysherzakary-web.github.io/words-goal-tracker/ and add that same address to the Redirect URLs allowlist.
4. Group members need accounts and internet to create/join groups and view shared progress. If email confirmation is enabled, users must confirm their email before signing in.
5. This app shares only a daily word-count value to groups. It does not upload book/chapter content. The solo timer remains separate; there is no group timer.
6. Writing, books, chapters, goals, and the solo timer do not require the group database. The app shell is cached by the service worker after a successful online visit. For first offline use, open the updated app online once and let it finish loading, then test offline.
7. The current group progress value is the local dailyLog total for today. Offline writing remains local; this version does not yet maintain a durable per-event sync queue or resolve multi-device concurrent editing. Reconnect and open the app online to sync the current daily total. Test carefully before relying on it.
8. Always export a backup before replacing files. Keep all files in the same folder and upload/commit the contents to the existing GitHub Pages repository.

FILES
index.html, styles.css, app.js, service-worker.js, manifest.json, icon.svg
