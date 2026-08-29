# Text Cleanup & Compare Workflow Design

## Scope

Implement issue #48's P0 text workflow. The work adds Text Cleaner and Find & Replace, upgrades the existing Text Diff page, and connects the new and existing text tools with contextual next actions. All text remains in browser memory and is never uploaded or added to analytics payloads.

This design deliberately excludes P1 filter/extract tools, cloud persistence, rich editing, AI rewriting, and merge/conflict functionality.

## Architecture

### Pure workflow services

Add `src/services/text/textWorkflowService.ts` as the sole location for new deterministic transform logic:

- `cleanText(input, options)` returns cleaned text and before/after line counts.
- `findAndReplace(input, options)` returns text, match count, replacement count, and a validation error when the find value or regular expression is invalid.
- `compareText(original, changed, options)` returns a line-level result and addition/removal counts.

The services normalize line endings before processing. Text Diff uses an LCS-based line comparison to preserve unchanged context reliably; it runs only after the user activates Compare.

### Shared UI

Add focused components in `src/components/text/`:

- result actions for copy, `.txt` download, clear, and applying output as the next input;
- workflow links that receive an explicit list of destination tools;
- optionally a small editor/stats primitive where it avoids real duplication.

These components own browser-only affordances, not transformation rules. Download uses `Blob`, `URL.createObjectURL`, and `URL.revokeObjectURL`. Analytics records only tool/action metadata and never editor, find, replacement, or regex values.

### Pages and routes

- Add `/text/text-cleaner`.
- Add `/text/find-replace`.
- Preserve the existing `/text/diff` route and upgrade it to the issue's Compare Text experience, avoiding a duplicate crawlable page.
- Keep existing text pages in `TextToolsPage`; add only contextual workflow links to Remove Duplicate Lines and Sort Lines.
- Add a reverse link from Regex Tester to Find & Replace.

Each tool follows `ToolPageTemplate`, `useSeo`, the tool registry, existing bilingual copy conventions, and static landing-page metadata so it appears in generated sitemap and prerendered content.

## Behaviour

### Text Cleaner

Provide combinable controls for trimming each line, removing leading/trailing whitespace, collapsing repeated spaces, removing empty lines, collapsing empty lines, converting tabs to spaces, normalizing line endings, and trimming the whole document. Empty input returns deterministic empty output without error. The result reports before and after line counts and offers Find & Replace, Remove Duplicate Lines, Sort Lines, and Compare Text as next actions.

### Find & Replace

Support literal and regex modes, case sensitivity, whole-word matching, and the Regex Tester's ordered flag controls. Replace All updates every match; the page reports matches and replacements. An empty find string does not run. Invalid patterns and unsupported flags return clear validation errors rather than throwing. Results link to Compare Text, Text Cleaner, Word Counter, and—when regex is active—Regex Tester.

### Text Diff

Accept Original and Changed input, with a user-triggered Compare action. Provide side-by-side and unified result modes plus ignore-whitespace and ignore-case options. Every result line exposes Added, Removed, or Unchanged state with a `+`, `-`, or neutral indicator as well as colour. Identical texts show a clear no-differences state. Result links point to Text Cleaner and Sort Lines; supporting content links to Sort Lines and Remove Duplicate Lines.

## Accessibility and responsive behaviour

Inputs, outputs, checkboxes, mode controls, and actions have explicit accessible names. Diff entries provide line-level status understandable by screen readers, and status is never colour-only. On narrow screens text inputs and diff views stack vertically; desktop retains two-column compare input and side-by-side output.

## Testing and verification

Use test-driven development for every new pure function: first create a focused failing test, verify the expected failure, then implement the minimum behaviour and re-run tests. Cover option composition, empty input, regexp validation, whole-word/case matching, LCS insertions/removals/modifications, ignore options, and identical values.

Component tests cover user-facing processing flows, error states, mode toggling, contextual links, accessible labels, copy/download activation, routes, and SEO/sitemap inclusion. Finish with the full test suite and production build to exercise static prerendering.

## Acceptance mapping

The implementation meets the P0 acceptance criteria through browser-only pure services, reusable result actions, explicit runs, responsive layouts, accessible labels and diff symbols, three crawlable text-tool entries (including preserved `/text/diff`), localized SEO metadata, and all required cross-tool navigation.
