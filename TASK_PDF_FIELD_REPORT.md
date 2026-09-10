# Task Brief: 1-Click PDF Field Report — BPD Capture

**Status: Implemented and built into `builds/bpd2.apk`.** Real device end-to-end
verification (tap button on an actual job with photos → confirm PDF + share sheet)
is the one thing still pending as of this writing — everything else below is
confirmed against the actual codebase, not assumed.

## Role & context

Expert React Native & Expo Mobile Engineer, working on **BPD Capture** — an existing,
working mobile app (not a greenfield build). Concretely:

- **Stack**: Expo SDK 57.0.20, React Native 0.86.3, React 19.2.3, TypeScript.
- **Package identity**: `com.blueprintdigital.bpdcapture`. Min SDK 24, compile/target SDK 36.
- **Architecture**: fully offline, on-device. `expo-sqlite` holds all job records
  (`src/db/orders.ts`, `src/db/mediaItems.ts`); photos/videos live in the app's own
  folder on device storage via `expo-file-system` (`src/services/storage.ts`). **There
  is no backend, no API, no network call anywhere in this codebase.**
- **Design system**: dark theme, defined in one place — `src/theme/theme.ts`.
  Background `#131316`, surface `#1C1C21`, text `#F5F5F7`/`#9C9BA3`, solid accent
  `#6C5CE7`, and a named cyan-to-purple hero gradient:
  `gradientAccent = ['#4FC3F7', '#7C4DFF']`, already used for the Dashboard's primary
  "+ New Order" button and the app's startup animation.

## Task (as originally framed)

Upgrade BPD Capture from an internal offline utility toward a
"Site Delivery & Quality Assurance Verification System" by closing the operational
loop: let the field operator generate and immediately share a signed-off-ready record
of a completed job, without leaving the app or needing connectivity.

## 1. 1-Click PDF Field Report — delivered

- **Packages added** (both new to this project, installed at the SDK-57-compatible
  version):
  ```bash
  npx expo install expo-print expo-sharing
  ```
  `expo-sharing` registered its own config plugin automatically in `app.json`;
  `expo-print` needs no plugin entry. **Both are native modules** — adding them
  required a full native rebuild (`expo prebuild` regenerates `android/`, then a full
  Gradle build — took ~21 minutes here, versus ~1 minute for an ordinary JS-only
  change), not something that ships from a JS-only edit.

- **"Export Field Report" button** — added to `src/screens/JobDetailScreen.tsx`,
  placed directly below the existing Capture/Upload action row. Full-width, filled
  with the same `gradientAccent` cyan-to-purple gradient as the app's other primary
  action button (not a new color choice), with the same press-scale tactile feedback
  (`usePressScale()`) used elsewhere in the app. Shows a "Preparing report…" loading
  state while generating.

- **PDF contents** — CE number, Client Name, Project Name, Due Date, a status badge
  (In Process / Overdue / Completed — computed the same way the rest of the app
  computes it), Notes (when present), and a photo grid. Videos are listed by filename
  with a note that they're available on-device rather than embedded (a PDF can't embed
  playable video) — worth deciding whether that's sufficient or whether a video
  thumbnail/link scheme is wanted later.

