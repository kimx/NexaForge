# Tool v2 SQL and Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-local SQL formatter/minifier and a structured five-field Cron builder with five future execution previews.

**Architecture:** Focused TypeScript services wrap dynamically imported `sql-formatter` and `cron-parser`; a pure Cron builder and SQL compactor keep deterministic logic independently testable. Two React pages reuse the existing tool template, bilingual dictionaries, discovery, SEO, and output conventions.

**Tech Stack:** React 18, TypeScript 5.8, `sql-formatter`, `cron-parser`, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-23-tool-v2-design.md`

## Global Constraints

- Process SQL and schedules locally; never place source, output, expressions, or field selections in analytics.
- Support only SQL Server, PostgreSQL, and MySQL and a standard five-field Cron expression.
- Dynamically import both runtime dependencies inside service functions so SSR and prerender never initialize them.
- Preserve SQL string, identifier, and comment contents during compacting.
- Prevent simultaneous day-of-month and day-of-week restrictions.
- Provide Traditional Chinese and English copy, field-associated errors, keyboard access, and narrow-screen reflow.

---

### Task 1: SQL formatting domain and adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/sql/sqlFormatterService.ts`
- Test: `src/services/sql/sqlFormatterService.test.ts`

**Interfaces:**
- Produces: `SqlDialect = "transactsql" | "postgresql" | "mysql"`, `SqlKeywordCase = "preserve" | "upper" | "lower"`, `SqlFormatOptions`, `formatSql(source, options, dependencies?): Promise<string>`, and `compactSql(formatted): string`.

- [ ] **Step 1: Write failing service tests**

```ts
expect(await formatSql("select * from users", {
  dialect: "transactsql", keywordCase: "upper", indent: 2, mode: "format",
}, { format: fakeFormatter })).toBe("SELECT\n  *\nFROM\n  users");
expect(compactSql("SELECT 'two  spaces'\nFROM [user table]\n-- keep\nWHERE id = 1"))
  .toBe("SELECT 'two  spaces' FROM [user table] -- keep\nWHERE id = 1");
expect(compactSql("SELECT $$a  b$$  FROM `items`")).toBe("SELECT $$a  b$$ FROM `items`");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/sql/sqlFormatterService.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Install dependency and implement minimal service**

Run: `npm install sql-formatter`

The default dependency dynamically imports `format` from `sql-formatter`. Map dialect and keyword-case options directly. Implement a lexical state machine for normal text, single/double/backtick/bracket quoting, PostgreSQL dollar quoting, line comments, and block comments; collapse only normal-state whitespace and retain the newline that terminates a line comment.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --run src/services/sql/sqlFormatterService.test.ts`

```powershell
git add -- package.json package-lock.json src/services/sql
git commit -m "feat: add local SQL formatting service"
```

### Task 2: Cron builder and schedule adapter

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/cron/cronBuilder.ts`
- Test: `src/services/cron/cronBuilder.test.ts`
- Create: `src/services/cron/cronScheduleService.ts`
- Test: `src/services/cron/cronScheduleService.test.ts`

**Interfaces:**
- Produces: `CronBuilderState`, `DEFAULT_CRON_STATE`, `buildCronExpression(state): string`, `withDayOfMonth(state, value): CronBuilderState`, `withWeekdays(state, values): CronBuilderState`, and `getNextExecutions(expression, options, dependencies?): Promise<Date[]>`.

- [ ] **Step 1: Write failing builder and schedule tests**

```ts
expect(buildCronExpression({
  minute: { mode: "interval", value: 15 }, hour: { mode: "specific", value: 9 },
  dayOfMonth: { mode: "every" }, month: { mode: "every" }, weekdays: [1, 3, 5],
})).toBe("*/15 9 * * 1,3,5");
expect(withDayOfMonth({ ...DEFAULT_CRON_STATE, weekdays: [1] }, 12).weekdays).toEqual([]);
const dates = await getNextExecutions("0 9 * * 1-5", {
  currentDate: new Date("2026-08-21T00:00:00Z"), timeZone: "UTC", count: 5,
}, fakeParser);
expect(dates).toHaveLength(5);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/cron`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Install dependency and implement services**

Run: `npm install cron-parser`

Validate all numeric ranges in the pure builder, sort/de-duplicate weekdays, and enforce mutual exclusion through the state transition helpers. The default schedule dependency dynamically imports `CronExpressionParser`, calls `parse(expression, { currentDate, tz })`, then converts `take(count)` results to native `Date` values.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- --run src/services/cron`

