# BPD Capture — Redesign Specification

> **Purpose:** This document is the complete build spec for the redesign branch.
> Another agent should be able to implement every change described here without
> needing to ask clarifying questions. Work on the `redesign` branch.
> **Update `DESIGN_SYSTEM.md` alongside every code change.**

---

## 1. Design Direction: "Ink & Ember" Hybrid

The redesign combines the best elements from three concept prototypes (Options A, B, C)
into a single cohesive design, replacing the current purple/cyan aesthetic with a
warmer, more professional "Ink & Ember" palette.

### What changes (high level)

| Area | Current | Redesign |
|---|---|---|
| **Color palette** | Deep purple/navy + cyan-purple gradient | "Ink" (neutral darks) + "Ember" (warm amber/coral accent) |
| **Typography** | System font (Roboto) | **Outfit** (Google Font, geometric, matches BPD logo geometry) |
| **Dashboard layout** | Hero band + search + segments + flat card list | Due-date groups (Overdue / This Week / Later) + day scrubber strip |
| **Job Detail** | Monolithic vertical scroll (everything in one long page) | Tabbed layout: Photos \| Details \| Notes |
| **Photo organization** | Flat grid | Date-grouped media (photos grouped by capture date) |
| **Job cards** | Avatar palette fallback colors + "View more" link | Real photo thumbnails + cleaner row design |
| **Camera** | Single-shot (returns to Job Detail after each photo) | Multi-shot mode with shot counter |

### What stays the same

- Overall navigation structure (4-tab bottom bar)
- SQLite local-first architecture
- Startup animation (keep the pencil-draws-logo animation)
- PDF Field Report / Daily Digest functionality
- All existing data models and business logic

---

## 2. New Color Tokens

Replace the values in `src/theme/theme.ts`. The token *names* stay the same for
backward compatibility — only the *values* change.

```typescript
export const colors = {
  // Backgrounds — "Ink" palette (slightly warmer undertone than current blue-grays)
  background: '#0F0F12',     // was #131316 — deeper, richer black
  surface:    '#1A1A1F',     // was #1C1C21 — subtle warm undertone
  surfaceMuted: '#242428',   // was #26262C
  border:     '#2E2E33',     // was #333238

  // Text — slightly warmer whites
  textPrimary:   '#F2F0ED',  // was #F5F5F7 — warm white
  textSecondary: '#9A9590',  // was #9C9BA3 — warm gray
  textMuted:     '#6B6560',  // was #6E6D74 — warm muted
  textOnDark:    '#FFFFFF',  // unchanged

  // Accent — "Ember" (warm amber-coral replacing cold purple)
  accent:        '#E8734A',  // warm coral-orange — primary interactive color
  accentPressed: '#D4613A',  // pressed state
  accentTint:    '#2D1D15',  // tinted background (for hero band, chips, etc.)

  // Status colors — keep semantic meaning, slightly adjust to harmonize
  success:     '#3ECF8E',    // unchanged — green for Completed
  successTint: '#122E22',    // slightly adjusted
  warning:     '#E8B93C',    // unchanged — amber for In Process
  warningTint: '#332A12',    // unchanged
  danger:      '#F2545B',    // unchanged — red for Overdue
  dangerTint:  '#331518',    // unchanged

  dark: '#000000',           // unchanged
} as const;

// Gradient shifts from cyan-purple to a warm ember gradient
export const gradientAccent = ['#E8734A', '#D4A74A'] as const;
// Alternative if you prefer the ember-to-gold sweep:
// export const gradientAccent = ['#E8734A', '#F5C563'] as const;
```

### Avatar palette (updated to harmonize with ember)

```typescript
const avatarPalette = [
  '#E8734A', // ember (accent)
  '#4AADE8', // cool blue (complementary)
  '#E8B93C', // gold
  '#3ECF8E', // green
  '#E84A6E', // rose
  '#8B6CE8', // soft purple
  '#4AE8C4', // teal
];
```

---

## 3. Typography — Switch to Outfit

### Installation

```bash
npx expo install expo-font @expo-google-fonts/outfit
```

### Font loading in `App.tsx`

```typescript
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';

// Inside the App component:
const [fontsLoaded] = useFonts({
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
});
```

### Updated typography tokens in `theme.ts`

