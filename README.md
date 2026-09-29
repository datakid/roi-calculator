# حاسبة العائد الاستثماري — ROI Calculator (v5)

Works out the investment return on shortage cases and splits the amount due between people. Arabic-first (RTL) with full English/LTR, light/dark/system themes, an audit-ready report, Excel/CSV/JSON/Markdown export, print-to-PDF, offline support, and installability. Vanilla JS with no build step and no backend.

## What changed in v5
- **New engine** (`js/engine.js`): a pure, stateless function `compute(input) → result`. It has no DOM, globals or caches shared across calls.
  - Dates are integer day numbers, so DST and timezones can't shift a day.
  - Working-day counts use per-year prefix sums, so any range is O(years).
  - Accrual conventions are a registry of `{window, factor}` rules. Adding a new convention takes one entry.
  - One accrual routine covers both the case level and the per-person level.
  - Allocation uses largest remainder, supports signed values, and never gives a unit to a zero-weight part.
  - Every result has typed issues (`{code, severity, caseId, personId, params}`) instead of free text.
- **Golden figures from v4 are reproduced exactly.** The golden test case gives c1 = 362,225, c2 = 93,850, total 506,075.
- **Rebuilt UI with the same visual identity** (palette, Tajawal/Inter, radii, soft insets, gradient brand mark):
  - A DOM-morph renderer that keeps focus and the text cursor while you type.
  - Collapsible case cards with a status pill and the amount due in the header.
  - A live summary strip and an inline year-by-year table.
  - An issues centre with one-click fixes (add rates, confirm 0%, jump to the case or person).
  - A command palette (Ctrl/⌘ K) that also searches cases and people.
  - Unlimited undo/redo (Ctrl Z / Ctrl Shift Z) with typing coalesced into single steps.
  - Native `<dialog>` modals, a keyboard-navigable date picker that shows weekends and holidays, and typed date entry (dd/mm/yyyy, ISO, Arabic digits).
  - A mobile layout with a floating add button.
- **Data sources in their own file**: `data/sources.json`.

## Data sources (edit without redeploying code)
`data/sources.json` holds:
- `rateTables[]`: `{ id, name:{ar,en}, description, source, rates:{ "2024": 19.75, … } }`
- `calendars[]`: `{ id, name, weekend:[0-6], holidays:[{name, date, repeats}] }`, available as presets under Settings → Calendar
- `defaults`: convention, frequency, distribution, rounding unit, extra rate, default expense rate, weekend, currency, default table
- `links.lite`

How it loads:
- The app fetches this file network-first on every visit.
- It falls back to the last cached copy when offline, and to a built-in copy if the file is unreachable.
- Settings → Data sources shows the status and version, lets you refresh it, and lets you point the app at any CORS-enabled JSON URL.

Local edits never modify the file. They are stored as an overlay on this device (`rateOverrides`), so official updates still flow through and each year shows whether it is Official, Edited locally, Added locally or Removed locally. You can also create local rate tables and pick a table per case.

## Calculation modes
| Area | Options |
|---|---|
| Accrual convention | 15-day rule (commercial) · Next working day of next month · Inclusive months · Actual/Actual · **Actual/365** · **Actual/360** · **30E/360** |
| Duration per case | From dates · Months per year · No schedule |
| Rate source per case | Any rate table (default ★ or a specific one) · Fixed rate (optionally plus the annual addition) |
| Method | Compound · Simple; frequency annual / quarterly / monthly (global, overridable per case) |
| Rounding | Case total · Each year · None, with a **configurable unit** (0.01 … 100) |
| Distribution | Equal · By working days · **By shares** |
| Per-person return (days mode) | Blended split · Per-person periods |
| Day-count basis (days mode) | Working days · Calendar days |
| Manual weights | Per-case day overrides, plus per-year days for manual-duration cases |

Guarantees, checked by tests:
- Year rows sum to the case return.
- People sum to the case due in every mode.
- Anything that can't be distributed is shown as unallocated with an issue.
- Excluded cases are listed with their reason in the report and in Excel.

## Entry points
- `index.html`: the app. Press `1`–`4` to switch views, `N` for a new case, `/` to search, `Ctrl/⌘ K` for the palette and `Ctrl/⌘ ,` for settings.
- `index.html?view=report`: opens directly on a view (`cases|people|report|reference`).
- `tests.html`: the engine test suite (48 tests, including a 600-scenario property test, the golden figures and a performance check). `index.html?selftest=1` redirects here.

## Files
| Path | Purpose |
|---|---|
| `index.html` | Shell |
| `css/app.css` | All styles (light/dark, RTL/LTR, responsive, print) |
| `js/boot.js` | Applies the theme and direction before first paint |
| `js/engine.js` | Pure calculation engine (`window.ROIEngine`) |
| `js/i18n.js` | Arabic/English dictionary |
| `js/store.js` | State, v4→v5 migration, undo/redo history, persistence, sources loader, workspaces |
| `js/ui.js` | Formatting, DOM morph, dialogs, popovers, menu, date picker, toasts, file helpers |
| `js/views.js` | Topbar, Cases, People, Report, Reference views and report tables |
| `js/panels.js` | Settings sections, issues centre, command palette |
| `js/app.js` | Event wiring, actions, import/export, keyboard, service-worker registration |
| `data/sources.json` | Rate tables, calendars, defaults |
| `sw.js` | Offline service worker (bump `CACHE_VERSION` on release) |
| `manifest.webmanifest`, `icon.svg`, `images/` | Install metadata and icons |
| `tests.html`, `js/engine.test.js`, `js/tests-runner.js` | Engine tests |

## Storage
- The state is saved in `localStorage` under `roi-calc-v5`: prefs, settings, rate overrides, local tables and workspaces (cases, people, report info).
- On first run, v4 data under `investment-return-pro` is migrated automatically and the old key is left untouched.
- Damaged data is copied to `roi-calc-v5-backup-<timestamp>` before the app starts fresh.
- The last good sources file is cached under `roi-calc-sources-cache`.
- JSON backups from v4 and v5 can be imported (Settings → Data). An import opens as a new workspace.

## Exports
- **Excel**: Case ledger, People totals, Per-person detail, Excluded cases, Issues, plus an audit sheet (settings, rate table, per-case logic, settings hash, engine and sources versions).
- **CSV**: the current table.
- **JSON**: a full backup.
- **Markdown**: copied to the clipboard.
- **Print/PDF**: prints every table and the explanation.

Excel is loaded on demand from cdnjs and cached for offline use. If it can't load, the app offers CSV instead.

## Not yet implemented / next steps
- Hijri-calendar holiday presets. Moving holidays have to be entered per year for now.
- Syncing workspaces across devices, which would need a backend.
- Diffing the current figures against a previously exported backup.
- UI regression tests. The old in-page UI tests were retired together with the old DOM.