```powershell
git add -- package.json package-lock.json src/services/cron
git commit -m "feat: add Cron building and preview services"
```

### Task 3: SQL and Cron pages

**Files:**
- Create: `src/pages/developer/SqlFormatterPage.tsx`
- Test: `src/pages/developer/SqlFormatterPage.test.tsx`
- Create: `src/pages/developer/CronBuilderPage.tsx`
- Test: `src/pages/developer/CronBuilderPage.test.tsx`
- Create: `src/i18n/issue26Messages.ts`
- Modify: `src/context/LanguageContext.tsx`
- Create: `src/styles/issue26-tools.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes Task 1 and 2 services, `ToolPageTemplate`, `CodeOutputPanel`, `useSeo`, `useLanguage`, and content-free analytics helpers.
- Produces lazy-route-ready `SqlFormatterPage` and `CronBuilderPage` components.

- [ ] **Step 1: Write failing page tests**

```ts
fireEvent.change(screen.getByLabelText("SQL input"), { target: { value: "select * from users" } });
fireEvent.change(screen.getByLabelText("SQL dialect"), { target: { value: "transactsql" } });
fireEvent.click(screen.getByRole("button", { name: "Format SQL" }));
await waitFor(() => expect(screen.getByLabelText("SQL output")).toHaveValue(expect.stringContaining("SELECT")));

fireEvent.change(screen.getByLabelText("Minute schedule"), { target: { value: "specific" } });
expect(screen.getByLabelText("Cron expression")).toHaveValue(expect.stringMatching(/^\d+ /));
expect(await screen.findAllByRole("listitem", { name: /execution/i })).toHaveLength(5);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/pages/developer/SqlFormatterPage.test.tsx src/pages/developer/CronBuilderPage.test.tsx`

Expected: FAIL because the pages and messages do not exist.

- [ ] **Step 3: Implement accessible pages and scoped styling**

Use explicit source labels, fieldsets for related options, one primary action per local decision, `aria-describedby` errors, `aria-busy` during lazy loading, read-only output, copy/download, a read-only Cron expression, a labeled browser time zone, five semantic list rows, and a polite status announcement when one day restriction resets the other.

- [ ] **Step 4: Verify GREEN and commit**

Run the two page tests from Step 2.

```powershell
git add -- src/pages/developer/SqlFormatterPage.tsx src/pages/developer/SqlFormatterPage.test.tsx src/pages/developer/CronBuilderPage.tsx src/pages/developer/CronBuilderPage.test.tsx src/i18n/issue26Messages.ts src/context/LanguageContext.tsx src/styles/issue26-tools.css src/main.tsx
git commit -m "feat: add SQL and Cron tool interfaces"
```

### Task 4: Batch 1 discovery and verification

**Files:**
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces canonical and English routes for `/developer/sql-formatter` and `/developer/cron-builder` through registry-driven routing and SEO artifacts.

- [ ] **Step 1: Add failing route, registry, and SSR assertions**

Assert both tool definitions, canonical routes, `/en` variants, localized titles, sitemap/prerender entries, and that importing/rendering the app does not load either dynamic dependency.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/App.test.tsx src/seo`

- [ ] **Step 3: Register pages and public inventory**

Add registry aliases/keywords, lazy imports and routes, README inventory entries, and MIT notice/source entries for `sql-formatter` and `cron-parser`.

- [ ] **Step 4: Verify batch and commit**

Run: `npm test -- --run src/services/sql src/services/cron src/pages/developer/SqlFormatterPage.test.tsx src/pages/developer/CronBuilderPage.test.tsx src/App.test.tsx src/seo`

Run: `npm run build`

Expected: all commands exit 0 and prerender includes both locales.

```powershell
git add -- src/data/tools.ts src/App.tsx src/App.test.tsx src/seo README.md THIRD_PARTY_NOTICES.md
git commit -m "feat: publish SQL and Cron tools"
```
