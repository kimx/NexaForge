# Regex Tester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, bilingual, indexable JavaScript Regex Tester that cannot freeze the NexaForge UI.

**Architecture:** A pure regex engine produces serializable match data, while a module Web Worker isolates untrusted expressions from the main thread. A timeout-aware service owns the Worker lifecycle, and a standalone `ToolPageTemplate` page owns form state, cancellation, localized feedback, and result rendering.

**Tech Stack:** React 18, TypeScript 5.8, Vite module workers, React Router 6, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-22-regex-tester-design.md`

## Global Constraints

- All pattern execution happens in a Web Worker, never on the UI thread.
- Terminate runs after 750 ms and cap output at 500 matches.
- Keep pattern and test text in the browser and out of analytics payloads.
- Support Traditional Chinese and English using the existing dictionaries.
- Add no runtime dependency and no generic playground abstraction.
- Preserve the current tool registry, localized route, SEO, and `ToolPageTemplate` conventions.

## File map

- `src/services/regex/regexEngine.ts`: serializable request/result types and pure matching logic.
- `src/services/regex/regexEngine.test.ts`: engine behavior and boundary tests.
- `src/services/regex/regexWorker.ts`: Worker message adapter around the pure engine.
- `src/services/regex/regexService.ts`: timeout, abort, cleanup, and typed errors for the UI.
- `src/services/regex/regexService.test.ts`: fake-Worker lifecycle tests.
- `src/pages/developer/RegexTesterPage.tsx`: accessible tool workflow and match presentation.
- `src/pages/developer/RegexTesterPage.test.tsx`: page interaction and async-state tests.
- `src/data/tools.ts`: registry/search metadata.
- `src/App.tsx`: lazy route registration.
- `src/App.test.tsx`: canonical and localized route coverage.
- `src/context/LanguageContext.tsx`: bilingual UI, how-to, FAQ, and error copy.
- `src/styles.css`: scoped regex form and result styles.
- `README.md`: public feature inventory.

---

### Task 1: Pure regex engine

**Files:**
- Create: `src/services/regex/regexEngine.ts`
- Test: `src/services/regex/regexEngine.test.ts`

**Interfaces:**
- Consumes: native `RegExp` only.
- Produces: `runRegex(request: RegexRunRequest): RegexRunResult`, `RegexRunRequest`, `RegexMatchResult`, and `RegexRunResult`.

- [ ] **Step 1: Write failing engine tests**

```ts
import { runRegex } from "./regexEngine";

it("returns global matches with captures and named groups", () => {
  const result = runRegex({
    pattern: "(?<word>[A-Za-z]+)-(\\d+)",
    flags: "g",
    text: "alpha-12 beta-34",
    maxMatches: 500,
  });
  expect(result.matches).toEqual([
    { value: "alpha-12", index: 0, groups: ["alpha", "12"], namedGroups: { word: "alpha" } },
    { value: "beta-34", index: 9, groups: ["beta", "34"], namedGroups: { word: "beta" } },
  ]);
  expect(result.truncated).toBe(false);
});

it("advances past zero-length global matches", () => {
  expect(runRegex({ pattern: "(?=a)", flags: "g", text: "aa", maxMatches: 500 }).matches)
    .toHaveLength(2);
});

it("stops at maxMatches and reports truncation", () => {
  const result = runRegex({ pattern: ".", flags: "g", text: "abcd", maxMatches: 2 });
  expect(result.matches).toHaveLength(2);
  expect(result.truncated).toBe(true);
});

it("returns only the first match without the global flag", () => {
  expect(runRegex({ pattern: "a", flags: "", text: "aaa", maxMatches: 500 }).matches)
    .toHaveLength(1);
});

it("lets invalid patterns throw SyntaxError", () => {
  expect(() => runRegex({ pattern: "(", flags: "g", text: "x", maxMatches: 500 }))
    .toThrow(SyntaxError);
});
```

- [ ] **Step 2: Run the tests and confirm the missing module failure**

Run: `npm test -- --run src/services/regex/regexEngine.test.ts`

Expected: FAIL because `./regexEngine` does not exist.

- [ ] **Step 3: Implement the minimal pure engine**

```ts
export interface RegexRunRequest {
  pattern: string;
  flags: string;
  text: string;
  maxMatches?: number;
}

