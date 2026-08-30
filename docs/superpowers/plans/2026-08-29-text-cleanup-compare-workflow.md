# Text Cleanup & Compare Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver issue #48 P0 as private browser-only text-cleaning, replacement, and comparison tools connected into NexaForge's text workflow.

**Architecture:** A pure `textWorkflowService` owns deterministic clean, replace, and LCS line-diff logic. Focused components share output actions and contextual tool links; pages compose existing templates, localization, routes, and landing-page SEO.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Testing Library, React Router.

**Spec:** `docs/superpowers/specs/2026-08-29-text-cleanup-compare-workflow-design.md`

## Global Constraints

- Process all text locally; add no network calls, persistence, or text-bearing analytics fields.
- Preserve `/text/diff`; add `/text/text-cleaner` and `/text/find-replace`.
- Run transformations only from explicit user actions.
- Follow existing `ToolPageTemplate`, `useSeo`, `FILE_TOOLS`, localization, and landing-page conventions.
- All controls have accessible names; diff states include text and `+`/`-` symbols as well as colour.

---

### Task 1: Implement and test pure workflow services

**Files:**
- Create: `src/services/text/textWorkflowService.ts`
- Create: `src/services/text/textWorkflowService.test.ts`

**Interfaces:** Produces `cleanText(input, options)`, `findAndReplace(input, options)`, and `compareText(original, changed, options)` plus their option/result types.

- [ ] **Step 1: Write the failing tests**

```ts
import { cleanText, compareText, findAndReplace } from "./textWorkflowService";
test("cleans combined options", () => expect(cleanText("  apple\r\n\r\n\tbanana  ", { trimLines: true, removeEmptyLines: true, tabsToSpaces: true }).text).toBe("apple\nbanana"));
test("reports invalid regex", () => expect(findAndReplace("value", { find: "(", replace: "", useRegex: true }).error).toMatch(/Invalid regular expression/));
test("preserves LCS context for insertion", () => expect(compareText("apple\norange", "apple\nbanana\norange", {}).lines.map(({ type, text }) => [type, text])).toEqual([["unchanged", "apple"], ["added", "banana"], ["unchanged", "orange"]]));
```

- [ ] **Step 2: Run test to verify it fails** — `npm test -- src/services/text/textWorkflowService.test.ts`; expected failure: missing module.

- [ ] **Step 3: Write minimal implementation**

```ts
export function cleanText(input: string, options: TextCleanerOptions): TextTransformResult { /* normalize then apply enabled rules */ }
export function findAndReplace(input: string, options: FindReplaceOptions): FindReplaceResult { /* literal/RegExp replacement and counts */ }
export function compareText(original: string, changed: string, options: TextDiffOptions): TextDiffResult { /* LCS matrix and backtracking */ }
```

- [ ] **Step 4: Run service tests** — `npm test -- src/services/text/textWorkflowService.test.ts`; expected PASS for empty input, whitespace options, literal case/word matching, no match, invalid regex, ignore settings, identical text, additions, and removals.

- [ ] **Step 5: Commit** — `git add src/services/text/textWorkflowService.ts src/services/text/textWorkflowService.test.ts; git commit -m "feat: add text workflow services"`.

### Task 2: Implement shared text result UI

**Files:**
- Create: `src/components/text/TextResultActions.tsx`
- Create: `src/components/text/TextWorkflowLinks.tsx`
- Create: `src/components/text/TextResultActions.test.tsx`

**Interfaces:** Consumes result text and `{ label, path }` destinations; exposes copy, `.txt` download, clear, use-output-as-input, and semantic workflow links.

- [ ] **Step 1: Write the failing component test**

```tsx
render(<TextResultActions text="apple" filename="cleaned-text.txt" onClear={onClear} onUseAsInput={onUse} />);
expect(screen.getByRole("button", { name: /copy/i })).toBeEnabled();
await user.click(screen.getByRole("button", { name: /use output as input/i }));
expect(onUse).toHaveBeenCalledWith("apple");
```

- [ ] **Step 2: Run test to verify it fails** — `npm test -- src/components/text/TextResultActions.test.tsx`; expected failure: missing component.

- [ ] **Step 3: Write minimal implementation**

```tsx
export function TextResultActions({ text, filename, onClear, onUseAsInput }: Props): JSX.Element { /* Clipboard API and Blob URL download */ }
export function TextWorkflowLinks({ tools }: { tools: WorkflowTool[] }): JSX.Element { /* anchors from supplied tools */ }
```

- [ ] **Step 4: Run component test** — `npm test -- src/components/text/TextResultActions.test.tsx`; expected PASS with clipboard, download, clear/use callbacks, and accessible names.

- [ ] **Step 5: Commit** — `git add src/components/text; git commit -m "feat: add shared text result actions"`.

### Task 3: Build Text Cleaner and Find & Replace

**Files:**
- Create: `src/pages/text/TextCleanerPage.tsx`, `src/pages/text/TextCleanerPage.test.tsx`
- Create: `src/pages/text/FindReplacePage.tsx`, `src/pages/text/FindReplacePage.test.tsx`
- Modify: `src/data/tools.ts`, `src/App.tsx`, `src/context/LanguageContext.tsx`, `src/seo/landingPages.ts`, `src/pages/developer/RegexTesterPage.tsx`

