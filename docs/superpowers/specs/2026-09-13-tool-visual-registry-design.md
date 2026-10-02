# Tool Visual Registry Design

## Context

Issue #98 requires the homepage, sidebar, and future tool entry points to use one consistent visual language for all registered tools. The repository currently contains 64 tools, but the homepage has visual metadata for only 27 tools, the sidebar infers icons from ID prefixes, and the two surfaces declare different category orders.

Primary actor: a visitor scanning or searching NexaForge tools on desktop or a 390px mobile viewport.

Job: identify the right tool quickly from its name, category, and visual marker, then open it.

Success: every registered tool has a predictable, category-compatible visual marker; category navigation has the same order everywhere; names and accessible names remain complete in both locales.

Constraints and evidence:

- `src/data/tools.ts` is the canonical tool list and contains exactly 64 tools.
- Existing category values are `Image`, `PDF`, `Data`, `Developer`, `Text`, and `QR & Barcode`.
- Homepage and sidebar already share the tool list and localization helpers but duplicate visual/order logic.
- The existing SVG sidebar icon vocabulary is intentionally small; the issue does not require 64 unique icons.
- Existing card and sidebar layouts must remain responsive and preserve wrapping for long localized titles.

## Design

### Central registry

Add `src/data/toolVisuals.ts` as the shared presentation registry. It will export:

- `TOOL_CATEGORY_ORDER`, the single ordered category list, using the current homepage order: `Image → PDF → Data → Developer → Text → QR & Barcode`.
- `CATEGORY_VISUALS`, mapping each category to its semantic sidebar icon and category-compatible default tone.
- `TOOL_VISUALS`, one entry for all 64 registered tool IDs. Each entry includes a short visual label, homepage tone, and sidebar icon semantic.
- A typed `getToolVisual(tool)` helper that returns the registered entry and, only as an explicit defensive runtime path, derives a category-compatible visual while emitting a development warning. The registry test remains the enforcement mechanism for additions.

The registry will not duplicate tool titles, descriptions, paths, or categories. Those remain authoritative in `src/data/tools.ts`.

### Homepage

`HomePage.tsx` will import `TOOL_CATEGORY_ORDER` and `getToolVisual`. The local `TOOL_VISUALS` table and `FILE` fallback will be removed. Every tool card will continue to render its full localized title and description, while the short visual label supplies a secondary scanning cue that does not depend on color alone.

### Sidebar

`ToolSidebar.tsx` will import `TOOL_CATEGORY_ORDER`, `CATEGORY_VISUALS`, and `getToolVisual`. The local category order and ID-prefix-based `getToolIcon` heuristic will be removed. Both expanded category lists and search results will use the registry icon, ensuring Developer tools never fall back to the Data icon and future categories cannot silently inherit an unrelated icon.

### Visual and responsive rules

- Category order is identical in homepage filters and sidebar navigation.
- Full localized names remain visible; labels wrap rather than truncate essential identity.
- Visual labels and icon semantics supplement, not replace, text and accessible names.
- Existing tones and CSS classes are reused where possible; no broad restyling is needed.
- At 390px, tool cards retain readable title/description flow and keep the open/pin actions reachable without horizontal page overflow.

## Data flow

`FILE_TOOLS` → `TOOL_CATEGORY_ORDER` for grouping/filter order → `getToolVisual(tool)` for each rendered tool → homepage card label/tone or sidebar icon. No component owns a second visual map or category order.

## Error handling

The registry test fails when a tool ID is missing from `TOOL_VISUALS`, when a category is missing from `TOOL_CATEGORY_ORDER`, or when a tool's sidebar icon is incompatible with its category. Runtime defensive lookup will be category-specific rather than the current generic `FILE`/`data` fallback and will be observable in development diagnostics.

## Verification

- Unit test the registry against all 64 `FILE_TOOLS` entries, including complete coverage, unique category order, and category-compatible icon semantics.
- Run focused homepage and sidebar tests plus the registry test.
- Run the full Vitest suite and TypeScript/build checks.
- Run the app in a browser at a wide viewport and 390px, inspect homepage search/filter cards and sidebar category/search results, and verify long localized labels remain readable.

