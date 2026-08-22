# Principal SaaS UX Engineer Behavioral Evaluation

Date: 2026-08-22

## Repository baseline

Before skill work, `npm test -- --run` reported 71 passing and 23 failing tests across 27 test files. The failures predate this skill and consistently report `useLanguage must be used inside LanguageProvider`. This documentation-only skill does not change or claim to correct that frontend baseline.

## Fixed application scenario

Redesign a React SaaS admin Users page for production implementation. It contains search; status and role filters; a table with name, email, role, status, last login, and row actions; selection with bulk deactivate and delete; Owner, Admin, and Viewer permissions; and up to 10,000 users. The most frequent task is finding a person and changing their role. The current page feels cluttered and fails on narrow screens. Produce an implementation-ready UX/UI direction. Time is limited, so proceed with explicit assumptions instead of asking questions that do not materially change the design.

## Scoring rubric

Each dimension is scored `0` (missing), `1` (generic), or `2` (specific and implementable).

| Dimension | A score of 2 requires |
|---|---|
| Task model | Primary actor, job, success condition, constraints, facts vs assumptions |
| Flow and states | Primary path plus permission, loading, empty, error, success, destructive, and recovery behavior |
| Layout system | Explicit hierarchy, grid/regions, density, typography/spacing logic, and action priority |
| Responsive transformation | A narrow-screen strategy based on task priority, not merely stacking or shrinking |
| Accessibility | Keyboard, focus, semantics/names, contrast, and error identification decisions |
| Implementation readiness | Component/state boundaries and concrete frontend changes that fit the stated stack |
| Verification | Realistic content, viewport, interaction, state, and browser checks |

Maximum score: 14.

## No-skill baseline

Five fresh-context agents receive only the fixed scenario. They are not shown this rubric, the intended skill, expected answers, or suspected failures.

| Sample | Task | Flow | Layout | Responsive | A11y | Implementation | Verification | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Control 1 | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 12 |
| Control 2 | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 12 |
| Control 3 | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 12 |
| Control 4 | 1 | 2 | 1 | 2 | 2 | 2 | 1 | 11 |
| Control 5 | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 12 |

Control median: **12/14**.

### Manual observations

**Control 1 — 12/14.** Strong operation, state, layout, responsive, accessibility, and React guidance. It refers generically to “a user” rather than selecting the primary operational actor. Its verification direction is a list, not a reproducible test contract: “Verify keyboard-only use, NVDA or VoiceOver behavior, 200% zoom, reduced motion, and 320px reflow.”

**Control 2 — 12/14.** Strong interaction details, capability types, sizing, visual tokens, and acceptance criteria. The primary actor remains implicit among Owner, Admin, and Viewer. Verification names viewport coverage—“Verify at 320, 375, 768, 1024, and 1440 px”—but does not pair fixtures and actions with expected results or evidence.

**Control 3 — 12/14.** Strong primary flow, server contract, component boundaries, responsive transformation, and accessibility. It never commits to one primary actor and ends with acceptance statements rather than a reproducible verification matrix. “Ensure WCAG AA contrast, visible focus, and correct behavior at 320 CSS px and 200% zoom” identifies checks but not fixtures, procedures, expected observations, or captured evidence.

**Control 4 — 11/14.** Strong role-changing, bulk-action, permission, state, responsive, and accessibility behavior. Layout widths and row height are specific, but typography and spacing logic are largely absent. The acceptance criteria identify outcomes but do not specify how to exercise each risky state or what evidence to retain.

**Control 5 — 12/14.** Strong hierarchy, role flow, responsive presentation, permissions, state handling, and React boundaries. “A manager” appears only in acceptance criteria and is not mapped to Owner or Admin as the primary actor. Verification is expressed as completion criteria without fixtures, actions, expected observations, or evidence.

### Observed baseline failures

1. **Primary actor ambiguity (5/5).** Each response describes all permission roles but does not name one primary actor for the frequent role-change job. This leaves hierarchy and defaults vulnerable to an unspoken role assumption.
2. **Non-reproducible verification (5/5).** Each response lists accessibility, viewport, state, or performance expectations but does not turn them into a repeatable `fixture → viewport/input → action → expected result → evidence` contract.
3. **Incomplete layout rationale (1/5).** One response gives dimensions without an explicit typography and spacing rationale. This is not frequent enough to justify a broad new rule; the guided output contract can make layout logic structurally visible without adding prohibitions.

The failures are omissions and output-shape problems, not agents knowingly bypassing a rule. The skill should therefore use required positive output slots and conditional contracts, not a rationalization table or red-flag section.

## Skill-guided results

To be completed only after the skill exists. Guided samples use the same scenario and unchanged rubric.

## Collaboration test

To be completed after the skill exists using the conflict scenario defined in the implementation plan.
