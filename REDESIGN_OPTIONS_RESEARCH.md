# BPD Capture — Artifact Options Research

> **Source:** Claude artifact "BPD Capture Redesign" (3 interactive prototypes).
> This document captures the findings from reviewing each option and provides
> the rationale behind the hybrid recommendation in `REDESIGN_SPEC.md`.

---

## Shared Design Language

All three options share:
- **Theme name:** "Ink & Ember"
- **Typeface:** Outfit (geometric Google Font)
- **Color palette:** Deeper neutral darks ("Ink") with warm amber/coral accent ("Ember")
- **Approach:** Replace the current purple/cyan aesthetic with something that feels
  more like a rugged, professional field-service tool

---

## Option A: Due-Date Groups

**Tagline:** "Jobs sorted into Overdue, This week, Later"

### Dashboard
- **Header:** Large date display ("Tuesday", 13 October, 6 jobs in process)
- BPD logo top-left, search icon top-right
- **List Structure:** Automatic urgency buckets:
  - `Overdue (2)` — coral red lateness indicators ("1 day late", "3 days late")
  - `This week (2)` — due date shown ("15 Oct")
  - `Later (2)` — future jobs
  - `No due date` — unscheduled
- **Row Style:** Compact list row with square thumbnail, project title + client name,
  urgency tag on the right

### Job Detail
- Back arrow, title, status chips ("Overdue . 12 Oct", "CE-2024-0088")
- **Horizontal swipeable photo carousel** ("12 photos . 1 video . Swipe")
- Metadata (Client, Opened, Due Date, Notes) sits underneath the media reel

### Verdict
**Fastest scan speed.** An inspector immediately knows what needs attention today
without scrolling or checking a separate calendar tab.

---

## Option B: Focus Card

**Tagline:** "The most urgent job big, the rest slim"

### Dashboard
- **Header:** Clean "Jobs" display (6 in process, 2 overdue)
- **Hero "Focus Card":** A prominent card for the single most urgent job:
  - Tag: "NEEDS YOU FIRST . 3 DAYS LATE"
  - Large photo preview with project title, client, photo count
  - Accent circular arrow button to dive straight in
- **Secondary List:** Segmented pill toggle (In process / Completed) followed by
  slim, lightweight rows for remaining jobs

### Job Detail
- **Full-bleed hero cover image** behind top navigation with floating photo count chip
- **Segmented internal tabs:** Photos | Details | Notes

### Verdict
**Best single-task focus.** Directs the inspector directly to their primary site visit.
The tabbed Job Detail screen eliminates the endless vertical form scrolling.

---

## Option C: Timeline

**Tagline:** "Jobs along a date line"

### Dashboard
- **Header:** Month title ("October", 6 jobs, 2 overdue)
- **Interactive Day Scrubber:** 7-day horizontal bar (Sa 10, Su 11, Mo 12, [Tu 13],
  We 14, Th 15, Fr 16) with status dots indicating jobs due on each day
- **Vertical Date-Line:** Jobs branch off an interconnected vertical timeline with
  milestone nodes ("Saturday 10 Oct . overdue", "Monday 12 Oct . overdue")

### Job Detail
- Title, metadata chips ("1 day late", Client, CE number)
- **Field Notes First:** Prominently features job notes at the top before media
- **Date-Grouped Media:** Photos grouped into sub-sections by capture date
  ("Saturday 10 Oct . 6 photos")

### Verdict
**Best for multi-day jobs and site progression.** Essential if an inspection spans
multiple days (before/after work or phased insurance reviews).

---

## Comparative Matrix

| Feature | Option A | Option B | Option C |
|---|---|---|---|
| Dashboard urgency | Grouped buckets | Single hero card | Day scrubber + timeline |
| Scan speed | Fastest | Good | Moderate |
| Single-task focus | Low | Highest | Moderate |
| Multi-day awareness | Low | Low | Highest |
| Job Detail structure | Horizontal carousel | Tabbed (Photos/Details/Notes) | Notes-first, date-grouped |
| Photo organization | Flat carousel | Flat grid in tab | Date-grouped |
| Best for | Daily task triage | "What do I do next?" | Multi-day site visits |

---

## Hybrid Recommendation (what REDESIGN_SPEC.md implements)

| Screen | Source | What we take |
|---|---|---|
| **Dashboard** | Option A + Option C | Due-date groups from A (Overdue/This Week/Later/No Date) + day scrubber strip from C |
| **Job Detail** | Option B | Tabbed layout (Photos / Details / Notes) + cover photo hero |
| **Photo Reel** | Option C | Date-grouped media within the Photos tab |
| **Camera** | New | Multi-shot mode (not in any option, but a common pain point) |

### Why this hybrid?

1. **Option A's groups** give the fastest urgency scan — the inspector sees overdue
   jobs immediately without any interaction
2. **Option C's day scrubber** adds quick per-day filtering without replacing the groups
3. **Option B's tabbed Job Detail** solves the biggest UX problem (scrolling past 20
   photos to reach notes/fields)
4. **Option C's date-grouped photos** make multi-day site progression crystal clear
5. **Multi-shot camera** is the #1 field workflow improvement regardless of layout choice

---

## Visual Improvements Over Current App

1. **"Ink & Ember" palette** vs current colors: Warm neutral darks + amber/coral
   accent feels more like a rugged field tool than the cold purple/cyan
2. **Outfit typography** gives titles and numbers a distinct geometric character
   that matches the Blueprint Digital logo geometry
3. **Real photo thumbnails** replace the random-colored avatar circles on job cards
4. **Removed "View more" link** — the entire card is tappable (less visual clutter)
5. **Dramatically better space utilization** — current dashboard wastes vertical
   space with stacked hero bars, search boxes, and segmented controls
6. **Search moves to a toggle icon** instead of always-visible field
