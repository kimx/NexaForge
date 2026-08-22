# NexaForge JSON-First Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make JSON the first-level NexaForge workflow and give developers a fast, consistent formatter, validator, converter, and comparison workspace.

**Architecture:** Extend the tool registry with a JSON topic group and a crawlable hub while retaining existing tool routes. Shared JSON navigation is rendered by the tool template; the formatter owns explicit input, validation, action, and result state.

**Tech Stack:** React 18, React Router 6, TypeScript, Vitest, Testing Library, CSS

**Spec:** `docs/superpowers/specs/2026-08-22-nexaforge-json-first-ux-seo-design.md`

## Global Constraints

- Execute after `2026-08-22-nexaforge-ux-foundation.md` is green.
- Preserve all existing tool paths and browser-local processing.
- Never persist editor or file contents.
- Keep JSON transforms explicit; validation may be debounced.
- Use tests first and leave changes uncommitted.

---

### Task 1: Add the JSON Topic Registry and Hub

**Files:**
- Modify: `src/data/tools.ts`
- Create: `src/utils/toolPaths.ts`
- Create: `src/pages/json/JsonHubPage.test.tsx`
- Create: `src/pages/json/JsonHubPage.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `JSON_TOOL_IDS: readonly string[]`
- Produces: `JSON_TOOLS: ToolDefinition[]`
- Produces: `/json` route with links to every JSON workflow
- Produces: `isJsonTool(toolId: string): boolean`

- [ ] **Step 1: Write failing registry and hub tests**

```tsx
expect(JSON_TOOLS.map((tool) => tool.id)).toEqual([
  "json-formatter", "json-diff", "json-yaml", "json-to-csv", "csv-to-json"
]);
renderWithProviders(<JsonHubPage />, { route: "/json" });
expect(screen.getByRole("heading", { level: 1, name: /json/i })).toBeInTheDocument();
expect(screen.getByRole("link", { name: /formatter|格式化/i })).toHaveAttribute("href", "/data/json-formatter");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --run src/pages/json/JsonHubPage.test.tsx src/App.test.tsx`

Expected: missing exports, component, and route.

- [ ] **Step 3: Implement the topic registry and page**

Derive `JSON_TOOLS` from `FILE_TOOLS` so metadata stays single-source. Render a visible introduction, task-oriented cards, privacy statement, and crawlable related links.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/pages/json/JsonHubPage.test.tsx src/App.test.tsx`

Expected: all focused tests pass.

### Task 2: Make Homepage Search and Hierarchy JSON-First

