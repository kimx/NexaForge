# NexaForge UX Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a clean test baseline and implement the shared responsive, accessible operation shell used by all 30 tools.

**Architecture:** Keep the existing React Router application and tool page components, but move route chrome into one semantic shell. Shared components own drawer navigation, focus transfer, dropzone behavior, and operation feedback so individual tools do not reimplement those rules.

**Tech Stack:** React 18, React Router 6, TypeScript 5.8, Vite 6, Vitest, Testing Library, CSS

**Spec:** `docs/superpowers/specs/2026-08-22-nexaforge-json-first-ux-seo-design.md`

## Global Constraints

- Work directly on `main` because the user explicitly approved it.
- Preserve the pre-existing `package-lock.json` modification and do not include it in this work.
- Do not add a backend, authentication, or payload persistence.
- Keep all 30 tools and all existing canonical Chinese tool paths.
- Use tests first for every production behavior change and observe the intended failure before implementation.
- Leave changes uncommitted for user review unless the user separately requests commits.

---

### Task 1: Repair the Existing Test Harness

**Files:**
- Create: `src/test/renderWithProviders.tsx`
- Modify: `src/pages/image/ResizePage.test.tsx`
- Modify: `src/pages/image/CompressPage.test.tsx`
- Modify: `src/pages/image/ConvertPage.test.tsx`
- Modify: `src/pages/pdf/MergePage.test.tsx`
- Modify: `src/pages/pdf/RotatePage.test.tsx`
- Modify: `src/pages/data/CsvViewerPage.test.tsx`
- Modify: `src/pages/data/CsvToJsonPage.test.tsx`
- Modify: `src/pages/text/UuidPage.test.tsx`
- Modify: `src/pages/qr/QrPage.test.tsx`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Produces: `renderWithProviders(ui: ReactElement, options?: { route?: string }): RenderResult`
- Produces: a jsdom `window.scrollTo` stub that prevents environment-only errors without asserting on the stub

- [ ] **Step 1: Re-run the failing baseline and record the provider failure**

Run: `npm test -- --run --reporter=dot`

Expected: 21 failures across 9 files, with `useLanguage must be used inside LanguageProvider` as the dominant cause.

- [ ] **Step 2: Add the real provider test renderer**

```tsx
export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {}
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}
```

- [ ] **Step 3: Replace provider-less renders without changing behavioral assertions**

Use `renderWithProviders(<Page />)` in each listed test. Keep real page components and mock only existing slow browser/file dependencies.

- [ ] **Step 4: Verify the repaired baseline**

Run: `npm test -- --run --reporter=dot`

Expected: all pre-existing tests pass with zero provider failures and no jsdom `scrollTo` error output.

### Task 2: Replace the Duplicate Landing with a Semantic Responsive Shell

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/ToolSidebar.test.tsx`
- Modify: `src/components/ToolSidebar.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `HeaderProps { onOpenTools?: () => void; toolsButtonRef?: RefObject<HTMLButtonElement> }`
- Produces: `ToolSidebarProps { isOpen?: boolean; onClose?: () => void; closeButtonRef?: RefObject<HTMLButtonElement> }`
- Produces: `<a className="skip-link" href="#main-content">…</a>`
- Produces: exactly one `main#main-content` and one structural H1 per route

- [ ] **Step 1: Write failing shell behavior tests**

```tsx
expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
expect(document.querySelector(".page-landing")).not.toBeInTheDocument();
expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
expect(screen.getByRole("link", { name: /skip|跳至主要內容/i })).toHaveAttribute("href", "#main-content");
```

Add a drawer test that opens from the header, asserts `aria-modal="true"`, closes with Escape, and verifies focus returns to the opener.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --run src/App.test.tsx src/components/ToolSidebar.test.tsx`

Expected: failures for duplicate H1, absent skip link, and absent drawer behavior.

- [ ] **Step 3: Implement the semantic shell and drawer**

Remove `page-landing` from `ToolFrame`. Render the sidebar next to `main#main-content`. Add mobile open/close state, Escape handling, focus entry, focus return, backdrop, body scroll lock, and localized labels. On desktop the navigation remains visible and is not modal.

- [ ] **Step 4: Implement responsive CSS**

At widths below 900px, position `.tool-sidebar` as a fixed drawer and keep it out of layout flow while closed. Ensure `.content-shell` is first-task content, remove page-level overflow hiding, and keep drawer contents independently reachable only while the modal is open.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/App.test.tsx src/components/ToolSidebar.test.tsx`

Expected: all focused tests pass.

### Task 3: Make Dropzones and Result Focus Predictable

**Files:**
- Modify: `src/components/FileDropzone.test.tsx`
- Modify: `src/components/FileDropzone.tsx`
- Create: `src/components/ToolPageTemplate.test.tsx`
- Modify: `src/components/ToolPageTemplate.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: one native file input keyboard stop per dropzone
- Produces: result section with `tabIndex={-1}` and a stable accessible label
- Consumes: `ToolWorkflow.state`

- [ ] **Step 1: Write the dropzone regression test**

```tsx
const dropzone = screen.getByLabelText(/file dropzone|檔案拖放區/i);
expect(dropzone).not.toHaveAttribute("tabindex");
expect(container.querySelectorAll('[tabindex="0"], input[type="file"]')).toHaveLength(1);
```

- [ ] **Step 2: Write the result focus regression test**

