# Tool v2 Design

## Summary

Issue 26 expands NexaForge with six browser-local developer utilities: SQL Formatter, Cron Expression Builder, URL Parser, cURL to Code, an upgraded UUID/Guid generator, and a Password/Random Secret Generator. The suite will ship as three independently usable batches while sharing the existing discovery, localization, SEO, analytics, workflow, and output conventions.

The primary actor is a .NET developer who needs to inspect, transform, or generate development artifacts without sending source, URLs, commands, identifiers, or secrets to a server. Secondary actors are frontend, backend, database, and operations developers. Success means the actor can produce a correct, copyable result in one focused page, understand any warning, and recover from invalid input without losing work.

Incorrect schedules and generated request code can cause operational errors, while mishandled secrets can create a security incident. Parsing and generation therefore live outside React components in focused, testable services, and secret values never enter analytics, URLs, persistent browser storage, or a backend.

## Goals

- Support SQL Server, PostgreSQL, and MySQL formatting and minification with configurable keyword case.
- Build common five-field Cron expressions through a structured UI and show the next five executions in the browser's current time zone.
- Parse an absolute URL into protocol, host, port, path, fragment, and ordered query parameters.
- Convert a pasted cURL command to C# HttpClient, JavaScript fetch, Python requests, or PowerShell without executing the request.
- Generate UUID v4, UUID v7, and .NET Guid output with case, braces, and hyphen formatting choices.
- Generate passwords, API keys, random hexadecimal values, and Base64 secrets with an explicit entropy estimate.
- Keep all input and output in the current browser session and preserve NexaForge's bilingual, accessible, responsive, and indexable product conventions.

## Non-goals

- Executing SQL, cURL commands, generated code, or HTTP requests.
- Supporting stored procedures, custom SQL delimiters, or every dialect exposed by the SQL formatting dependency.
- Providing a free-form Cron editor or platform-specific six/seven-field Cron dialects in this release.
- Performing DNS lookup, network validation, URL reputation checks, or HTTP preview.
- Guaranteeing semantic equivalence for every cURL flag or arbitrary Bash program. Conversion warnings remain visible when the dependency reports limitations.
- Storing secret history, synchronizing preferences, evaluating leaked-password databases, or claiming password-strength guarantees.
- Adding a backend, account model, or server-side processing path.

## Delivery decomposition

### Batch 1: SQL and scheduling

- `/developer/sql-formatter`
- `/developer/cron-builder`

### Batch 2: URL and request conversion

- `/developer/url-parser`
- `/developer/curl-to-code`

### Batch 3: identifiers and secrets

- Upgrade `/text/uuid` without changing its canonical route.
- Add `/developer/secret-generator`.

Each batch includes its services, pages, tests, tool registry entries, routes, localization, SEO metadata, scoped styles, README inventory updates, and third-party notices. No batch depends on incomplete UI in a later batch.

## Shared architecture

### Page and service boundaries

Each route owns a focused page component that manages transient form state, validation messages, workflow state, and copy/download actions. Pages use the existing `ToolPageTemplate` and `CodeOutputPanel` where their current contracts fit. Reusable controls are introduced only when two or more Tool v2 pages need identical behavior.

Focused services own domain work and expose typed requests, results, warnings, and error codes. React components do not parse SQL, Cron, cURL, UUIDs, or secret formats directly. Native-only logic remains pure TypeScript where practical; dependency adapters contain dynamic imports and normalize third-party exceptions before returning to a page.

Service boundaries are:

- `src/services/sql/sqlFormatterService.ts`: dialect and output configuration to formatted or compact SQL.
- `src/services/cron/cronBuilder.ts`: structured selections to a five-field expression.
- `src/services/cron/cronScheduleService.ts`: expression and current date to five execution dates.
- `src/services/url/urlParserService.ts`: URL text to an ordered parsed result.
- `src/services/curl/curlConverterService.ts`: source and target language to code plus warnings.
- `src/services/text/uuidService.ts`: versioned UUID generation and presentation formatting; existing UUID generation moves out of the general text service.
- `src/services/security/secretService.ts`: cryptographic random generation and entropy metadata.

New pages are `src/pages/developer/SqlFormatterPage.tsx`, `CronBuilderPage.tsx`, `UrlParserPage.tsx`, `CurlToCodePage.tsx`, and `SecretGeneratorPage.tsx`. The existing `src/pages/text/UuidPage.tsx` is upgraded in place. Tests sit beside each service and page using the repository's current `*.test.ts` and `*.test.tsx` convention.

### Dependency strategy