```typescript
export const typography = {
  display:  { fontSize: 26, fontFamily: 'Outfit_800ExtraBold',  color: colors.textPrimary },
  title:    { fontSize: 19, fontFamily: 'Outfit_700Bold',       color: colors.textPrimary },
  subtitle: { fontSize: 15, fontFamily: 'Outfit_600SemiBold',   color: colors.textPrimary },
  body:     { fontSize: 15, fontFamily: 'Outfit_400Regular',    color: colors.textPrimary },
  caption:  { fontSize: 13, fontFamily: 'Outfit_500Medium',     color: colors.textSecondary },
  label:    { fontSize: 12, fontFamily: 'Outfit_700Bold',       color: colors.textMuted,
              textTransform: 'uppercase' as const, letterSpacing: 0.6 },
};
```

> **Important:** Every `fontWeight` reference in `StyleSheet.create` blocks across all
> screens must be replaced with `fontFamily` references. Search the entire `src/` for
> `fontWeight` and update each occurrence.

---

## 4. Dashboard Screen — `src/screens/DashboardScreen.tsx`

### New layout (replaces current hero band + flat list)

```
+------------------------------------------+
| [BPD logo 44px]              [search]    |  <- simplified header
|                                          |
|  Tuesday                                 |  <- large day name (display style)
|  13 October . 6 jobs in process          |  <- date + count (caption style)
|                                          |
| +--------------------------------------+ |
| | Sa  Su  Mo  [Tu]  We  Th  Fr         | |  <- Day scrubber strip (from Option C)
| | 10  11  12  [13]  14  15  16         | |    Active day = ember accent circle
| |  .       .   .         .             | |    Dots = days with due jobs
| +--------------------------------------+ |
|                                          |
| In Process (4)    Completed (2)          |  <- Segmented control (keep)
|                                          |
| v OVERDUE (2)                            |  <- Collapsible section header
| +--------------------------------------+ |
| | [img] Storm damage inspection        | |  <- Real thumbnail, not avatar
| |       Acme Corp . CE-2024-0088       | |
| |       1 day late                     | |  <- Danger-colored lateness indicator
| +--------------------------------------+ |
| +--------------------------------------+ |
| | [img] Pool deck inspection           | |
| |       Smith & Co . CE-2024-0091      | |
| |       3 days late                    | |
| +--------------------------------------+ |
|                                          |
| v THIS WEEK (2)                          |
| +--------------------------------------+ |
| | [img] Fence repair assessment        | |
| |       Jones Ltd . CE-2024-0095       | |
| |       Due 15 Oct                     | |  <- Accent-colored due date
| +--------------------------------------+ |
|                                          |
| v LATER (1)                              |
| +--------------------------------------+ |
|                                          |
| v NO DUE DATE (1)                        |
|                                          |
|                                    [+]   |  <- FAB (now ember accent)
+------------------------------------------+
```

### Implementation details

1. **Day scrubber strip** — new component `src/components/DayScrubber.tsx`:
   - Horizontal row showing 7 days centered on today
   - Each day: 2-letter abbreviation + day number
   - Today gets an `accent` circle behind the number
   - Small dot indicators below days that have jobs with due dates
   - Tapping a day filters the list to jobs due that day (or shows all if tapped again)
   - Swipe left/right to scroll through weeks

2. **Due-date grouped sections** — group jobs into collapsible buckets:
   - `OVERDUE (n)` — jobs past due date, sorted by most overdue first
   - `THIS WEEK (n)` — jobs due within the current week
   - `LATER (n)` — jobs due more than a week from now
   - `NO DUE DATE (n)` — jobs without a due date assigned
   - Section headers are tappable to collapse/expand (animated)

3. **Remove "View more" link** from job cards — the entire card is tappable

4. **Job card redesign** — `src/components/OrderListItem.tsx`:
   - Remove the avatar color palette fallback
   - Show real first-photo thumbnail (48x48, `md` radius) or a muted placeholder icon
   - Project name as primary text (keep)
   - Client + CE number as secondary line (keep)
   - Replace due-date chip in bottom row with inline lateness text:
     - Overdue: danger color text "X days late"
     - Due today: warning color "Due today"
     - Future: accent color "Due Mon, 15 Oct"
     - No date: textMuted "No due date"
   - Keep the 4px colored left edge (amber/green)
   - Keep press scale animation

