# Security — BPD Capture (mobile + desktop)

Rules for both apps, and the state of the last security review. Run the automatic check before
every release:

```sh
npm run security:check     # scans mobile src/ and ../BPD_Capture_Desktop/src
```

It fails on SQL built from strings, raw HTML/`eval`, and hard-coded secrets.

## Rules

1. **SQL: values always go in as `?` parameters.** Never put typed text into SQL with `${…}` or
   `+`. The only interpolations allowed are the constants `ORDER_COLUMNS` and `SCHEMA_VERSION`; whole-statement variables must come from the constant lists in `db/schema.ts`. This is what makes SQL
   injection impossible: whatever someone types is stored as data, never run as SQL.
2. **CE numbers are folder names, so they go through `utils/ceNumber.ts`** (desktop:
   `src/shared/ceNumber.ts`, an identical copy). `assertValidCeNumber` on create/rename;
   `isSafeFolderName` as the last check before any folder is touched. A CE number made only of
   dots, or containing `/`, `\` or control characters, must never reach the file system.
3. **Desktop: the renderer is untrusted.** Every IPC handler that takes a file path calls
   `assertInsideOrdersDirectory` (in `src/main/services/storage.ts`) first. Never add an IPC
   handler that reads, writes, deletes, renames or opens an arbitrary path.
4. **Desktop: the window only ever shows the app.** Navigation, redirects, pop-ups and
   `<webview>` are blocked in `src/main/index.ts`; webcam permission is granted only to the
   app's own pages. Keep `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
   and the CSP in `src/renderer/index.html`.
5. **HTML for PDFs goes through `escapeHtml()`.** React escapes on screen; the PDF HTML is
   built by hand, so every value typed by a person must be escaped.
6. **No secrets in either app.** Anything shipped in an APK or installer can be extracted.
   Logins (e.g. the planned GitHub sync) are per device and stored in the OS's secure storage.
7. **Zip restore rejects unsafe entries** (`..`, absolute paths, and on desktop symlinks) before
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
