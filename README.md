# حاسبة العائد الاستثماري — ROI Calculator

A vanilla-JS app for working out investment return on shortage cases and splitting it between people. Arabic-first (RTL), with English/LTR, light/dark themes, an audit-ready report, and Excel/JSON export. Works offline and can be installed as an app.

## Files
| File | Purpose |
|---|---|
| `index.html` | The whole app: UI, calculation engine, both test suites. Works on its own, even opened from `file://`. |
| `sw.js` | Service worker for offline use (only runs over http(s)) |
| `manifest.webmanifest` | App manifest for installing |
| `icon.svg` | App icon (turned into a PNG at runtime for iOS) |

## Entry points
- `index.html`: the app (Cases · People · Report · Reference; press `1` to `4` to switch)
- `index.html?selftest=1`: calculation engine tests (74)
- `index.html?uitest=1`: interface tests (33). They drive the real page with an in-memory copy of storage, so your saved workspace is never touched. Results show on the page and in the console (`[uitest] N/M passed`).
- `index.html?perf=1`: engine benchmark

## Offline and install
- Once visited over https, the app, fonts and Excel engine are cached. Everything works offline, including Excel import and export.
- `index.html` is fetched from the network first and falls back to the cache after 3.5 s. A "New version ready — Refresh" message appears when an update has downloaded.
- To install: use the top-bar install button (shown only where supported) or "Install app" in the command palette (Ctrl/⌘+K). On iOS it shows Add-to-Home-Screen instructions.
- When releasing a change to `sw.js` itself, bump `CACHE_VERSION` in that file.

## Features
- Case modes: by dates, by months entered per year, or no timeline
- Accrual: commercial-15, actual/actual, inclusive months, next working month
- Annual, quarterly or monthly rate periods, optional compounding
- Per-person distribution: equal split, or by days worked (blended or per-period)
- Weekends and holidays, rate tables, and import from Excel or pasted text
- Report tabs, XLSX/JSON/Markdown export, print view, command palette, undo, warnings inbox
- Arabic-Indic digits accepted everywhere; accessible switches; warning when another tab changes the workspace; recovery screen for damaged data

## Data and storage
Everything is stored in the browser's `localStorage` under `investment-return-pro`. There is no backend. If saved data is damaged, a copy is kept as `investment-return-pro-backup-<timestamp>`.

## Dependencies (CDN, cached offline)
Google Fonts (Inter, Tajawal) · SheetJS `xlsx@0.18.5` (loaded when first needed)

## Next steps
- Run `?selftest=1` and `?uitest=1` automatically on every push (headless browser)
- Optional: encrypted export for sensitive workspaces
