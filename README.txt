WORDS GOAL TRACKER — STARTER VERSION

Included:
- Create and edit books with word goals
- Create chapters and write inside the editor
- Live chapter word count
- Total words across saved chapters and goal progress
- Light and dark purple themes
- Local browser database (IndexedDB)
- Export a chapter as .txt
- Export/import a JSON backup
- PWA manifest and service worker for offline app shell caching

IMPORTANT:
1. This is a starter app, not yet published online.
2. To install as an app and use service-worker offline caching, host it on HTTPS (for example, GitHub Pages). Open it online once, then install it from Chrome's menu.
3. Drafts are stored locally in the browser on this device. Clearing site data, uninstalling/resetting the browser, or losing the device may delete drafts. Export backups regularly.
4. Monthly progress currently totals the words in saved chapters; it does not yet distinguish words written during the current calendar month. Calendar, streaks, daily goals, cloud accounts, and syncing are future upgrades.
5. The app does not send your writing to a server.


VERSION 2 ADDITIONS
- Daily word goal setting and words-written-today counter (counts positive increases in the editor's word count).
- Writing calendar and consecutive-day streak display.
- Solo writing sprint timer with pause/resume/reset and approximate words-added result.
- Shared live group sprints are not included yet; those need an online real-time service and accounts.

To update your published GitHub Pages app, upload/replace the files from this version in the same repository and commit the changes. The service-worker cache name is bumped so the browser can fetch the new app shell. Existing local IndexedDB data is kept, but export a backup before updating as a precaution.


VERSION 3 LAYOUT UPDATE
- Navigation separates Home, My Library, Progress, Solo Sprint, and Sprint Groups into different screens.
- Group screen includes local group creation and invite-link preparation UI.
- Important: actual invitations, member accounts, and live shared word-count progress are not active without an online backend. Group members should never receive manuscript/chapter contents; only opted-in progress data should be synced.
- Group sprints intentionally have no shared timer. The timer is only for solo sprints.
- Export a backup before replacing the published app files.
