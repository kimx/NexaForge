# Tool v2 URL and cURL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automatic browser-native URL parser and a browser-local cURL converter for C#, JavaScript, Python, and PowerShell.

**Architecture:** A pure URL service normalizes native `URL` output while preserving ordered duplicate parameters. A dynamically loaded `curlconverter` adapter owns Tree-sitter WASM initialization, target mapping, warnings, and sanitized errors; focused React pages render the results without executing requests.

**Tech Stack:** React 18, TypeScript 5.8, native URL APIs, `curlconverter`, Tree-sitter WASM, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-23-tool-v2-design.md`

## Global Constraints

- Parse and convert locally; never execute a request or put source/output in analytics or persistent storage.
- Preserve query parameter order, duplicate keys, blank keys, and blank values.
- Dynamically import `curlconverter` only after Convert and never during SSR/prerender.
- Deploy `tree-sitter.wasm` and `tree-sitter-bash.wasm` at the static root expected by the browser parser.
- Preserve input and selected target after errors; show non-blocking conversion warnings next to valid output.
- Provide bilingual, accessible, responsive pages and content-free analytics.

---

### Task 1: URL parsing service

**Files:**
- Create: `src/services/url/urlParserService.ts`
- Test: `src/services/url/urlParserService.test.ts`

**Interfaces:**
- Produces: `ParsedUrl`, `ParsedQueryParameter`, `UrlParseError`, and `parseUrl(source): ParsedUrl`.

- [ ] **Step 1: Write failing URL behavior tests**

```ts
const result = parseUrl("https://abc.com:8443/api/items?id=123&type=A&id=456&empty=#top");
expect(result.protocol).toBe("https:");
expect(result.hostname).toBe("abc.com");
expect(result.port).toBe("8443");
expect(result.pathname).toBe("/api/items");
expect(result.queryParameters).toEqual([
  { key: "id", value: "123" }, { key: "type", value: "A" },
  { key: "id", value: "456" }, { key: "empty", value: "" },
]);
expect(() => parseUrl("/relative")).toThrow(UrlParseError);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/url/urlParserService.test.ts`

- [ ] **Step 3: Implement native parsing and JSON serialization shape**

Trim surrounding whitespace, require an explicit absolute protocol, use `new URL`, map `searchParams.entries()` without converting to an object, and return serializable scalar fields plus ordered parameters. Normalize all failures to `UrlParseError("invalid-url")` without echoing input.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
git add -- src/services/url
git commit -m "feat: add local URL parsing service"
```

