# Tool Visual Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 64 registered NexaForge tools predictable visual metadata and make homepage/sidebar category order and icon semantics come from one shared registry.

**Architecture:** Keep `src/data/tools.ts` as the source of tool content and categories. Add a focused `src/data/toolVisuals.ts` registry for category order, category icon semantics, and per-tool card/sidebar visuals; both `HomePage.tsx` and `ToolSidebar.tsx` consume it through typed helpers. Registry tests enforce complete coverage so a future tool cannot silently use the old generic fallback.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, existing CSS/SVG icon vocabulary, React Router.

**Spec:** `docs/superpowers/specs/2026-09-13-tool-visual-registry-design.md`

## Execution record

Status: implementation and verification complete. The original task checklist below records the planned procedure; actual execution and deviations are recorded here and in `docs/issue-98-verification.md`.

- Implemented on `codex/issue-98-tool-visuals` using inline execution.
- Registry tests first failed for the missing module, then passed after adding all 64 entries.
- Consumer regressions first demonstrated the existing FILE label and divergent category order, then passed after integration.
- Consumer tests live together in `src/pages/ToolVisualIntegration.test.tsx`. They compare actual rendered SVGs, avoiding test-only data attributes in production.
- The existing `TOOLS_BY_CATEGORY` export also uses the shared category order so future consumers receive ordered groups.
- Registry coverage, category-safe recovery, complete action names, and pinned/recent/featured/search consistency are covered. Related tests: 43 passed.
- Browser verification script: `scripts/verify-tool-visuals.mjs`. English and Traditional Chinese at 1440px and 390px passed with 64 cards each, no clipped titles, no horizontal overflow, matching category/icon semantics, and successful keyboard navigation.
- Implementation commits are consolidated after verification rather than committing intentionally failing test states.

## Global Constraints

- `src/data/tools.ts` remains the canonical tool list and contains exactly 64 tools.
- Existing category values remain `Image`, `PDF`, `Data`, `Developer`, `Text`, and `QR & Barcode`.
- Category order is `Image → PDF → Data → Developer → Text → QR & Barcode`.
- The issue does not require 64 unique icons; category icon plus short label/function symbol is acceptable.
- Full localized names, descriptions, and accessible names remain intact.
- Existing card/sidebar CSS and responsive behavior are reused unless a focused overflow fix is required.

## File Map

- Create `src/data/toolVisuals.ts`: shared visual metadata, category order, icon/tone types, and lookup helper.
- Create `src/data/toolVisuals.test.ts`: registry coverage, order, and category/icon compatibility tests.
- Modify `src/pages/HomePage.tsx`: consume shared order and visual lookup; remove local visual map and `FILE` fallback.
- Modify `src/components/ToolSidebar.tsx`: consume shared order and visual lookup; remove ID-prefix icon heuristic; expose a stable `data-icon` marker for integration assertions.
- Modify `src/pages/HomePage.test.tsx`: assert all-tool cards do not show generic `FILE` visuals.
- Modify `src/components/ToolSidebar.test.tsx`: assert shared category order and Developer tools use Developer icon semantics.

### Task 1: Add the registry contract tests (RED)

**Files:**
- Create: `src/data/toolVisuals.test.ts`

**Interfaces:**
- The tests define the required exports: `TOOL_CATEGORY_ORDER`, `CATEGORY_VISUALS`, `TOOL_VISUALS`, `getToolVisual`.
- `ToolVisual` entries expose `label`, `tone`, and `sidebarIcon`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { FILE_TOOLS } from "./tools";
import {
  CATEGORY_VISUALS,
  TOOL_CATEGORY_ORDER,
  TOOL_VISUALS,
  getToolVisual,
} from "./toolVisuals";

