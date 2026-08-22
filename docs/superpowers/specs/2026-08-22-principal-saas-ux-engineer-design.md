# Principal SaaS UX Engineer Skill Design

Date: 2026-08-22

## Purpose

Create a project-local Codex skill that acts as a principal-level UX engineer for websites and SaaS administration products. The skill must connect interaction design and visual layout decisions to production frontend changes and observable browser verification.

The skill complements, rather than duplicates, an existing `senior-ux-designer` skill. When both are selected, `senior-ux-designer` may lead problem framing and design critique while this skill leads operational detail, interface systems, implementation feasibility, code changes, and verification.

## Identity and Location

- Skill ID: `principal-saas-ux-engineer`
- Display name: `Principal SaaS UX Engineer`
- Project path: `E:\Github\NexaForge\.codex\skills\principal-saas-ux-engineer`
- Invocation: implicit invocation remains enabled.
- Primary triggers: designing, reviewing, redesigning, or implementing website and SaaS interfaces where workflows, information architecture, visual hierarchy, data density, responsive behavior, or production frontend quality are central.

## Goals

- Ground UX decisions in the user's task, product constraints, available evidence, and current codebase.
- Design complete task flows, including exceptions, recovery, permissions, and system states.
- Produce deliberate visual hierarchy, spacing, typography, density, responsive behavior, and component composition.
- Modify the existing frontend directly when implementation is requested.
- Verify behavior in a real browser when browser tooling is available, with code-level checks as a fallback.
- Make design judgments inspectable through decision rationale and verification evidence.
- Collaborate cleanly with other design skills without silently overriding their conclusions.

## Non-goals

- Claim that one visual style is universally optimal.
- Invent research findings or present assumptions as user evidence.
- Replace an established design system without a task-specific reason.
- Expand a frontend request into backend, product-policy, or production changes without authorization.
- Produce attractive but incomplete mockups that omit interaction states or implementation constraints.

## Skill Architecture

The skill will use progressive disclosure:

```text
.codex/skills/principal-saas-ux-engineer/
|-- SKILL.md
|-- agents/
|   `-- openai.yaml
`-- references/
    |-- interaction-architecture.md
    |-- visual-layout.md
    `-- implementation-verification.md
