# Issue #23 Structured Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON-to-C#, JSON-to-TypeScript, bidirectional JSON/XML conversion, and XML formatting as deterministic bilingual browser tools.

**Architecture:** Pure schema inference and XML mapping modules own conversion behavior. Focused React pages provide editable samples, validation, generated text, copy/download actions, and registry-driven discovery without adding runtime dependencies.

**Tech Stack:** React 18, TypeScript 5.8, native DOMParser/XMLSerializer, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-22-issue-23-complete-tool-suite-design.md`

## Global Constraints

- Process all JSON/XML locally and never place source or generated content in analytics.
- Reject XML containing `DOCTYPE` or `ENTITY` declarations.
- Use `@name`, `#text`, and arrays as the documented JSON/XML mapping.
- Sanitize and de-duplicate generated type/property identifiers deterministically.
- Provide editable valid samples, field-associated errors, copy, and download.
- Add no runtime dependency.

---

### Task 1: Shared JSON schema inference

**Files:**
- Create: `src/services/codegen/jsonSchema.ts`
- Test: `src/services/codegen/jsonSchema.test.ts`

**Interfaces:**
- Produces: `inferJsonSchema(value, rootName): InferredSchema`, `sanitizeTypeName`, `sanitizePropertyName`, and schema node types for object, array, string, number, boolean, null, and union.

- [ ] **Step 1: Write failing inference tests**

```ts
const schema = inferJsonSchema({ user: { "display-name": "Ada" }, items: [{ id: 1 }, { id: 2, active: true }] }, "Api Response");
expect(schema.rootName).toBe("ApiResponse");
expect(schema.objects.map((item) => item.name)).toEqual(["ApiResponse", "User", "Item"]);
expect(schema.objects.find((item) => item.name === "Item")?.properties.find((item) => item.sourceName === "active")?.optional).toBe(true);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/codegen/jsonSchema.test.ts`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement recursive deterministic inference**

Merge array object shapes by source property name, mark missing properties optional, union incompatible scalar types, treat empty arrays as unknown arrays, suffix duplicate type names numerically, and retain original property names for renderers.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --run src/services/codegen/jsonSchema.test.ts`

```powershell
git add -- src/services/codegen/jsonSchema.ts src/services/codegen/jsonSchema.test.ts
git commit -m "feat: infer schemas from JSON"
```

### Task 2: C# and TypeScript renderers

**Files:**
- Create: `src/services/codegen/csharpGenerator.ts`
- Test: `src/services/codegen/csharpGenerator.test.ts`
- Create: `src/services/codegen/typescriptGenerator.ts`
- Test: `src/services/codegen/typescriptGenerator.test.ts`

**Interfaces:**
- Produces: `generateCSharp(value, options): string` and `generateTypeScript(value, options): string`.

- [ ] **Step 1: Write failing renderer tests**

```ts
expect(generateCSharp({ "display-name": "Ada", age: null }, { rootName: "Person", namespace: "Demo.Models" }))
  .toContain('[JsonPropertyName("display-name")]');
expect(generateCSharp({ age: null }, { rootName: "Person" })).toContain("public object? Age");
expect(generateTypeScript([{ id: 1 }, { id: 2, label: null }], { rootName: "Item" }))
  .toContain("label?: null;");
```

- [ ] **Step 2: Verify RED**

Run both new test files. Expected: FAIL because renderers are absent.

- [ ] **Step 3: Implement renderers over `InferredSchema`**

C# emits `using System.Text.Json.Serialization`, optional namespace, nullable reference syntax, `List<T>`, `[JsonPropertyName]` when the source/property names differ, and one public class per object shape. TypeScript emits exported interfaces, quoted unsafe property names, `?` for missing properties, `unknown[]` for empty arrays, and stable declaration order.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --run src/services/codegen`

```powershell
git add -- src/services/codegen
git commit -m "feat: generate C# and TypeScript from JSON"
```

### Task 3: XML mapping and formatter domain

**Files:**
- Create: `src/services/xml/xmlService.ts`
- Test: `src/services/xml/xmlService.test.ts`

**Interfaces:**
- Produces: `jsonToXml(jsonText, options): string`, `xmlToJson(xmlText, options): string`, `formatXml(xmlText, options): string`, and `XmlValidationError`.

- [ ] **Step 1: Write failing XML tests**

