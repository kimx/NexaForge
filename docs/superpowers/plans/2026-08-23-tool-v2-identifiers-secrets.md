# Tool v2 Identifiers and Secrets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade UUID generation with RFC 9562 v4/v7 and .NET Guid formatting, and add cryptographically secure Password, API Key, Hex, and Base64 secret generation with entropy metadata.

**Architecture:** A focused UUID service wraps tree-shakable `uuid` generators and separates version generation from presentation formatting. A pure security service uses injected Web Crypto bytes, rejection sampling, and cryptographic shuffling; two accessible pages keep generated values transient and content-free in analytics.

**Tech Stack:** React 18, TypeScript 5.8, `uuid`, Web Crypto, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-23-tool-v2-design.md`

## Global Constraints

- Use Web Crypto for all identifiers and secrets; never call `Math.random`.
- Never persist, automatically copy, log, or include generated values/options in analytics.
- Keep UUID batch count from 1 to 1000.
- Label .NET Guid as v4-compatible and keep presentation independent of generated version bits.
- Use rejection sampling for bounded alphabet selection and a cryptographic Fisher-Yates shuffle.
- Clearly distinguish upper-bound alphabet entropy from exact random-byte entropy.

---

### Task 1: UUID generation and formatting service

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/text/uuidService.ts`
- Test: `src/services/text/uuidService.test.ts`
- Modify: `src/services/text/textService.ts`

**Interfaces:**
- Produces: `UuidKind = "v4" | "v7" | "dotnet-guid"`, `UuidCase`, `UuidFormat`, `generateIdentifiers(options, dependencies?): string[]`, and `formatIdentifier(value, options): string`.

- [ ] **Step 1: Write failing UUID tests**

```ts
const generated = generateIdentifiers({ kind: "v7", count: 2, case: "upper", format: "braced" }, fakeUuid);
expect(generated).toEqual([
  "{01941F29-7C00-73E4-A310-744D2167FC5B}",
  "{01941F29-7C00-73E4-A310-744D2167FC5C}",
]);
expect(formatIdentifier("109156be-c4fb-41ea-b1b4-efe1671c5836", { case: "lower", format: "compact" }))
  .toBe("109156bec4fb41eab1b4efe1671c5836");
expect(() => generateIdentifiers({ kind: "v4", count: 1001, case: "lower", format: "standard" }, fakeUuid))
  .toThrow("count");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/text/uuidService.test.ts`

- [ ] **Step 3: Install UUID and implement generation/formatting**

Run: `npm install uuid`

Use `v4` for v4 and `.NET Guid (v4)`, `v7` for v7, validate 1–1000 count, and format only after generation. Move or deprecate the existing `generateUuids` implementation so one production path owns UUID generation.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
git add -- package.json package-lock.json src/services/text/textService.ts src/services/text/uuidService.ts src/services/text/uuidService.test.ts
git commit -m "feat: add UUID v4 v7 and Guid service"
```

### Task 2: Cryptographic secret service

**Files:**
- Create: `src/services/security/secretService.ts`
- Test: `src/services/security/secretService.test.ts`

**Interfaces:**
- Produces: `PasswordOptions`, `SecretRequest`, `SecretResult`, `generateSecret(request, randomSource?): SecretResult`, `randomIndex(limit, randomSource): number`, and `estimateAlphabetEntropy(length, alphabetSize): number`.

- [ ] **Step 1: Write failing secret tests**

```ts
const password = generateSecret({
  kind: "password", length: 12,
  sets: { lower: true, upper: true, digits: true, symbols: true },
}, deterministicRandom);
expect(password.value).toHaveLength(12);
expect(password.value).toMatch(/[a-z]/);
expect(password.value).toMatch(/[A-Z]/);
expect(password.value).toMatch(/[0-9]/);
expect(password.value).toMatch(/[^A-Za-z0-9]/);
expect(generateSecret({ kind: "hex", bytes: 16 }, deterministicRandom).entropyBits).toBe(128);
expect(generateSecret({ kind: "base64", bytes: 8 }, deterministicRandom).value).toMatch(/={0,2}$/);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/security/secretService.test.ts`

- [ ] **Step 3: Implement unbiased generation and typed validation**

Use `crypto.getRandomValues` by default. Reject sampled bytes at or above `floor(256 / alphabet.length) * alphabet.length`, ensure every enabled password set contributes one character, fill from the union, and Fisher-Yates shuffle with `randomIndex`. Enforce password 8–128 characters, API key 16–128 characters, Hex/Base64 8–64 bytes, and at least one password set. Return upper-bound entropy for alphabet modes and exact `bytes * 8` for byte modes.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
git add -- src/services/security
git commit -m "feat: add cryptographic secret generation"
```

