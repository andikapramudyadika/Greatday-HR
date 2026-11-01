# Verification — 1 November 2026

## Automated checks

- `pnpm build`: passed. TypeScript checks and Vite production build completed; no oversized-chunk warning after editor code splitting.
- `pnpm test`: 23 tests passed.
- Coverage includes valid and invalid dates/times, shift validation, duplicate dates, status normalization, period filtering, month/year boundaries, working time and overtime, real script-driven IndexedDB writes and reload, failed-write preservation, lexical scope, immutable const bindings, pause/resume gating, stop behavior, and rejected browser/prototype access.

## Browser checks

Checked both development and production builds in the browser:

- Run the supplied attendance-editing template; Dashboard, history, and JSON inspector synchronize.
- Change the JavaScript source in CodeMirror, run it, and verify the new times/notes in history.
- Edit attendance through the visual form; invalid checkout before check-in is rejected.
- Record actual device time through Rekam Waktu; check-in enables check-out and both save.
- Reload; persisted times remain present.
- Change attendance month; history and inspector filter while Dashboard stays on today.
- Report reflects the selected records (e.g. 08:00–17:00 → 9 hours, 1 hour overtime).
- Save employee name in Settings; Dashboard updates.
- Switch VS Code Dark, Monochrome, Rainbow Code; all panels change theme.
- Pause, resume, and stop script execution through terminal controls.
- Resize editor/inspector and terminal using keyboard-accessible separators.
- Mobile footer terminal shortcut selects the terminal pane.
- Final production page recorded no browser warnings or errors.

Responsive viewports checked: 1440×900 desktop, 820×1180 tablet, 390×844 smartphone. At 1440px, the measured Dashboard width is 417.59px (29%). At 390px, document width equals viewport width, with no page-level horizontal overflow. Code/JSON panes scroll independently.

Screenshots:

- [Desktop](workspace-desktop.jpg)
- [Tablet](workspace-tablet.jpg)
- [Smartphone](workspace-mobile.jpg)

Screenshots show disposable local example data used during verification. Browser viewport checks do not constitute physical Android-device testing. GitHub Pages workflow is supplied; deployment was not performed. Script syntax and overnight-shift limitations are documented in the application API Reference and README.
