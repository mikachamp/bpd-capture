# BPD Capture — Design System

The single reference for how BPD Capture looks and behaves visually, on both the
**Android app** (this repo) and the **Windows desktop app** (`BPD_Capture_Desktop`).

> **Keep this file current.** Any change to colors, spacing, typography, components,
> screen layouts, or the startup animation must update this file in the same change,
> plus a line in the [Changelog](#changelog). The code is the source of truth —
> if this file and the code disagree, fix whichever is wrong, don't leave them diverged.

Source of truth in code:
- Mobile tokens: `src/theme/theme.ts`
- Desktop tokens: `BPD_Capture_Desktop/src/renderer/src/theme.css` (CSS variables mirroring the same values)

---

## 1. Design principles

> **Redesign branch (`redesign`, test build "BPD Capture Next").** This file describes the
> redesign. The released app on `master` still uses the purple design; see the Changelog.

1. **Built around the order flow.** Every CE order moves **Sample → Production → Dispatch →
   Installed**, and Production is split into the manufacturing steps the order needs:
   **Machining** (cutting: laser, CNC, 3D printing) → **Fabricating** (assembly) → **Finishing**
   (paint, vinyl, final QC). Lists filter by stage, each order shows how far it has got, the camera opens on
   the order's current stage, and photos are filed under the stage they were taken in.
2. **Dark, tinted, calm.** Deep navy surfaces with soft blue-white text, never pure white on
   black. Few elements per screen: lists over tiles, no dashboards of numbers.
3. **One accent, used once.** Ember orange (`accent`) marks the single most likely next action on
   a screen (Capture, Photo · Production). Selected tabs and chips use a tint (`selected`), not
   the accent and not white.
4. **Status colours keep their meaning.** Overdue = `danger`, finished stage = `success`,
   current stage = `accent`.
5. **Project name first.** Orders are known by client + product; the CE number is secondary.
6. **Destructive actions are quiet but confirmed** (Delete sits in the ••• menu or behind a
   long-press, always with a confirmation).
7. **No emoji in the UI.** Icons are line icons from `components/Icon.tsx` (react-native-svg).
8. **Reference screenshots set the style, not the layout** (palette, type, shapes); layouts are
   designed for this business's tasks.

---

## 2. Color tokens — "Ink & ember"

| Token | Hex | Used for |
|---|---|---|
| `background` | `#0F141C` | Screen background |
| `backgroundTop` | `#141C27` | Top of the background tint (reserved for a soft top glow) |
| `surface` | `#172030` | Cards, chips, round icon buttons, tab bar, inputs |
| `surfaceMuted` | `#1E2939` | Empty stage-bar segments, inactive step dots |
| `border` | `#22304A` | Hairline dividers between list rows |
| `textPrimary` | `#DAE2EE` | Main text (soft blue-white, never #FFF) |
| `textSecondary` | `#B3BFD0` | Client names, notes, supporting text |
| `textMuted` | `#7F8EA5` | Meta lines, CE numbers, placeholders, inactive icons |
| `textOnDark` | `#E4ECF7` | Text on dark overlays (camera) |
| `accent` | `#E98B60` | The one main action per screen; current stage |
| `accentPressed` | `#D2774E` | Pressed accent |
| `accentTint` | `#3A2618` | Ring around the current stage dot |
| `accentInk` | `#2B1206` | Text/icons on an accent fill |
| `selected` / `selectedText` | `#26344B` / `#E4ECF7` | Selected tab, chip, segment, secondary buttons |
| `secondary` | `#7C9CC8` | Secondary data colour (sparingly) |
| `success` / `successTint` | `#6FBF9A` / `#15302A` | Finished stages |
| `warning` / `warningTint` | `#E9B45F` / `#33270F` | Due today |
| `danger` / `dangerTint` | `#F2546B` / `#3A1820` | Overdue, delete, errors |
| `dark` | `#000000` | Camera background, startup animation background |

**No gradients in the UI.** `gradientAccent` now holds the accent twice so older components
that still draw a two-stop fill render flat ember. (The PDF report keeps its own header.)
**No avatar colours:** orders without photos show a camera placeholder on `surface`.

---

## 3. Spacing, radius, elevation

**Spacing scale** (px): `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 28`
- Screen side padding: `xl` (20). Card internal padding: `lg` (16). Gap between cards: `md` (12).

**Radius** (px): `sm 8 · md 12 · lg 16 · xl 22 · pill 999`
- Cards / stat tiles: `lg`. Inputs and buttons: `md`. Segments: `sm`. Badges and chips: `pill`. Modal sheets: `xl`.

**Elevation** — `cardShadow`: soft shadow on iOS, `elevation: 2` on Android. Cards also carry a
hairline `border`. The FAB uses a stronger `elevation: 4`.

**Max content width** — screens center their content at `maxWidth: 720` so tablets/landscape
don't stretch cards edge to edge.

---

## 4. Typography — Outfit

**Outfit** (SIL Open Font Licence, `assets/fonts/`), embedded at build time by the `expo-font`
config plugin as one family with weights 300/400/500/600. Every text style sets
`fontFamily: fonts.family` (`'Outfit'`); weights above 600 render as 600.

| Style | Size / weight | Used for |
|---|---|---|
| Screen title | 32 / 400, −0.6 tracking | "Jobs", order name (29) |
| `title` | 20 / 500 | Card headings |
| List primary | 17 / 400 | Product name in job rows |
| `body` | 15 / 400 | Notes, paragraphs |
| `caption` | 13 / 400, textMuted | Meta lines, dates, CE numbers |
| `label` | 12 / 500, +0.3 tracking | Section labels (sentence case, not uppercase) |

Big numbers and titles are light (400), never heavy bold. Inputs set `color: textPrimary` and
`placeholderTextColor: textMuted`.

---

## 5. Components

### Job card — `components/OrderListItem.tsx`
- `surface` card, `lg` radius, hairline border, **4px colored left edge**: amber (In Process) or green (Completed).
- Top row: 48×48 rounded thumbnail (first photo) **or** initials avatar on the avatar palette →
  heading = **project name** (`title`, falls back to CE number) with 📝 if the job has notes →
  meta line `Client · CE-number` → `Opened`/`Completed` date (`caption`).
- Status badge top-right: pill, `warningTint`/`successTint` fill, 12/700 text.
- Bottom row (above a hairline divider): due-date chip left, accent "View more ›" link right.
- Press feedback: scales to 0.97 (`usePressScale`).

### Status badge
Pill, `paddingVertical 6`, `paddingHorizontal md`. In Process = `warningTint` fill; Completed = `successTint` fill.

### Due-date chip — `components/DueDateChip.tsx`
Tappable pill that opens the date picker. Tones:
- No date → muted, with a small purple "+ Add" badge
- Future → accent ("Due Mon, Oct 19")
- Today → warning ("Due today")
- Past and not completed → danger ("Overdue · Oct 2"), **pulses** (scale 1↔1.06, 650 ms each way)
- Completed jobs never show as overdue — just "Due Oct 19" in accent.

Two sizes: `compact` (cards) and `full` (Job Detail).

### Stat tile — `components/StatTile.tsx`
`surface` card, `lg` radius, ~half width (`flexBasis 48%`). Uppercase `label`, big 28/800 value,
optional `caption` hint. Tones: neutral, `warning` (tinted fill + amber value), `danger` (tinted
fill + red value). Can be tappable.

### Segmented controls
- **Dashboard In Process / Completed:** two equal buttons; active = solid `accent` fill + white
  label text; inactive = `surface` + hairline border + `textSecondary`.
- **Status toggle (Job Detail)** — `components/StatusToggle.tsx`: `surfaceMuted` track with 4px
  padding; active segment tinted by status (`warningTint` / `successTint`).
- **Calendar Month / Week:** same track style as the status toggle.

### Buttons — hierarchy, most to least prominent
1. **Gradient primary** — `gradientAccent` fill, white 15/700 text, `md` radius. One per screen
   at most (Export Field Report).
2. **Accent solid** — `accent` fill, white text (Save, Open Order, active segment).
3. **Black** — `dark` fill, white text: the Capture button only (reads as "camera").
4. **Secondary** — `surfaceMuted` or `surface` + hairline border, `textPrimary` text (Upload
   from Gallery, Manage Clients, Create Full Backup, Send Daily Digest).
5. **Text link** — accent text ("View more ›", header "Save") or danger text ("Delete Job").

### Floating action button (Dashboard)
64×64 `accent` circle, white "+", bottom-right at `lg` inset. The list pads its bottom by
`64 + 2×lg` so the FAB never covers the last card.

### Inputs
`surface` fill, 1px `border`, `md` radius, `md`/`sm` padding, 14px text in `textPrimary`.
Labels above fields: 12/700 `textSecondary` (e.g. "CE Number", "Client Name").

### Calendars — `MonthCalendarBoard.tsx`, `DueDateCalendarModal.tsx`
7 columns, **each day cell exactly 1/7 of the row width (`14.2857%`)** — never a fixed px width
(fixed widths wrapped 8 days per row on wide phones). Today = `accentTint` circle with accent
number; days outside the month in `textMuted`; small status-colored dot under days with jobs.
The due-date picker is a centered `surface` sheet, max 380px wide, `xl` radius.

### Media grid — `components/MediaGrid.tsx`
Square thumbnails, `lg` radius, a "⋯" menu button top-right of each (rename / delete), with the
"Delete Job" text link as the grid's footer.

### App logo and app icons — `components/AppLogo.tsx`
The real Blueprint Digital mark (`assets/bpd-logo-mark.png`, transparent), with **no tile behind
it**. Shown in the mobile Dashboard header at 44px and the desktop header at 32px.

All icons come from the startup animation's final frame, so they match the splash exactly
(`scripts/app-icon/README.md` has the steps):
- **Android launcher:** the mark on black. The adaptive icon keeps the mark at ~45% (58% was clipped on device) so circle and
  squircle masks never clip it; its background layer is black (`#000000`). The themed
  (monochrome) icon is a white silhouette with the pencil bars cut out.
- **Desktop:** `build/icon.ico`, used by the window and the desktop shortcut.

---

## 6. Navigation & screen layouts

**Bottom tab bar** (4 tabs): 🏠 Home · 📅 Calendar · 📊 Insights · ⚙️ Settings. Emoji icons at
20px. Bar = `surface` with `border` top line; active label `accent`, inactive `textMuted`.

**Headers**: `surface` background, `textPrimary` title and back arrow. React Navigation's theme
is set from our tokens in `navigation/RootNavigator.tsx` — **update it whenever `theme.ts`
colors change**, it does not pick them up automatically.

| Screen | Layout |
|---|---|
| **Dashboard** | Hero band (logo, "BPD Capture" display title, live counts "6 active · 5 with due date · 2 overdue"), search field, In Process/Completed segments, "ACTIVE JOBS" label, job cards, FAB. Completed tab adds a "📨 Send Daily Digest" button. |
| **Job Detail** | Project name as the large editable heading → opened/completed dates → labeled CE Number and Client Name fields → due-date chip (full) → status toggle → Notes → Capture (black) + Upload from Gallery (secondary) → Export Field Report (gradient) → MEDIA grid → "Delete Job" link. Header has an accent "Save" that saves and closes. |
| **New Order** | Labeled fields: CE Number, Client Name (with autocomplete), Project Name, Due Date chip → accent "Open Order" button. |
| **Capture** | Full-screen black camera view, "✕ Cancel" top-left, Photo/Video pill switch, large white shutter ring at bottom. |
| **Calendar** | Display title, Month/Week toggle, month grid, then jobs grouped "WEEK OF …" as rows (CE number + status pill). Week view lists each day with its jobs or "No due dates", today tagged. |
| **Insights** | 2×2 stat tiles (In Process, Overdue [danger], Due This Week [warning], Avg. Turnaround), on-time completion meter, "OVERDUE JOBS" list. |
| **Settings** | Sections: Clients (Manage Clients), Dispatcher Contact (email + Save), Data Backup (Create / Restore, optional password), App Updates (current version + Check for Updates). |

Safe areas: every screen uses `SafeAreaView` from **`react-native-safe-area-context`** (the
built-in one does nothing on Android, and content slid under the camera cutout).

---

### Redesign screens (branch `redesign`)

- **Tab bar** — a floating pill (`surface`, radius pill, 64 high) with four icon tabs (Jobs,
  Calendar, Insights, Settings; selected = `selected` circle) and an accent **Capture** pill that
  opens "Which order?" then the camera on that order's stage.
- **Jobs** (`JobsScreen.tsx`) — logo + round search / new-order buttons; "Jobs" title with
  "N open orders · ● n overdue"; search appears only when the search icon is tapped; stage chips
  (All, Sample, Production, Dispatch, Installed, Done) with counts; rows = 52px photo thumbnail
  (or camera placeholder), client + due ("● 3 days late" in `danger`), product name, a 4-part
  stage bar (done `success`, current `accent`, rest `surfaceMuted`), stage + CE number (in Production the label includes the step, e.g.
  "Production · Fabricating"). Overdue first. "Send today's digest" is a quiet link under the list.
- **Order** (`OrderScreen.tsx`) — back / ••• (Edit details, Delete order); client · CE; product
  name; due line; **stage stepper** (numbered dots, ✓ when done, tap a finished one to move back);
  a "what happens next" card with one tint button (e.g. "Client approved", "Machining done →
  Fabricating", "Finishing done → Dispatch", "Mark installed"); in Production the section shows
  **step chips** (done = `successTint` + ✓, current = `accentTint` with an `accent` border; tap to
  move between steps) and groups photos under each step; photos grouped under each stage (and by day when a stage spans
  several days), future stages dimmed; **Client report** (sample photos / installation proof)
  and **Internal record** (everything); sticky accent button "Photo · <stage>". Long-press a
  photo to delete it.
- **Capture** (`CaptureScreen.tsx`) — multi-shot: stays open, shot counter, last-shot
  thumbnail, light haptic per shot; stage pills choose where shots are filed; in Production a
  second row of **step pills** (only the order's steps); on Installed a Before / After switch
  (flips to After after a Before shot); "Done · N saved".
- **New order** — adds **Production steps** checkbox chips (all three ticked by default). The
  ••• menu on an order has **Production steps**, a bottom sheet with the same three checkboxes
  (changing them restarts Production at the first step).
- **Edit details** — the previous Job Detail screen, reached from the ••• menu.

---

## 7. Motion

- **Press feedback:** tappable cards and key buttons scale to 0.97 over 100 ms, back over 150 ms (`utils/usePressScale.ts`).
- **Overdue pulse:** overdue due-date chips gently pulse forever.
- **Startup animation** — see below.

### Brand animation protocol — follow this for any new logo, splash or brand animation

These rules come from the owner's feedback while the startup animation was designed (several
rounds were rejected before concept 7). Apply them to any similar request, on mobile or
desktop.

**What to make**
1. **Use the real brand artwork.** Start from the full-colour logo files
   (`Documents\3D Printing\Jobs\2026\BluePrint_Digital\BPT Logo.pdf` / `.svg`), never the
   "Cutfile" versions (outline only) and never a redrawn guess. Extract the exact paths and the
   exact gradient stops; don't approximate colours.
2. **The last frame is the logo, exactly.** Same shape, same colours, face-on. The animation is
   judged on whether it ends looking identical to the printed logo.
3. **One idea per animation.** Don't blend two concepts into one scene (the iris + blueprint
   mix was rejected for this). The story should come from the brand itself; for BPD that's
   the bulb lighting up and the pencil drawing.
4. **No text and no container.** No wordmark, captions or tagline, and no rounded square or
   tile behind the mark. Just the logo on the dark background (`colors.dark`).
5. **Real 3D, not a flat video.** Use a three.js scene with depth, light and a slight camera
   angle that settles face-on, so it feels interactive rather than a 2D clip.
6. **Avoid clichés.** Generic three.js demos (spinning torus knots, particle swirls, network
   meshes) were rejected as boring. Make it specific to this business.
7. **Short.** About 3–3.5 s before the app opens. It must never delay real work.

**How to build it**
1. **Offer options first.** Prototype several concepts side by side in the gallery
   (`BPD_Capture_Desktop/loading-screen-concepts/index.html`, also published as a
   clickable page) and let the owner pick one before touching the apps. Don't build anything
   until a concept is chosen.
2. **One shared scene module** (`startupLogoDraw.ts` style): `buildScene(aspect)` returns
   `{ scene, camera, tick(t), dispose }`, with `tick` a pure function of time. The same file is
   copied into the desktop app, and the deterministic `tick` is what makes video export
   possible.
3. **Fit to any screen.** The camera fits the mark to the tighter screen axis; the view is
   full-screen (`StyleSheet.absoluteFill`) so nothing is clipped by a visible box.
4. **It can never crash the app.** Wrap renderer creation and every frame in try/catch; on any
   failure, end the splash immediately and open the app. Keep the expo-gl WebGL fix in
   `utils/expoThreeRenderer.ts`.

**Tools and tech — use the same stack unless there's a reason not to**

| Job | Tool | Notes |
|---|---|---|
| 3D engine | **three.js**, mobile `three@^0.166.1`, desktop `three@^0.186.1` (`@types/three@^0.186`) | Plain three.js only; no React Three Fiber, no `expo-three` (its deps are stale). |
| GL on Android | **`expo-gl`** (`~57.0.2`, SDK 57) `GLView` → WebGL2 context | Renderer made in `utils/expoThreeRenderer.ts` with a canvas shim; must hide `globalThis.WebGLRenderingContext` while constructing or three throws "WebGL 1 is not supported" and the app crashes. |
| GL on desktop | Electron's Chromium WebGL2 | Same scene file; `LoadingScreen.tsx` hosts the canvas. |
| Logo geometry | `THREE.Shape` from the logo's own bezier paths → `ExtrudeGeometry` (slight depth) | Paths stored as data in `bpdLogoMark.ts` (SVG units, y down). |
| Exact gradients | `ShaderMaterial` with the SVG's linear-gradient stops, output as raw sRGB | Don't use lit materials for brand colours; lighting shifts them. A `uFill` uniform does the "pour" reveal. |
| Line drawing | `CatmullRomCurve3` + `TubeGeometry`, revealed with `geometry.setDrawRange` | Used for the pencil's guide line. |
| Glow | `PlaneGeometry` + `AdditiveBlending` halo | Cheaper and more reliable on phones than post-processing (no bloom passes). |
| Camera | `PerspectiveCamera` FOV 45, distance fitted to the tighter screen axis | Small rotation that settles face-on gives the 3D feel. |
| Extracting the logo | Python + **PyMuPDF** (`scripts/logo-extract/extract_logo.py`) | Reads paths and gradient functions from `BPT Logo.pdf`; final stops checked against `BPT Logo.svg`. |
| Concept gallery | Single HTML page, three `0.169.0` from unpkg + `OrbitControls` | `BPD_Capture_Desktop/loading-screen-concepts/index.html`; also published as a clickable artifact. |
| Video export | esbuild (bundle) → Electron (render frames) → ffmpeg (`libx264`, `yuv420p`) | `scripts/startup-video/README.md`. 1080×1920, 60 fps. |
| Gallery save | `expo-asset` + `expo-media-library` (granular `photo`/`video` permission) | `services/brandVideo.ts`; copy to a readable file name first. |
| Testing | Android emulator (`bpd_test` AVD, `-gpu host`) + `adb exec-out screencap` | Release APK only; web preview can't test expo-gl. |

Don't add new animation libraries (Lottie, Reanimated scenes, GSAP, post-processing packages)
without asking first. The stack above already covers what the brand animation needs.

**How to check it**
1. Render frames at fixed times and compare the final frame against the logo file.
2. Test on the Android emulator with the **release** APK and take screenshots. Web preview
   cannot validate expo-gl.
3. Re-render the video (`scripts/startup-video/README.md`) and update this section and the
   Changelog in the same change.

### Startup animation — `components/StartupAnimation.tsx` + `startupLogoDraw.ts`

**"Pencil draws the logo"** (concept 7 in the gallery). A real three.js scene (expo-gl on
mobile, WebGL in Electron on desktop), full-screen on the dark background, **no text**,
3.5 s before the app opens:
1. **0.25–1.75 s** — the logo's own pencil (light `#E9E9EE` bars, white tip) rides the mark's
   outline, drawing a light-blue (`#9BD8F7`) guide line behind its tip.
2. **1.3–2.4 s** — the colours pour in along the logo's real gradient directions: the blue arc
   sweeps left to right, then the body rises purple → magenta → orange.
3. **1.75–2.4 s** — the pencil slides home into its place in the logo and turns the logo's
   near-black `#231F20`.
4. **2.2–3.1 s** — the bulb flickers on: its interior fills with warm light that settles to
   white, a soft glow blooms behind it, and the guide line fades.
5. Meanwhile a slight 3D angle settles to exactly face-on, so the last frame is the logo.

**Logo source:** `components/bpdLogoMark.ts` holds the mark's exact paths (from `BPT Logo.pdf`)
and the gradient stops copied verbatim from `BPT Logo.svg` (blue `#0671B3`→`#2DA4DD`; body
`#3E3C91`…`#E30E87`…`#F7B853`). Use the full-colour files, never the "Cutfile" versions, which
are outline-only. The bulb interior (white paper in the printed logo) is the light here, and the
graphite tip is white because a near-black tip vanishes on the dark background.

The camera fits the mark to whichever screen axis is tighter. If 3D fails for any reason the
splash ends immediately and the app opens — **the splash must never be able to crash the app.**
Concepts considered: `BPD_Capture_Desktop/loading-screen-concepts/index.html`.

**Video export:** `assets/bpd-startup-animation.mp4` (1080×1920, 60 fps, 4.5 s, H.264) is
rendered frame-by-frame from this same `startupLogoDraw.ts`, so it matches the app exactly.
`services/brandVideo.ts` saves it to the gallery ("BPD Capture" album, as
"BPD Startup Animation.mp4") once, after the splash on first launch. **If the animation
changes, re-render the video** (steps in `SESSION_HANDOFF.md`).

---

## 8. Field report PDF — `services/reportPdf.ts`

Light document (white page) for printing/emailing: full-width `gradientAccent` header band with
"BLUEPRINT DIGITAL · BPD CAPTURE", "Field Report — CE-…" and project name in white → CE number
+ status pill → CLIENT / DUE DATE / OPENED columns → "PHOTOS (n)" grid of rounded thumbnails →
"Generated by BPD Capture on …" footer. The Daily Digest PDF uses the same styles.

---

## 9. Desktop app mapping

The desktop app (`BPD_Capture_Desktop`) reuses the same tokens as CSS variables
(`--color-background`, `--color-accent`, `--gradient-accent`, `--space-*`, `--radius-*`) and the
same type styles as classes (`.display`, `.title`, `.subtitle`, `.caption`, `.label`). Buttons
are `.btn-primary` (gradient) and `.btn-secondary` (surface + border); cards are `.card`.
Layout differs for a wide window: top nav (Dashboard / Calendar / Insights / Clients) + Settings
instead of a bottom tab bar, and a multi-column card grid. Same startup animation.

---

## 10. Known pitfalls

- `StyleSheet.absoluteFillObject` doesn't exist in this React Native version — use `StyleSheet.absoluteFill`. Spreading the missing one silently gives an empty style.
- Calendar cells must be a percentage width, not fixed px (see §5).
- Text inputs need an explicit text color on dark backgrounds (see §4).
- Navigation header/tab colors live in `RootNavigator.tsx`, separate from `theme.ts` (see §6).

---

## Changelog

| Date | Version | Change |
|---|---|---|
| 2026-10-14 | Next (redesign) | Production split into steps (Machining → Fabricating → Finishing, chosen per order); stage 2 renamed **Dispatch** (was Packed). Step chips on the Order screen, step pills in the camera, step checkboxes on New order and in a Production steps sheet. |
| 2026-10-14 | Next (redesign) | Redesign on branch `redesign`, test build **BPD Capture Next**: Ink & ember palette, Outfit font, no emoji, stage-based Jobs / Order / multi-shot Capture screens, floating pill tab bar. |
| 2026-10-13 | 1.5.0 (in progress) | Settings gains a **Sync** section (both apps): Sign in with GitHub (shows the device code large, then status, Sync now, small Sign out link). Desktop shows a Windows notification for jobs added on the phone. |
| 2026-10-13 | 1.4.2 | App icons and in-app logo replaced with the real Blueprint Digital mark (was a camera placeholder); adaptive icon background now black. Desktop header, window and shortcut icon too. |
| 2026-10-13 | 1.4.1 | Brand animation protocol: added the tools/tech table (three.js versions, expo-gl, geometry/shader techniques, PyMuPDF logo extraction, video pipeline, testing). |
| 2026-10-13 | 1.4.1 | Added the Brand animation protocol (§7): rules and process for any future logo/splash animation, from the owner's feedback. |
| 2026-10-13 | 1.4.1 | Startup animation exported as `assets/bpd-startup-animation.mp4` (1080×1920, 60fps, 4.5s, rendered from the same scene code); saved to the gallery once on first launch. Update dialog: "Update Now", no backup share sheet. |
| 2026-10-13 | 1.4.0 | Startup animation replaced with "Pencil draws the logo" using the real Blueprint Digital logo mark; wordmark text removed. Same on desktop. |
| 2026-10-12 | 1.3.2 | Document created from the current code. |
| 2026-10-06 | 1.3.2 | Startup animation made full-screen, auto-fitting, iris retracts and fades on open; calendar cells fixed to 1/7 width. |
| 2026-10-01 | 1.3.0 | Three.js startup animation (iris + blueprint) replaced the 2D production-line splash. |
| 2026-10-01 | 1.2.0 | Job Detail: project name became the large heading; CE Number got a label and moved below. |