5. **Header simplification** — remove the hero gradient band. Just:
   - BPD logo (44px) top-left
   - Search icon top-right
   - Large day name below (e.g., "Tuesday")
   - Subtitle with date + job count

6. **Search** — search icon in header opens an animated search bar that slides down
   (replaces the always-visible search field)

---

## 5. Job Detail Screen — `src/screens/JobDetailScreen.tsx`

### New layout (tabbed, from Option B)

```
+------------------------------------------+
| <- Back                          Save    |  <- Header (keep accent Save)
|                                          |
| +--------------------------------------+ |
| |                                      | |
| |        [Full-width cover photo]      | |  <- Hero image (first photo, 200px tall)
| |                                      | |    Floating chip: "12 photos"
| |                                      | |    If no photos: muted placeholder
| +--------------------------------------+ |
|                                          |
|  Storm damage inspection                 |  <- Project name (display, editable)
|  Acme Corp . CE-2024-0088               |  <- Client + CE number (caption)
|  Overdue . 12 Oct    In Process          |  <- Status chips
|                                          |
| +--------+------------+---------+        |
| | Photos |  Details   |  Notes  |        |  <- Tab bar (3 segments)
| +--------+------------+---------+        |
|                                          |
|  [Tab content area - see below]          |
|                                          |
+------------------------------------------+
```

### Tab: Photos

```
+------------------------------------------+
|  [Capture]  [Upload from Gallery]        |  <- Action buttons at top of tab
|                                          |
|  SATURDAY 10 OCT . 6 PHOTOS             |  <- Date-grouped sections (Option C)
|  +-----+ +-----+ +-----+               |
|  | img | | img | | img |               |  <- 3-column grid
|  +-----+ +-----+ +-----+               |
|  +-----+ +-----+ +-----+               |
|  | img | | img | | img |               |
|  +-----+ +-----+ +-----+               |
|                                          |
|  MONDAY 12 OCT . 4 PHOTOS               |
|  +-----+ +-----+ +-----+               |
|  | img | | img | | img |               |
|  +-----+ +-----+ +-----+               |
|  +-----+                                |
|  | img |                                |
|  +-----+                                |
|                                          |
|  Export Field Report                     |  <- Gradient button (keep)
|                                          |
|  Delete Job                              |  <- Danger text link (keep)
+------------------------------------------+
```

### Tab: Details

```
+------------------------------------------+
|  CE NUMBER                               |
|  +--------------------------------------+|
|  | CE-2024-0088                         ||  <- Input field (keep)
|  +--------------------------------------+|
|                                          |
|  CLIENT NAME                             |
|  +--------------------------------------+|
|  | Acme Corp                            ||  <- Input with autocomplete (keep)
|  +--------------------------------------+|
|                                          |
|  PROJECT NAME                            |
|  +--------------------------------------+|
|  | Storm damage inspection              ||
|  +--------------------------------------+|
|                                          |
|  DUE DATE                                |
|  [Due Mon, 12 Oct]                       |  <- Due date chip (full size, keep)
|                                          |
|  STATUS                                  |
|  +-------------+---------------+         |
|  | In Process  |  Completed    |         |  <- Status toggle (keep)
|  +-------------+---------------+         |
|                                          |
|  OPENED                                  |
|  10 October 2024                         |
|                                          |
|  COMPLETED                               |
|  --                                      |
+------------------------------------------+
```

### Tab: Notes

```
+------------------------------------------+
|  FIELD NOTES                             |
|  +--------------------------------------+|
|  | Fence panels down along the east     ||
|  | boundary; gutter torn at the back    ||  <- Multi-line text area (keep)
|  | corner. Insurer needs the report by  ||
|  | end of week.                         ||
|  |                                      ||
|  +--------------------------------------+|
|                                          |
|  Last edited: 12 Oct 2024, 14:32        |  <- New: timestamp of last note edit
+------------------------------------------+
```

### Implementation details

1. **Cover photo**: Display the first photo from the job's media as a full-width hero
   image (200px height, `overflow: 'hidden'`). Floating chip overlay showing photo count.
   If no photos exist, show a muted placeholder with a camera icon.

2. **Tab bar**: Use a custom segmented control (3 segments). Active tab = `accent` color
   underline or fill. Store active tab in component state, default to "Photos".

