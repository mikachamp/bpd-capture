# BPD Capture — App Overview

A product-level summary for external review: what this app is, the problem it solves,
how it's built, how it's distributed, and where it currently stands. Written for someone
evaluating the app's direction and giving improvement feedback, not for a developer
picking up the codebase (that document is `SESSION_HANDOFF.md`, in this same project
folder, which is a build/troubleshooting log — this file is the product-level view).

## The problem it solves

Field jobs (inspections, site visits, work orders — each identified by a **CE number**)
need photo/video documentation, and that documentation needs to stay organized, dated,
and easy to find later — by job number, by client, or by when it happened. Doing this
with a phone's regular camera roll means photos from different jobs get mixed together,
there's no record of due dates or completion status, and nothing tracks whether jobs are
being finished on time.

BPD Capture is a single-purpose mobile tool for the person doing that fieldwork: open (or
create) a job by its CE number, capture or upload photos/videos straight into that job's
own folder, track its due date and status, and see at a glance which jobs are overdue.

## Who uses it, and the core workflow

One user per device (a field inspector/contractor), working mostly on-site with
intermittent or no connectivity — the app is fully offline-capable (see "How it's built"
below). Typical flow:

1. **Open or start a job** — search for an existing CE number, or create a new one with a
   client name, project name, and (optional) due date.
2. **Capture documentation** — take photos/videos directly in-app (dedicated camera
   screen), or pull existing ones in from the device gallery.
3. **Track it** — mark the job In Process or Completed, add notes (e.g. why a job is
   delayed), see it on the dashboard and the calendar.
4. **Find it again later** — search by CE number or by client name; browse completed jobs
   by year/month on a calendar.
5. **See the bigger picture** — an Insights screen surfaces how many jobs are in process,
   how many are overdue, how many are due this week, average turnaround time, and what
   percentage of completed jobs finished by their due date.

## Feature list

- **Dashboard** — every in-process job as a card (CE number, client, project, status, due
  date), with quick actions to start a new job, search, or browse completed work.
- **Job detail** — client/project name (editable), due date, status toggle
  (In Process/Completed), free-text notes, capture/upload actions, a photo/video grid, and
  a delete-the-whole-job option.
- **Camera capture** — in-app photo and video capture, saved into a per-CE-number folder
  on the device, with an automatic backup copy in the phone's normal gallery app.
- **Photo/video management** — rename or delete individual photos/videos from within a
  job; delete an entire job (and its files) if it was created by mistake.
- **Due dates & calendar** — every job can carry a due date, editable from a calendar
  picker anywhere it appears. A dedicated Calendar screen shows month and week views, with
  overdue jobs flagged. Selecting a month lists every job due that month, grouped by week.
- **Browse Completed** — completed jobs organized by year → month, shown on the same
  calendar-style view, with each job tagged "On time" or "Late" against its due date.
- **Search** — by CE number or by client name, both live-filtering as you type.
- **Insights** — at-a-glance KPIs: jobs in process, overdue count, due-this-week count,
  average turnaround (days from opened to completed), and an on-time-completion-rate meter
  with the list of currently overdue jobs underneath.
- **Notes per job** — a place to record why a job hasn't been finished, access issues,
  follow-ups, etc. — small indicator on the dashboard card shows which jobs have notes.
- **1-click PDF Field Report** — generates a branded PDF (job metadata, status, notes,
  photo grid) for a single job entirely on-device and shares it, right from the job
  detail screen.
- **End-of-Day Digest** — one button on the dashboard bundles every job completed that
  day into a single consolidated PDF, instead of sending 3-20 separate reports.
- **Pre-routed delivery to a saved Dispatcher** — a Settings screen saves a dispatcher's
  email address. When set, exporting a report (single job or the daily digest) skips
  Android's generic share-sheet chooser and opens the mail app directly with the PDF
  attached and the dispatcher pre-filled as the recipient.
- **Startup animation** — a short branded intro on cold launch.
- **Camera/microphone permissions** requested up front at first launch, not lazily.

## How it's built

