# Session Handoff — BPD Capture

Written so a fresh agent (or human) can pick up exactly where this session left off.
Read this fully before doing anything — especially before re-running builds or killing
processes, since some of this documents *why* certain choices were made.

## TL;DR — current state (last updated 2026-09-22, Clients + UX-restructure round)

- **Two rounds of external "Gemini" implementation plans landed this round, both reviewed
  and handled by this session**: (1) a bottom-tab UX restructure (Home/Calendar/Insights/
  Settings tabs, unified search, segmented In Process/Completed, FAB) — reviewed and
  verified, found 2 real bugs (FAB overlapping list content; dead "‹ Dashboard" links on
  Calendar/Insights left over from the pre-tab structure) — **both now fixed** as part of
  this round; (2) a "Clients List & Dashboard Visuals" plan — this one was **implemented
  directly by this session** (not Gemini) after review, since the user said to go ahead.
  See "Follow-up: Clients List & Dashboard Visuals" below for full details.
- **This project now has a GitHub remote**: `https://github.com/mikachamp/bpd-capture`
  (private repo, created via `gh repo create ... --push`). GitHub CLI was installed this
  round via `winget install --id GitHub.cli --scope user` (no admin needed) — it lives at
  `C:\Users\mikaw\AppData\Local\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe`
  (not yet on `PATH` in this harness's shell sessions — use the full path, or `gh auth
  setup-git` already wired plain `git push`/`git pull` to work directly too). User is
  authenticated as `mikachamp` via `gh auth login` (their own browser-based login, same
  constraint as the still-unresolved EAS login). **`master` is pushed and tracks
  `origin/master`.**
- **The APK is distributed via GitHub Releases, not committed into the repo** —
  deliberate choice to avoid bloating git history with a ~47MB binary on every rebuild
  (`.gitignore` already excluded `/builds` and `*.apk` from before this round, so this was
  free). Current release: `v1.0.0` at
  `https://github.com/mikachamp/bpd-capture/releases/tag/v1.0.0`, asset `bpd2.apk`.
  **To publish a newer build after a future rebuild**: either `gh release create v1.0.1
  builds/bpd2.apk --title "..." --notes "..."` (new version tag) or `gh release upload
  v1.0.0 builds/bpd2.apk --clobber` (replace the same release's asset) — ask the user
  which they'd prefer before choosing, this wasn't specified.
- **Google Drive sideloading (the original distribution method) still works and hasn't
  been replaced** — GitHub Releases is now an additional/alternative way to get the APK
  onto the phone, not a mandatory switch. Whichever's more convenient for the user is fine.

## TL;DR — current state (2026-09-11, real-device bug-fix round)

- **Three real-device bugs reported via screenshots, all fixed and rebuilt into
  `builds/bpd2.apk`** (each a fast incremental build, no new native deps): (1)
  `MediaGrid.tsx` photo tiles stretched to fill the row when the row wasn't fully
  populated (a plain flexbox `flex:1`-on-a-partial-row issue, **not** the earlier
  native-only Yoga bug — this one would have shown in web preview too, it just was never
  tested with an uneven photo count); (2) exported PDFs (both single-job and daily digest)
  shared/attached with an unreadable random UUID filename because `expo-print` has no
  option to name its output — fixed by renaming the file before sharing; (3) "Upload from
  Gallery" repeatedly triggered Android's "Allow BPD Capture to modify this photo?"
  prompt — root cause was the app redundantly re-saving a backup copy of an
  already-in-the-gallery photo back into the gallery on every single upload. See
  "Follow-up: real-device bug fixes — MediaGrid tile sizing + PDF filenames" and the
  "Follow-up: gallery-upload permission prompt" section right after it for full details.
  **Not yet confirmed on the real device** — ask the user to check all three on their S21.
- **A "Phase 3 Implementation Plan" (Backup & Restore, Maestro E2E testing, EAS OTA
  Updates) was handed to this session externally** (the user pasted it after being asked
  "what plan?"). Backup & Restore and Maestro scaffolding are **done and rebuilt into
  `builds/bpd2.apk`**; EAS Updates is **deferred, not attempted**, because the user has no
  Expo account yet. See "Follow-up: Phase 3 — Backup & Restore, Maestro scaffolding, EAS
  Updates blocked" below for full details.
- **This repo now has git history.** It had zero commits all session; the user was asked
  and approved making an initial commit. `master`'s root commit (`80b1bff`) has everything
  through this Phase 3 round. A `feature/eas-updates` branch was created off it (currently
  identical to master, no EAS-specific work on it yet) for when EAS setup actually starts —
  don't add EAS config to `master`, switch to that branch first.
- **Not yet confirmed on the real device**: Backup export/restore (zip/unzip, DB
  close-and-replace) is entirely native-only and could only be typechecked +
  web-preview-verified here. Ask the user to install this build and check: Create Full
  Backup produces a real `.zip` via the share sheet, and Restore from Backup (picking that
  same zip back) actually replaces the data after a full app close/reopen.
- **The app is feature-complete and actively being polished from real-device feedback.**
  All app screens/features described below are done and typechecked. The Android build
  problem (Windows path-length/Ninja bug) is **solved** — see "RESOLVED: local Android
  build now works" below — this is no longer blocking anything.
- **Phase 2 (Daily Digest + Pre-Routed Email Sharing) is implemented, web-verified, and
  rebuilt into `builds/bpd2.apk`.** See "Follow-up: Phase 2 — Daily Digest + Pre-Routed
  Sharing" below for full details, plus the follow-up note right after it recording that
  the WhatsApp companion notification (originally part of Phase 2) was **built, then
  explicitly removed at the user's request** — email-based pre-routing is the only
  dispatcher-delivery path now. **Not yet confirmed on the real device** — mail compose
  and real digest PDF generation/pagination are native-only code paths that could only be
  typechecked + web-preview-verified in this environment. Ask the user to install this
  build and confirm: (1) Settings screen saves a dispatcher email and it persists across
  app restarts, (2) tapping Export Field Report or Send Daily Digest with a dispatcher
  email saved opens the mail compose UI directly (attachment + recipient pre-filled)
  instead of the generic share sheet.
- **Nothing is currently blocked.** The last few sessions have each ended with: user
  installs the latest APK on their Samsung S21 → sends screenshots/feedback → fixes get
  made and verified in web preview → rebuilt → handed back. That loop is the steady state
  of this project now; expect to continue it.
- **The installable file is `builds/bpd2.apk`** at the project root (gitignored). It shares
  the same `applicationId`/signing key as every build this project has produced, so
  installing a new one always updates what's already on the user's phone — never a second,
  separate app. **Always rebuild through the short-path mirror at `C:\dev\bpd`** (see
  "RESOLVED" section below for why) — never try `android/` under the real project path
  directly, it will fail.
- **Standard workflow for a small UI/behavior change** (this is now well-worn — follow it):
  1. Make the source edit(s) in the real project path (`...\BPD_Image_app\src\...`).
  2. `npx tsc --noEmit` — must be clean.
  3. Kill stray processes first (`taskkill //F //IM java.exe` and `//IM node.exe` — these
     accumulate across a session and silently make Metro bundling pathologically slow,
     this has bitten multiple rounds, see the process-hygiene note further down).
  4. Verify in web preview (`npx expo start --web`, warm the bundle with a `curl` to
     `/index.ts.bundle?platform=web&dev=true` first since first-bundle-after-restart can
     take 1-5 min, then screenshot with the Playwright pattern used throughout this doc)
     for anything that isn't native-only (permissions, safe-area/notch behavior, and
     anything Yoga-layout-specific like the `flex:1`-in-a-column bug documented below
     cannot be verified this way — say so explicitly rather than claiming confidence).
  5. Robocopy-sync the mirror: `robocopy "<real project path>" "C:\dev\bpd" /E /XD
     node_modules android ios .git .expo .gradle builds /XF *.log /NFL /NDL /NJH /NJS /NP`
     (exit code 1 is robocopy's own "success, files copied" signal, not an error).
  6. `cd C:\dev\bpd\android`, then (with `JAVA_HOME`/`ANDROID_HOME`/`PATH` exported — see
     below, they don't persist between tool calls in this harness) `./gradlew.bat
     assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2`.
  7. Copy `C:\dev\bpd\android\app\build\outputs\apk\release\app-release.apk` over
     `builds\bpd2.apk` in the real project.
  8. Tell the user it's the same install-as-update as always.

## Follow-up: 5 fixes from real-device screenshots of bpd2 (all rebuilt into bpd2.apk)

User installed the first `bpd2.apk` and sent back 3 real-device screenshots with 5 issues,
all fixed and re-verified via web preview (except #5, native-only) before rebuilding:

1. **Text input text was black/invisible on dark inputs** — `NewOrderScreen.tsx`,
   `SearchByCeScreen.tsx`, `SearchByClientScreen.tsx`'s `input` styles, and
   `MediaGrid.tsx`'s `renameInput` style, all lacked an explicit `color`, so they fell back
   to the platform default (black) against the new dark `surface` background. Added
   `color: colors.textPrimary` to each, plus `placeholderTextColor={colors.textMuted}` on
   the `TextInput`s that were missing it. **Lesson for next theme swap**: always grep for
   `TextInput`/`input:` styles specifically — implicit black text is invisible on dark
   backgrounds and web preview's own default text color assumptions didn't catch this
   either initially (worth an explicit check next time, not just eyeballing screenshots).
2. **Native-stack headers stayed white** — React Navigation's default header doesn't
   inherit from `theme.ts` automatically. Fixed in `RootNavigator.tsx`: added a
   `navigationTheme` (spreads `DarkTheme` from `@react-navigation/native`, overrides
   `background`/`card`/`text`/`border`/`primary` with our tokens) passed to
   `NavigationContainer`, plus global `screenOptions` on the `Stack.Navigator`
   (`headerStyle`/`headerTintColor`/`headerTitleStyle`) so every default-header screen
   (NewOrder, JobDetail, SearchByCe, SearchByClient) matches. **This needs to be redone
   any time `theme.ts` colors change** — it's a separate place from the rest of the app's
   styling and is easy to forget.
3. **"Due this week" stat tile made clickable** — `StatTile.tsx` gained an optional
   `onPress` (renders as `Pressable` instead of `View` when provided).
   `RootStackParamList['Calendar']` changed from `undefined` to
   `{ initialMode?: 'month' | 'week' } | undefined`; `CalendarScreen` seeds its `mode`
   state from `route.params?.initialMode`. `InsightsScreen` navigates to
   `Calendar` with `{ initialMode: 'week' }` from that tile. Verified end-to-end via web
   preview — lands directly on the current week.
4. **Delete Job button changed from a pinned full-width red button to a small text link
   reached by scrolling** — per explicit user preference. `MediaGrid.tsx` gained an
   optional `footer?: React.ReactElement | null` prop, rendered both in its empty-media
   branch and as the grid `FlatList`'s `ListFooterComponent` (this is the reusable pattern
   now — anything that needs to appear "after all the photos, requiring a scroll" goes
   through this prop rather than a sibling element outside the grid, since the grid owns
   the actual scroll container). `JobDetailScreen.tsx` passes a small centered
   `Text`-only red link ("Delete Job", no background fill) as that footer; removed the old
   pinned `deleteFooter`/`deleteJobButton` styles entirely.
5. **Camera + microphone permissions requested at app startup, not lazily on first camera
   use** — `App.bootstrap.ts` now calls `Camera.requestCameraPermissionsAsync()` and
   `Camera.requestMicrophonePermissionsAsync()` (imperative, non-hook API — confirmed via
   `node_modules/expo-camera/build/index.d.ts` rather than assumed, per this project's
   own instruction to verify current Expo APIs) as the very first thing in
   `bootstrapApp()`, before DB init. **Native-only** — `Platform.OS === 'web'` still
   short-circuits before this, and this specific fix could not be verified via web preview
   at all; take on faith from the API check unless the user reports it not firing.

**Process hygiene note that cost real time this round**: mid-verification, Metro's bundle
time pathologically climbed from ~2s to 282s. Root cause was resource contention from
accumulated stray processes (7+ orphaned `java.exe` Gradle daemons, ~24 stray `node.exe`
processes from repeated dev-server restarts across the session, Windows Defender's
`MsMpEng.exe` also active again despite being disabled earlier). Fix was `taskkill //F
//IM java.exe` and `taskkill //F //IM node.exe` for a fully clean slate, then restart —
bundle time dropped back to ~2s immediately. **Do this proactively** (kill both before any
web-preview session or Gradle build, not just Gradle daemons alone as done in earlier
rounds) if bundling or builds seem to be taking unusually long — don't assume it's a code
problem before ruling out accumulated process cruft first.

## Follow-up: delete-job feature, real on-device seed data, theme pivot to dark/blue-purple ("bpd2")

Three things landed together in one build, output as `builds/bpd2.apk`:

1. **Delete an entire job** — user asked for a way to delete a whole CE entry (not just a
   photo), preferring a Delete option at the bottom of the job detail screen over a
   long-press-on-card pattern. Added: `deleteOrder(id)` in `src/db/orders.ts` (+ mirrored in
   `webMock.ts` for web preview, removing associated `mediaItems` too) and
   `deleteOrderDirectory(ceNumber)` in `src/services/storage.ts` (deletes the CE-numbered
   folder and all its photos/videos on disk). `JobDetailScreen.tsx` now has a "🗑 Delete Job"
   button pinned below the media grid (wrapped the `MediaGrid` in a `flex: 1` container so
   it scrolls within bounded space and the delete footer always stays visible below it,
   rather than requiring a scroll through however many photos exist) — confirms via
   `Alert.alert` before deleting, then `navigation.goBack()`.

2. **Real on-device demo data** — the 20-entry seed data added earlier this session lives
   in `webMock.ts`, which is **web-preview only** and never touches the real SQLite database
   the actual Android app uses. User asked for the real APK to come pre-populated with ~10
   CE entries. Added `src/db/seedDemoData.ts` (10 varied orders, direct SQL inserts for full
   control over `createdAt`/`completedAt`/`dueDate`, mirroring the webMock style) and wired
   it into `src/App.bootstrap.ts` via `seedDemoDataIfEmpty()` — **only seeds when the
   database has zero orders**, so it can never duplicate or clobber real data on a routine
   update. **Important**: the currently-installed app (from earlier this session) already
   has a manually-created test order ("GHH") in its database, so installing `bpd2.apk` as an
   in-place update will **not** trigger seeding (DB isn't empty). The user needs to
   **uninstall the app first**, then install `bpd2.apk` fresh, to see the 10 seeded entries.

3. **Theme pivot, twice, per user-supplied reference images** — user shared a screenshot of
   a dark app ("Flow+") with a warm amber/orange accent and asked to "try this colour
   scheme"; implemented it fully in `theme.ts` (dark charcoal background, amber accent).
   Before that was even shown to the user, they shared a **second, different** reference
   ("FocusFlow") — dark charcoal with a **cyan-to-purple gradient** accent — and asked to
   build with *that* style instead, named `bpd2`. **The amber version was superseded and
   never shipped** — only the final cyan/purple version is in `bpd2.apk`. Current palette
   in `src/theme/theme.ts`: background `#131316`, surface `#1C1C21`, accent `#6C5CE7`
   (solid uses, e.g. chip tints/borders/badges), plus a new exported `gradientAccent =
   ['#4FC3F7', '#7C4DFF']` constant used for the hero gradient button
   (`DashboardScreen`'s "+ New Order") and picked up automatically by
   `StartupAnimation.tsx`'s conveyor-part color (its background gradient's second stop was
   also retuned to a cool dark tone `#17151F` to match). No custom font was added — the
   reference images' sans-serif look is close enough to the system default already in use;
   revisit only if the user specifically asks for a custom font family.

   **If the user asks for yet another color scheme from a reference image**: the pattern is
   now established — update the `colors` object (and `gradientAccent` if the reference has
   a gradient hero element) in `src/theme/theme.ts`, check `grep -rn "'#" src/ | grep -v
   theme.ts` for any hardcoded hex colors that might need retuning for cohesion (as of this
   writing: `AppLogo.tsx`, `MediaGrid.tsx`'s and `CaptureScreen.tsx`'s black
   camera/media-viewer chrome are all deliberately theme-independent and don't need
   touching), typecheck, re-sync the `C:\dev\bpd` mirror, rebuild.

   **Important pending caveat**: because of the pace of requests, this theme was **never
   actually verified in the web preview** before being built into an APK (the warm-up
   curl for the amber version took ~3 minutes and the user moved on to the blue/purple ask
   before a screenshot pass could run) — the cyan/purple `bpd2.apk` build has **not been
   visually confirmed by either the web preview or the user** as of this note. If the user
   reports anything looking off, do a proper web-preview screenshot pass first (see
   `verify_all.js` pattern used earlier this session) before assuming it's another
   native-only bug.

**`bpd2.apk` still shares the same `applicationId` and signing key as every other build this
session** — it is not a separately-installable second app; installing it will replace
whatever's currently on the user's phone, same as every previous update. If the user
actually wants two side-by-side installable variants to compare, that requires giving one a
different `android.package` in `app.json`, which hasn't been done — flag this explicitly if
asked to "keep both" rather than assuming it already works.

## Follow-up: a native-only Yoga bug that web preview structurally cannot catch

User tested the safe-area-fixed release APK on their S21 and found the dashboard's two
**full-width** buttons ("+ New Order" and "Browse Completed") rendering with **no visible
text** — the button boxes were there, just empty. This never showed up in *any* of the many
web-preview screenshots taken across the whole project. Root cause (found by reading
`DashboardScreen.tsx`, not by guessing): the shared `actionButton` base style has `flex: 1`
(needed so the two side-by-side Search buttons split their row evenly), and
`actionButtonFull` only added `width: '100%'` without resetting that inherited `flex: 1`.
On native Android's Yoga layout engine, `flex: 1` (which implies `flexBasis: 0%`) on an item
inside a plain, non-fixed-height column container can collapse the item's content box —
but **React Native Web's CSS-flexbox implementation does not have this failure mode**, so
it rendered perfectly fine in every browser screenshot while being broken on the real
device the whole time. This is a structural blind spot of web-only testing for this
project, not a one-off mistake — **any future full-width button/element that also carries
a `flex: 1` from a shared base style should be checked on-device, not just in web preview**.

**Fixed**: `actionButtonFull` now also sets `flex: 0` (in
`src/screens/DashboardScreen.tsx`), so it relies purely on `width: '100%'` sized within its
(column, non-flex) parent. Checked for the same pattern elsewhere in the codebase (grepped
for other `...Full` style variants) — this was the only occurrence.

Also in the same round: darkened `colors.background` in `src/theme/theme.ts` from
`#F6F7FB` to `#E9EBF2` per user request (simple preference tweak, not a bug).

Rebuilt and re-copied to `builds/BPD-Capture-release.apk` — **not yet confirmed on-device
by the user** as of this note. If reported broken again, re-check this exact file for any
other `flex: 1`-inheriting style combined with a `width`/`Full` override before looking
elsewhere.

## Follow-up session: emulator abandoned, two real bugs found + fixed via web preview

User asked for an emulator to test on; installed one (`sdkmanager "emulator"
"system-images;android-35;google_apis;x86_64"`, `avdmanager create avd -n bpd_test
-k "system-images;android-35;google_apis;x86_64" -d pixel_6`) but it was unreliable on
this machine — first hung indefinitely with `-gpu swiftshader_indirect` + WHPX active,
then segfaulted (exit 139) with GPU mode `auto`. **User said to stop pursuing the emulator
and use web preview instead** — that's now the standing approach for quick visual checks;
don't re-attempt the emulator unless the user asks again.

Restarting the plain web preview (`npx expo start --web`) surfaced a **real, previously-latent
bug**: Metro failed to bundle at all —
`Unable to resolve "./wa-sqlite/wa-sqlite.wasm" from "node_modules\expo-sqlite\web\worker.ts"`.
This project had no `metro.config.js`, so Metro didn't know `.wasm` is a bundleable asset
(required for `expo-sqlite`'s web/WASM implementation, which `src/db/client.ts` pulls in
transitively even though the actual DB calls are web-mocked). **Fixed**: added
`metro.config.js` at the project root:
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
module.exports = config;
```
This is the standard, documented fix for this exact class of error — copy it into the
`C:\dev\bpd` build mirror too before the next build (robocopy sync will pick it up
automatically since it's not excluded).

**Second, more important bug** — the user tested the previously-built APK on their real
Samsung S21 and found the app's content rendering **underneath the camera cutout** at the
top of the screen. Root cause: every screen imported `SafeAreaView` from `'react-native'`
directly. React Native's **built-in** `SafeAreaView` is essentially a no-op on Android — it
only ever worked on iOS. Combined with `edgeToEdgeEnabled=true` (already set in
`android/gradle.properties`, regenerated by `expo prebuild` from Expo's default template),
content draws behind the status bar / cutout instead of being inset from it. **Fixed**: in
all 9 screens that used it (`BrowseByDateScreen`, `CalendarScreen`, `CaptureScreen`,
`DashboardScreen`, `InsightsScreen`, `JobDetailScreen`, `NewOrderScreen`,
`SearchByCeScreen`, `SearchByClientScreen`), split `SafeAreaView` out of the
`'react-native'` import and imported it from `'react-native-safe-area-context'` instead
(already a project dependency, already used to wrap the whole app via `SafeAreaProvider`
in `App.tsx` — just wasn't being used at the per-screen level). No `edges` prop needed:
screens with `headerShown: false` in the navigator correctly get a real top inset now;
screens with the native-stack header already sit below the header so the extra top edge
is a no-op there, which is correct.

**Important**: this fix is code-only and has **not yet been verified on a real device** —
by definition, the web preview cannot show notch/cutout behavior (no browser has a camera
cutout to render behind), so re-verifying this specific fix requires a fresh
release-build install on an actual phone. Rebuild (`assembleRelease` from `C:\dev\bpd`,
same as before — remember to re-sync the robocopy mirror first, since `metro.config.js` and
the 9 screen files all changed) and have the user reinstall + check the S21 again before
considering this closed.

## RESOLVED: local Android build now works

Root cause was **not** antivirus (ruled out by disabling Windows Defender + removing
McAfee entirely — build still failed identically). The real cause was **Windows path
length**: this project's path plus CMake/Ninja's own deeply-nested scratch directories
(e.g. `node_modules\react-native-worklets\android\.cxx\Debug\<hash>\arm64-v8a\CMakeFiles\
CMakeTmp\CMakeFiles\`) pushed some generated file paths past Windows' 260-character
`MAX_PATH` limit, which Ninja reports as `manifest 'build.ninja' still dirty after 100
tries` (it retries assuming a transient race; the real failure never clears).

**Fix**: build from a short-path mirror instead of the real (long, deeply-nested) project
location. The actual project at
`C:\Users\mikaw\Documents\Online_Courses\ZTM-Course\Custom_Projects\BPD_Image_app` is
untouched and remains the canonical place to edit source — a copy lives at **`C:\dev\bpd`**
purely for building. `BUILD SUCCESSFUL in 8m 46s` on the first attempt from there.

**APK location**: `C:\dev\bpd\android\app\build\outputs\apk\debug\app-debug.apk` (93.4 MB,
arm64-v8a debug build).

**To rebuild after future source changes**: re-sync the mirror, then build:
```
robocopy "C:\Users\mikaw\Documents\Online_Courses\ZTM-Course\Custom_Projects\BPD_Image_app" "C:\dev\bpd" /E /XD node_modules android ios .git .expo .gradle /XF *.log /NFL /NDL /NJH /NJS /NP
cd /c/dev/bpd && npm install
npx expo prebuild --platform android --no-install
cd android
export JAVA_HOME="/c/Users/mikaw/dev/jdk17"
export ANDROID_HOME="/c/Users/mikaw/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
./gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain
```
(Robocopy exit code 1 is its own "success, files copied" signal — not a real error; only
codes ≥8 indicate a robocopy failure.)

**Debug build shows a dev-client launcher screen instead of the app** — this is expected:
this project includes `expo-dev-client`, and a `debug` build variant always shows the
"development servers" launcher and expects a Metro bundler, rather than embedding JS.
**Fixed by building `release` instead**: `assembleRelease` (same env vars, same
`-PreactNativeArchitectures=arm64-v8a`) bundles the JS via Metro's `export:embed` and runs
fully standalone — `BUILD SUCCESSFUL in 7m 21s`, output at
`C:\dev\bpd\android\app\build\outputs\apk\release\app-release.apk` (47MB, smaller than the
debug build too). The release build type already reuses `signingConfigs.debug` for signing
(see `android/app/build.gradle` line ~115) — no separate keystore setup was needed, and
because it's signed with the **same** key as the debug build, installing the release APK
over the already-installed debug one should work as a normal update (no need to uninstall
first, same `applicationId` + same signing cert). **Use the release APK for anything the
user actually wants to use/demo** — the debug one is only useful if actively developing
against a running Metro server.

**A copy now also lives in the project folder** at `builds/BPD-Capture-debug.apk` and
`builds/BPD-Capture-release.apk` (added
`/builds` and `*.apk` to `.gitignore` — this binary should never be committed). Re-copy
from `C:\dev\bpd\android\app\build\outputs\apk\debug\app-debug.apk` after each rebuild if
you want that copy kept current.

**Distribution note**: the built APK (~93MB) is too large to push through the
`mcp__claude_ai_Google_Drive__create_file` tool (it only accepts inline base64 content —
would be ~125MB of text, impractical as a tool-call payload). Options for getting it onto
the phone: (a) if the phone is connected via USB with USB debugging enabled, `adb install
<path to apk>` installs it directly in one step — checked for a connected device this
session, none was plugged in; (b) the user copies the file themselves (USB transfer, or
dragging it into their own Google Drive via the website/app) — this was always going to be
necessary for a file this size regardless of which cloud service is used.

The Windows Defender exclusion and McAfee removal are no longer necessary for the build to
work (the real fix was the short path), but there's no harm in leaving Defender's real-time
protection off or back on — that decision is the user's, unrelated to this project now.

## Blocked: local Android build (historical — see RESOLVED section above for the actual fix)

### Symptom
`cd android && ./gradlew.bat assembleDebug` fails every time with:
```
ninja: error: manifest 'build.ninja' still dirty after 100 tries
```
This happens during native C++ compilation (CMake/Ninja) for whichever native module
Gradle gets to first — seen failing on `react-native-reanimated`, `expo-modules-core`,
and `react-native-worklets` across different attempts. Same signature every time, just at
different points/speeds (fastest failure so far: 3m33s; a full successful run of everything
before it fails takes ~15-20 min).

### Root cause (diagnosed, not yet fixed)
This is a well-known Windows issue: real-time antivirus scanning races with Ninja's rapid
file writes/reads during the native build, corrupting its dirty-check. It is **not** a
problem with the app code, the Gradle config, or the JS/TS side — confirmed by testing:
- Reducing to a single ABI (`-PreactNativeArchitectures=arm64-v8a`) — still fails.
- Reducing Gradle parallelism (`--max-workers=2`) — still fails.
- Clearing all `.cxx` build caches before retrying — still fails.
- Killing stale Gradle daemons before retrying — still fails.

**New finding, not yet acted on**: `Get-CimInstance -Namespace root/SecurityCenter2
-ClassName AntiVirusProduct` shows **two** registered AV products on this machine:
**Windows Defender** and **McAfee**. The user added a Windows Defender exclusion for the
project folder (`Add-MpPreference -ExclusionPath "...\BPD_Image_app"`, run by the user in
their own elevated PowerShell) — the build still failed identically afterward. This
strongly suggests **McAfee is the actual active real-time scanner** (Defender commonly
steps back when a third-party AV is installed), so the Defender-only exclusion didn't
address the real culprit. This was the next thing to investigate/act on when the session
was interrupted.

It's also possible (not confirmed either way) that Windows **Tamper Protection** silently
blocked the `Add-MpPreference` call even though it was run elevated — this can happen on
some Windows configurations. Exclusions can't be read back to verify without admin rights,
which this harness's shell doesn't have.

### Update (follow-up session)
Retried the build again (4th attempt total) with no config changes — failed identically
(`react-native-reanimated`, same `ninja: error: manifest 'build.ninja' still dirty after
100 tries`, this time at 5m1s). This confirms the issue is persistent/environmental, not
random flakiness. Asked the user again how to proceed; **they chose to add a McAfee
exclusion** via McAfee's own UI (Settings → Real-Time Scanning → Excluded Files/Folders →
add the project folder). Currently waiting on their confirmation that it's done before
retrying — do not retry blindly again without that confirmation, it will just fail the
same way a 5th time.

### Next steps, in priority order
1. **Ask the user to add a McAfee exclusion** for the project folder via McAfee's own UI
   (not PowerShell — McAfee doesn't respond to `Add-MpPreference`). Path: usually
   Settings → Real-Time Scanning → Excluded Files/Folders → add
   `C:\Users\mikaw\Documents\Online_Courses\ZTM-Course\Custom_Projects\BPD_Image_app`.
   This is the most likely actual fix.
2. Optionally verify the Defender exclusion really registered: from an **elevated**
   PowerShell, `Get-MpPreference | Select -ExpandProperty ExclusionPath` should list the
   project path. If it's missing, Tamper Protection is likely the blocker — the user would
   need to add the exclusion via the Windows Security app GUI instead (Virus & threat
   protection → Manage settings → Exclusions), which isn't blocked by Tamper Protection.
3. After either exclusion is confirmed, retry:
   ```
   export JAVA_HOME="/c/Users/mikaw/dev/jdk17"
   export ANDROID_HOME="/c/Users/mikaw/Android/Sdk"
   export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
   cd "<project root>/android"
   ./gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain
   ```
   Run this **in the background** (it takes 15-20 min on success) and watch the log for
   `BUILD SUCCESSFUL` / `BUILD FAILED` / `ninja: error`. On success the APK will be at
   `android/app/build/outputs/apk/debug/app-debug.apk`.
4. If AV exclusions don't fix it or aren't wanted, **fall back to an EAS cloud build**,
   which sidesteps this Windows-local-antivirus problem entirely (builds on Expo's Linux
   servers). `eas.json` already has a ready `preview` profile (APK, internal distribution).
   Needs the user to run `npx eas login` themselves (free Expo account) since I can't do
   that on their behalf; then `npx eas build --platform android --profile preview`.
5. Once a debug APK exists, **upload it to the user's Google Drive** so they can download
   and sideload it directly from the Drive app on their phone (this was the user's
   explicitly requested distribution method). Use
   `mcp__claude_ai_Google_Drive__create_file` with `base64Content` +
   `contentMimeType: application/vnd.android.package-archive` +
   `disableConversionToGoogleType: true`. **Untested**: whether the APK's size (debug
   builds with 1 ABI are typically 60-150MB, base64 inflates by ~33%) fits within this
   tool's payload limits — check the file size first (`ls -la` the APK) and if it's too
   large, the EAS build's own downloadable link (from step 4) is a ready fallback that
   doesn't have this constraint.
6. **Restart the Expo web dev server** (`npx expo start` or `npx expo start --web`) for any
   further web-preview testing — it was killed earlier by a Metro file-watcher crash
   caused by the concurrent native build touching `.cxx` folders in `node_modules`. That
   crash is harmless/unrelated to the app itself, just needs a restart.

### Local toolchain already installed (no admin rights available on this machine, so
everything below was installed into user-writable folders — do not redo this):
- **JDK 17** (Eclipse Temurin) → `C:\Users\mikaw\dev\jdk17`
- **Android SDK** → `C:\Users\mikaw\Android\Sdk`
  - cmdline-tools → `C:\Users\mikaw\Android\Sdk\cmdline-tools\latest`
  - Installed via sdkmanager: `platform-tools`, `platforms;android-35`,
    `platforms;android-36`, `build-tools;35.0.0`, `build-tools;36.0.0`. Licenses accepted.
- **Google's new unified `android` CLI** → `C:\Users\mikaw\AppData\AndroidCLI\android.exe`
  (installed per the user's request from `https://dl.google.com/android/cli/...` — legit
  Google-hosted binary, inspected the installer script before running it). Has `run`
  (build+deploy+launch to a connected device), `sdk`, `emulator`, `info`, etc. Note: `run`
  still invokes the same Gradle/CMake/Ninja stack underneath, so it hit the **same** ninja
  race when tried — this tool does not bypass the AV issue, it's just a nicer CLI wrapper.
  Could be useful later for one-step build+install if the user connects their phone via
  USB with debugging enabled, once the underlying build issue is fixed.
- **Env vars**: persisted as **User**-scope via `[Environment]::SetEnvironmentVariable`
  (`JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and PATH additions for
  `jdk17\bin`, `cmdline-tools\latest\bin`, `platform-tools`, `AppData\AndroidCLI`). **These
  do NOT show up automatically in this harness's Bash/PowerShell tool sessions** — each
  new tool invocation needs the exports set explicitly (see command block in step 3 above).
  A normal terminal the user opens themselves (outside this harness) should pick them up
  fine, since Windows loads User env vars fresh for new processes.
- **`android/` native project**: generated via `npx expo prebuild --platform android
  --no-install` (already gitignored via the existing `/android` rule in `.gitignore`). If
  `app.json` plugins/config change before the next build attempt, re-run
  `npx expo prebuild --platform android --clean` first.
- Killed several stray Gradle daemon `java.exe` processes at the end of this session to
  leave a clean slate (safe — they just restart on next `gradlew` invocation). If you see
  many `java.exe` processes accumulating again after repeated failed attempts, same deal:
  `taskkill //F //IM java.exe` is safe.

### Why a rebuild is needed at all
The **only** code reason a native rebuild is required now is one new native dependency:
**`expo-linear-gradient`**, added this session for the gradient visual-polish touches
(dashboard header band, primary button). Everything else added this session (Reanimated
animations, the custom calendar/date-picker, etc.) uses packages that were already part of
the previously-installed dev-client build and would work without a rebuild.

**Fallback worth knowing about**: if the build blocker can't be resolved soon and the user
wants to test on their existing installed dev-client app without waiting, `expo-linear-gradient`
could be removed and the two gradient touches reimplemented with plain layered `View`s
(flat color bands instead of a true gradient) — a small, quick change, not something to do
unprompted, but worth offering if the build keeps stalling.

---

## App feature work — all complete and verified this session

Everything below was typechecked (`npx tsc --noEmit`, clean every time) and exercised
end-to-end in a headless-Chromium web preview (the only way to test without a real Android
build in this environment) across many rounds of testing, with zero console errors.

1. **Dashboard redesign**: card-based job list, status-colored left accent bar (amber
   in-process / green completed), "View more" button per job, gradient hero header band,
   gradient primary "+ New Order" button, press-scale animations on cards/buttons.
2. **Due dates**: settable at job creation and editable anywhere via a custom
   calendar-grid picker (`DueDateChip` + `DueDateCalendarModal` — built from scratch with
   plain Views/date-fns, deliberately no native date-picker dependency). Shows
   "No due date · + Add", "Due <date>", or "Overdue · <date>" — **fixed a bug** this
   session where completed jobs incorrectly showed "Overdue" (now shows a neutral
   "Due <date>" once a job is completed, via a new `isCompleted` prop on `DueDateChip`).
3. **Photo rename/delete**: `MediaGrid` per-thumbnail "⋯" menu → Rename (keeps original
   extension) / Delete (with confirm).
4. **Calendar screen** (`CalendarScreen.tsx` + shared `MonthCalendarBoard.tsx`): Month view
   shows a grid with due-date dots (red = overdue, blue = upcoming) **and** a full list of
   every job due that month underneath the grid, grouped by week with a divider line
   between each week. Week view lists all 7 days with their due jobs.
5. **Browse Completed flow** (`BrowseByDateScreen.tsx`): Year → Month → now opens directly
   into the same `MonthCalendarBoard`, filtered to completed jobs (via `completedAt`),
   tagging each row **"On time"/"Late"** against its due date. The old Week/Day
   sub-choice screens were removed; `dateGrouping.ts` was trimmed to match (removed
   `getWeeksInMonth`/`getDaysInMonth`/`filterByWeekKey`/`filterByDayKey`, kept
   `getAvailableYears`/`getMonthsInYear`).
6. **Insights screen** (`InsightsScreen.tsx`, reachable via a 📊 icon next to 📅 on the
   dashboard): stat tiles (In Process, Overdue, Due This Week, Avg Turnaround), a Meter for
   on-time completion rate (colored by severity: green ≥80%, amber 50-79%, red below), and
   an Overdue Jobs quick-access list. Built per the `dataviz` skill's stat-tile/meter
   guidance (checked `references/choosing-a-form.md` and `references/marks-and-anatomy.md`
   before building).
7. **Notes field per job** (`JobDetailScreen`): multiline, saves on blur (debounced via a
   "draft" local-state pattern that only re-syncs from the server when the order id
   changes, so it never clobbers in-progress typing). Small 📝 indicator appears on
   dashboard cards when a job has notes.
8. **Client Name + Project Name fields**: added to schema/model/data layer
   (`createOrder` was refactored to take a single options object — `{ ceNumber, dueDate,
   clientName, projectName }` — instead of growing positional params). Settable in
   `NewOrderScreen`, editable in `JobDetailScreen` (save-on-blur, same draft pattern as
   notes), shown on every `OrderListItem` card (so it appears for free on the dashboard,
   search results, and browse-completed lists, since they all reuse that component).
9. **Search by Client screen** (`SearchByClientScreen.tsx`) + dashboard button. Dashboard
   actions were reorganized into: New Order (full width) → Search-by-CE / Search-by-Client
   (paired row) → Browse Completed (full width), to fit the new 4th action cleanly.
10. **Fixed a reported friction point**: tapping "Completed" on a job with zero media used
    to show a blocking "are you sure?" confirmation dialog. Removed — it now applies
    instantly, as the user asked.
11. **Startup animation** (`StartupAnimation.tsx`, wired into `App.tsx` before
    `RootNavigator` mounts, gated behind both the real bootstrap finishing and the
    animation's own `onFinish`): a ~3-second "QC manufacturing flow" — a small square part
    travels a conveyor line through Capture (📷) → Inspect (🔍) → QC Pass (✅) checkpoints,
    each glowing as the part arrives, ending with a checkmark-stamp bounce, then a clean
    (non-overlapping — this took two timing-tuning passes to get right, verified via
    frame-by-frame screenshots at ~1s intervals) crossfade into the app wordmark. Built
    entirely with Reanimated (already installed) and plain Views — no image assets, no new
    dependency for the animation logic itself.
12. **Visual polish**: `expo-linear-gradient` added (see "Why a rebuild is needed" above —
    this is the one new dependency from this session). Gradient header band + gradient
    primary button on the dashboard; a gentle looping pulse animation on overdue due-date
    chips (`DueDateChip`, via Reanimated `withRepeat`); a small reusable `usePressScale()`
    hook (`src/utils/usePressScale.ts`) applied consistently to cards and primary buttons.
13. **Seed data expanded to 20 varied demo orders** (`src/db/webMock.ts` — **web-preview
    only**, this never touches the real on-device SQLite database) with varied clients,
    projects, statuses, due dates (overdue/upcoming/none), and notes, for a fuller
    showcase/test dataset. Also **fixed a real timezone bug** found while doing this: the
    mock's `daysFromNowDate` helper used `.toISOString().slice(0,10)` (UTC-based, could be
    off by a day depending on timezone/time of day) — changed to `date-fns`'s `format()`
    (local-time-safe, matches how the rest of the app derives date strings). A related bug
    was also fixed in 3 places (`BrowseByDateScreen`, `MonthCalendarBoard`, `InsightsScreen`)
    that were doing the same unsafe `completedAt.slice(0,10)` pattern instead of
    `format(new Date(completedAt), 'yyyy-MM-dd')` — could have caused off-by-one
    "late/on-time" misclassifications or wrong calendar-dot placement for some users'
    timezones.
14. **Confirmed tablet + phone + touch + rotation support**: screenshots taken at
    phone-portrait (390×844) and tablet-landscape (1180×820) viewport sizes — the existing
    `maxWidth: 720` centered-layout pattern (already used throughout) holds up correctly at
    both sizes with no stretching or broken layout. `ScreenOrientation.unlockAsync()`
    (`App.tsx`) + `"orientation": "default"` (`app.json`) already unlock rotation on
    Android; every interaction uses native `Pressable`/`TextInput` (touch-native, no
    mouse-only assumptions). Nothing needed to change here — this was verification, not a
    fix.
15. **DB schema migrations** in place for all new `Order` columns (`dueDate`, `notes`,
    `clientName`, `projectName`) — safe `ALTER TABLE ... ADD COLUMN` migrations in
    `src/db/schema.ts` (`MIGRATIONS_SQL` array), applied on every app launch via
    `src/db/client.ts`'s `initDatabase()`, wrapped in try/catch so they're a no-op on a
    database that's already been migrated (SQLite has no `ADD COLUMN IF NOT EXISTS`).

### Key files if you need to orient quickly
- `src/theme/theme.ts` — colors/spacing/radius/typography tokens, everything reads from here.
- `src/components/MonthCalendarBoard.tsx` — shared month-grid-plus-grouped-list widget used
  by both the Calendar screen (due dates) and Browse Completed (completed dates).
- `src/components/DueDateChip.tsx`, `DueDateCalendarModal.tsx` — the from-scratch date
  picker/chip, no native dependency.
- `src/db/orders.ts` / `src/db/webMock.ts` — real SQLite data layer / web-preview mock
  (mock is dev-only, never used on Android — see the comment at the top of `webMock.ts`).
- `src/navigation/types.ts` + `RootNavigator.tsx` — all screens/routes.
- `eas.json` — has `development`, `preview` (APK), and `production` (AAB) build profiles
  already configured, ready for either local or EAS-cloud builds.
- `app.json` — `android.package = com.blueprintdigital.bpdcapture`. No `extra.eas.projectId`
  configured yet — `eas build` will prompt to create one on first run if that path is used.

## Follow-up: "‹ Dashboard" back-link enlarged (2026-09-07/08)

Small, low-risk cosmetic request: the "‹ Dashboard" custom back-link text (used on
`CalendarScreen.tsx`, `InsightsScreen.tsx`, `BrowseByDateScreen.tsx` — these three have
`headerShown: false` and roll their own back-navigation link, unlike the native-header
screens) was too small. Bumped `backLink` style `fontSize` from 15 → 18 and added
`paddingVertical: spacing.xs` on all three (same values, kept consistent across all
three files intentionally — they were already identical before this change). Rebuilt into
`bpd2.apk`, confirmed via `SESSION_HANDOFF.md`-documented rebuild flow. Web-preview
verification was skipped for this one (change was too trivial/low-risk and the dev server
was being uncooperative that round) — purely cosmetic, low regression risk, but flagging
that it wasn't screenshot-verified in case it's ever relevant.

## Follow-up: smaller media grid + explicit header "Save" buttons (2026-09-08/09)

Two more real-device-informed requests, both fixed and verified via web preview before
rebuilding into `bpd2.apk`:

1. **Media thumbnails were too big** — `MediaGrid.tsx`'s `MIN_THUMB_SIZE` constant reduced
   from `110` to `82`. This is the minimum width used to compute `numColumns =
   Math.max(2, Math.floor(width / (MIN_THUMB_SIZE + THUMB_GAP)))`, so a smaller minimum
   means more columns fit and each thumbnail renders smaller. Went from 3 → 4 columns at a
   typical ~390px phone width. No other changes needed — the grid is already fully
   responsive to this constant.
2. **Explicit "Save" button requested at the top of the page** when creating a CE
   (`NewOrderScreen.tsx`) or editing one (`JobDetailScreen.tsx`), rather than relying only
   on the existing bottom "Open Order" button / auto-save-on-blur behavior. Both now set
   `headerRight` via `navigation.setOptions(...)` inside a `useLayoutEffect`:
   - `NewOrderScreen`: header "Save" calls the existing `handleCreate` (same function the
     bottom "Open Order" button already called) — kept the bottom button too, this just
     adds a second, faster-to-reach way to submit.
   - `JobDetailScreen`: header "Save" calls a new `handleSaveAll()` that dismisses the
     keyboard (`Keyboard.dismiss()`) and explicitly flushes both `handleClientInfoBlur()`
     and `handleNotesBlur()` (the same functions already wired to each field's `onBlur` —
     calling them directly bypasses needing to blur first), then shows "Saved ✓" in the
     header for 1.2s (`justSaved` state + `setTimeout`) before reverting to "Save", since
     auto-save-on-blur alone gives no visible confirmation and the user wanted one.
   - **Ordering gotcha hit twice this session**: `useLayoutEffect(() => {... references
     handleX ...})` technically works even if `handleX` is defined *after* the effect in
     source order (JS closures don't execute until the effect actually runs, well after
     the whole component body — including the later `const handleX = ...` — has executed),
     but it's confusing to read and risks lint/TDZ mistakes on a future edit. Kept the
     convention of defining every handler the effect references *before* the
     `useLayoutEffect` call in both files — do the same for any future header-button
     addition.
   - Style for both: `headerSaveText` — `color: colors.accent, fontWeight: '700', fontSize:
     16` — same values in both files, kept identical intentionally.

## Follow-up: 1-click PDF Field Report export (2026-09-09)

Requested via a "director AI" review of `APP_OVERVIEW.md` (a separate, product-level
summary doc at the project root, written for external/strategic review — distinct in
purpose from this file). Implemented exactly as specified:

- **New dependencies**: `expo-print` + `expo-sharing` (`npx expo install expo-print
  expo-sharing`). `expo-sharing` auto-registered itself as a config plugin in `app.json`;
  `expo-print` needs no plugin entry. **Both are new native modules** — this required a
  full `expo prebuild --platform android --clean`-equivalent regen (prebuild auto-clears
  `android/` when plugins change) and a full ~21 min Gradle rebuild (755/787 tasks
  executed, not the usual ~1min/24-task incremental build) — expect this same cost any
  time a new native dependency is added, not just the first time.
- **New file**: `src/services/reportPdf.ts` — `exportAndShareJobReport(order, media)`.
  Builds a branded HTML string (gradient header matching `gradientAccent` from
  `theme.ts`, metadata grid, status badge, notes box, photo grid, video filename list),
  inlines each photo as a base64 `data:` URI (read via `expo-file-system`'s `File.base64()`
  — **required**, not optional: `expo-print`'s WebView renderer cannot reliably load local
  `file://` image sources, this is documented behavior, not a workaround), renders it to a
  PDF via `Print.printToFileAsync({ html })`, then opens the native share sheet via
  `Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle })`. Runs **entirely
  on-device** — no server, consistent with the app's offline-first SQLite architecture.
  Throws a friendly error on `Platform.OS === 'web'` (photo file access + PDF generation
  are both native-only) — `JobDetailScreen.tsx`'s handler catches this and shows an
  `Alert` instead of letting it surface as a crash.
- **`JobDetailScreen.tsx`**: new "📄 Export Field Report" button (full-width,
  `gradientAccent` cyan-to-purple gradient — same gradient as the Dashboard's "+ New
  Order" button, for visual consistency with the existing design system) placed right
  after the Capture/Upload action row. Uses the same `usePressScale()` +
  `LinearGradient` + `Animated.View` pattern already established for gradient buttons
  elsewhere. **Deliberately did not give this button's wrapper style any `flex`
  property** — this project hit a real bug earlier where a `flex: 1` inherited from a
  shared base style collapsed a full-width button's content on native Android (Yoga-only
  bug, invisible on web preview) — the new `exportRow`/`exportButton` styles are
  independent, flex-free, to avoid the same class of bug by construction.
- **Verification**: typechecked clean. Confirmed via web preview that the button renders
  correctly (gradient, icon, label) and tapping it on web shows the graceful fallback
  alert rather than crashing — console-error-free. **Additionally** rendered the PDF's
  HTML/CSS template standalone (dummy data, saved as a local `.html` file, screenshotted
  directly in a browser) to sanity-check the actual print layout before spending the
  ~21min rebuild cycle on it — this is a reusable technique worth repeating for any future
  HTML-based feature (print/export templates aren't exercised by the normal RN Web preview
  since the HTML is just a string, never mounted as a real page). The actual PDF-generation
  and share-sheet code paths are native-only and have **not** been exercised on a real
  device yet as of this note — ask the user to confirm a real end-to-end export (tap
  button on an actual completed job with photos → PDF opens/shares correctly) once they've
  installed this build.
- Chose a **white-background, light PDF layout** (not a literal dark-mode replica of the
  in-app UI) with the brand's cyan-to-purple gradient used for the header band and status
  accents only — this was a deliberate judgment call: a dark PDF is impractical to print
  and unusual for a sign-off document, whereas "match the existing design system" is
  better served by carrying the actual brand colors/gradient into a print-appropriate
  layout than by forcing a literal dark theme onto paper. Flag this reasoning if the
  director AI or user pushes back and wants a literal dark PDF instead.

## Follow-up: Phase 2 — Daily Digest + Pre-Routed Sharing (2026-09-09)

Triggered by the user externally editing `TASK_PDF_FIELD_REPORT.md` to add an approved
"Phase 2" section, then asking to check that file for updates and implement them. Full
grounded details now live in `TASK_PDF_FIELD_REPORT.md`'s own Phase 2 section — this is
the condensed version for quick orientation:

- **New dependency**: `expo-mail-composer` (`npx expo install expo-mail-composer`,
  auto-registered its config plugin in `app.json`, same pattern as `expo-print`/
  `expo-sharing` before it). **Native module — next build needs a full prebuild regen**,
  same ~20min cost as the original PDF feature's rebuild, not the usual ~1min incremental
  path.
- **New `settings` SQLite table** (`src/db/schema.ts`, new `CREATE TABLE IF NOT EXISTS` —
  no migration entry needed since it's a new table, not a new column on an existing one)
  + **new `src/db/settings.ts`** (`getSetting`/`setSetting`/`getDispatcherContact`/
  `setDispatcherContact`, with the same in-memory web-preview fallback pattern as
  `webMock.ts` — never touches real SQLite on web).
- **New `src/screens/SettingsScreen.tsx`**: Dispatcher Email + Dispatcher WhatsApp Number
  fields, header "Save" button (same `useLayoutEffect` + `navigation.setOptions` pattern
  as `NewOrderScreen`/`JobDetailScreen`). Registered as a new `Settings` route
  (`src/navigation/types.ts` + `RootNavigator.tsx`), reachable via a new ⚙️ icon on
  `DashboardScreen.tsx`'s header (alongside the existing 📊/📅 icons).
- **`src/services/reportPdf.ts` significantly refactored**: extracted the single-job HTML
  builder into a reusable `buildJobSectionHtml()` (now shared by both the single-job
  report and the new digest, each job section takes an optional CSS page-break), added
  `buildDigestHtml(orders, mediaByOrder)` for the multi-job document, added
  `exportAndShareDailyDigest()` (fetches today's completed jobs via the previously-unused
  `listCompletedOrdersInRange()` in `src/db/orders.ts`, throws a friendly "no jobs
  completed today yet" error if empty), and added a shared `deliverPdf()` helper that both
  export functions now call: if a Dispatcher Email is saved and
  `MailComposer.isAvailableAsync()`, it opens the mail compose UI directly with the
  recipient and PDF attachment pre-filled (genuine share-sheet bypass); otherwise falls
  back to the original `Sharing.shareAsync(...)` chooser, unchanged from Phase 1.
- **WhatsApp is intentionally text-only, not a PDF-attach bypass** — confirmed (not
  assumed) that the public `whatsapp://send?phone=&text=` scheme cannot carry a file
  attachment, and there is no public API for it without the gated WhatsApp Business API.
  Added `notifyDispatcherOnWhatsApp(message)` (`Linking.openURL` with a pre-filled text
  note) plus a small "💬 Notify Dispatcher on WhatsApp" text link next to both the Export
  Field Report button (`JobDetailScreen.tsx`) and the new Send Daily Digest button
  (`DashboardScreen.tsx`) — a companion heads-up, not a report-delivery mechanism. Flag
  this distinction explicitly if the user or director AI expects a literal WhatsApp
  attachment later — the real fix for that would be a small native module wrapping
  WhatsApp's own `ACTION_SEND` file-share intent, not something achievable through Expo's
  public APIs today.
- **New Dashboard button**: "📨 Send Daily Digest" (`DashboardScreen.tsx`, full-width,
  same plain-surface secondary-button style as "Browse Completed" — deliberately **not**
  the `gradientAccent` treatment, to keep the gradient reserved for the single primary
  action per screen as established elsewhere in the app), placed directly below "Browse
  Completed". Shows "Preparing digest…" while generating, a friendly `Alert` on failure
  (including the "no jobs completed today" case), a success `Alert` with the job count on
  completion.
- **Verification**: typechecked clean (`npx tsc --noEmit`) after each round of changes.
  Full web-preview pass via Playwright: Dashboard screenshot confirms the new ⚙️ icon and
  both new buttons/links render correctly; Settings screen screenshot confirms proper dark-
  theme text contrast on both inputs (this project has been bitten by black-on-dark text
  bugs before — checked explicitly this time); filled both fields, saved, confirmed the
  values persisted in the (web-mock) `settings` store via a second screenshot; tapped
  "Send Daily Digest" on web and confirmed zero console errors (native-only code path
  throws its `Platform.OS === 'web'` guard, caught and shown as a friendly alert, same
  established pattern as the original single-job export — RN Web's `Alert.alert` doesn't
  render a visible dialog in this environment, confirmed via a `page.on('dialog')` listener
  that recorded none, which is expected/known, not a bug); reopened a job afterward and
  confirmed the existing Export Field Report button still renders correctly post-refactor.
  **Everything native (mail compose, WhatsApp deep link, real digest PDF generation/
  pagination) is unverified until the next real-device install** — say so explicitly if
  asked whether this is "done."
- **Rebuilt**: robocopy-synced the mirror, `npm install` (confirmed `expo-mail-composer`
  added), `npx expo prebuild --platform android --no-install` (regenerated `android/`
  since a native module was added), `./gradlew.bat assembleRelease
  -PreactNativeArchitectures=arm64-v8a --max-workers=2` — `BUILD SUCCESSFUL in 24m 21s`
  (787 tasks, 755 executed). Copied to `builds/bpd2.apk` (47.4MB).

## Follow-up: WhatsApp companion notification removed (2026-09-09)

Immediately after the Phase 2 round above shipped, the user asked to **remove the
WhatsApp feature but keep the PDF export feature**. The WhatsApp piece was always the
text-only companion notification described above (never a real attachment bypass — that
was a confirmed platform limitation, not a corner that got cut) — removed cleanly rather
than reworked:

- `src/db/settings.ts` — `DispatcherContact` is now just `{ email: string | null }`;
  dropped `whatsappNumber`, `DISPATCHER_WHATSAPP_KEY`, and the WhatsApp half of
  `getDispatcherContact`/`setDispatcherContact`.
- `src/services/reportPdf.ts` — deleted `notifyDispatcherOnWhatsApp()` entirely and the
  now-unused `Linking` import. `deliverPdf()` (the email pre-routing helper) is untouched
  — email-based 1-click sharing is unaffected by this change.
- `src/screens/SettingsScreen.tsx` — removed the "Dispatcher WhatsApp Number" field and
  its state; only Dispatcher Email remains.
- `src/screens/JobDetailScreen.tsx` and `src/screens/DashboardScreen.tsx` — removed the
  "💬 Notify Dispatcher on WhatsApp" links, their handlers, and their styles.
- **No native dependency changed** (`expo-mail-composer` stays — email routing is still
  live), so this rebuild used the **fast incremental Gradle path**, not a full
  `expo prebuild` regen — robocopy-sync the mirror, then `assembleRelease` directly,
  skipping the prebuild step entirely. Confirmed fast: `BUILD SUCCESSFUL in 6m 53s`
  (33 tasks executed, 754 up-to-date, vs. 755/787 executed for the full Phase 2 rebuild).
  Copied to `builds/bpd2.apk` (47.4MB). Real-device confirmation of the email pre-routing
  is still the one remaining step for both this round and the Phase 2 round before it.
- **Verification**: typechecked clean; web-preview screenshot pass confirmed both
  Dashboard and Settings screens render with zero WhatsApp UI remaining and zero console
  errors, and that the Daily Digest button and Settings' email field still work exactly
  as before.
- Updated `TASK_PDF_FIELD_REPORT.md`'s Phase 2 section and `APP_OVERVIEW.md` to remove
  WhatsApp mentions and note the email-only delivery model.

## Follow-up: Phase 3 — Backup & Restore, Maestro scaffolding, EAS Updates blocked (2026-09-10)

A "Phase 3 Implementation Plan" (Backup & Restore, automated Maestro E2E testing, EAS OTA
Updates isolated to a `feature/eas-updates` branch) was pasted into this session after the
user's initial "read the implementation plan and run it" turned out to have no actual
plan file behind it — this plan came from outside the conversation. The plan's own text
flagged two decisions as "User Review Required"; asked the user directly via
`AskUserQuestion`, and they delegated all three to "your choice," so the recommended
option was taken on each:

1. **Backup & Restore — delivered.**
   - **New dependencies**: `react-native-zip-archive` (native module, needs the Expo
     config plugin — auto-registered in `app.json`) and `expo-document-picker` (no plugin
     needed). Verified compatibility **before** installing (not assumed): confirmed via
     web search that `react-native-zip-archive` v8+ requires New Architecture, which SDK
     57 has mandatory, and read its real API off GitHub (`zip(source, target)`,
     `unzip(source, target)`) since npmjs.com blocked the fetch (403).
   - **New `src/services/backup.ts`**: `exportBackup()` stages the SQLite DB file
     (`documentDirectory/SQLite/bpd_capture.db` — confirmed from expo-sqlite's own Kotlin
     source, `SQLiteModule.kt`, not assumed) and the `BPD_Capture/orders/` media directory
     into a temp folder under `Paths.cache`, zips it with `react-native-zip-archive`, then
     shares it via `Sharing.shareAsync`. `importBackup()` uses
     `DocumentPicker.getDocumentAsync` to pick a `.zip`, unzips it to a staging folder,
     validates a `bpd_capture.db` is actually inside, **replaces** (not merges) the live DB
     file and orders folder with the backup's contents. Both throw a friendly
     `Platform.OS === 'web'` guard error, same established pattern as every other
     native-only feature in this app.
   - **`src/db/client.ts`**: added `closeDb()` (closes the cached `SQLiteDatabase` handle
     and clears the promise cache) — called before restore overwrites the `.db` file out
     from under an open connection. Confirmed `closeAsync()` exists by reading
     `expo-sqlite`'s own `.d.ts`, not assumed.
   - **`src/screens/SettingsScreen.tsx`**: new "Data Backup" section below Dispatcher
     Contact — "📦 Create Full Backup" and "♻️ Restore from Backup" buttons (the latter
     behind a destructive-style confirm `Alert`, and tells the user afterward to fully
     close and reopen the app, since there's no `expo-updates`/reload mechanism installed
     on this branch to refresh the JS+SQLite state in-process).
   - **Verification**: typechecked clean; web-preview screenshot confirmed the new section
     renders correctly (dark-theme contrast checked explicitly, this project's been bitten
     by that before) and both buttons show the graceful web-fallback path with zero
     console errors.

2. **Maestro E2E scaffolding — written, deliberately NOT run.**
   - `.maestro/flows/create_job.yaml` and `.maestro/flows/capture_photo.yaml` — real,
     specific selectors pulled from the actual screens (exact placeholder text like
     `"e.g. CE-2024-0091"`, exact button labels like `"📷 Capture"`), not generic
     boilerplate.
   - **Deliberately not executed** — Maestro's own flow-running requires a connected
     Android device or emulator, and this project has an explicit standing rule (see the
     emulator section elsewhere in this file) to not use an emulator on this machine after
     it repeatedly hung/crashed earlier in the project. Flagged this conflict to the user
     before proceeding; they delegated the choice, and "write the flows but don't run them"
     was the option taken. **Running these for real requires the user's own device/emulator
     setup** — `maestro test .maestro/flows/create_job.yaml` (needs the Maestro CLI
     installed separately, this session did not install it).

3. **EAS OTA Updates — blocked, not attempted further.**
   - The plan calls for isolating this work on a new `git branch feature/eas-updates`.
     **Discovered blocker**: this repository has **zero commits, ever** (`git log` on
     `master` returns "does not have any commits yet") — there is nothing to branch from.
     Making the project's first-ever commit is a bigger, more consequential decision than
     the branch-strategy question the user already delegated ("your choice" covered *which*
     branch strategy, not *whether to create the repo's first commit as a side effect*) —
     standing instruction is to never commit unless explicitly asked, so this was not done
     unilaterally. **Needs a direct answer from the user**: should everything currently
     sitting uncommitted be committed to `master` first (recommended — this is the natural
     point to start real git history, given how much unversioned work exists), and if so,
     is a single squashed "initial commit" acceptable, or does the user want it broken up?
   - **Second, independent blocker**: `npx eas-cli whoami` returns "Not logged in" — EAS
     init/`update:configure` requires an authenticated Expo account, and `npx eas login` is
     an interactive browser-based flow this session cannot run on the user's behalf (same
     constraint noted in the "Distribution note" section elsewhere in this file, from when
     EAS was considered as a build-blocker fallback and never actually pursued). **Asked
     the user directly — they confirmed they don't have an Expo account yet.** Signing up
     is free at expo.dev, but it's their action to take, not something to route around.
   - **Resolution**: asked the user whether to make the repo's first commit (see "Git
     state" below — yes, approved) and separately confirmed they have no Expo account yet.
     Given no account exists, there is genuinely nothing further to do on the EAS side
     right now — created an empty `feature/eas-updates` branch off the new initial commit
     as the isolation point the plan called for, but **deliberately installed nothing and
     configured nothing on it**: `expo-updates` is a native module, and adding it now would
     cost another ~20min rebuild for something that can't be configured (no project to
     link) or verified (nothing to test against) until the user has logged in. Adding it
     prematurely would also leave `master` and this branch diverged for no real benefit yet.
   - **Next steps, once the user has an Expo account**: `git checkout feature/eas-updates`,
     `npx expo install expo-updates`, `npx eas login`, `npx eas init`, `npx eas
     update:configure` — these inject a real Expo Project ID into `app.json`/`eas.json` and
     only make sense to run once, with the user actually logged in. Then the usual
     robocopy-sync + prebuild + rebuild cycle (new native module) applies before this can
     be tested on-device.
- **Rebuild**: robocopy-synced the mirror, `npm install` (confirmed both new packages
  added), `npx expo prebuild --platform android --no-install` (regenerated `android/`
  since two native modules were added), `./gradlew.bat assembleRelease
  -PreactNativeArchitectures=arm64-v8a --max-workers=2` — `BUILD SUCCESSFUL in 20m 8s`
  (828 tasks, 796 executed). Copied to `builds/bpd2.apk` (47.6MB, on `master`).

## Follow-up: real-device bug fixes — MediaGrid tile sizing + PDF filenames (2026-09-11)

User sent two real-device screenshots from the S21 after installing the Phase 3 build.

1. **MediaGrid photo tiles rendering giant instead of small** — screenshot showed a job
   with exactly 1 photo rendering as one huge square filling almost the whole screen
   width. Root cause, found by reading `src/components/MediaGrid.tsx`: the `thumbWrapper`
   style used `flex: 1` (so items in a full row split the row width evenly) plus
   `aspectRatio: 1` (square). Standard flexbox behavior (**identical in both RN Web and
   native Yoga** — this is not the earlier documented native-only Yoga bug) means a
   `flex: 1` child in a row that isn't fully populated grows to fill *all* remaining space
   in that row — with only 1 photo (or any count that doesn't evenly fill `numColumns`),
   that one item stretched to the full row width, and `aspectRatio: 1` then made it just
   as tall. This was never caught before because every prior verification round happened
   to use photo counts that filled full rows exactly. **Fixed**: compute an explicit
   `thumbSize` (`(width - padding*2 - gap*(numColumns-1)) / numColumns`) and set each
   tile's `width`/`height` directly instead of relying on `flex: 1` — a partial row now
   just leaves empty space instead of stretching. Verified via web preview at CE-2024-0075
   (3 photos, one seeded job with real media in `webMock.ts`) — tiles now render at their
   correct fixed small size regardless of row fill. **This is a general, not native-only,
   fix** — safe to trust the web-preview verification fully here.
2. **Exported PDFs shared with an unreadable filename** — screenshot showed the Android
   share sheet after "Send Daily Digest" listing the attachment as a random UUID (e.g.
   `4386be38-445b-4df7-...pdf`). Root cause: `expo-print`'s `Print.printToFileAsync`
   always writes to an auto-generated UUID-named file in the cache directory — confirmed
   from its own `Print.types.d.ts` that `FilePrintOptions` has no filename field at all,
   not assumed. **Fixed**: added `withFriendlyFileName()` in `src/services/reportPdf.ts`,
   which renames (`File.moveSync`) the freshly-printed file to a real name —
   `Field-Report-<CE number>.pdf` for the single-job export,
   `Daily-Digest-<yyyy-MM-dd>.pdf` for the digest — before it's handed to either
   `Sharing.shareAsync` or `MailComposer.composeAsync`'s `attachments`. Both the share
   sheet and any mail attachment take their displayed name from the file's actual name on
   disk, so this fixes the display in both delivery paths, not just the share sheet shown
   in the screenshot. **Native-only** (expo-print + expo-file-system's synchronous file
   move) — typechecked clean but not exercised on-device yet.
- **Rebuild**: both fixes are JS-only (no native dependency changes), so this was the fast
  incremental path — robocopy-sync, straight to `./gradlew.bat assembleRelease` (no
  `expo prebuild` needed) — `BUILD SUCCESSFUL in 4m 9s` (828 tasks, 33 executed, 795
  up-to-date). Copied to `builds/bpd2.apk` (47.6MB).
- **Not yet committed** — these fixes are sitting as uncommitted changes on `master` on
  top of the Phase 3 initial commit; ask before committing again, same standing rule as
  always.

## Follow-up: gallery-upload permission prompt (2026-09-11)

Same feedback round as the two fixes above — a third screenshot showed Android's system
"Allow BPD Capture to modify this photo?" dialog appearing after tapping "Upload from
Gallery" on `CE-2024-0088`. Root cause, found in `src/services/storage.ts`:
`saveCapturedMedia()` is the single function used by **both** the in-app camera
(`CaptureScreen.tsx`) and gallery uploads (`JobDetailScreen.tsx`'s
`handleUploadFromGallery`), and it unconditionally calls a `saveToGallery()` step that
copies the media into a device-gallery "BPD Capture" album via `expo-media-library`. That
step makes sense for a camera capture (so the photo also lands in the user's normal
gallery, surviving an app uninstall) but is redundant when the source is **already** a
gallery photo the user just picked — re-inserting an existing MediaStore-tracked asset
into a new album is exactly what triggers Android's per-operation "modify" consent dialog,
once per uploaded file.

**Fixed**: `saveCapturedMedia()` gained an options param, `{ backupToGallery?: boolean }`
(default `true`, preserving existing camera-capture behavior with zero call-site changes
needed there). `JobDetailScreen.tsx`'s upload-from-gallery call site now passes
`{ backupToGallery: false }`. `CaptureScreen.tsx` is untouched — camera captures still get
their gallery backup exactly as before.

- **Verification**: typechecked clean. This is native-only (`expo-media-library`) and the
  actual permission-prompt behavior can't be reproduced in web preview — not exercised
  on-device yet.
- **Rebuild**: JS-only change, fast incremental path — `BUILD SUCCESSFUL in 31s` (828
  tasks, 24 executed, 804 up-to-date). Copied to `builds/bpd2.apk` (47.6MB). Not yet
  committed, same as the two fixes above.

## Follow-up: Gemini's bottom-tab UX restructure — reviewed, 2 bugs fixed (2026-09-22)

The user pasted a "UX Restructure Implementation Plan" from Gemini (bottom tabs replacing
the old unlabeled 📊/📅/⚙️ header icons, a unified search bar replacing separate Search-by-
CE/Search-by-Client buttons, a segmented In Process/Completed toggle replacing the old
"Browse Completed" navigation, a FAB replacing the header "+ New Order" button). User's
explicit role assignment for this one: **wait for Gemini to implement it, then this session
reviews/verifies/rebuilds** — a different division of labor than the PDF/Backup features
earlier in this doc, which this session built directly.

- **Watched the working tree** (a 10-minute `git status`/`git diff --stat` poll loop) while
  Gemini implemented: `RootNavigator.tsx`/`types.ts` restructured into
  `MainTabParamList` (DashboardTab/CalendarTab/InsightsTab/SettingsTab) nested inside the
  existing `RootStackParamList` stack (NewOrder/JobDetail/Capture/BrowseByDate/SearchByCe/
  SearchByClient stay top-level stack routes) — correctly typed throughout via
  `CompositeScreenProps<BottomTabScreenProps<MainTabParamList, '...'>,
  NativeStackScreenProps<RootStackParamList>>` on every migrated screen.
- **Full review pass** once Gemini finished: typechecked clean, zero console errors,
  Playwright walkthrough at both phone (390×844) and tablet-landscape (1180×820) covering
  every tab, the search bar, the segmented toggle, the Insights→Calendar-week deep link, and
  the FAB→New Order flow.
- **Found 2 real bugs, both now fixed** (rolled into the same round as the Clients feature
  below, single rebuild covers both):
  1. **FAB overlapped list content** — `DashboardScreen.tsx`'s `listContent` had only
     `paddingBottom: spacing.xl` (20px), nowhere near enough to clear the 64px FAB sitting
     `spacing.lg` (16px) above the screen's bottom edge — the last visible card's content
     was genuinely covered, not just the normal "FAB floats over content while scrolling"
     behavior every app has. Fixed: `paddingBottom: 64 + spacing.lg * 2` (96px), enough to
     fully clear the FAB once scrolled to the true end of the list.
  2. **Dead "‹ Dashboard" back-links on `CalendarScreen.tsx` and `InsightsScreen.tsx`** —
     leftover from when these were stack-pushed screens; now that they're persistent bottom
     tabs (reached by tapping the tab bar, not by pushing), `navigation.goBack()` had no
     back-history to go to, and the link implied a parent/child relationship with Home that
     no longer exists. `SettingsScreen.tsx` (also migrated to a tab) correctly never had
     this link — confirmed it was an oversight, not a design choice. Fixed: removed the
     back-link `Pressable`/`Text` from both screens' headers, keeping just the screen title.
- Everything else (search, segmented toggle, cross-tab deep link, tablet layout) was
  correct as Gemini built it — no other changes made to the restructure itself.

## Follow-up: Clients List & Dashboard Visuals — implemented directly (2026-09-22)

A second Gemini-authored plan ("Clients List & Dashboard Visuals") was pasted in the same
session. Reviewed it first (see the review notes in-conversation — not duplicated here in
full, but the gist: `clients` table has no FK to `orders.clientName` so it's a pure
autocomplete-suggestion list, not a real relational link; "update queries" undersold needing
all 8 Order-returning functions in `db/orders.ts`, not just 2; a 5th bottom tab felt crowded
next to the already-4-tab bar from the round above; "update the heading" was ambiguous about
whether it replaced app branding). User said to implement it — **this session built it
directly** (not Gemini), resolving each open point as noted:

- **`src/db/schema.ts`**: new `clients` table (`id`, `name UNIQUE`, `createdAt`) — no
  migration entry needed, same reasoning as the pre-existing `settings` table (new table,
  not a new column).
- **`src/types/models.ts`**: new `Client` type; `Order` gained an optional `coverImage`
  field with a comment noting it's computed by a subquery, not a stored column.
- **`src/db/clients.ts`** (new): `listClients()`/`addClient()` (`INSERT OR IGNORE`, so
  re-adding an existing name is a harmless no-op)/`deleteClient()`. Deliberately **does not**
  touch `orders.clientName` on delete — removing a client only affects future autocomplete
  suggestions, never rewrites existing job data. Both real-SQLite and `webMock.ts` (new
  `webClients` store, seeded with the 7 distinct client names already used in the mock
  orders) paths implemented.
- **`src/db/orders.ts`**: added a shared `ORDER_COLUMNS` SQL fragment (`orders.*` plus a
  correlated subquery for the order's first photo, ordered by `createdAt ASC`) and applied
  it to **all 8** functions that return `Order`/`Order[]` — `listInProcessOrders`,
  `listCompletedOrdersInRange`, `listAllCompletedOrders`, `listOrdersWithDueDate`,
  `getOrderById`, `getOrderByCe`, `searchByCe`, `searchByClient` — specifically to avoid the
  "thumbnail on Dashboard but blank fallback on Search results for the same job"
  inconsistency the original plan's narrower 2-function scope would have caused.
  `webMock.ts` mirrors this via a `withCoverImage`/`withCoverImages` helper applied at every
  `webOrders` return point, so web preview shows the same thumbnails/fallbacks.
- **`src/components/OrderListItem.tsx`**: 48×48 rounded thumbnail on the left of each card;
  falls back to a colorful initials circle (deterministic color from a simple string hash
  over `AVATAR_COLORS`, so the same client always gets the same color) when there's no
  `coverImage`. Verified: real photos, other-clients'-initials, and no-client-name (falls
  back to CE number's initials) all render correctly.
- **`src/screens/ClientsScreen.tsx`** (new): add-a-client input + list with per-row Remove
  (destructive-confirm not used here since removal is non-destructive to job data — a plain
  tap is enough, unlike deleting a whole job). Registered as a **top-level stack route**
  (`Clients` in `RootStackParamList`), **not a 5th bottom tab** — reachable via a new
  "👥 Manage Clients" row added to `SettingsScreen.tsx`. This was a judgment call flagged
  explicitly to the user during review (low-frequency "manage a list occasionally" action
  competing for a scarce tab slot); no objection was raised, so it shipped this way — easy
  to move to its own tab later if that turns out wrong.
- **`src/screens/NewOrderScreen.tsx`**: Client Name field gained a live autocomplete —
  suggestions render **inline below the field** (not absolutely positioned), deliberately,
  to avoid the ScrollView-clipping/z-index issues an absolute-positioned dropdown risks
  inside a `keyboardShouldPersistTaps="handled"` ScrollView. Typing filters `listClients()`
  results client-side (substring match, excludes an exact match, capped at 5). Selecting a
  suggestion fills the field and closes the dropdown; the other two fields close it via
  `onFocus`. On successful order creation, a non-empty client name is fire-and-forget
  `addClient()`-saved (auto-save default from the plan's own "Open Questions" section,
  which the user didn't override) — doesn't block navigation into the new job.
- **`src/screens/DashboardScreen.tsx`**: added an "Active Jobs"/"Completed Jobs" label above
  the list (resolving the plan's ambiguity by **adding** a section heading rather than
  replacing the "BPD Capture" branding title, which stays untouched).
- **Verification**: typechecked clean; full Playwright pass — thumbnails, initials fallback,
  autocomplete dropdown + selection, Clients screen list/add all confirmed working with zero
  console errors. The one real photo in the seed data (`CE-2024-0075`, via picsum.photos)
  rendered as a blank box in the sandboxed test browser — same known no-internet-access
  limitation hit earlier this session with MediaGrid, not a code defect; the 48×48
  sizing/rounding around it was confirmed correct.
- **Rebuild**: combined with the FAB/back-link fixes above into one build attempt — **first
  attempt failed**: `Unable to resolve module @react-navigation/bottom-tabs`. Root cause:
  that package was added to `package.json` by Gemini's earlier tab-restructure round, but
  this session never ran `npm install` in the `C:\dev\bpd` mirror since before that round
  landed (robocopy deliberately excludes `node_modules`, so a new JS dependency needs an
  explicit `npm install` in the mirror even though it needs no `expo prebuild` — no native
  code, so nothing else was affected). Fixed with `npm install` in `C:\dev\bpd` (confirmed
  "added 1 package"), then `BUILD SUCCESSFUL in 1m 28s`. Copied to `builds/bpd2.apk`
  (47.6MB). **Lesson for next time**: after a batch of source changes lands from an
  external source (Gemini or otherwise) without going through this session's own
  `npx expo install`, diff `package.json` against the mirror's `node_modules` before
  assuming "JS-only, skip npm install" — don't rely on "no native module" alone to skip it.

### Git state
This repo had **zero commits for the entire project up to this point** — asked the user
directly whether to make the first commit given how consequential that felt, and they said
yes. `master`'s root commit is `80b1bff` ("Initial commit: BPD Capture"), 65 files, everything
through this Phase 3 round. A `feature/eas-updates` branch exists off that commit (currently
identical to master) reserved for EAS Updates work once the user has an Expo account — see
above. The working tree is back on `master` after creating that branch; don't switch to
`feature/eas-updates` for ordinary app work, only for the EAS-specific steps.
