WORDS GOAL TRACKER — V4 OFFLINE-FIRST FOUNDATION

Included files:
- index.html
- styles.css
- app.js
- manifest.json
- service-worker.js
- icon.svg

V4 changes:
- Improved service worker cache installation so one failed cache request does not cancel all caching.
- Improved offline navigation fallback to the cached app page.
- Cache-first loading for same-origin app files.
- Updated cache version so browsers can detect the new offline shell.
- Installed app start URL points to the app root.

IMPORTANT OFFLINE SETUP:
1. Publish these files to the existing GitHub Pages repository.
2. Each friend must open the published app while they have internet, wait for it to finish loading, and visit the app screens once.
3. Close the app and reopen it online once if possible, to allow the service worker to finish installing/updating.
4. Then test offline by turning off both Wi-Fi and mobile data and opening the installed app.
5. If the app was already installed, fully close it and open it again online to allow the new service worker to update. The update may not take effect until the next launch.
6. Always export a backup before replacing files. The app stores books and chapters locally on each device.

LIMITATIONS THAT ARE NOT FIXED BY THIS OFFLINE SHELL:
- This version still does not have a real online group backend. Group invitations and cross-device group progress will NOT work yet.
- Offline support cannot be installed remotely onto a phone that has never loaded the app while online. A friend who is offline and has not previously cached the app must reconnect once to set it up.
- This upgrade improves app-shell caching; it does not replace testing on multiple devices.

GROUP SPRINT BACKEND PLAN:
A secure backend must be configured before genuine groups work across phones. It should store group membership and opted-in progress only, and must never expose manuscript/chapter contents to other members. Offline progress synchronization needs a separate, carefully tested queue to avoid lost or duplicated updates.

Existing local writing is stored in IndexedDB under the same database name/schema. Export a backup first as a precaution.
