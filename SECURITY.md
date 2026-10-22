# Security — BPD Capture (mobile + desktop)

Rules for both apps, and the state of the last security review. Run the automatic check before
every release:

```sh
npm run security:check     # scans mobile src/ and ../BPD_Capture_Desktop/src
npm run test:security      # mobile: job-folder and path-guard tests (scripts/security-test)
# and in BPD_Capture_Desktop:
npm run test:security      # desktop: storage, IPC path checks and navigation (tests/security)
```

`security:check` fails on SQL built from strings, raw HTML/`eval`, and hard-coded secrets. The
`test:security` suites run the real storage code (mobile on a fake file system, desktop on the
real one in a temp folder) and must pass before a release.

## Rules

1. **SQL: values always go in as `?` parameters.** Never put typed text into SQL with `${…}` or
   `+`. The only interpolations allowed are the constants `ORDER_COLUMNS` and `SCHEMA_VERSION`; whole-statement variables must come from the constant lists in `db/schema.ts`. This is what makes SQL
   injection impossible: whatever someone types is stored as data, never run as SQL.
2. **CE numbers are folder names, so they go through `utils/ceNumber.ts`** (desktop:
   `src/shared/ceNumber.ts`, an identical copy). `assertValidCeNumber` on create/rename;
   `isSafeFolderName` as the last check before any folder is touched, and the resolved folder
   must be strictly inside the orders folder (mobile: `utils/pathGuard.ts` `isStrictlyInside`;
   desktop: `assertInsideOrdersDirectory`). A CE number made only of dots, or containing `/`,
   `\` or control characters, must never reach the file system. Typed photo names go through
   `safeFileBaseName`, and photo delete/rename never act outside the job folders.
3. **Desktop: the renderer is untrusted.** Every IPC handler that takes a file path calls
   `assertInsideOrdersDirectory` (in `src/main/services/storage.ts`) first. Never add an IPC
   handler that reads, writes, deletes, renames or opens an arbitrary path.
4. **Desktop: the window only ever shows the app.** Navigation, redirects, pop-ups and
   `<webview>` are blocked in `src/main/index.ts`; "the app" means exactly the built renderer
   page (`src/main/navigation.ts`), not any `file://` page. Webcam permission is granted only to
   that page. Keep `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
   and the CSP in `src/renderer/index.html`.
5. **HTML for PDFs goes through `escapeHtml()`.** React escapes on screen; the PDF HTML is
   built by hand, so every value typed by a person must be escaped.
6. **No secrets in either app.** Anything shipped in an APK or installer can be extracted.
   Logins (e.g. the planned GitHub sync) are per device and stored in the OS's secure storage.
7. **Sync logins stay on the device.** The GitHub sign-in uses the device flow (a code
   approved in the browser; no client secret exists in either app). The token is kept in
   Android's encrypted SecureStore on the phone and encrypted with Electron `safeStorage`
   (Windows DPAPI) on the desktop, never in the database, logs or backups. The GitHub App
   should only be installed on `mikachamp/bpd-capture` with Contents: read and write.
8. **Synced data is private only if the repo is private.** Job data lives on the `data` branch
   of `bpd-capture`; set the repo to private once every device runs a version with sign-in.
9. **Zip restore rejects unsafe entries** (`..`, absolute paths, and on desktop symlinks) before
   extracting anything. Don't use `extract-zip` (unfixed symlink advisory).

## Review — 2026-10-13

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Release APK signed with React Native's **public** debug key (SHA-1 `5e8f16…f625`); anyone could sign an APK Android accepts as an update | Critical | **Open.** Needs a private release keystore and a one-time backup → reinstall → restore on each phone. |
| 2 | CE numbers like `..` could point outside the jobs folder; deleting that job would delete every job's media (desktop had no checks; mobile allowed dot-only names) | High | Fixed in code (desktop now; mobile ships with the next APK): shared validation + storage guard in both apps. |
| 3 | Desktop IPC accepted any path for read/delete/rename/reveal | High | Fixed: all paths must be inside the orders folder. |
| 4 | Desktop window had no navigation lock; webcam allowed for any origin | Medium | Fixed: navigation/pop-ups/webviews blocked; media only for app pages. |
| 5 | Desktop depended on `extract-zip` (high-severity advisory) | Medium | Fixed: removed (it was unused). |
| 6 | Build-tool dependency advisories (brace-expansion, braces, compression, node-forge, shell-quote) | Low | Open. Build tooling only, not in the installed app. |
| 7 | Job photos are also copied to the phone's public gallery | Info | By design (gallery backup). |

**How #2–#5 were verified:** attack scripts run inside the real desktop app (via the Chrome
DevTools Protocol) tried to read `C:\Windows\win.ini`, traverse with `..\`, delete/rename/reveal
files outside the data folder, delete job folder `..`, create CE `..`, open a pop-up and navigate
to a website. All 10 were blocked, while creating a job, saving a photo, loading its thumbnail and
deleting the job still worked. CE rules have unit cases (`..`, `.`, `...   `, control characters,
65+ characters, `123.`).

## Follow-up — 2026-10-22

Checked the 2026-10-13 findings against the code, added automated tests, and closed the gaps
they found. Data format, folder layout and backup format are unchanged; no version bump.

| Finding | State on 2026-10-22 | Change |
|---|---|---|
| CE `.` / `..` deletes other jobs (#2 above) | Already fixed (mobile `8987ca9` + `5fb0303`, desktop 2026-10-13) | Added a resolved-path check on mobile (`isStrictlyInside`) on top of the name check. Tests reproduce the data loss on the pre-fix mobile code (`0ffc2b7`: 7 of 9 fail) and on desktop with the guards removed (7 of 9 fail). |
| Mobile photo rename could move a file out of its job (`../../x`) | **New, fixed** | `renameMediaFile` strips separators and refuses to leave the job folder; `deleteMediaFile` never deletes outside the job folders. |
| Desktop IPC path checks (#3 above) | Already fixed | Tested through the real handlers. Found `storage:readAsDataUrl` was no longer registered (dropped in a later rewrite of `ipc.ts`), so desktop thumbnails could not load; re-added through the guarded `readMediaAsDataUrl`. |
| Desktop navigation lock (#4 above) | Partly fixed | It allowed **any** `file://` page, which would get `window.api`; now only the app's own renderer page (`navigation.ts`, tested). Verified live: `window.open`, links to a local file and to a website, and reading the database or `win.ini` through the bridge were all refused. |
| Jobs already saved with a bad CE number | Checked | Both apps list them at start-up (log only; nothing changed or deleted). The desktop database has none (1 job, "5666"). Phones not checked from here. |
| Release keystore (#1 above), build-tool advisories (#6) | Open | Unchanged: the keystore switch needs a planned release (one-time reinstall). |