Render `ToolPageTemplate` with a ready workflow, rerender with success, mock the result rectangle outside the viewport, and assert the result region receives focus. Repeat with an in-view rectangle and assert the trigger retains focus.

- [ ] **Step 3: Run tests and verify RED**

Run: `npm test -- --run src/components/FileDropzone.test.tsx src/components/ToolPageTemplate.test.tsx`

Expected: dropzone has two focus targets and result focus behavior is missing.

- [ ] **Step 4: Implement one-stop dropzone semantics**

Remove wrapper `tabIndex`, click, and keyboard emulation. Keep drag events on the region and use the native input/label pair for activation. Style `:focus-within` so the visible dropzone receives the focus ring.

- [ ] **Step 5: Implement visibility-aware result focus**

On transition to success or error, inspect the result bounds. If outside the viewport, scroll using `auto` when reduced motion is requested and focus the result with `preventScroll`. If already visible, leave keyboard focus and rely on the live status.

- [ ] **Step 6: Verify GREEN**

Run: `npm test -- --run src/components/FileDropzone.test.tsx src/components/ToolPageTemplate.test.tsx`

Expected: all focused tests pass.

### Task 4: Repair Shared Accessibility and Localization Defects

**Files:**
- Create: `src/components/JsonTreeEditor.test.tsx`
- Modify: `src/components/JsonTreeEditor.tsx`
- Create: `src/context/LanguageContext.test.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/pages/image/ExifPage.tsx`
- Modify: `src/pages/developer/JwtDecoderPage.tsx`
- Modify: `src/pages/text/MarkdownPreviewPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: specific accessible names for JSON tree key/value/add/remove controls
- Produces: complete `zh-TW` and `en` messages for every literal `t("…")` key
- Produces: visible `:focus-visible` treatment and AA semantic text tokens

- [ ] **Step 1: Write failing accessibility and locale tests**

Assert JSON tree buttons are not descendants of `summary`, text inputs have key/value accessible names, and delete buttons expose the affected key/index. Add Chinese tests for `sidebar.navigation`, EXIF shared/errors, removed byte copy, JWT malformed token copy, and the Markdown sample.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/components/JsonTreeEditor.test.tsx src/context/LanguageContext.test.tsx`

Expected: nested controls, unnamed inputs, and missing Chinese messages fail.

- [ ] **Step 3: Refactor JSON tree interaction**

Move expand/collapse into its own 44px button outside action controls. Associate visible or screen-reader labels with each editable key/value. Give add/remove controls contextual names.

- [ ] **Step 4: Complete localization and user-facing errors**

Add all missing keys to both dictionaries. Translate EXIF instructions, Markdown initial sample, and JWT format errors at the page boundary instead of exposing raw service exceptions.

- [ ] **Step 5: Correct focus and contrast CSS**

Remove focus rules that set `outline: none` without an equivalent ring. Darken accent and semantic text tokens until normal text reaches 4.5:1 on white and subtle surfaces; do not rely on color alone for status.

- [ ] **Step 6: Verify GREEN**

Run: `npm test -- --run src/components/JsonTreeEditor.test.tsx src/context/LanguageContext.test.tsx src/pages/developer/DeveloperToolsPage.test.tsx`

Expected: all focused tests pass.

### Task 5: Enforce Ready-State Actions Across File Tools

**Files:**
- Modify tests and pages for: `src/pages/image/ResizePage.*`, `CompressPage.*`, `ConvertPage.*`, `CropPage.*`
- Modify tests and pages for: `src/pages/pdf/MergePage.*`, `SplitPage.*`, `RotatePage.*`
- Modify tests and pages for: `src/pages/data/CsvViewerPage.*`, `CsvToJsonPage.*`
- Modify tests and pages for: `src/pages/text/HashPage.*`

**Interfaces:**
- Produces: primary action disabled until the page has the minimum accepted input
- Produces: no initial download action unless a real result exists

- [ ] **Step 1: Add one readiness assertion to each existing page test**

```tsx
const action = screen.getByRole("button", { name: /process|處理|merge|合併|split|分割|rotate|旋轉/i });
expect(action).toBeDisabled();
fireEvent.change(fileInput, { target: { files: [validFixture] } });
expect(action).toBeEnabled();
```

For multi-file merge, assert the action stays disabled with one file and enables with two. For split/rotate, assert initial download controls are absent.

- [ ] **Step 2: Run the listed page tests and verify RED**

Run: `npm test -- --run src/pages/image src/pages/pdf src/pages/data src/pages/text/HashPage.test.tsx`

Expected: current enabled-empty actions and premature download controls fail.

- [ ] **Step 3: Implement minimal readiness predicates**

Disable each primary action from existing state (`files.length`, accepted file, or required selection). Render download actions only when a non-null result exists. Do not introduce new persisted state.

- [ ] **Step 4: Verify all UX foundation behavior**

Run: `npm test -- --run`

Expected: zero failures.

Run: `npm run build`

Expected: TypeScript and Vite exit 0.

### Task 6: Review the Foundation Diff

**Files:** all files changed by Tasks 1-5

- [ ] **Step 1: Inspect scope and preserve user work**

Run: `git status --short` and `git diff -- . ':!package-lock.json'`

Expected: only planned source, test, style, and documentation files appear; the lockfile remains untouched.

- [ ] **Step 2: Re-run the complete verification after review fixes**

Run: `npm test -- --run && npm run build`

Expected: both commands exit 0.