describe("tool visual registry", () => {
  it("covers every registered tool with a non-generic visual", () => {
    expect(Object.keys(TOOL_VISUALS).sort()).toEqual(FILE_TOOLS.map((tool) => tool.id).sort());
    expect(FILE_TOOLS.every((tool) => getToolVisual(tool).label !== "FILE")).toBe(true);
  });

  it("keeps one complete category order", () => {
    expect(TOOL_CATEGORY_ORDER).toEqual([
      "Image",
      "PDF",
      "Data",
      "Developer",
      "Text",
      "QR & Barcode",
    ]);
    expect(new Set(TOOL_CATEGORY_ORDER).size).toBe(TOOL_CATEGORY_ORDER.length);
    expect(Object.keys(CATEGORY_VISUALS).sort()).toEqual([...TOOL_CATEGORY_ORDER].sort());
  });

  it("uses an icon compatible with each tool category", () => {
    const expectedIconByCategory = {
      Image: "image",
      PDF: "pdf",
      Data: "data",
      Developer: "developer",
      Text: "text",
      "QR & Barcode": "qr",
    } as const;

    for (const tool of FILE_TOOLS) {
      expect(getToolVisual(tool).sidebarIcon).toBe(expectedIconByCategory[tool.category]);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails for the missing registry**

Run: `npm test -- --run src/data/toolVisuals.test.ts`

Expected: FAIL because `src/data/toolVisuals.ts` does not exist yet.

- [ ] **Step 3: Commit the red test**

```bash
git add src/data/toolVisuals.test.ts
git commit -m "test: define tool visual registry coverage"
```

### Task 2: Implement the complete shared registry (GREEN)

**Files:**
- Create: `src/data/toolVisuals.ts`
- Test: `src/data/toolVisuals.test.ts`

**Interfaces:**

```ts
export type ToolCategory = ToolDefinition["category"];
export type ToolVisualTone = "blue" | "sky" | "mint" | "red" | "violet" | "amber";
export type ToolSidebarVisualIcon = "data" | "developer" | "image" | "pdf" | "qr" | "text";
export interface ToolVisual {
  label: string;
  tone: ToolVisualTone;
  sidebarIcon: ToolSidebarVisualIcon;
}
export const TOOL_CATEGORY_ORDER: readonly ToolCategory[];
export const CATEGORY_VISUALS: Record<ToolCategory, ToolVisual>;
export const TOOL_VISUALS: Record<string, ToolVisual>;
export function getToolVisual(tool: ToolDefinition): ToolVisual;
```

- [ ] **Step 1: Add category metadata and the ordered category source**

Use the six category entries below; the category fallback label is short and never `FILE`:

```ts
export const TOOL_CATEGORY_ORDER = [
  "Image", "PDF", "Data", "Developer", "Text", "QR & Barcode",
] as const satisfies readonly ToolCategory[];

export const CATEGORY_VISUALS: Record<ToolCategory, ToolVisual> = {
  Image: { label: "IMG", tone: "blue", sidebarIcon: "image" },
  PDF: { label: "PDF", tone: "red", sidebarIcon: "pdf" },
  Data: { label: "DATA", tone: "mint", sidebarIcon: "data" },
  Developer: { label: "DEV", tone: "violet", sidebarIcon: "developer" },
  Text: { label: "TXT", tone: "sky", sidebarIcon: "text" },
  "QR & Barcode": { label: "QR", tone: "blue", sidebarIcon: "qr" },
};
```

- [ ] **Step 2: Add one explicit visual entry for all 64 tool IDs**

Use the following short labels and category-compatible sidebar icon for each entry. Tones may vary within a category to preserve existing scanning contrast:

| Category | Tool IDs and labels |
| --- | --- |
| Image | `image-to-pdf: I→P`, `image-watermark: WM`, `image-resize: RES`, `image-crop: CROP`, `image-compress: ↘`, `image-convert: IMG`, `image-exif-viewer: EXIF`, `image-remove-exif: META`, `heic-converter: HEIC`, `image-base64: 64`, `svg-optimizer: SVG`, `favicon-generator: FAV`, `social-resizer: SOC` |
| PDF | `pdf-to-image: P→I`, `pdf-merge: MERGE`, `pdf-split: ✂`, `pdf-rotate: ROT`, `pdf-reorder-pages: ORDER`, `pdf-delete-pages: DEL`, `pdf-extract-pages: EXT`, `pdf-add-page-numbers: #`, `pdf-watermark: WM`, `pdf-metadata: META` |
| Data | `json-formatter: {}`, `jsonpath-tester: JPATH`, `csv-viewer: CSV`, `csv-to-json: C→J`, `json-to-csv: J→C`, `json-xml: J↔X`, `xml-formatter: XML`, `json-yaml: J↔Y`, `json-diff: DIFF` |
| Developer | `base64: 64`, `jwt-key: KEY`, `jwt-decoder: JWT`, `url-encoder: URL`, `unix-timestamp: TIME`, `local-time-converter: LOCAL`, `regex-tester: REGEX`, `sql-formatter: SQL`, `cron-builder: CRON`, `url-parser: PARSE`, `curl-to-code: CURL`, `secret-generator: SEC`, `json-to-csharp: C#`, `json-to-typescript: TS` |
| Text | `list-cleanup: LIST`, `hash: HASH`, `uuid: UUID`, `word-counter: WORDS`, `case-converter: Aa`, `remove-duplicate-lines: ≡`, `sort-lines: AZ`, `text-cleaner: CLEAN`, `find-replace: F/R`, `text-diff: DIFF`, `html-encoder: HTML`, `markdown-previewer: MD` |
| QR & Barcode | `qr-code: QR`, `qr-reader: SCAN`, `barcode-generator: BAR`, `barcode-reader: READ`, `wifi-qr: WIFI`, `vcard-qr: CARD` |

Each entry should use one of the existing tones and the category icon (`image`, `pdf`, `data`, `developer`, `text`, or `qr`) matching its tool category.

- [ ] **Step 3: Add a typed lookup with an explicit category-safe defensive path**

```ts
export function getToolVisual(tool: ToolDefinition): ToolVisual {
  const visual = TOOL_VISUALS[tool.id];
  if (visual) return visual;

  if (import.meta.env?.DEV) {
    console.warn(`[NexaForge] Missing visual metadata for tool: ${tool.id}`);
  }
  return CATEGORY_VISUALS[tool.category];
}
```

The test in Task 1 is the enforcement mechanism for future additions; the runtime path is only a category-correct recovery path and is not allowed to use `FILE` or `data` universally.

- [ ] **Step 4: Run the focused registry test to verify it passes**

Run: `npm test -- --run src/data/toolVisuals.test.ts`

Expected: PASS with all registry tests passing.

- [ ] **Step 5: Commit the registry**

```bash
git add src/data/toolVisuals.ts src/data/toolVisuals.test.ts
git commit -m "feat: add complete tool visual registry"
```

### Task 3: Add consumer regression tests (RED)

**Files:**
- Modify: `src/pages/HomePage.test.tsx`
- Modify: `src/components/ToolSidebar.test.tsx`

**Interfaces:**
- Homepage must render no `FILE` marker when the `All` filter displays all tools.
- Sidebar category buttons must follow `TOOL_CATEGORY_ORDER` and rendered tool icons must expose their registry semantic through `data-icon`.

- [ ] **Step 1: Add the homepage fallback regression test**

Append this test to the existing `HomePage task-first hierarchy` suite:

```tsx
it("gives every registered tool a meaningful visual marker", () => {
  renderWithProviders(<HomePage />);
  fireEvent.click(screen.getByRole("button", { name: "All" }));

  const allTools = screen.getByRole("heading", { level: 2, name: "All Tools" }).closest(".workspace-section");
  expect(allTools).not.toBeNull();
  expect(within(allTools!).getAllByRole("article")).toHaveLength(FILE_TOOLS.length);
  expect(within(allTools!).queryByText("FILE", { selector: "span" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add the sidebar ordering and icon regression tests**

Add imports for `TOOL_CATEGORY_ORDER` and append these tests to `ToolSidebar`:

```tsx
it("uses the shared category order", () => {
  render(<MemoryRouter><LanguageProvider initialLocale="en"><ToolSidebar /></LanguageProvider></MemoryRouter>);

  const categoryButtons = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-controls")?.startsWith("tool-sidebar-category-"));
  expect(categoryButtons.map((button) => button.getAttribute("aria-controls")?.replace("tool-sidebar-category-", ""))).toEqual([...TOOL_CATEGORY_ORDER]);
});

it("uses Developer icon semantics for Developer tools", () => {
  render(<MemoryRouter><LanguageProvider initialLocale="en"><ToolSidebar /></LanguageProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Developer.*tools/i }));

  expect(screen.getByRole("link", { name: "Regex Tester" }).querySelector(".tool-sidebar__icon"))
    .toHaveAttribute("data-icon", "developer");
});
```

- [ ] **Step 3: Run the focused consumer tests to verify they fail before integration**

Run: `npm test -- --run src/pages/HomePage.test.tsx src/components/ToolSidebar.test.tsx`

Expected: FAIL because the homepage still renders `FILE`, the sidebar order is local/ different, and sidebar icon wrappers do not yet expose registry metadata.

- [ ] **Step 4: Commit the red consumer tests**

```bash
git add src/pages/HomePage.test.tsx src/components/ToolSidebar.test.tsx
git commit -m "test: cover shared tool visual consumers"
```

### Task 4: Integrate the registry into homepage and sidebar (GREEN)

**Files:**
- Modify: `src/pages/HomePage.tsx:3-110,357-373`
- Modify: `src/components/ToolSidebar.tsx:11-78,237-248,383-445`
- Test: `src/pages/HomePage.test.tsx`
- Test: `src/components/ToolSidebar.test.tsx`

**Interfaces:**
- `HomePage` uses `TOOL_CATEGORY_ORDER` for filter buttons and `getToolVisual(tool)` for labels/tones.
- `ToolSidebar` uses `TOOL_CATEGORY_ORDER` for grouping and `getToolVisual(tool).sidebarIcon` for both expanded and searched tool links.

- [ ] **Step 1: Replace the homepage-local order and visual lookup**

Import `TOOL_CATEGORY_ORDER` and `getToolVisual`; delete the local `categoryOrder` array and local `TOOL_VISUALS` object. In `ToolCard`, replace the fallback expression with:

```tsx
const visual = getToolVisual(tool);
```

Render category filters with `TOOL_CATEGORY_ORDER`:

```tsx
{(["Featured", "All", ...TOOL_CATEGORY_ORDER] as const).map((category) => (
```

- [ ] **Step 2: Replace sidebar-local order and ID-prefix heuristic**

Import `CATEGORY_VISUALS`, `TOOL_CATEGORY_ORDER`, and `getToolVisual`; extend the local `SidebarIconName` union with the imported `ToolSidebarVisualIcon` type instead of duplicating the six visual icon names. Delete the local category order, `CATEGORY_ICONS`, and `getToolIcon` implementation. Use `CATEGORY_VISUALS[category].sidebarIcon` for category headers/toggles and `getToolVisual(tool).sidebarIcon` for tool links.

Add `data-icon` to tool icon wrappers in both sidebar tool-link locations:

```tsx
<span className="tool-sidebar__icon" data-icon={getToolVisual(tool).sidebarIcon} aria-hidden="true">
  <SidebarIcon name={getToolVisual(tool).sidebarIcon} />
</span>
```

Use `TOOL_CATEGORY_ORDER.map(...)` and `TOOL_CATEGORY_ORDER.reduce(...)` for both unfiltered and searched grouping.

- [ ] **Step 3: Run the focused tests to verify the integration passes**

Run: `npm test -- --run src/data/toolVisuals.test.ts src/pages/HomePage.test.tsx src/components/ToolSidebar.test.tsx`

Expected: PASS with all registry, homepage, and sidebar tests passing.

- [ ] **Step 4: Run TypeScript checks**

Run: `npx tsc --noEmit`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 5: Commit the integration**

```bash
git add src/data/toolVisuals.ts src/pages/HomePage.tsx src/components/ToolSidebar.tsx src/pages/HomePage.test.tsx src/components/ToolSidebar.test.tsx
git commit -m "feat: unify tool visual consumers"
```

### Task 5: Full verification and responsive inspection

**Files:**
- Modify: any affected implementation file only if verification identifies a real defect.

- [ ] **Step 1: Run the complete Vitest suite**

Run: `npm test -- --run`

Expected: exit code 0 and no failed tests.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit code 0 for TypeScript, client build, SSR build, and prerender.

- [ ] **Step 3: Exercise the homepage at a wide viewport**

Fixture: all registered tools and the existing English locale. Viewport: desktop width. Actions: open homepage, select `All`, search for `json`, and inspect card markers; open the sidebar and expand each category. Expected: all cards have a non-`FILE` marker, category/filter order is identical, Developer entries use Developer icon semantics, and full names/accessibility labels remain present.

- [ ] **Step 4: Exercise the homepage/sidebar at 390px**

Fixture: English and Traditional Chinese locales, including long titles such as `PDF Metadata Viewer & Remover`, `Code128 / EAN-13 Barcode Generator`, and `YAML ↔ JSON Converter`. Viewport: 390px. Actions: open `All`, search/filter, expand sidebar categories, and use a tool link. Expected: no horizontal page overflow, title/description text remains readable, cards keep their actions reachable, and sidebar items remain aligned and operable.

- [ ] **Step 5: Review the final diff and status**

Run: `git diff --check; git status --short; git log -5 --oneline`

Expected: no whitespace errors; only the Issue #98 spec, plan, registry, tests, and consumer integration changes are present; no unrelated files are modified.