3. **Date-grouped media**: In the Photos tab, group photos by their capture date
   (from file metadata or creation timestamp). Each group has a `label`-style header
   showing the date and photo count.

4. **Details tab**: All the existing editable fields (CE Number, Client Name, Project
   Name, Due Date, Status) move here. This eliminates the "endless scroll past photos"
   problem.

5. **Notes tab**: The existing notes field, given its own dedicated space. Add a "last
   edited" timestamp below.

---

## 6. Camera / Capture — `src/screens/CaptureScreen.tsx`

### Multi-shot mode

The camera should stay open after taking a photo, allowing rapid capture:

```
+------------------------------------------+
| X Cancel                    12 photos    |  <- Shot counter (top-right)
|                                          |
|                                          |
|         [Camera viewfinder]              |
|                                          |
|                                          |
|                                          |
|                                          |
|                                          |
| +-----+                                 |
| |last |  <- Last captured thumbnail     |
| |shot |     (small, bottom-left)        |
| +-----+                                 |
|                                          |
|       Photo o----- Video                 |  <- Mode toggle (keep)
|                                          |
|              [ O ]                       |  <- Shutter button
|                                          |
|         Done (12 photos)                 |  <- "Done" button to exit
+------------------------------------------+
```

### Implementation details

1. **Don't navigate away after each capture** — stay on the camera screen
2. **Shot counter** in the top-right showing "N photos" that increments with each shot
3. **Last-shot thumbnail** in the bottom-left (40x40) showing the most recent capture
   with a brief scale-up animation on each new shot
4. **"Done" button** below the shutter to exit camera and return to Job Detail
5. **Haptic feedback** (if available) on each capture — `expo-haptics` light impact
6. The existing "X Cancel" still exits without saving the current session

---

## 7. Insights Screen — `src/screens/InsightsScreen.tsx`

### Minor visual refresh (same layout, updated tokens)

- Update stat tile colors to use the new ember accent
- The overdue stat tile keeps `danger` / `dangerTint`
- The "due this week" stat tile keeps `warning` / `warningTint`
- The completion meter keeps its current design, just with updated accent color
- The overdue jobs list at the bottom uses the same redesigned card style as Dashboard

No structural changes needed — the Insights screen works well as-is.

---

## 8. Calendar Screen — `src/screens/CalendarScreen.tsx`

### Minor visual refresh

- Today circle: change from `accentTint` circle to `accent` (ember) circle
- Job dots under calendar days: keep status-colored dots
- Week view: use the same redesigned card rows as Dashboard
- Month/Week segmented control: update to new accent color

No structural changes needed.

---

## 9. Settings Screen — `src/screens/SettingsScreen.tsx`

### Minor visual refresh

- Update button colors (accent to ember)
- Update section headers to Outfit font
- Keep all existing functionality (Sync, Clients, Dispatcher, Backup, Updates)

No structural changes needed.

---

## 10. New Components to Create

### `src/components/DayScrubber.tsx`

A horizontal 7-day strip for quick date filtering on the Dashboard.

```typescript
interface DayScrubberProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  jobDueDates: Date[];  // dates that have jobs due — shown as dots
}
```

- Render 7 days centered on today
- Swipeable left/right to navigate weeks
- Active day gets `accent` circle background
- Days with due jobs get a small dot indicator below the number
- Tapping the active day again deselects it (shows all jobs)

### `src/components/JobDetailTabs.tsx`

Tab navigation for the Job Detail screen.

```typescript
interface JobDetailTabsProps {
  activeTab: 'photos' | 'details' | 'notes';
  onTabChange: (tab: 'photos' | 'details' | 'notes') => void;
  photoCount: number;
  hasNotes: boolean;
}
```

- 3 equal-width segments
- Active tab: `accent` text + `accent` bottom border (2px)
- Inactive: `textSecondary`
- Optional badge dots on Photos (count) and Notes (has content)

### `src/components/DateGroupedMedia.tsx`

Photos organized by capture date (replaces flat `MediaGrid` in the Photos tab).

```typescript
interface DateGroupedMediaProps {
  media: MediaItem[];
  onMediaPress: (item: MediaItem) => void;
  onMediaDelete: (item: MediaItem) => void;
  onMediaRename: (item: MediaItem) => void;
}
```

- Groups media by date (using file creation/modification timestamp)
- Each group: `label`-style header "SATURDAY 10 OCT . 6 PHOTOS"
- 3-column grid within each group
- Keep existing menu functionality from `MediaGrid`

