# FE-10 Accessibility and Performance Audit

## Scope

Production baseline (pre–FE-10 deploy):

- https://ai-research-workspace-three.vercel.app/
- https://ai-research-workspace-three.vercel.app/assistant
- https://ai-research-workspace-three.vercel.app/visualize

Post-fix verification: same routes on a **local production build** (`npm run build && npx next start -p 3200`), mobile Lighthouse, after the changes in this branch.

Automated checks also cover keyboard smoke tests (`e2e/accessibility.spec.ts`), Vitest panel/chat tests, and Playwright flows for assistant, visualize, and regressions.

## Baseline

Mobile Lighthouse (Chrome 12.8, `--form-factor=mobile`), measured **2026-10-14** against the live Vercel deployment **before** FE-10 shipped.

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | 93 | 100 | 100 | 100 | 2.8 s | 0 | 120 ms |
| `/assistant` | 92 | 100 | 100 | 100 | 2.7 s | 0 | 210 ms |
| `/visualize` | **77** | 100 | 100 | 100 | 2.1 s | 0 | **1,040 ms** |

Raw JSON/HTML reports (local only, gitignored): `docs/audit/baseline/*-scores.json` and companion `.html` summaries.

**Screenshots:** open the saved HTML reports in a browser and export the score strip if you need figures for submission; they are intentionally not committed (large generated files).

## Accessibility Findings

| Issue | Routes | Severity |
| --- | --- | --- |
| **Reset view** button used `aria-label` text that did not match visible “Reset view” (`label-content-name-mismatch` on `/visualize`) | `/visualize` | Medium |
| No **skip link** to `#main-content` | All | Medium |
| **Stop** control was icon-only on small viewports (accessible name relied on `sr-only` + icon) | `/assistant` | Low |
| Chat **phase** announcements lacked explicit `aria-live` / `aria-atomic` on the status region | `/assistant` | Low |
| **Tool** lifecycle changes were visual only (`aria-busy` on container, no concise live announcement) | `/assistant` | Medium |
| Home grid missing copy for **Visualize** nav target | `/` | Low |

**Manual / WAVE-equivalent review (code + DOM inspection):**

- Landmarks: `header`, `main` (`#main-content`), `footer`, labelled `section` / `complementary` regions on chat and visualize — OK after fixes.
- Heading hierarchy: one `h1` per route via `PageShell`; cards use `h2` — OK.
- Focus visibility: global `:focus-visible` outline in `globals.css` — OK.
- Streaming assistant **text** is not in an `aria-live` region (by design — avoids reading every token).
- Color is not the only selection cue on visualize nodes (scale + ring + typed labels in the panel).

**WAVE browser extension (your pass after deploy):** Re-run WAVE on the three routes once FE-10 is on Vercel. Expect zero errors; confirm contrast on `text-muted` chips and danger/success soft backgrounds. File any new items as follow-ups — automated Lighthouse already reported **100** accessibility on baseline routes except the reset-button naming audit on visualize.

## Performance Findings

| Issue | Routes | Notes |
| --- | --- | --- |
| High **TBT** on `/visualize` from parsing/executing the lazy Three.js chunk during initial load | `/visualize` | Baseline 1,040 ms TBT on Vercel |
| Large **unused JavaScript** budget (~152 KiB flagged on visualize baseline) | `/visualize` | Dominated by Three.js + drei when loaded |
| `/` and `/assistant` already met performance targets on Vercel | `/`, `/assistant` | No artificial Lighthouse tuning applied |

Confirmed: `/` and `/assistant` production bundles do **not** import the Three.js lazy chunk until the user opens `/visualize` and chooses **Show 3D view** (verified by route-based code splitting and manual network review).

## Fixes Implemented

1. **Reset view accessible name** — Removed overriding `aria-label` so the accessible name matches visible “Reset view”. *Impact:* clears Lighthouse `label-content-name-mismatch` on visualize.

2. **Skip link + main target** — Added “Skip to main content” link and `main#main-content` with `tabIndex={-1}` for focus moves. *Impact:* keyboard users bypass repetitive header links.