- `sql-formatter` performs SQL formatting for `transactsql`, `postgresql`, and `mysql`. It is dynamically imported when the actor formats or minifies input.
- `cron-parser` validates the generated expression and calculates future executions with DST-aware date behavior. It is dynamically imported when a schedule is evaluated.
- `curlconverter` performs Bash/cURL parsing and target-language generation. It is dynamically imported only on the cURL page. Its required `tree-sitter.wasm` and `tree-sitter-bash.wasm` assets are copied to the static root during installation/build setup and are covered by deployment verification.
- `uuid` supplies RFC 9562 v4 and v7 generation using modern browser cryptography. Tree-shakable imports limit the shipped code to the required generators.
- The browser-native `URL`, `URLSearchParams`, `crypto.getRandomValues`, `Blob`, and clipboard APIs cover URL, secret, download, and copy behavior.

All new third-party dependencies must have compatible licenses recorded in `THIRD_PARTY_NOTICES.md`. Dynamic modules may not be imported during SSR or prerender execution.

### Registration and localization

The six surfaces integrate with `FILE_TOOLS`, lazy route registration in `App.tsx`, localized paths, indexable route generation, search aliases, related-tool discovery, home/category counts, and SEO metadata. New strings live in `src/i18n/issue26Messages.ts` and are spread into the existing Traditional Chinese and English dictionaries. New layout rules live in a scoped `src/styles/issue26-tools.css` file imported by the main client entry.

Analytics records tool identifiers and coarse actions such as start, success, failure, copy, and download. Event payloads never contain SQL, URLs, query parameters, cURL source, generated request code, UUIDs, secrets, schedule expressions, or field selections that could expose user data.

## Tool behavior

### SQL Formatter

The page starts with an editable SQL input area and options for dialect, keyword case, and indentation width. Supported dialects are SQL Server, PostgreSQL, and MySQL. Keyword case offers preserve, uppercase, and lowercase. Indentation offers two spaces, four spaces, or tabs.

Two local actions are available: Format and Minify. Format delegates to `sql-formatter` with the selected dialect, keyword case, and indentation. Minify first passes the source through the same formatter, then runs a deterministic lexical scanner that collapses runs of formatting whitespace outside SQL strings, quoted identifiers, and comments to one space. It preserves whitespace inside single quotes, double quotes, MySQL backticks, SQL Server brackets, PostgreSQL dollar-quoted strings, and block comments. It retains a newline after `--` comments so the following statement cannot become part of the comment. Minification is therefore compact and semantics-preserving rather than a promise of the fewest possible bytes; a global whitespace regular expression is prohibited.

The result appears as read-only code with copy and `.sql` download actions. Empty input is a field error. Unsupported or invalid syntax is reported next to the input while preserving the source and selected options. The page states that stored procedures and custom delimiters are outside the supported scope.

### Cron Expression Builder

The builder produces a standard five-field expression in the order minute, hour, day of month, month, and day of week. Each field exposes only combinations the domain module can represent and validate:

- Minute: every minute, a specific minute from 0 to 59, or an interval from 2 to 30 minutes.
- Hour: every hour, or a specific hour from 0 to 23.
- Day of month: every day, or a specific day from 1 to 31.
- Month: every month, or a specific month from 1 to 12.
- Day of week: every day, or one or more named weekdays.

The generated expression updates immediately and is read-only. The page shows the browser time-zone name from `Intl.DateTimeFormat().resolvedOptions().timeZone` and labels it explicitly. It parses the expression from the current time and lists the next five localized execution timestamps. The preview is recalculated when a field changes and when the actor explicitly refreshes the current-time basis.

Impossible or dependency-rejected combinations display an inline schedule error without clearing selections. Day of month and day of week cannot both be restricted: choosing a specific day of month resets day of week to every day, and choosing one or more weekdays resets day of month to every day. The changed control remains focused and a polite status message announces the reset. This avoids platform differences in combined day-field semantics. The builder does not expose seconds, years, free-form Cron text, `L`, `#`, `?`, or platform-specific macros.

### URL Parser

The page accepts one absolute URL. Because native parsing is synchronous and inexpensive, it parses on every input change without a debounce or network request. A successful result exposes protocol, hostname, port, host, pathname, search, and fragment. Query parameters are rendered as an ordered key/value list from `URLSearchParams.entries()` so duplicate keys and blank values remain visible.

Each scalar value has an accessible copy action, and the full parsed result can be copied or downloaded as JSON. Percent-encoded text is shown as represented by the native URL object; the query list may also show a decoded value when decoding succeeds, clearly labeled so the original representation is not lost.

Empty input returns to the idle state. Relative URLs and invalid absolute URLs are field errors. The last valid result is cleared when current input becomes invalid so stale data cannot be mistaken for the new URL.