**Interfaces:** Consumes Tasks 1–2; produces both crawlable routes and bidirectional Regex Tester navigation.

- [ ] **Step 1: Write failing page tests**

```tsx
renderAtRoute("/text/text-cleaner");
await user.type(screen.getByLabelText(/input text/i), "  apple\n\n banana  ");
await user.click(screen.getByLabelText(/trim each line/i));
await user.click(screen.getByRole("button", { name: /clean text/i }));
expect(screen.getByLabelText(/cleaned text/i)).toHaveValue("apple\n\nbanana");
render(<FindReplacePage />);
await user.type(screen.getByLabelText(/^text$/i), "Cat cat catalog");
await user.type(screen.getByLabelText(/^find$/i), "cat");
await user.click(screen.getByLabelText(/whole word/i));
await user.click(screen.getByRole("button", { name: /replace all/i }));
expect(screen.getByLabelText(/result/i)).toHaveValue("Cat catlog");
```

- [ ] **Step 2: Run tests to verify they fail** — `npm test -- src/pages/text/TextCleanerPage.test.tsx src/pages/text/FindReplacePage.test.tsx`; expected failure: pages absent.

- [ ] **Step 3: Write minimal pages and integrations**

```tsx
const cleaned = cleanText(input, options);
const replaced = findAndReplace(input, { find, replace, caseSensitive, wholeWord, useRegex, flags });
<TextWorkflowLinks tools={nextTools} />
```

- [ ] **Step 4: Run page/SEO tests** — `npm test -- src/pages/text/TextCleanerPage.test.tsx src/pages/text/FindReplacePage.test.tsx src/pages/developer/RegexTesterPage.test.tsx src/App.test.tsx src/seo/landingPages.test.ts`; expected PASS for transformations, errors, actions, localized routes, metadata, and Cleaner/Find/Regex links.

- [ ] **Step 5: Commit** — `git add src/pages/text src/pages/developer/RegexTesterPage.tsx src/data/tools.ts src/App.tsx src/context/LanguageContext.tsx src/seo/landingPages.ts; git commit -m "feat: add text cleaning and replacement tools"`.

### Task 4: Upgrade Text Diff and existing workflow links

**Files:**
- Modify: `src/pages/text/TextDiffPage.tsx`, `src/pages/text/TextToolsPage.tsx`, `src/context/LanguageContext.tsx`, `src/styles.css`
- Create: `src/pages/text/TextDiffPage.test.tsx`

**Interfaces:** Consumes `compareText` and workflow components; preserves `/text/diff` while adding modes, ignore options, symbols, actions, and required links.

- [ ] **Step 1: Write the failing interaction test**

```tsx
render(<TextDiffPage />);
await user.type(screen.getByLabelText(/original/i), "apple\norange");
await user.type(screen.getByLabelText(/changed/i), "apple\nbanana\norange");
await user.click(screen.getByRole("button", { name: /^compare$/i }));
expect(screen.getByText(/1 addition/i)).toBeInTheDocument();
expect(screen.getByLabelText(/added line/i)).toHaveTextContent("+ banana");
await user.click(screen.getByRole("radio", { name: /unified/i }));
expect(screen.getByText("+banana")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails** — `npm test -- src/pages/text/TextDiffPage.test.tsx`; expected failure: controls and semantics absent.

- [ ] **Step 3: Replace inline diff logic and add contextual UI**

```tsx
const [mode, setMode] = useState<"side-by-side" | "unified">("side-by-side");
const result = compareText(original, changed, { ignoreWhitespace, ignoreCase });
<TextWorkflowLinks tools={diffNextTools} />
```

- [ ] **Step 4: Run workflow tests** — `npm test -- src/pages/text/TextDiffPage.test.tsx src/pages/text/TextToolsPage.test.tsx`; expected PASS for explicit comparison, modes, ignores, identical state, accessible symbols, actions, responsive classes, and Remove Duplicate/Sort links.

- [ ] **Step 5: Commit** — `git add src/pages/text/TextDiffPage.tsx src/pages/text/TextDiffPage.test.tsx src/pages/text/TextToolsPage.tsx src/context/LanguageContext.tsx src/styles.css; git commit -m "feat: complete text compare workflow"`.

### Task 5: Full verification

**Files:** Modify only files necessary to correct a test, type, or build failure.

- [ ] **Step 1: Run focused suite** — `npm test -- src/services/text/textWorkflowService.test.ts src/components/text/TextResultActions.test.tsx src/pages/text/TextCleanerPage.test.tsx src/pages/text/FindReplacePage.test.tsx src/pages/text/TextDiffPage.test.tsx`; expected PASS.
- [ ] **Step 2: Run complete suite and build** — `npm test -- --run; npm run build`; expected PASS with sitemap including both new localized routes and `/text/diff`.
- [ ] **Step 3: Commit verification fixes, if any** — `git add src; git commit -m "fix: verify text workflow integration"`.