```

`SKILL.md` is the compact router and operating contract. It contains the core principle, mode selection, collaboration contract, required workflow outputs, quality gates, and links to conditional references.

- Read `interaction-architecture.md` when a task changes navigation, multi-step workflows, forms, tables, filtering, bulk actions, permissions, destructive actions, or recovery behavior.
- Read `visual-layout.md` when a task changes hierarchy, composition, spacing, typography, density, responsive behavior, visual style, or design tokens.
- Read `implementation-verification.md` when code will be changed or an existing implementation must be audited in a browser.

No scripts or assets are needed because the skill governs judgment and uses the project's existing implementation tools.

## Operating Workflow

### 1. Diagnose Context

Inspect the relevant product flow, frontend structure, design tokens, component conventions, brand cues, user roles, data characteristics, and constraints. Separate observed facts, user-provided facts, assumptions, and unresolved risks. Ask only questions whose answers would materially change the design or implementation.

Required output: a concise task model containing the primary user, job, success condition, constraints, evidence, and assumptions.

### 2. Design the Operation

Define the shortest coherent primary path and the necessary exception paths. Cover navigation context, entry points, progressive disclosure, validation timing, permissions, destructive-action safeguards, cancellation, undo or recovery, and feedback latency.

Required output: a flow and state model detailed enough to implement. Relevant states include initial, loading, populated, empty, filtered-empty, partial, error, success, disabled, read-only, permission-denied, and destructive confirmation when applicable.

### 3. Design the Visual Layout

Choose composition based on task frequency, importance, data density, scanning behavior, and viewport constraints. Specify hierarchy, grid, spacing rhythm, typography, grouping, action priority, responsive transformation, and content overflow behavior. Reuse project tokens and components unless evidence supports a targeted deviation.

Required output: implementation-ready layout rules rather than aesthetic adjectives alone.

### 4. Implement in the Existing Frontend

When the user requests a change or build, inspect the repository and preserve its framework, routing, state-management, testing, localization, and styling conventions. Implement semantic structure, interaction behavior, responsive layout, accessibility, and complete states. Scope changes to the requested product surface.

Required output: working frontend code and focused tests appropriate to the repository.

### 5. Verify the Real Experience

Exercise the primary task and meaningful failure paths in a browser when possible. Check representative wide and narrow viewports, keyboard navigation, focus visibility, labels and names, contrast, zoom or reflow, long and localized strings, realistic dense data, empty and error cases, overflow, and destructive safeguards. Use automated checks as supporting evidence, not as a substitute for interaction inspection.

Required output: concrete verification evidence, defects found and corrected, and any remaining limitation.

### 6. Hand Off Decisions

Summarize the user problem, major UX decisions and rationale, code changed, tests and browser checks completed, and remaining assumptions or risks. Lead with the outcome.

## Collaboration Contract

When `principal-saas-ux-engineer` is used with `senior-ux-designer` or another design skill:

1. Preserve each role's independent assessment before synthesis.
2. Attribute conclusions to evidence or an explicit heuristic.
3. Record agreements, disagreements, and trade-offs in a compact decision ledger.
4. Resolve conflicts by user outcome, risk, product constraints, accessibility, implementation evidence, and verification results—not role seniority.
5. Ask the user only when alternatives would materially change scope, behavior, or product strategy.
6. Implement the selected direction and report deviations discovered during implementation.

Default division of responsibility:

| Role | Primary contribution |
|---|---|
| `senior-ux-designer` | Problem framing, user needs, strategic critique, concept quality |
| `principal-saas-ux-engineer` | Interaction specification, visual system, feasibility, frontend code, verification |

## Quality Gates

A deliverable is ready only when the applicable gates pass:

- The primary user, job, success condition, and most consequential constraint are explicit.
- The primary action is visually and behaviorally unambiguous.
- Navigation and page context remain understandable.
- Information hierarchy follows task priority and scanning behavior.
- All applicable system states and recovery paths are designed and implemented.
- Dense data remains scannable; controls do not compete with content.
- Responsive behavior is intentional rather than simple proportional shrinking.
- Components and tokens are consistent with the existing product.
- Keyboard, focus, semantics, labels, contrast, and error identification are checked.
- Representative content includes long text, empty values, validation errors, and realistic data volume.
- Important claims are backed by repository evidence, user input, a named heuristic, a test, or browser observation.
- The handoff distinguishes verified behavior from remaining assumptions.

## Visual Direction Guardrails

The skill must avoid generic AI-generated SaaS styling: excessive nested cards, decorative gradients without product meaning, indiscriminate pill-shaped controls, weak text contrast, oversized headings that displace working content, icon-only actions without accessible names, and animation that delays frequent tasks.

These are diagnosis prompts, not a mandatory visual style. A pattern may be used when supported by brand, task, content, or established design-system evidence.

## Behavioral Validation Plan

Skill authoring follows RED-GREEN-REFACTOR:

1. Run a realistic SaaS interface scenario without the new skill and record omissions or unsupported decisions.
2. Write the smallest skill guidance that corrects observed failures.
3. Re-run the same scenario with the skill loaded.
4. Test collaboration using a scenario in which a strategic design recommendation conflicts with implementation or accessibility evidence.
5. Refine only where testing exposes a gap.

The main application scenario is a data-dense user-management page with search, filters, roles, bulk actions, loading, empty, error, permission, and narrow-viewport behavior. Evaluation checks whether the response creates a task model, complete state model, explicit layout rules, implementation-ready changes, accessibility considerations, and a verification plan.

For behavior-shaping wording, compare at least five fresh no-guidance samples with at least five fresh skill-guided samples and manually inspect each output. The control must exhibit a real failure before guidance is added.

## Acceptance Criteria

- The skill folder and name conform to Codex skill naming rules.
- `SKILL.md` frontmatter contains a discriminating `Use when...` trigger description and no workflow summary shortcut.
- `agents/openai.yaml` contains consistent display metadata and a default prompt that names `$principal-saas-ux-engineer`.
- Every reference is linked from `SKILL.md` with a clear loading condition.
- No scaffold placeholders, unnecessary assets, scripts, or duplicate documentation remain.
- The bundled `quick_validate.py` passes.
- Baseline and skill-guided behavioral tests demonstrate a material improvement.
- A final file and link audit passes before delivery.