- **React Native + Expo** (Expo SDK 57, React Native 0.86, React 19) — one TypeScript
  codebase compiled to a real native Android app (not a web wrapper).
- **Fully offline, on-device data** — a local SQLite database (`expo-sqlite`) holds every
  job's data; photos/videos live in the app's own folder on the device's storage. **There
  is no server and no cloud sync** — nothing leaves the device unless the user manually
  shares a file. This means: no network dependency to use the app day-to-day, but also no
  backup if the phone is lost, reset, or the app is uninstalled (Android clears app data on
  uninstall) — see "Limitations" below.
- **Native modules used**: camera (`expo-camera`), gallery picker (`expo-image-picker`),
  gallery backup writes (`expo-media-library`), video playback (`expo-video`), local
  storage/file management (`expo-file-system`), screen rotation (`expo-screen-orientation`).
- **Design**: dark theme with a cyan-to-purple gradient accent (iterated to match a
  reference the user supplied), custom-built calendar/date-picker components (no
  third-party date-picker dependency), Reanimated-driven animations.
- Package identity: `com.blueprintdigital.bpdcapture`. Targets Android 7.0+ (minSdk 24)
  through the current Android SDK (compile/target SDK 36).

## How it's installed

This is **not distributed through the Google Play Store** — it's a manually-built,
manually-signed APK, sideloaded directly onto the device:

1. The app is built locally into a single `.apk` file (currently `builds/bpd2.apk` in the
   project folder — a release build with the JavaScript bundle embedded, so it runs
   standalone with no development server needed).
2. That file gets onto the phone by whatever means is convenient — dragged into Google
   Drive and downloaded on-device, copied over USB, etc.
3. The user opens the file on their phone (allowing "install unknown apps" for whichever
   app they used to open it) to install it.
4. Every rebuild reuses the same signing key and package identity, so re-installing a
   newer `.apk` **updates the app in place** — it's always the same single installed app,
   never a duplicate.

This is a debug/internal-distribution setup appropriate for a single-user tool still in
active iteration. It has not been set up for Play Store distribution, over-the-air update
delivery, or installing on multiple devices/users at once.

## Current state

Actively in a feedback loop: the user installs the latest build on their own device (a
Samsung Galaxy S21), reports back what does and doesn't look/work right, and the app gets
adjusted and rebuilt. All features listed above are implemented and built into the
current APK; the PDF Field Report / Daily Digest / dispatcher pre-routing work is the
newest addition and is pending its first real-device confirmation (everything native-only
could only be verified via typechecking and browser-based preview so far, not an actual
install).

## Known limitations / open questions for review

- **No cloud backup or sync.** All job data and photos are local to one device. If the
  phone is lost, factory-reset, or the app uninstalled, that data is gone. Worth deciding
  whether this is acceptable for the intended use case or whether backup/export/sync
  should be prioritized.
- **Single user, single device.** No accounts, no login, no way for a team to share or
  hand off jobs. If more than one person needs to work from the same job data, that's a
  design gap today.
- **No Play Store distribution.** Manual APK builds and sideloading work for one person
  iterating quickly, but don't scale to distributing updates to other users without a lot
  of manual copying.
- **Report delivery is email-only.** A WhatsApp notification option was built and then
  removed by request — WhatsApp has no public way for another app to hand it a file
  attachment with a recipient already chosen (that only exists behind Meta's gated
  WhatsApp Business API), so it could only ever send a text heads-up, not the report
  itself. Worth knowing if WhatsApp delivery is a requirement worth revisiting later.
- **Tested on one physical device model** (Samsung Galaxy S21) plus a browser-based preview
  used for rapid UI iteration (which can't verify some native-only behavior, like how
  layouts sit around a camera cutout, or how the camera itself performs) — broader device
  testing hasn't been done.
- **No automated tests.** Correctness has been verified through manual use and visual
  review each round, not a test suite.

---
*This file is a snapshot for external/strategic review. For the detailed technical
build/troubleshooting history, see `SESSION_HANDOFF.md` in this same folder.*
