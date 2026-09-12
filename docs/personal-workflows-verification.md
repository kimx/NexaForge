# Issues #86 and #87 — acceptance record

Validated on 2026-09-12 from the production build of `codex/complete-open-issues`.

## #86 — List Cleanup

- `/text/list-cleanup` and `/en/text/list-cleanup` are registered, prerendered and discoverable from the homepage task, catalog, sidebar and existing text workflow.
- Explicit Run applies existing services in clean → deduplicate → optional sort order. Rules remain editable before processing. Exact helper equivalence tests include case-sensitive rules, descending order, skipped sorting and trailing blank lines.
- Original input remains unchanged across reruns; previews expose each step and before/after line counts. The final text can be copied and downloaded.
- Personal templates allow creation, rename, deletion and resetting rules. Storage is allowlisted to names, steps and supported options, capped at 30 templates with unique names. Invalid/unavailable storage has a visible fallback; content is never stored.
- Workflow integration allows explicit import of the original input held by the existing in-memory text workflow. Reload starts with empty text.

## #87 — Personal tool settings

- Tool entry tracking is centralized in `ToolPageTemplate`. Real App navigation tests cover direct links, related links, sidebar, homepage launches and bilingual switching. The old six-entry writer was removed; recent IDs are valid, unique and capped at four.
- Pin/unpin controls expose localized accessible names and pressed state. Homepage pinned shortcuts and browser refresh persistence are verified.
- Compression saves only format and quality; cleaner saves checkbox choices. Files, entered text, target-size custom input and outputs are excluded. Unsupported storage versions and corrupt data revert to defaults.
- Scoped clear actions independently clear recents, pins, or options. Clear personal settings combines those three scopes and preserves language, existing QR settings and list templates. Each tool offers its own reset.
- Cross-tab resets synchronize controls and invalidate results generated with earlier options. Tests cover a cleaner draft retained across navigation while settings are reset.

## Verification evidence

- `npm test -- --run --maxWorkers=3`: **145 files, 757 tests passed**.
- `npm run build`: TypeScript, Vite client build, SSR build and prerender completed successfully.
- Code review found two stale-preference/result issues; both were fixed with regressions and re-reviewed successfully.
- `node scripts/verify-personal-workflows.mjs`: English and Traditional Chinese, desktop 1440×1000 and mobile emulation 390×844. All four flows passed explicit processing, previews, clipboard output, downloaded text, template save/rename/reload, pin persistence, compression WebP/63% restoration, empty cleaner input after reload, recent order/cap and scoped clearing. Storage checks confirm synthetic private inputs were absent.
- [Browser results](../artifacts/personal-workflows/results.json) retain viewport results and console observations. Mobile can emit the same recoverable React #421 hydration message observed on the existing production site; the workflow completes. This is not a claim of zero console warnings or physical-device testing.
- [PDF delivery audit for #88](issue-88-pdf-delivery-audit.md) separately records the previously deployed PDF version and representative output acceptance.

Browser audit scripts use optional local Playwright (and PDF audit canvas) dependencies and are separate from normal unit-test/build requirements. Run a built preview with `npm run preview -- --host 127.0.0.1 --port 4187 --strictPort`, then run the personal workflow script. `AUDIT_BASE_URL` and `AUDIT_OUTPUT` override its defaults.
