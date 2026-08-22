# Regex Tester Design

## Context and scope

GitHub issue #23 is a backlog of independent tool families. The first delivery slice is a standalone Regex Tester because it fits NexaForge's existing browser-only developer-tool model and can ship without coupling the later QR, barcode, data-conversion, or image batches to one another.

This slice adds one indexable tool at `/developer/regex-tester` and its English locale equivalent. It does not include regex replacement, a saved-expression library, server persistence, or cross-language regex dialects.

## User experience

The page follows the existing `ToolPageTemplate` structure:

- Workspace: pattern input, test text, and a compact sample users can edit.
- Options: independent JavaScript regex flag controls and a primary **Test regex** action.
- Result: validation or timeout errors, a match count, truncation notice when applicable, and a table of each match's value, zero-based index, capture groups, and named groups.
- Supporting content: localized how-it-works steps, FAQ, privacy messaging, related tools, and SEO metadata.

The action is explicit rather than running on every keystroke. This keeps errors predictable, avoids repeatedly starting expensive expressions, and works well with keyboard and assistive-technology workflows. The form remains usable in both Traditional Chinese and English.

## Architecture

### Regex engine

A pure TypeScript engine compiles a JavaScript `RegExp` and returns a serializable result. It records match text, source index, numbered capture groups, and named capture groups. Global expressions scan repeatedly; non-global expressions return the first match. Zero-length global matches advance their last index to prevent infinite loops. Results are capped at 500 matches and report when more results were omitted.

The pure engine is independently unit tested for ordinary matches, captures, named groups, zero-length matches, invalid syntax, non-global behavior, and result truncation.

### Worker boundary

The UI never executes user-provided expressions on the main thread. A module Web Worker calls the pure engine and posts a success or structured error response. The browser-facing service creates one worker per run, terminates it on completion, and rejects after 750 ms with a distinct timeout error. It also terminates superseded or abandoned work through an `AbortSignal`.

This boundary prevents catastrophic backtracking from freezing the NexaForge interface. Worker creation is injectable so the service can be tested without depending on a real browser Worker in JSDOM.

### Page integration

The page owns input, selected flags, processing state, result, and error state. Starting a new run aborts the preceding run. Unmounting the page also aborts active work. Existing analytics events record start, success, and failure without including the user's pattern or test content.

The tool registry supplies search, sidebar, related-tool, sitemap, and SEO discovery. `App.tsx` adds a lazy route for both locale route trees through the app's existing localization mechanism. Localized strings live in the current language dictionaries.

## Error handling and limits

- Empty patterns and empty test text are permitted because both are valid regex test cases.
- Invalid patterns return a readable validation error and do not crash the page.
- Runs exceeding 750 ms return a timeout message and terminate the worker.
- Results stop after 500 entries and expose a truncation notice.
- User-provided pattern and text are never sent to analytics or a network service.
- Unexpected worker failures produce a generic local-processing error.

## Testing

- Unit tests cover the pure engine and worker-backed service lifecycle, including completion, timeout, abort, and worker errors.
- Page tests cover inputs and flags, successful match rendering, capture groups, validation errors, the processing state, and stale-run cancellation.
- Routing/tool-registry tests confirm the new canonical and localized routes are indexable and discoverable.
- The full Vitest suite and production build must pass before completion.

## Delivery boundaries

This design intentionally establishes no generic playground framework. Later issue #23 batches can reuse proven patterns when useful, but remain independently specified and delivered. The next recommended batch after Regex Tester is QR/barcode input expansion because the repository already contains a QR generator service and page.