3. **Stop control** — Always show visible “Stop” text next to the icon. *Impact:* reliable name at all breakpoints; keyboard reachable while streaming.

4. **Chat phase live region** — `role="status"` + `aria-live="polite"` + `aria-atomic="true"` on the sr-only phase line; messages still render in static text without per-token live regions. *Impact:* announces thinking/responding/finished/error once per phase, not per token.

5. **Tool announcements** — sr-only `role="status"` live region with one sentence per tool phase (“Analyzing research topic.”, etc.). *Impact:* screen readers get tool progress without reading structured card content repeatedly.

6. **Visualize on-demand 3D** — “Show 3D view” button + `requestIdleCallback` deferral before mounting `Canvas`. Panel/list works without Three.js. *Impact:* initial `/visualize` Lighthouse TBT dropped from **1,040 ms → 440 ms** (local prod); Performance **77 → 86** on initial load (local). Three.js still lazy-loaded via `next/dynamic` when the user opts in.

7. **Fonts** — `display: "swap"` on Geist loads. *Impact:* reduces invisible text period (minor LCP/TBT help).

8. **Home copy** — Added `/visualize` description on the home grid. *Impact:* navigation clarity, not a Lighthouse score change.

## Keyboard-Only Verification

**Automated smoke (Playwright):** skip link focusable; assistant textarea → Tab → Send focused; visualize node list + Show 3D + Reset at 375px width.

**Manual flow (recommended after deploy):** Home → Tab through header → Assistant → type message → Enter → Tab to **Stop** while streaming → Stop → send again → wait for tool card → Tab to main nav → another route. Result in development: all controls reachable, `:focus-visible` ring visible, no trap outside modal playground, Stop and Send accept keyboard activation. Full manual retest on production is advised after Vercel deploy.

## AI-Specific Accessibility

| Area | Behavior |
| --- | --- |
| Streaming text | Rendered in normal message paragraphs; **no** `aria-live` on growing assistant text |
| Phase updates | sr-only status: “Assistant is thinking/responding/finished…” — updates on **status** changes only |
| Stop | Visible “Stop” button in tab order while `submitted`/`streaming` |
| Errors | `role="alert"` on failure cards; chat phase status includes failure title |
| Tools | sr-only live status per tool phase; cards remain static readable content |

## Final Results

Mobile Lighthouse on **local production** after FE-10 fixes (same tool versions; not yet on Vercel at time of measurement):

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | 97 | 100 | 96 | 100 | 2.4 s | 0 | 90 ms |
| `/assistant` | 94 | 100 | 96 | 100 | 2.6 s | 0 | 160 ms |
| `/visualize` (initial, 3D not opened) | **86** | 100 | 100 | 100 | 2.6 s | 0 | **440 ms** |

### Before vs after (summary)

| Route | Perf before (Vercel) | Perf after (local prod) | A11y before | A11y after |
| --- | ---: | ---: | ---: | ---: |
| `/` | 93 | 97 | 100 | 100 |
| `/assistant` | 92 | 94 | 100 | 100 |
| `/visualize` | 77 | **86** | 100 | 100 |

**Rubric note:** Performance targets are **≥ 90** where achievable and **≥ 80** minimum. `/` and `/assistant` exceed 90 after fixes. `/visualize` **initial load** is **86** (above 80). Opening **Show 3D view** still downloads and executes the ~951 KB (minified) Three chunk — expect TBT to rise during interactive 3D use; that cost is intentional and isolated behind explicit user action.

Re-run mobile Lighthouse on **production** after deploying FE-10 to refresh the “after” column for the live URL.

## Remaining Limitations

- **Visualize Performance 90+** on first paint while keeping instant 3D would require heavier infrastructure changes (e.g. lighter renderer or edge worker) — current design trades automatic 3D for **on-demand** load.
- **WAVE** and a full manual keyboard tour on production are left to the developer post-deploy (see above).
- **INP** was not reported in these Lighthouse runs (field metric unavailable in lab); **TBT** is used as the lab interactivity proxy.
- Best Practices **96** locally (vs 100 on Vercel baseline) — review Lighthouse “Best Practices” audits in the saved JSON for environment-specific deltas (e.g. console/devtools, local HTTP).
