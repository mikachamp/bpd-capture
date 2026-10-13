# BPD Capture — Current App Visual Review

> **Purpose:** Documents specific visual and UX issues in the current app that the
> redesign addresses. Reference this when implementing `REDESIGN_SPEC.md` to
> understand the "why" behind each change.

---

## Issue 1: Dashboard Visual Clutter

**File:** `src/screens/DashboardScreen.tsx`

**Problem:** The dashboard stacks too many elements vertically before showing jobs:
1. Hero gradient band with logo + title + live counts
2. Search field (always visible)
3. In Process / Completed segmented control
4. "ACTIVE JOBS" label
5. Then finally the job cards

**Impact:** On a typical phone screen (especially shorter devices), users see at most
1-2 job cards before scrolling. The header area consumes roughly 40% of the viewport.

**Fix in redesign:** Compact header (logo + search icon on one line, day name + date
on a second line), day scrubber, then directly into grouped job sections.

---

## Issue 2: Avatar Color Roulette

**File:** `src/components/OrderListItem.tsx` (line ~15)

**Problem:** When a job has no photos, the card shows an initials avatar with a color
randomly selected from 7 pastel options. This creates visual noise and has no
informational value — the color doesn't represent anything meaningful.

```typescript
// Current: 7 random colors
const AVATAR_COLORS = ['#6C5CE7', '#4FC3F7', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#8B5CF6'];
```

**Fix in redesign:** Replace with real photo thumbnails. For jobs without photos,
use a consistent muted placeholder icon (camera outline in `textMuted` color on
`surfaceMuted` background).

---

## Issue 3: Job Detail Monolithic Scroll

**File:** `src/screens/JobDetailScreen.tsx`

**Problem:** Everything is in one long vertical scroll:
- Project name (editable)
- Dates
- CE Number and Client fields
- Due date chip
- Status toggle
- Notes
- Capture + Upload buttons
- Export button
- Media grid (potentially 20+ photos)
- Delete link at the very bottom

**Impact:** Users must scroll past the entire photo grid to reach notes, or scroll
past all metadata fields to see photos. On a job with 15+ photos, the page becomes
very long and the notes field is effectively buried.

**Fix in redesign:** Tabbed layout (Photos | Details | Notes). Each concern gets
its own dedicated view. The cover photo at the top provides visual context without
a massive grid blocking other content.

---

## Issue 4: Single-Shot Camera

**File:** `src/screens/CaptureScreen.tsx`

**Problem:** After taking each photo, the camera navigates back to the Job Detail
screen. The inspector must then:
1. Scroll down past existing content
2. Find and tap the Capture button again
3. Wait for the camera to initialize
4. Take the next photo
5. Get sent back to Job Detail again

**Impact:** For a typical 10-15 photo inspection, this creates significant friction.
Each photo requires 4-5 taps and several seconds of navigation.

**Fix in redesign:** Multi-shot mode. Camera stays open, shot counter shows progress,
"Done" button exits when finished.

---

## Issue 5: Flat Photo Grid Lacks Context

**File:** `src/components/MediaGrid.tsx`

**Problem:** Photos are displayed in a flat, undifferentiated grid. For multi-day
inspections (e.g., day 1 initial assessment, day 2 remediation progress, day 3 final
check), there's no way to tell which photos belong to which visit.

**Fix in redesign:** Date-grouped media. Photos are organized by capture date with
clear date headers ("SATURDAY 10 OCT . 6 PHOTOS"), making site progression visible.

---

## Issue 6: "View More" Link Redundancy

**File:** `src/components/OrderListItem.tsx`

**Problem:** Each job card has a "View more >" link in the bottom-right. This is
redundant because the entire card is already tappable. It wastes space and creates
a visual distraction.

**Fix in redesign:** Remove the link entirely. The card press behavior is sufficient.

---

## Issue 7: Cold Purple Palette

**File:** `src/theme/theme.ts`

**Problem:** The deep purple accent (`#6C5CE7`) and cyan-purple gradient
(`#4FC3F7` to `#7C4DFF`) feel generic and tech-startup-ish. For a field service /
construction inspection tool, the color language doesn't match the rugged,
professional nature of the work.

**Fix in redesign:** "Ink & Ember" palette with warm coral-orange (`#E8734A`) as the
primary accent and warm-tinted neutrals. Feels more grounded and professional.

---

## Issue 8: System Font Typography

**File:** `src/theme/theme.ts`

**Problem:** Using the system font (Roboto on Android) is functional but generic.
The app looks like any default React Native app. The Blueprint Digital brand mark
has a geometric, angular design that the system font doesn't complement.

**Fix in redesign:** Switch to Outfit, a geometric Google Font that echoes the
BPD logo's angular character and gives the app a distinctive, premium feel.

---

## Issue 9: Always-Visible Search Bar

**File:** `src/screens/DashboardScreen.tsx`

**Problem:** The search field is always visible on the dashboard, taking up
vertical space even when not in use (which is most of the time — users browse
by scrolling, not searching, for most interactions).

**Fix in redesign:** Search becomes a toggle icon in the header. Tapping it
animates a search bar sliding down. This recovers screen space for job content.

---

## Issue 10: No Visual Hierarchy for Urgency

**File:** `src/screens/DashboardScreen.tsx`

**Problem:** All jobs are shown in a flat list with the same visual weight.
Overdue jobs, due-today jobs, and future jobs all look identical except for
the small due-date chip text. There's no structural emphasis on urgency.

**Fix in redesign:** Due-date grouped sections (Overdue / This Week / Later /
No Due Date) with collapsible headers. Overdue jobs sit at the top with
danger-colored lateness indicators ("3 days late"). The inspector's eye is
immediately drawn to what needs attention.