### cURL to Code

The page accepts a cURL/Bash command and one target: C# HttpClient, JavaScript fetch, Python requests, or PowerShell. The actor explicitly invokes Convert; the command is never executed and no network request is made.

The adapter maps targets to the corresponding `curlconverter` generator and warning-capable API. The result includes generated code and a list of dependency warnings. Warnings are non-blocking and remain adjacent to the result; parse failures are blocking field errors. Source, selected target, warnings, and valid output remain visible after a failure or reconversion.

The result supports copy and an extension-appropriate download. The page documents important limitations: only HTTP-oriented conversion is supported, generated runtimes can differ from cURL defaults, and arbitrary Bash constructs cannot always be converted reliably.

The adapter owns lazy initialization of Tree-sitter WASM. Loading has a visible busy state and retry path. SSR and prerender render only the stable page shell and never initialize WASM.

### UUID and .NET Guid

The existing UUID page gains a type selection for UUID v4, UUID v7, and .NET Guid. UUID v4 and UUID v7 use the matching `uuid` generator. .NET Guid uses cryptographically random v4-compatible bytes because .NET's ordinary `Guid.NewGuid()` produces a version-4 UUID-compatible value; the UI labels this as `.NET Guid (v4)` to avoid implying a different identifier algorithm.

Presentation options are independent of generation:

- Lowercase or uppercase.
- Standard hyphenated form.
- Braced form `{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}`.
- Compact form without hyphens.

Batch count remains 1 through 1000. Every generated value appears on its own line and can be copied or downloaded as text. Formatting is applied after generation and tests assert the underlying version and variant bits before presentation changes.

### Password and Random Secret Generator

The page offers Password, API Key, Random Hex, and Base64 Secret modes. All bytes and character choices come from `crypto.getRandomValues`; `Math.random` is never used.

Password mode accepts 8 to 128 characters and selectable lowercase, uppercase, digit, and symbol sets. At least one set must remain enabled. Generation includes at least one character from every enabled set, fills the rest from the combined pool, and performs a cryptographically random shuffle. To avoid modulo bias, bounded character selection uses rejection sampling.

API Key mode accepts 16 to 128 characters and generates a URL-safe value from uppercase letters, lowercase letters, digits, hyphen, and underscore. Random Hex and Base64 modes accept 8 to 64 bytes so entropy has an exact byte-based meaning. Base64 output uses standard padded Base64 and is labeled accordingly.

Each result displays its length and an entropy estimate. Password and API-key estimates are labeled as upper-bound estimates based on alphabet size and output length; enforced set coverage means the exact distribution is more constrained. Hex and Base64 show exact source entropy of eight bits per random byte. Entropy is informational and does not make a security guarantee.

The secret remains visible until regenerated, cleared, or the page unmounts. It is never persisted, included in analytics, placed in the URL, or copied automatically. Copy requires an explicit action and reports clipboard failure inline.

## Operation and layout model

The existing NexaForge shell, tool identity, breadcrumbs, related-tool navigation, and responsive behavior remain authoritative. Each page follows the actor's decision order: source or generator choices, focused options, one primary operation, then result and secondary copy/download actions.

On wide screens, input and result editors use the available working width while options remain visually attached to the content they affect. On narrow screens, regions become a single column in the order input, options, primary action, status, and result. Generated SQL and code may scroll horizontally inside their own result region; the document itself may not overflow horizontally.

Labels sit above controls where localization or narrow layouts can expand text. Every control has a programmatic label, visible focus, and usable pointer target. State is conveyed with text and semantics, not color alone. Long generated output wraps only where doing so does not corrupt code; code and identifiers retain literal text with controlled overflow.

Processing states use the repository's `idle`, `ready`, `processing`, `success`, and `error` workflow model. Dynamic dependency loading disables only the affected primary action, sets `aria-busy`, and leaves navigation and editable source available. Results update without stealing focus. Field errors use `aria-describedby`; workflow failures use an alert region with a retry path.

## Data flow and state ownership

1. A page keeps source, options, result, warnings, and errors in local React state.
2. It validates required fields and creates a serializable service request.
3. A pure domain service or dynamically loaded adapter performs the work.
4. The service returns normalized output or a typed error. Development logging may record only a sanitized error code and exception type; it never records an exception message that could echo source or generated content.
5. The page renders output as text, records only content-free analytics, and creates a Blob only when the actor downloads.
6. A new operation supersedes stale completion from an older asynchronous operation. Unmounted pages ignore completion and release transient resources.

No Tool v2 state is stored in query parameters, localStorage, IndexedDB, cookies, or a service worker. The browser's current time and time zone are the only ambient inputs used for schedule preview, and both are exposed in the UI.