### `src/components/CollapsibleSection.tsx`

Animated collapsible section header for Dashboard groups.

```typescript
interface CollapsibleSectionProps {
  title: string;       // e.g. "OVERDUE"
  count: number;
  tone?: 'danger' | 'warning' | 'accent' | 'muted';
  defaultExpanded?: boolean;
  children: React.ReactNode;
}
```

- Chevron rotates 90 degrees on collapse/expand (Animated)
- Content height animates (LayoutAnimation or Animated)
- Section count displayed in parentheses
- Tone colors the count badge

---

## 11. Migration Checklist

When implementing, follow this order:

- [ ] **Phase 1: Tokens** — Update `theme.ts` colors, gradient, typography. Update
      `DESIGN_SYSTEM.md` sections 2, 4 with new values.
- [ ] **Phase 2: Font** — Install Outfit, load in `App.tsx`, update all `fontWeight`
      references across all files to `fontFamily`.
- [ ] **Phase 3: Dashboard** — Build `DayScrubber`, `CollapsibleSection`, update
      `DashboardScreen`, update `OrderListItem`. Update `DESIGN_SYSTEM.md` sections 5, 6.
- [ ] **Phase 4: Job Detail** — Build `JobDetailTabs`, `DateGroupedMedia`, restructure
      `JobDetailScreen` into tabs. Update `DESIGN_SYSTEM.md` sections 5, 6.
- [ ] **Phase 5: Camera** — Add multi-shot mode to `CaptureScreen`. Update
      `DESIGN_SYSTEM.md` section 6.
- [ ] **Phase 6: Polish** — Update remaining screens (Calendar, Insights, Settings) with
      new tokens. Final `DESIGN_SYSTEM.md` review.
- [ ] **Phase 7: Navigation** — Update `RootNavigator.tsx` theme colors to match new
      tokens (header backgrounds, tab bar colors, etc.).

---

## 12. Files to modify

| File | Changes |
|---|---|
| `src/theme/theme.ts` | All color values, gradient, typography (font family) |
| `App.tsx` | Add font loading |
| `src/screens/DashboardScreen.tsx` | Complete layout rewrite (groups + scrubber) |
| `src/screens/JobDetailScreen.tsx` | Restructure into tabbed layout |
| `src/screens/CaptureScreen.tsx` | Add multi-shot mode |
| `src/screens/InsightsScreen.tsx` | Token updates only |
| `src/screens/CalendarScreen.tsx` | Token updates only |
| `src/screens/SettingsScreen.tsx` | Token updates only |
| `src/screens/NewOrderScreen.tsx` | Token updates only |
| `src/components/OrderListItem.tsx` | Redesign card (remove avatar palette, add thumbnail) |
| `src/components/DueDateChip.tsx` | Update colors |
| `src/components/StatTile.tsx` | Update colors |
| `src/components/StatusToggle.tsx` | Update colors |
| `src/components/MediaGrid.tsx` | Keep as fallback, add date grouping logic |
| `src/components/Meter.tsx` | Update colors |
| `src/components/MonthCalendarBoard.tsx` | Update today highlight color |
| `src/components/DueDateCalendarModal.tsx` | Update colors |
| `src/navigation/RootNavigator.tsx` | Update theme colors for headers and tab bar |
| `DESIGN_SYSTEM.md` | Update throughout |

### New files to create

| File | Purpose |
|---|---|
| `src/components/DayScrubber.tsx` | 7-day horizontal date strip |
| `src/components/JobDetailTabs.tsx` | Photo/Details/Notes tab bar |
| `src/components/DateGroupedMedia.tsx` | Date-grouped photo grid |
| `src/components/CollapsibleSection.tsx` | Animated collapsible section |

---

## 13. What NOT to change

- **Startup animation** — keep the pencil-draws-logo animation exactly as-is (it uses
  its own colors from the real logo file, independent of the app theme)
- **Data layer** — `src/db/`, `src/services/`, `src/sync/` — no changes
- **PDF report** — `services/reportPdf.ts` — keep the gradient header (the PDF is a
  separate document with its own white-page styling)
- **Business logic** — all job CRUD, search, backup/restore, sync — no changes
- **Package identity** — `com.blueprintdigital.bpdcapture` stays the same