### Task 2: cURL adapter and WASM assets

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/copy-curl-wasm.mjs`
- Create during setup: `public/tree-sitter.wasm`
- Create during setup: `public/tree-sitter-bash.wasm`
- Create: `src/services/curl/curlConverterService.ts`
- Test: `src/services/curl/curlConverterService.test.ts`

**Interfaces:**
- Produces: `CurlTarget = "csharp" | "javascript" | "python" | "powershell"`, `CurlConversionResult`, `CurlConversionWarning`, `CurlConversionError`, and `convertCurl(source, target, dependencies?): Promise<CurlConversionResult>`.

- [ ] **Step 1: Write failing adapter tests**

```ts
const result = await convertCurl("curl https://example.com", "csharp", {
  csharp: async () => ["using var client = new HttpClient();", [["note", "Check redirect behavior"]]],
});
expect(result.code).toContain("HttpClient");
expect(result.warnings[0].message).toBe("Check redirect behavior");
await expect(convertCurl("echo nope", "python", failingDependencies)).rejects.toMatchObject({ code: "invalid-curl" });
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/curl/curlConverterService.test.ts`

- [ ] **Step 3: Install converter and copy browser WASM assets**

Run: `npm install curlconverter`

Create `scripts/copy-curl-wasm.mjs` with `copyFileSync` from `node_modules/web-tree-sitter/tree-sitter.wasm` and `node_modules/curlconverter/dist/tree-sitter-bash.wasm` into `public/`. Add `prepare:curl-wasm` and invoke it before client and SSR builds without overwriting unrelated public files.

- [ ] **Step 4: Implement target mapping and normalized warnings**

Map to `toCSharpWarn`, `toJavaScriptWarn`, `toPythonWarn`, and `toPowershellRestMethodWarn`. Convert warning tuples to `{ code, message }`, reject blank input before import, normalize parser failures to sanitized error codes, and cache only the module import promise rather than user content.

- [ ] **Step 5: Verify GREEN, asset copy, and commit**

Run: `npm test -- --run src/services/curl/curlConverterService.test.ts`

Run: `npm run prepare:curl-wasm`

Expected: both public WASM files exist and are non-empty.

```powershell
git add -- package.json package-lock.json scripts/copy-curl-wasm.mjs public/tree-sitter.wasm public/tree-sitter-bash.wasm src/services/curl
git commit -m "feat: add browser cURL conversion service"
```

### Task 3: URL and cURL pages

**Files:**
- Create: `src/pages/developer/UrlParserPage.tsx`
- Test: `src/pages/developer/UrlParserPage.test.tsx`
- Create: `src/pages/developer/CurlToCodePage.tsx`
- Test: `src/pages/developer/CurlToCodePage.test.tsx`
- Modify: `src/i18n/issue26Messages.ts`
- Modify: `src/styles/issue26-tools.css`

**Interfaces:**
- Consumes Task 1 and 2 services plus existing template, output, SEO, localization, download, and analytics helpers.

- [ ] **Step 1: Write failing page tests**

```ts
fireEvent.change(screen.getByLabelText("URL"), { target: { value: "https://abc.com/api?id=123&id=456" } });
expect(screen.getByText("abc.com")).toBeInTheDocument();
expect(screen.getAllByText("id")).toHaveLength(2);

fireEvent.change(screen.getByLabelText("cURL command"), { target: { value: "curl https://example.com" } });
fireEvent.change(screen.getByLabelText("Target language"), { target: { value: "csharp" } });
fireEvent.click(screen.getByRole("button", { name: "Convert cURL" }));
await waitFor(() => expect(screen.getByLabelText("Generated code")).toHaveValue(expect.stringContaining("HttpClient")));
```

- [ ] **Step 2: Verify RED**

Run both new page tests; expect missing modules/pages.

- [ ] **Step 3: Implement immediate URL and explicit cURL workflows**

URL parsing runs synchronously on each edit, clears stale valid results on invalid input, renders scalar values and an ordered semantic parameter list, and supports per-value plus JSON copy/download. cURL conversion uses a labeled target select, explicit Convert button, `aria-busy`, warning list, code copy/download extensions, retained input, and retryable load errors.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
git add -- src/pages/developer/UrlParserPage.tsx src/pages/developer/UrlParserPage.test.tsx src/pages/developer/CurlToCodePage.tsx src/pages/developer/CurlToCodePage.test.tsx src/i18n/issue26Messages.ts src/styles/issue26-tools.css
git commit -m "feat: add URL and cURL tool interfaces"
```

### Task 4: Batch 2 discovery and verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Add failing discovery, localized route, asset, and SSR assertions**

Assert `/developer/url-parser`, `/developer/curl-to-code`, `/en` variants, registry aliases, prerender artifacts, public WASM files, and no cURL module/WASM initialization during SSR.

- [ ] **Step 2: Verify RED**

Run registry, app, and SEO tests.

- [ ] **Step 3: Register routes, notices, and README inventory**

Add lazy page imports, tool definitions and aliases, curlconverter/Tree-sitter notice entries, and the two public tools to README.

- [ ] **Step 4: Verify batch and commit**

Run: `npm test -- --run src/services/url src/services/curl src/pages/developer/UrlParserPage.test.tsx src/pages/developer/CurlToCodePage.test.tsx src/App.test.tsx src/seo`

Run: `npm run build`

```powershell
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx src/seo README.md THIRD_PARTY_NOTICES.md
git commit -m "feat: publish URL and cURL tools"
```