## Error and recovery model

- Empty required input: associate a specific message with the source field and retain all options.
- Invalid URL or SQL/cURL syntax: retain the source, clear stale output when it could be misleading, and place the message next to the cause.
- Cron rejection or exhausted iteration: retain builder selections and show a schedule-level message with refresh/retry.
- Dependency or WASM load failure: preserve input, show a workflow error, and provide Retry without re-entering data.
- Non-blocking cURL conversion warning: show code and warning together; copying remains available.
- Web Crypto unavailable: block identifier/secret generation and explain that a modern secure browser context is required.
- Clipboard failure: keep output visible and offer selection/download as recovery.
- Download failure: retain output and allow copy or retry.
- Dynamic operation superseded or page unmounted: discard stale completion silently without overwriting newer state.

Messages are localized and actionable. They do not echo full secret values or include raw stack traces.

## Testing strategy

All production behavior is introduced through red-green-refactor. A focused failing test must be observed before each new function or behavior is implemented.

### Domain and adapter tests

- SQL Server, PostgreSQL, and MySQL fixtures; keyword case; indentation; minification; quoted whitespace; comments; invalid syntax.
- Every Cron field mode; numeric boundaries; weekday ordering; expression generation; five future executions; month rollover; browser time zone; DST transition fixtures.
- URL scalar fields; explicit/default ports; encoded paths; fragments; repeated, blank, and valueless query parameters; invalid and relative inputs.
- cURL GET/POST, headers, JSON and form bodies, quoting, target selection, warnings, parse failures, WASM loading failure, and initialization reuse.
- UUID v4/v7 version and variant bits; .NET Guid labeling; case, braces, compact formatting; batch bounds.
- Password enabled-set coverage, rejection-sampled selection boundaries, shuffle behavior, empty-set rejection, API-key alphabet, exact Hex/Base64 byte lengths, and entropy metadata.

Tests use deterministic injected random-byte and current-time sources where exact assertions require them. They assert returned behavior rather than third-party mock call counts.

### Page and integration tests

- Accessible names, field descriptions, validation associations, keyboard operation, busy state, success, error, retry, warnings, copy, and download.
- Traditional Chinese and English titles, descriptions, option labels, errors, help, and FAQ content.
- Registry entries, search aliases, related tools, lazy routes, localized paths, canonical metadata, indexable routes, sitemap/prerender output, and home/category counts.
- SSR safety proving dynamic dependencies and WASM are not initialized during server rendering.
- Analytics assertions proving event payloads contain no input or generated values.

### Release verification

Each batch ends with focused Vitest execution, a production build, `git diff --check`, and browser verification at desktop and narrow viewports. Final verification runs the complete Vitest suite and the TypeScript, client, SSR, and prerender build. Browser fixtures cover keyboard-only operation, long localized labels, long SQL/code output, copy/download recovery, Cron DST display, cURL warnings, and document-level horizontal overflow.

## Accessibility and responsive acceptance

- All inputs, selects, buttons, generated values, warning lists, and next-run timestamps expose meaningful accessible names and semantics.
- Focus remains visible and predictable at 200% zoom and through result updates.
- Loading and error state changes are announced without repetitive live-region noise.
- Color is not the only indicator for success, warning, error, or selected state.
- Long translated text and generated output do not obscure the primary action or cause document-level horizontal scrolling at 320 CSS pixels.
- Reduced-motion preferences are respected; Tool v2 requires no motion to understand state.

## Privacy and security acceptance

- No SQL, URL, cURL, generated code, Cron expression, UUID, password, API key, Hex, or Base64 value leaves the browser through application code.
- No sensitive input/output is placed in analytics, logs, URLs, persistent browser storage, or error telemetry.
- cURL conversion never executes a request or evaluates generated code.
- Secret generation uses Web Crypto with rejection sampling where mapping random bytes to non-power-of-two alphabets.
- Dynamic dependencies and WASM are pinned by the lockfile, included in third-party notices, and verified as static application assets.

## Delivery order

1. Add and verify SQL/Cron dependencies, pure services, pages, discovery integration, localization, SEO, accessibility, and production build.
2. Add URL parsing and cURL conversion, including WASM asset handling, SSR safeguards, warning behavior, discovery integration, localization, SEO, accessibility, and production build.
3. Upgrade UUID, add secret generation, complete privacy-sensitive tests, discovery integration, localization, SEO, accessibility, and production build.
4. Run cross-suite regression, full build, browser verification, third-party notice review, and documentation inventory checks.

Each batch is committed separately and leaves `develop` in a usable, testable state.