### Task 3: Upgrade UUID page and add Secret Generator page

**Files:**
- Modify: `src/pages/text/UuidPage.tsx`
- Modify: `src/pages/text/UuidPage.test.tsx`
- Create: `src/pages/developer/SecretGeneratorPage.tsx`
- Test: `src/pages/developer/SecretGeneratorPage.test.tsx`
- Modify: `src/i18n/issue26Messages.ts`
- Modify: `src/styles/issue26-tools.css`

**Interfaces:**
- Consumes Task 1 and 2 services and existing template, output, download, localization, SEO, and analytics helpers.

- [ ] **Step 1: Write failing page tests**

```ts
fireEvent.change(screen.getByLabelText("Identifier type"), { target: { value: "v7" } });
fireEvent.change(screen.getByLabelText("Output format"), { target: { value: "braced" } });
fireEvent.click(screen.getByRole("button", { name: "Generate identifiers" }));
expect(await screen.findByText(/\{[0-9a-f-]+\}/i)).toBeInTheDocument();

fireEvent.change(screen.getByLabelText("Secret type"), { target: { value: "password" } });
fireEvent.click(screen.getByRole("button", { name: "Generate secret" }));
expect(screen.getByLabelText("Generated secret")).not.toHaveValue("");
expect(screen.getByText(/bits/i)).toBeInTheDocument();
```

- [ ] **Step 2: Verify RED**

Run both page tests and confirm failures are caused by absent new controls/page.

- [ ] **Step 3: Implement transient, accessible generators**

Upgrade UUID controls without changing the canonical route or batch/download behavior. Secret mode changes expose only relevant bounded inputs, password character sets use a semantic fieldset, generated values are never copied automatically, entropy is labeled as estimate or exact source entropy, and clipboard failures retain selectable output.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
git add -- src/pages/text/UuidPage.tsx src/pages/text/UuidPage.test.tsx src/pages/developer/SecretGeneratorPage.tsx src/pages/developer/SecretGeneratorPage.test.tsx src/i18n/issue26Messages.ts src/styles/issue26-tools.css
git commit -m "feat: add identifier and secret interfaces"
```

### Task 4: Batch 3 discovery and full Tool v2 verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Add failing Secret route, UUID metadata, privacy, and localized assertions**

Assert `/developer/secret-generator` and `/en` route/prerender output, upgraded UUID aliases/descriptions, localized labels, and analytics calls containing no generated values or secret options.

- [ ] **Step 2: Verify RED**

Run UUID, Secret, app, registry, and SEO tests.

- [ ] **Step 3: Register Secret Generator and update public inventory**

Add the lazy route and tool definition, update UUID discovery copy, README inventory, and the MIT/source notice for `uuid`.

- [ ] **Step 4: Run complete verification and commit**

Run: `npm test -- --run`

Run: `npm run build`

Run: `git diff --check`

Expected: the full suite and client/SSR/prerender build exit 0; all twelve canonical/localized Tool v2 route forms are present (five new tools plus the upgraded UUID route across both supported locales).

```powershell
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx src/seo README.md THIRD_PARTY_NOTICES.md
git commit -m "feat: complete Tool v2 suite"
```
