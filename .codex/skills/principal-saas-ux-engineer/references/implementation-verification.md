# Frontend Implementation and Experience Verification

Read this reference before changing frontend code or auditing a runnable implementation.

## Required outcome

Deliver a scoped change that fits the repository, implements the selected interaction and layout models, passes relevant automated checks, and has observable experience evidence. Do not claim production readiness from code inspection, a screenshot, or acceptance criteria alone.

## Repository-first contract

Before editing, inspect the smallest useful evidence set:

| Evidence | Determine |
|---|---|
| Project instructions and package scripts | Required workflow, commands, boundaries |
| Route/page entry | Navigation, shell, data dependencies, page metadata |
| Related components | Existing composition, states, accessibility, reuse options |
| Tokens/styles | Color, type, spacing, breakpoints, focus, motion conventions |
| Data/state layer | API shape, authority, caching, URL state, mutations, errors |
| Tests and fixtures | User-observable conventions and reliable test setup |
| Localization/content | Message source, expansion risk, date/number formatting |

Record observed facts separately from assumptions. Never invent an endpoint, permission, design token, dependency, or backend guarantee. If a missing contract blocks safe implementation, stop and ask; otherwise isolate the assumption so it is easy to replace.

Preserve the framework, component system, routing, state management, styling, localization, and testing patterns unless one directly prevents the requested outcome. Improve affected boundaries where necessary; do not turn a focused UX task into unrelated refactoring.

## Define the implementation slice

Map the selected design to code before changing it:

```text
user task
  → route/page responsibility
  → component responsibilities
  → server/URL/shared/local state ownership
  → semantic controls and focus behavior
  → visual tokens and responsive rules
  → behavioral tests and browser observations
```

Each component should have one clear responsibility and a small interface. Prefer the existing component library. Extract a component when it owns meaningful behavior/state, is reused, or makes a complex unit independently testable—not merely to shorten JSX.

### State ownership

| State | Typical owner |
|---|---|
| Shareable query, filter, sort, selected entity | URL |
| Authoritative records, permissions, job progress | Server/cache |
| Cross-region selection or workflow state | Page/shared client state |
| Menu, tooltip, ordinary dialog visibility | Local component state |
| Form draft | Local/form state unless resume or collaboration requires persistence |

Avoid duplicating the same state across URL, page, and component. Define reconciliation for optimistic changes, stale responses, cancellation, navigation, and permission loss.

## Implementation requirements

When applicable, implement:

- semantic landmarks, headings, tables/lists, forms, buttons, links, dialogs, and status regions;
- accessible names, descriptions, relationships, error association, and live announcements;
- predictable keyboard order, menu/dialog behavior, initial focus, focus restoration, and focus after removal;
- complete initial/loading, refreshing, populated, empty, filtered-empty, error, pending, success, partial, disabled, read-only, permission, and destructive states;
- capability-driven presentation with server-side authorization still authoritative;
- URL persistence when back, refresh, sharing, or cross-page return matters;
- responsive composition based on task priority and comparison needs;
- realistic overflow, wrapping, truncation, locale, date/number, and large-data behavior;
- motion that communicates continuity and respects reduced-motion preferences.

Do not hide an unfinished state behind a generic spinner or toast. Place feedback near its scope and preserve the actor's input/context through recoverable failures.

## Tests that protect the experience

Follow the repository's required development workflow. For changed behavior, add focused tests around user-observable outcomes rather than CSS class names or component internals.

Useful automated coverage includes:

- primary task with the allowed capability;
- read-only or denied capability;
- validation and server error with preserved input;
- loading, empty, no-match, stale/conflict, and partial states when consequential;
- URL state and navigation restoration;
- keyboard activation and focus restoration where the test environment supports it;
- responsive rendering decisions that can be asserted semantically;
- destructive scope and confirmation copy;
- long/localized content fixtures that expose overflow assumptions.

Use mocks only at external boundaries. A test should fail when user-facing behavior breaks, not when harmless markup changes.

## Browser verification contract

Automated tests support verification; they do not replace exercising the rendered flow. When browser tooling is available, run the relevant app and verify in the browser. When it is unavailable or the app cannot run, report that limit and strengthen code-level checks without claiming browser verification.

Build a matrix before testing:

| Risk | Fixture | Viewport/input | Action | Expected result | Evidence |
|---|---|---|---|---|---|
| Primary task | Most common valid record | Representative wide viewport; pointer and keyboard | Complete the full job | Success with context/focus preserved | Observation plus test/log; image if layout matters |
| Narrow layout | Long identity/content | Smallest supported width; touch/keyboard | Find and use primary action | No lost content/action or page overflow | Observation and viewport image if useful |
| Permission | Read-only and protected records | Wide and narrow; keyboard | Inspect and attempt only visible actions | Unauthorized controls absent or explained; no mutation | Observation plus API/test evidence |
| Loading/empty/error | Slow, zero, no-match, failed request | Representative viewport | Load, filter, retry | Stable layout, distinct states, recoverable context | Observation plus test |
| Destructive/bulk | Mixed eligible/protected records | Pointer and keyboard | Select, review, cancel/confirm | Exact scope/consequence; safe focus; partial result clear | Observation plus test/log |
| Content stress | Long translation, missing values, dense page | Narrow, wide, zoom/reflow | Scan and operate | Readable, obtainable values; no obscured controls | Images/observation |

Use the matrix literally: a phrase such as “check mobile and accessibility” is not a verification plan.

## Browser passes

### Functional pass

- Enter from the real route and complete the primary task.
- Exercise meaningful error/recovery and permission paths.
- Confirm pending work cannot be submitted twice unless intentionally idempotent.
- Confirm back, refresh, cancellation, and return preserve or reset state intentionally.

### Visual and responsive pass

- Check at least one wide and one narrow viewport whenever layout changes.
- Add widths where content actually fails; do not test breakpoints only one pixel apart.
- Use realistic dense data, long names, long translations, missing values, and error text.
- Inspect alignment, reading order, clipping, page and nested overflow, sticky elements, zoom/reflow, and content hidden behind fixed bars.
- Compare to existing product surfaces so the change belongs to the same system.

### Keyboard and semantics pass

- Traverse from page identity through the primary task without a pointer.
- Confirm visible focus, logical order, accessible names, Escape/cancel behavior, dialog focus, and restoration.
- Confirm status/errors are announced at the right time without noisy repetition.
- Inspect the accessibility tree or run appropriate checks when available, then manually verify the interaction those checks cannot judge.

### Visual-regression pass

Capture images when they materially prove hierarchy, overflow, responsive transformation, or corrected defects. A screenshot cannot prove keyboard behavior, accessible naming, focus restoration, API authorization, or async recovery; retain the appropriate observation, test, or trace too.

## Verification evidence rules

- State the exact command and result for automated checks.
- For a browser observation, state route, fixture, viewport/input, action, and observed result.
- Distinguish a newly introduced failure from a pre-existing baseline failure.
- Correct defects found during verification and repeat the affected pass.
- If a relevant check cannot run, state why, what alternative evidence exists, and the remaining risk.
- Never change unrelated code merely to make the final test summary look clean.

## Stop conditions

Do not claim the experience is complete when:

- the app cannot run or the primary flow was not exercised;
- responsive behavior changed but only one usable width was observed;
- loading/error/permission/destructive behavior is relevant but untested;
- keyboard or focus behavior is unknown for newly interactive UI;
- a test fails and its relationship to the change is unexplained;
- the implementation silently deviates from the selected operation or layout model;
- evidence is only a polished screenshot.

Report the limitation and the safest next step. A known pre-existing failure may remain if it is documented, demonstrably unrelated, and the scoped checks pass.

## Handoff contract

Lead with the working outcome, then provide:

1. major UX decisions and their task/risk rationale;
2. files changed and the responsibility of each change;
3. automated checks with commands and results;
4. browser checks with fixtures, viewports/inputs, and observations;
5. defects discovered and corrected during verification;
6. remaining assumptions, unavailable checks, and risks.

## Common failures

| Failure | Correction |
|---|---|
| Code starts before the flow is understood | Map task, state, and component responsibility first |
| Restyle succeeds while states remain broken | Implement state/capability matrices in the same slice |
| Tests assert classes or snapshots only | Assert user-visible behavior and recovery |
| Friendly mock data hides overflow | Add dense, long, missing, error, and localized fixtures |
| Desktop-only or screenshot-only review | Run narrow, keyboard, state, and semantic passes |
| Design deviation is silently rationalized | Record evidence, impact, and the selected resolution |