```ts
expect(xmlToJson('<catalog lang="en"><item>One</item><item>Two</item></catalog>', { indent: 2 }))
  .toBe('{\n  "catalog": {\n    "@lang": "en",\n    "item": [\n      "One",\n      "Two"\n    ]\n  }\n}');
expect(jsonToXml('{"catalog":{"@lang":"en","item":["One","Two"]}}', { indent: 2 }))
  .toContain('<catalog lang="en">');
expect(() => formatXml('<!DOCTYPE x><x/>', { mode: "pretty", indent: 2 })).toThrow(XmlValidationError);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/xml/xmlService.test.ts`

Expected: FAIL because `xmlService.ts` is absent.

- [ ] **Step 3: Implement safe parsing, mapping, and serialization**

Reject declaration patterns before parsing, detect `parsererror`, map attributes/text/repeated children, require one JSON root property, create DOM nodes rather than string-concatenating XML, and serialize pretty/compact/minified output deterministically.

- [ ] **Step 4: Verify GREEN and commit**

Run the XML test file. Expected: PASS.

```powershell
git add -- src/services/xml/xmlService.ts src/services/xml/xmlService.test.ts
git commit -m "feat: add safe JSON and XML conversion"
```

### Task 4: Code output component and four pages

**Files:**
- Create: `src/components/CodeOutputPanel.tsx`
- Test: `src/components/CodeOutputPanel.test.tsx`
- Create: `src/pages/developer/JsonToCSharpPage.tsx`
- Test: `src/pages/developer/JsonToCSharpPage.test.tsx`
- Create: `src/pages/developer/JsonToTypeScriptPage.tsx`
- Test: `src/pages/developer/JsonToTypeScriptPage.test.tsx`
- Create: `src/pages/data/JsonXmlPage.tsx`
- Test: `src/pages/data/JsonXmlPage.test.tsx`
- Create: `src/pages/data/XmlFormatterPage.tsx`
- Test: `src/pages/data/XmlFormatterPage.test.tsx`
- Modify: `src/i18n/issue23Messages.ts`
- Modify: `src/styles/issue23-tools.css`

**Interfaces:**
- `CodeOutputPanel` consumes label, value, fileName, language, and empty text; it exposes copy and text download only when value exists.

- [ ] **Step 1: Write failing component/page tests**

Cover explicit conversion, editable samples, root/namespace options, invalid JSON, invalid XML, direction switching, indentation, minify/pretty, copy/download visibility, and bilingual labels.

- [ ] **Step 2: Verify RED**

Run the five new test files. Expected: FAIL because components/pages are missing.

- [ ] **Step 3: Implement minimal accessible workflows**

Use labeled source/output textareas, explicit primary actions, `aria-describedby` for parse errors, non-editable generated output, safe text rendering, and `ToolPageTemplate` how-to/FAQ content. Preserve source text after failures and clear stale results when direction or source changes.

- [ ] **Step 4: Verify GREEN and commit**

Run the five files from Step 2. Expected: PASS.

```powershell
git add -- src/components/CodeOutputPanel.tsx src/components/CodeOutputPanel.test.tsx src/pages/developer/JsonToCSharpPage.tsx src/pages/developer/JsonToCSharpPage.test.tsx src/pages/developer/JsonToTypeScriptPage.tsx src/pages/developer/JsonToTypeScriptPage.test.tsx src/pages/data/JsonXmlPage.tsx src/pages/data/JsonXmlPage.test.tsx src/pages/data/XmlFormatterPage.tsx src/pages/data/XmlFormatterPage.test.tsx src/i18n/issue23Messages.ts src/styles/issue23-tools.css
git commit -m "feat: add structured data tool interfaces"
```

### Task 5: Discovery and batch verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Add failing assertions for four canonical and localized routes**

Paths: `/developer/json-to-csharp`, `/developer/json-to-typescript`, `/data/json-xml`, and `/data/xml-formatter` plus `/en` variants.

- [ ] **Step 2: Verify RED**

Run route and SEO tests. Expected: FAIL because tools are not registered.

- [ ] **Step 3: Register lazy pages, aliases, and README entries**

Code generators use Developer category; XML tools use Data. Include C sharp/C#/TS/interface/XML converter aliases.

- [ ] **Step 4: Verify batch and commit**

Run: `npm test -- --run src/services/codegen src/services/xml src/components/CodeOutputPanel.test.tsx src/pages/developer src/pages/data src/App.test.tsx src/seo`

Run: `npm run build`

Expected: both commands exit 0.

```powershell
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx src/seo README.md
git commit -m "feat: publish structured data tool suite"
```