**Files:**
- Create: `src/pages/HomePage.test.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `JSON_TOOLS`
- Produces: JSON primary CTA and JSON workflow section before recent/categories
- Produces: active-search mode that renders only search results and its result count/empty state

- [ ] **Step 1: Write failing homepage behavior tests**

```tsx
expect(primaryCta).toHaveAttribute("href", "/data/json-formatter");
expect(jsonSection.compareDocumentPosition(recentSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
fireEvent.change(search, { target: { value: "not-a-real-tool" } });
expect(screen.getByText(/no tools|找不到工具/i)).toBeInTheDocument();
expect(screen.queryByTestId("recent-tools")).not.toBeInTheDocument();
```

Add tests that `/` focuses search outside editable controls and Escape clears an active query.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- --run src/pages/HomePage.test.tsx`

Expected: old hierarchy, contradictory no-results cards, and missing Escape behavior fail.

- [ ] **Step 3: Implement the approved hierarchy**

Place JSON value proposition and CTA first, render the JSON task cluster second, then recent and other categories. When query/filter is active, hide unrelated sections and render a single results collection.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/pages/HomePage.test.tsx`

Expected: all homepage behavior tests pass.

### Task 3: Add Shared JSON In-Context Navigation

**Files:**
- Create: `src/components/JsonWorkspaceNav.test.tsx`
- Create: `src/components/JsonWorkspaceNav.tsx`
- Modify: `src/components/ToolPageTemplate.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `JSON_TOOLS`, active pathname, localized tool metadata
- Produces: `<nav aria-label="JSON workspace">` with ordinary links and `aria-current="page"`

- [ ] **Step 1: Write failing navigation tests**

Render on `/developer/json-diff`; assert all five JSON workflows are links, JSON Diff is current, and the nav is absent on `/image/resize`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/components/JsonWorkspaceNav.test.tsx`

Expected: component is missing.

- [ ] **Step 3: Implement and integrate**

Render the navigation immediately after the tool header for tools in the JSON topic group. Use wrapping links on narrow screens without horizontal page overflow.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/components/JsonWorkspaceNav.test.tsx`

Expected: all focused tests pass.

### Task 4: Rebuild JSON Formatter Empty, Validation, and Shortcut States

**Files:**
- Modify: `src/pages/data/JsonFormatterPage.test.tsx`
- Modify: `src/pages/data/JsonFormatterPage.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: empty labeled source editor
- Produces: secondary sample action
- Produces: debounced parse feedback below 250,000 characters
- Produces: `Ctrl/Meta + Enter` primary action
- Produces: `aria-invalid` and `aria-describedby` on parse errors

- [ ] **Step 1: Replace the old sample-first test with approved empty-state tests**

```tsx
const editor = screen.getByRole("textbox", { name: /json input|json 輸入/i });
expect(editor).toHaveValue("");
expect(screen.getByRole("button", { name: /process|處理/i })).toBeDisabled();
fireEvent.click(screen.getByRole("button", { name: /load sample|載入範例/i }));
expect(JSON.parse((editor as HTMLTextAreaElement).value)).toEqual({ name: "NexaForge", active: true, tags: ["json", "sample"] });
```

Add tests for invalid debounced input, corrected input, keyboard execution, preserved input after error, and large-input manual validation.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/pages/data/JsonFormatterPage.test.tsx`

Expected: default sample, enabled-empty action, missing shortcut, and missing field association fail.

- [ ] **Step 3: Implement minimal state transitions**

Default to text mode with empty input. Add a 350ms validation effect for non-empty input below the size threshold. Keep processing in `handleProcess`; never transform the source during validation. Clear field errors after valid correction.

- [ ] **Step 4: Implement two-pane formatter layout**

Add a formatter-specific class/data attribute through `ToolPageTemplate`. At wide widths place workspace/options on the left and result on the right; stack in task order below the breakpoint. Keep one H1 and no page overflow.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/pages/data/JsonFormatterPage.test.tsx`

Expected: all formatter tests pass.

### Task 5: Associate JSON Errors and Ready States in Related Tools

**Files:**
- Modify tests/pages: `src/pages/data/JsonToCsvPage.*`
- Modify tests/pages: `src/pages/data/CsvToJsonPage.*`
- Modify tests/pages: `src/pages/developer/DeveloperToolsPage.*`
- Modify: `src/context/LanguageContext.tsx`

**Interfaces:**
- Produces: labeled JSON/YAML/diff input areas with field-associated errors
- Produces: disabled empty primary action and preserved correction state

- [ ] **Step 1: Add failing error-association tests**

For malformed JSON, assert the input retains its value, has `aria-invalid="true"`, references the visible error, and returns to `aria-invalid="false"` after correction. Assert empty primary actions are disabled.

- [ ] **Step 2: Run and verify RED**

Run: `npm test -- --run src/pages/data/JsonToCsvPage.test.tsx src/pages/data/CsvToJsonPage.test.tsx src/pages/developer/DeveloperToolsPage.test.tsx`

Expected: generic result-only errors and enabled-empty actions fail.

- [ ] **Step 3: Implement page-boundary error copy and associations**

Translate parse/service failures into actionable messages, assign stable error IDs, and connect inputs with `aria-describedby`. Preserve source text and mode.

- [ ] **Step 4: Verify the JSON workspace plan**

Run: `npm test -- --run`

Expected: zero failures.

Run: `npm run build`

Expected: exit 0.

### Task 6: Review the JSON-First Diff

- [ ] **Step 1: Inspect implementation against spec Sections 1-6**

Confirm the JSON hierarchy, mobile task order, explicit transforms, input privacy, related navigation, and state semantics are represented in code and tests.

- [ ] **Step 2: Re-run verification after review corrections**

Run: `npm test -- --run && npm run build`

Expected: both commands exit 0.