- **Share sheet** — `Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle
  })` opens Android's native chooser immediately after generation. One accuracy
  correction to the original brief: this opens **whatever apps on the device register
  as handling a PDF** (Gmail, Drive, Bluetooth, etc., depending on what's installed) — it
  is Android's standard share intent, not a hardcoded email integration. Phase 2 below
  replaces this with a genuine 1-click bypass for email when a dispatcher address is
  saved.

- **New file**: `src/services/reportPdf.ts`, one exported function:
  ```ts
  export async function exportAndShareJobReport(order: Order, media: MediaItem[]): Promise<void>
  ```
  It builds a branded HTML string, inlines every photo as a base64 `data:` URI (read
  via `expo-file-system`'s `File.base64()` — **required**, not a style choice:
  `expo-print`'s WebView renderer cannot reliably load local `file://` image sources,
  per Expo's own documented limitation), calls `Print.printToFileAsync({ html })` to
  produce the PDF entirely on-device, then calls `Sharing.shareAsync(...)`.

## 2. Architecture constraints — confirmed against the real codebase

- **Offline-first SQLite**: untouched. This feature only *reads* existing job/media
  records already in SQLite; it writes nothing back to the database.
- **On-device PDF generation, no cloud server**: confirmed —
  `Print.printToFileAsync` runs Expo's local HTML-to-PDF conversion; there is no
  network call anywhere in `reportPdf.ts` or anywhere else in this codebase.
- **Matches the existing design system**: same gradient (`gradientAccent`), same
  button/press-animation pattern as the rest of the app. **One deliberate deviation,
  flagged for review**: the PDF document itself renders on a white background, not a
  literal dark-mode replica of the in-app UI — a dark PDF is impractical to print and
  unusual for a client sign-off document. The brand's cyan-to-purple gradient is used
  for the header band and status accents on that light layout instead. If a literal
  dark PDF is actually wanted, that's a small change, not a redesign.

## What's verified vs. not

- ✅ Typechecks clean (`npx tsc --noEmit`).
- ✅ Button renders correctly and behaves gracefully in the web preview (shows a
  friendly "not available on web" message instead of crashing — photo file access and
  PDF generation are both native-only).
- ✅ The PDF's actual HTML/CSS template was rendered standalone with sample data and
  visually verified (branded header, metadata grid, photo grid, notes box, footer all
  render correctly) before committing to the ~21-minute rebuild.
- ✅ Builds successfully into `builds/bpd2.apk`.
- ⬜ **Not yet done**: a real end-to-end test on the actual device — tapping the
  button on a real completed job with real photos, confirming the PDF generates
  correctly and the Android share sheet opens with it attached. This is the one
  native-only step nothing in this development environment could verify directly;
  needs confirmation after installing this build.

## Future Enhancements (Phase 2 - Approved)

Based on the low-volume (3-20 jobs/day) internal workflow for Floor Managers and Dispatchers, the following enhancements have been approved for the next phase.

**Status: Implemented, typechecked, verified in web preview, and rebuilt into
`builds/bpd2.apk` (2026-09-09).** Not yet confirmed on a real device as of this note —
ask the user to install this build and check: Settings saves/persists the dispatcher
email, and Export Field Report / Send Daily Digest open the mail compose UI directly (not
the generic share sheet) when a dispatcher email is saved.

**WhatsApp pre-routing was scoped out after being built, per explicit user request
(2026-09-09)** — it shipped as a text-only companion notification (there is no public API
for any app to hand WhatsApp a file attachment with a pre-filled recipient; that requires
the gated WhatsApp Business API, out of scope here), and the user decided that partial
version wasn't worth keeping. Removed: the Dispatcher WhatsApp Number field from Settings,
`notifyDispatcherOnWhatsApp()` from `reportPdf.ts`, and the "Notify Dispatcher on
WhatsApp" links from both Job Detail and the Dashboard. The `DispatcherContact` type in
`src/db/settings.ts` is now just `{ email: string | null }`. If WhatsApp delivery is
wanted later, the only real path is a native Android Intent using WhatsApp's own
`ACTION_SEND` file-share intent (still opens WhatsApp's own contact/chooser UI, not a true
bypass, and needs a small native module since Expo has no built-in wrapper for it) — not
something to attempt again without that context.

1. **"End of Day" PDF Digest — delivered.**
   - New "📨 Send Daily Digest" button on the Dashboard (`DashboardScreen.tsx`), below
     "Browse Completed". Calls `exportAndShareDailyDigest()` (new, in
     `src/services/reportPdf.ts`), which uses the existing (previously unused)
     `listCompletedOrdersInRange()` in `src/db/orders.ts` to fetch every job completed
     today, builds one multi-page HTML document (each job as its own section with a CSS
     `page-break-before`, sharing the same styling as the single-job report), renders it
     to one PDF via `Print.printToFileAsync`, then delivers it (see #2). Shows a friendly
     alert if zero jobs have been completed yet today, instead of generating an empty PDF.

2. **Pre-Routed Sharing (True 1-Click) — delivered for email.**
   - **New Settings screen** (`src/screens/SettingsScreen.tsx`, reachable via a new ⚙️
     icon on the Dashboard header) saves a Dispatcher Email to a new `settings`
     key-value SQLite table (`src/db/schema.ts` + `src/db/settings.ts`).
   - Added `expo-mail-composer` (`npx expo install expo-mail-composer`, auto-registered
     as a config plugin in `app.json`, same pattern as `expo-sharing`). A new
     `deliverPdf()` helper in `reportPdf.ts` is used by **both** the single-job export
     and the daily digest: when a Dispatcher Email is saved and
     `MailComposer.isAvailableAsync()` is true, it calls `MailComposer.composeAsync({
     recipients: [email], subject, body, attachments: [pdfUri] })` — this opens the
     device's mail compose UI directly with the recipient and PDF attachment pre-filled,
     genuinely bypassing Android's generic share-sheet chooser. Falls back to the
     original `Sharing.shareAsync(...)` share sheet when no dispatcher email is saved, or
     no mail app is configured on the device.
   - **Verification**: typechecked clean; full web-preview pass (Settings screen save/
     load round-trip confirmed the email field value persists; Dashboard's new icon and
     digest button render correctly at phone width with zero console errors; Job Detail's
     existing Export Field Report button still renders correctly after the `reportPdf.ts`
     refactor). Mail compose and daily-digest PDF generation are both native-only code
     paths and have **not** been exercised on a real device yet.