export interface RegexMatchResult {
  value: string;
  index: number;
  groups: Array<string | null>;
  namedGroups: Record<string, string | null>;
}

export interface RegexRunResult {
  matches: RegexMatchResult[];
  truncated: boolean;
}

export function runRegex({ pattern, flags, text, maxMatches = 500 }: RegexRunRequest): RegexRunResult {
  const expression = new RegExp(pattern, flags);
  const matches: RegexMatchResult[] = [];
  let truncated = false;

  while (true) {
    const match = expression.exec(text);
    if (!match) break;
    if (matches.length === maxMatches) {
      truncated = true;
      break;
    }
    matches.push({
      value: match[0],
      index: match.index,
      groups: match.slice(1).map((value) => value ?? null),
      namedGroups: Object.fromEntries(
        Object.entries(match.groups ?? {}).map(([name, value]) => [name, value ?? null])
      ),
    });
    if (!expression.global) break;
    if (match[0] === "") expression.lastIndex += 1;
  }

  return { matches, truncated };
}
```

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/services/regex/regexEngine.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the engine**

```powershell
git add -- src/services/regex/regexEngine.ts src/services/regex/regexEngine.test.ts
git commit -m "feat: add regex matching engine"
```

### Task 2: Worker-backed execution service

**Files:**
- Create: `src/services/regex/regexWorker.ts`
- Create: `src/services/regex/regexService.ts`
- Test: `src/services/regex/regexService.test.ts`

**Interfaces:**
- Consumes: `RegexRunRequest`, `RegexRunResult`, and `runRegex` from Task 1.
- Produces: `testRegex(request, options?): Promise<RegexRunResult>`, `RegexValidationError`, `RegexTimeoutError`, `RegexExecutionError`, `RegexWorkerLike`, and `RegexWorkerFactory`.

- [ ] **Step 1: Write failing lifecycle tests using a fake Worker**

```ts
it("resolves a successful worker response and terminates it", async () => {
  const worker = new FakeWorker();
  const pending = testRegex(request, { workerFactory: () => worker, timeoutMs: 750 });
  worker.emitMessage({ ok: true, result: { matches: [], truncated: false } });
  await expect(pending).resolves.toEqual({ matches: [], truncated: false });
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it("rejects invalid syntax with RegexValidationError", async () => {
  const worker = new FakeWorker();
  const pending = testRegex(request, { workerFactory: () => worker });
  worker.emitMessage({ ok: false, error: { kind: "invalid-pattern", message: "bad pattern" } });
  await expect(pending).rejects.toBeInstanceOf(RegexValidationError);
});

it("times out and terminates the worker", async () => {
  vi.useFakeTimers();
  const worker = new FakeWorker();
  const pending = testRegex(request, { workerFactory: () => worker, timeoutMs: 750 });
  const assertion = expect(pending).rejects.toBeInstanceOf(RegexTimeoutError);
  await vi.advanceTimersByTimeAsync(750);
  await assertion;
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it("aborts and terminates the worker", async () => {
  const controller = new AbortController();
  const worker = new FakeWorker();
  const pending = testRegex(request, { workerFactory: () => worker, signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(worker.terminate).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the service tests and confirm failure**

Run: `npm test -- --run src/services/regex/regexService.test.ts`

Expected: FAIL because `regexService.ts` does not exist.

- [ ] **Step 3: Implement Worker message adaptation and service cleanup**

`regexWorker.ts` must listen for a `RegexRunRequest`, call `runRegex`, and post either `{ ok: true, result }` or `{ ok: false, error: { kind, message } }`, mapping `SyntaxError` to `invalid-pattern` and all other errors to `execution`.

`regexService.ts` must create `new Worker(new URL("./regexWorker.ts", import.meta.url), { type: "module" })` by default. It must settle only once, clear its timer, remove the abort listener, terminate the worker on every terminal path, and reject an already-aborted signal immediately with `new DOMException("Regex test aborted", "AbortError")`.

- [ ] **Step 4: Run engine and service tests**

Run: `npm test -- --run src/services/regex/regexEngine.test.ts src/services/regex/regexService.test.ts`

Expected: PASS with no unhandled rejections or fake-timer leakage.

- [ ] **Step 5: Commit the worker boundary**

```powershell
git add -- src/services/regex/regexWorker.ts src/services/regex/regexService.ts src/services/regex/regexService.test.ts
git commit -m "feat: isolate regex execution in worker"
```

### Task 3: Accessible bilingual Regex Tester page

**Files:**
- Create: `src/pages/developer/RegexTesterPage.tsx`
- Test: `src/pages/developer/RegexTesterPage.test.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `testRegex`, the three typed service errors, `FILE_TOOLS`, `ToolPageTemplate`, `useLanguage`, `useSeo`, `getRelatedTools`, and `trackEvent`.
- Produces: `RegexTesterPage(): JSX.Element`.

- [ ] **Step 1: Write failing page tests with `regexService` mocked**

```ts
vi.mock("../../services/regex/regexService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/regex/regexService")>();
  return { ...actual, testRegex: vi.fn() };
});

it("submits the pattern, selected flags, and test text", async () => {
  vi.mocked(testRegex).mockResolvedValue({
    matches: [{ value: "alpha-12", index: 0, groups: ["alpha", "12"], namedGroups: { word: "alpha" } }],
    truncated: false,
  });
  renderWithProviders(<RegexTesterPage />);
  fireEvent.change(screen.getByLabelText("Pattern"), { target: { value: "(?<word>[a-z]+)-(\\d+)" } });
  fireEvent.change(screen.getByLabelText("Test text"), { target: { value: "alpha-12" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /case insensitive/i }));
  fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
  await waitFor(() => expect(testRegex).toHaveBeenCalledWith(
    expect.objectContaining({ pattern: "(?<word>[a-z]+)-(\\d+)", flags: "g", text: "alpha-12", maxMatches: 500 }),
    expect.objectContaining({ signal: expect.any(AbortSignal), timeoutMs: 750 })
  ));
  expect(await screen.findByText("alpha-12")).toBeInTheDocument();
  expect(screen.getByText("word: alpha")).toBeInTheDocument();
});

it("shows validation and timeout errors", async () => {
  vi.mocked(testRegex).mockRejectedValueOnce(new RegexValidationError("Unterminated group"));
  renderWithProviders(<RegexTesterPage />);
  fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid regular expression: Unterminated group"
  );

  vi.mocked(testRegex).mockRejectedValueOnce(new RegexTimeoutError());
  fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "That expression took too long and was stopped."
  );
});

it("aborts the previous run before starting another", async () => {
  const signals: AbortSignal[] = [];
  vi.mocked(testRegex).mockImplementation((_request, options) => {
    signals.push(options?.signal as AbortSignal);
    return new Promise(() => undefined);
  });
  renderWithProviders(<RegexTesterPage />);
  const action = screen.getByRole("button", { name: "Test regex" });
  fireEvent.click(action);
  fireEvent.click(screen.getByRole("button", { name: "Testing..." }));
  expect(signals).toHaveLength(2);
  expect(signals[0].aborted).toBe(true);
  expect(signals[1].aborted).toBe(false);
});
```

- [ ] **Step 2: Run the page test and confirm failure**

Run: `npm test -- --run src/pages/developer/RegexTesterPage.test.tsx`

Expected: FAIL because `RegexTesterPage.tsx` and translation keys do not exist.

- [ ] **Step 3: Implement page state, copy, and rendering**

Use a controlled text input for pattern, controlled textarea for test text, and checkboxes for `g`, `i`, `m`, `s`, `u`, and `y` with stable flag order. Start with `g` selected. An `AbortController` ref must abort the prior run before each submit and on unmount. Ignore `AbortError`; map `RegexValidationError`, `RegexTimeoutError`, and other errors to distinct localized messages.

Render match output in a `.table-wrapper` table with headers for match, index, capture groups, and named groups. Render empty unmatched captures as `null`, a localized no-match state for zero results, and a localized 500-result truncation notice. Use `<code>` for pattern data and match/capture values so whitespace remains distinguishable.

Add both `zhMessages` and `enMessages` entries for:

```text
tool.regex-tester.title
tool.regex-tester.description
tool.regex-tester.label.pattern
tool.regex-tester.label.flags
tool.regex-tester.label.testText
tool.regex-tester.label.matchCount
tool.regex-tester.label.match
tool.regex-tester.label.index
tool.regex-tester.label.groups
tool.regex-tester.label.namedGroups
tool.regex-tester.label.noGroups
tool.regex-tester.label.noMatches
tool.regex-tester.label.truncated
tool.regex-tester.button.test
tool.regex-tester.button.testing
tool.regex-tester.error.invalid
tool.regex-tester.error.timeout
tool.regex-tester.error.execution
tool.regex-tester.flag.g through tool.regex-tester.flag.y
tool.regex-tester.how.0 through tool.regex-tester.how.2
tool.regex-tester.faq.0.question/.answer and faq.1.question/.answer
```

Add only scoped `.regex-tester__*` styles for the pattern row, flag grid, summary, and group lists. Reuse existing form, button, card, table-wrapper, and global table styles.

- [ ] **Step 4: Run focused page and service tests**

Run: `npm test -- --run src/pages/developer/RegexTesterPage.test.tsx src/services/regex/regexService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the page**

```powershell
git add -- src/pages/developer/RegexTesterPage.tsx src/pages/developer/RegexTesterPage.test.tsx src/context/LanguageContext.tsx src/styles.css
git commit -m "feat: add regex tester interface"
```

### Task 4: Discovery, routing, SEO, and final verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `README.md`
- Test: existing `src/routing/routes.ts`, `src/seo/siteMeta.test.ts`, and `src/seo/artifacts.test.ts` behavior through the registry.

**Interfaces:**
- Consumes: `RegexTesterPage` from Task 3 and existing registry-driven route/SEO helpers.
- Produces: canonical `/developer/regex-tester`, localized `/en/developer/regex-tester`, and discoverable tool metadata.

- [ ] **Step 1: Extend route tests before registration**

Add `"/developer/regex-tester": "Regex Tester"` to the English route title cases in `App.test.tsx`. Add assertions that both `/developer/regex-tester` and `/en/developer/regex-tester` render the title and that `BASE_INDEXABLE_ROUTES`/`INDEXABLE_ROUTES` include the respective paths.

- [ ] **Step 2: Run the route test and confirm failure**

Run: `npm test -- --run src/App.test.tsx src/routing/localePaths.test.ts src/seo/siteMeta.test.ts`

Expected: FAIL because the tool is not registered or routed.

- [ ] **Step 3: Register and route the tool**

Add this registry entry near other developer tools:

```ts
{
  id: "regex-tester",
  title: "Regex Tester",
  description: "Test JavaScript regular expressions safely in an isolated browser worker.",
  path: "/developer/regex-tester",
  category: "Developer",
  aliases: ["regex test", "regexp tester", "regular expression tester"],
  keywords: ["developer", "regex", "regexp", "pattern", "match", "capture groups"],
}
```

Lazy import `RegexTesterPage` in `App.tsx` and add it to `APP_ROUTES`. Registry-driven routing and SEO lists will include both locales automatically. Add **Regex Tester** to the README developer-tool list.

- [ ] **Step 4: Run focused routing and SEO tests**

Run: `npm test -- --run src/App.test.tsx src/routing/localePaths.test.ts src/seo/siteMeta.test.ts src/seo/artifacts.test.ts`

Expected: PASS.

- [ ] **Step 5: Run complete verification**

Run: `npm test -- --run`

Expected: all Vitest suites pass.

Run: `npm run build`

Expected: TypeScript, client build, SSR build, and prerender all complete; generated artifacts include the canonical and English Regex Tester pages.

- [ ] **Step 6: Review the final diff and commit integration**

```powershell
git diff --check
git status --short
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx README.md
git commit -m "feat: publish regex tester tool"
```

- [ ] **Step 7: Confirm repository state**

Run: `git status --short --branch; git log -5 --oneline`

Expected: clean working tree with the design, plan, engine, Worker service, page, and integration commits at `HEAD`.
