# Principal SaaS UX Engineer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and behaviorally validate a project-local skill that turns website and SaaS UX decisions into precise interaction models, visual layout rules, production frontend changes, and browser verification.

**Architecture:** A compact `SKILL.md` acts as the operating contract and routes to three focused references for interaction architecture, visual layout, and implementation verification. The skill stays stack-agnostic, respects the current repository and design system, and collaborates with other design skills through an evidence-based decision ledger.

**Tech Stack:** Markdown, YAML, Codex skill metadata, Python-based Codex skill validation, fresh-context subagent behavioral evaluation.

**Spec:** `docs/superpowers/specs/2026-08-22-principal-saas-ux-engineer-design.md`

## Global Constraints

- Install only at `.codex/skills/principal-saas-ux-engineer` in this repository.
- Keep the skill ID exactly `principal-saas-ux-engineer` and the display name exactly `Principal SaaS UX Engineer`.
- Keep implicit invocation enabled.
- Complement `senior-ux-designer`; do not claim authority based on role title.
- Preserve the user's language and existing frontend stack, component system, design tokens, localization, testing, and styling conventions.
- Do not invent research evidence or expand frontend scope into backend, policy, or production changes without authorization.
- Do not add scripts, assets, README files, placeholders, or duplicate reference content.
- Stage and commit only files created by this plan; preserve the dirty working tree.

---

### Task 1: Capture the Failing UX Behavior Baseline

**Files:**
- Create: `docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md`

**Interfaces:**
- Consumes: the approved skill design spec.
- Produces: one fixed scenario, a seven-dimension scoring rubric, five fresh-context no-skill results, exact short excerpts showing omissions, and the observed failures the skill must correct.

- [ ] **Step 1: Create the evaluation directory and baseline header**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'docs\superpowers\evaluations' | Out-Null
```

Create the evaluation file with this fixed scenario:

```markdown
## Fixed application scenario

Redesign a React SaaS admin Users page for production implementation. It contains search; status and role filters; a table with name, email, role, status, last login, and row actions; selection with bulk deactivate and delete; Owner, Admin, and Viewer permissions; and up to 10,000 users. The most frequent task is finding a person and changing their role. The current page feels cluttered and fails on narrow screens. Produce an implementation-ready UX/UI direction. Time is limited, so proceed with explicit assumptions instead of asking questions that do not materially change the design.
```

- [ ] **Step 2: Define the scoring rubric before sampling**

Use seven dimensions, each scored `0` (missing), `1` (generic), or `2` (specific and implementable):

```markdown
| Dimension | A score of 2 requires |
|---|---|
| Task model | Primary actor, job, success condition, constraints, facts vs assumptions |
| Flow and states | Primary path plus permission, loading, empty, error, success, destructive, and recovery behavior |
| Layout system | Explicit hierarchy, grid/regions, density, typography/spacing logic, and action priority |
| Responsive transformation | A narrow-screen strategy based on task priority, not merely stacking or shrinking |
| Accessibility | Keyboard, focus, semantics/names, contrast, and error identification decisions |
| Implementation readiness | Component/state boundaries and concrete frontend changes that fit the stated stack |
| Verification | Realistic content, viewport, interaction, state, and browser checks |
```

- [ ] **Step 3: Run five fresh-context baseline samples without loading the new skill**

Dispatch one new subagent per sample with only the fixed scenario and a request for a self-contained answer. Do not mention the intended skill, rubric, expected answer, or suspected failures. Keep the agents read-only and prohibit repository edits.

Expected RED result: at least one rubric dimension repeatedly scores below `2`. If all five controls score `2` on every dimension, stop authoring the guidance that has no demonstrated failure and reassess the skill's value.

- [ ] **Step 4: Record baseline evidence manually**

For each sample, add its score, a concise factual observation, and a short exact excerpt that demonstrates the observation. Finish with `## Observed baseline failures` containing only patterns seen in at least two samples.

- [ ] **Step 5: Commit the baseline test artifact**

Run:

```powershell
git add -- 'docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md'
git diff --cached --check -- 'docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md'
git commit -m "test: capture SaaS UX skill baseline" -- 'docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md'
```

---

### Task 2: Initialize the Skill and Write the Core Operating Contract

**Files:**
- Create: `.codex/skills/principal-saas-ux-engineer/SKILL.md`
- Create: `.codex/skills/principal-saas-ux-engineer/agents/openai.yaml`
- Create directory: `.codex/skills/principal-saas-ux-engineer/references`

**Interfaces:**
- Consumes: observed failures from Task 1.
- Produces: the discoverable skill entrypoint, its invocation metadata, mode routing, collaboration contract, output contract, and quality gates used by all later references.

- [ ] **Step 1: Initialize the skill scaffold**

Run:

```powershell
python 'C:\Users\kim\.codex\skills\.system\skill-creator\scripts\init_skill.py' principal-saas-ux-engineer --path 'E:\Github\NexaForge\.codex\skills' --resources references --interface 'display_name=Principal SaaS UX Engineer' --interface 'short_description=Production-grade SaaS UX design and frontend execution' --interface 'default_prompt=Use $principal-saas-ux-engineer to redesign and implement this SaaS workflow with precise interaction, layout, and verification.'
```

Expected: the skill folder, `SKILL.md`, `agents/openai.yaml`, and an empty `references` folder exist; no examples or assets are created.

- [ ] **Step 2: Replace the scaffold frontmatter and overview**

Use exactly this discovery shape:

```yaml
---
name: principal-saas-ux-engineer
description: Use when designing, reviewing, redesigning, or implementing website and SaaS interfaces where workflows, information architecture, data-dense screens, visual hierarchy, responsive behavior, accessibility, or production frontend quality are central.
---
```

The overview's core principle must say that the best interface is the one that makes the target user's important work clear, efficient, recoverable, accessible, and verifiably correct within product constraints—not the one that merely looks most polished.

- [ ] **Step 3: Add mode and reference routing**

Add a compact table with these observable modes:

```markdown
| Request | Work mode | Read |
|---|---|---|
| Diagnose or critique an existing flow | Audit | Relevant references only |
| Design or redesign without code changes | Design | Interaction and/or visual reference |
| Build or modify frontend code | Implement | All three references |
| Work alongside another design skill | Collaborate | Relevant references plus decision ledger |
```

Explicitly state when to load each reference; do not load visual guidance for a purely structural flow question or implementation guidance when no code is in scope.

- [ ] **Step 4: Add the positive operating and output contract**

Define the result as these ordered sections, scaled to the task rather than emitted as ceremonial headings when trivial:

```markdown
1. Context model — user, job, success, constraints, evidence, assumptions.
2. Operation model — primary path, exception/recovery paths, permissions, state model.
3. Layout model — hierarchy, regions/grid, density, spacing/type logic, responsive transformation.
4. Implementation — repository-aligned code and focused tests when requested.
5. Verification — browser/test evidence, defects corrected, remaining limits.
6. Handoff — outcome, decisions, changed files, assumptions, risks.
```

Every important design decision must connect a user task or risk to a UI rule and an observable verification method.

- [ ] **Step 5: Add the collaboration contract and quick reference**

When another design skill is present, require independent assessments before synthesis and a compact ledger with `Decision`, `Agreement`, `Conflict`, `Evidence`, and `Resolution`. Set the default role split from the spec, but resolve disagreements by evidence, constraints, accessibility, implementation results, and user outcome.

Add a quick-reference table mapping common SaaS surfaces—navigation, tables, filters, forms, dashboards, settings, destructive actions—to the first question and highest-risk failure.

- [ ] **Step 6: Add quality gates and common mistakes**

Include the applicable gates from the spec and a correction-oriented mistakes table. Cover unsupported visual restyling, card soup, arbitrary mobile stacking, missing states, hidden permissions, color-only meaning, premature code edits, and unverified completion. Use positive corrections rather than a long prohibition list because the baseline failure is expected to be output omission or wrong shape, not intentional rule-breaking.

- [ ] **Step 7: Verify UI metadata**

Ensure `agents/openai.yaml` contains quoted strings, the exact display name, a 25–64 character short description, the default prompt with `$principal-saas-ux-engineer`, and no policy override because implicit invocation is the default.

- [ ] **Step 8: Commit the core skill**

Run:

```powershell
git add -- '.codex/skills/principal-saas-ux-engineer/SKILL.md' '.codex/skills/principal-saas-ux-engineer/agents/openai.yaml'
git diff --cached --check -- '.codex/skills/principal-saas-ux-engineer/SKILL.md' '.codex/skills/principal-saas-ux-engineer/agents/openai.yaml'
git commit -m "feat: add principal SaaS UX skill contract" -- '.codex/skills/principal-saas-ux-engineer/SKILL.md' '.codex/skills/principal-saas-ux-engineer/agents/openai.yaml'
```

---

### Task 3: Add the Interaction Architecture Reference

**Files:**
- Create: `.codex/skills/principal-saas-ux-engineer/references/interaction-architecture.md`

**Interfaces:**
- Consumes: the context model from `SKILL.md`.
- Produces: an implementation-ready task flow, information architecture, permissions model, and state model consumed by visual design and implementation.

- [ ] **Step 1: Write the interaction decision framework**

Cover these decisions with concise prompts and output fields:

```markdown
- Actor and job: who acts, trigger, desired outcome, frequency, cost of error.
- Entry and orientation: route, page identity, scope, current selection, back path.
- Primary path: smallest coherent sequence with explicit system feedback.
- Exceptions: validation, conflict, latency, partial failure, permission, cancellation, retry, undo.
- Disclosure: visible now, revealed on intent, moved to details, or removed.
- State ownership: URL, server, shared client, or local component state.
```

- [ ] **Step 2: Add SaaS-specific patterns and constraints**

Include actionable guidance for data tables, search and filters, bulk actions, forms, multi-step setup, dashboards, settings, role/permission UX, destructive actions, and asynchronous work. For each surface, identify the task-fit pattern, minimum states, and failure to prevent.

- [ ] **Step 3: Add the complete state matrix**

Provide a reusable matrix with columns `State`, `Trigger`, `Visible content`, `Available action`, `Announcement/focus`, and `Recovery`. Include initial, loading, populated, empty, filtered-empty, partial, stale, error, success, disabled, read-only, permission-denied, and destructive-confirmation rows as conditional prompts rather than universal UI requirements.

- [ ] **Step 4: Add one worked user-management example**

Use the fixed evaluation scenario and show one integrated slice: finding a person, opening an anchored role editor, explaining unavailable roles, saving with pending feedback, handling a conflict, confirming success without losing table context, and restoring focus. Include relevant URL state, permissions, empty/filter states, and narrow-screen behavior. Keep it short enough to adapt rather than copy blindly.

- [ ] **Step 5: Add a common-failures table and commit**

Map at least these failures to corrections: controls before task model, filter reset surprises, row-action ambiguity, selection across pagination, optimistic destructive changes, inaccessible validation, and unrecoverable permission errors.

Run:

```powershell
git add -- '.codex/skills/principal-saas-ux-engineer/references/interaction-architecture.md'
git diff --cached --check -- '.codex/skills/principal-saas-ux-engineer/references/interaction-architecture.md'
git commit -m "docs: add SaaS interaction architecture playbook" -- '.codex/skills/principal-saas-ux-engineer/references/interaction-architecture.md'
```

---

### Task 4: Add the Visual Layout Reference

**Files:**
- Create: `.codex/skills/principal-saas-ux-engineer/references/visual-layout.md`

**Interfaces:**
- Consumes: task priority, operation model, content/data characteristics, project tokens, and brand constraints.
- Produces: explicit hierarchy, regions, density, typography, spacing, responsive transformation, and component styling rules.

- [ ] **Step 1: Define the layout decision sequence**

Use the sequence `task priority → content model → regions → hierarchy → density → responsive transformation → visual finish`. Make each step yield concrete rules such as region order, width behavior, alignment, spacing rhythm, line length, wrapping, truncation, and sticky behavior.

- [ ] **Step 2: Add hierarchy, grid, density, and typography guidance**

Cover page shell, local navigation, headings, action hierarchy, toolbars, tables, forms, side panels, modals, dashboards, and detail views. Distinguish scan-heavy operational screens from read-heavy content screens. Require token reuse and optical review instead of blindly applying a fixed spacing scale.

- [ ] **Step 3: Add responsive transformation patterns**

Define when to preserve a table with horizontal scrolling, hide secondary columns with disclosure, switch to a prioritized list, move editing to a sheet or full page, collapse filters into a summary plus drawer, or retain side-by-side comparison. Decisions must follow task frequency and comparison needs, not breakpoint alone.

- [ ] **Step 4: Add visual accessibility and AI-style guardrails**

Cover contrast, non-color signals, focus visibility, target size, reduced motion, zoom/reflow, reading order, and error placement. Diagnose excessive nested cards, ornamental gradients, indiscriminate pills, oversized headings, weak muted text, arbitrary shadows, and decorative whitespace by explaining which task or hierarchy signal they damage.

- [ ] **Step 5: Add optional project intelligence routing and commit**

State that `ui-ux-pro-max` may be used when the task genuinely needs style, palette, typography, chart, or stack research; its output is input to judgment, not an automatic design system. Do not make it a required dependency.

Run:

```powershell
git add -- '.codex/skills/principal-saas-ux-engineer/references/visual-layout.md'
git diff --cached --check -- '.codex/skills/principal-saas-ux-engineer/references/visual-layout.md'
git commit -m "docs: add SaaS visual layout playbook" -- '.codex/skills/principal-saas-ux-engineer/references/visual-layout.md'
```

---

### Task 5: Add the Frontend Implementation and Verification Reference

**Files:**
- Create: `.codex/skills/principal-saas-ux-engineer/references/implementation-verification.md`

**Interfaces:**
- Consumes: approved operation and layout models plus the existing repository.
- Produces: scoped frontend changes, focused tests, browser evidence, and a concise handoff.

- [ ] **Step 1: Write the repository-first implementation contract**

Require inspection of relevant routes, components, styles/tokens, state/data layer, tests, localization, and project instructions before editing. Preserve existing patterns unless they directly prevent the requested outcome. Separate discovered facts from assumptions and do not invent backend capabilities.

- [ ] **Step 2: Define the frontend implementation slice**

Require semantic structure, explicit component responsibilities, state ownership, URL persistence where sharing/back navigation matters, accessible names and relationships, predictable focus behavior, complete async states, responsive composition, and no hidden data loss. State that implementation tests follow the repository's normal test-first workflow when code changes are authorized.

- [ ] **Step 3: Define proportionate browser verification**

Provide a matrix with `Risk`, `Fixture`, `Viewport/input`, `Action`, `Expected result`, and `Evidence`. Cover primary task, loading/empty/error, permissions, destructive action, long/localized content, realistic data density, keyboard-only use, focus restoration, zoom/reflow, and at least one narrow and one wide viewport when responsive behavior changes.

- [ ] **Step 4: Add stop conditions and handoff format**

Do not claim completion when the app cannot run, the primary flow was not exercised, responsive changes were checked at only one width, or failures remain unexplained. The handoff must state outcome, design decisions, files changed, tests, browser checks, corrected defects, and remaining limits.

- [ ] **Step 5: Add common implementation mistakes and commit**

Cover coding before understanding the flow, restyling without state coverage, tests that assert markup details instead of user behavior, mock data that hides overflow, desktop-only verification, screenshot-only verification, and silent deviations from the selected design.

Run:

```powershell
git add -- '.codex/skills/principal-saas-ux-engineer/references/implementation-verification.md'
git diff --cached --check -- '.codex/skills/principal-saas-ux-engineer/references/implementation-verification.md'
git commit -m "docs: add frontend UX verification playbook" -- '.codex/skills/principal-saas-ux-engineer/references/implementation-verification.md'
```

---

### Task 6: Run Guided Behavioral Tests and Refactor the Skill

**Files:**
- Modify: `docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md`
- Modify if evidence requires: `.codex/skills/principal-saas-ux-engineer/SKILL.md`
- Modify if evidence requires: `.codex/skills/principal-saas-ux-engineer/references/interaction-architecture.md`
- Modify if evidence requires: `.codex/skills/principal-saas-ux-engineer/references/visual-layout.md`
- Modify if evidence requires: `.codex/skills/principal-saas-ux-engineer/references/implementation-verification.md`

**Interfaces:**
- Consumes: the fixed Task 1 scenario, rubric, and complete draft skill.
- Produces: five fresh guided scores, a collaboration test result, evidence-based refinements, and a documented comparison against baseline.

- [ ] **Step 1: Run five fresh-context guided samples**

Dispatch one new subagent per sample. Give it only the complete skill path and the fixed application scenario:

```text
Use $principal-saas-ux-engineer at E:\Github\NexaForge\.codex\skills\principal-saas-ux-engineer to complete this request. Read only the references the skill routes you to. Do not edit the repository; return the implementation-ready design response.
```

Score each response against the unchanged rubric and manually inspect every result. Success requires the median guided score to exceed the median control score and no dimension to regress.

- [ ] **Step 2: Run the collaboration scenario**

Use a fresh agent with the skill and this conflict:

```text
The senior-ux-designer recommends replacing a 10,000-user management table with profile cards because cards feel more approachable. Operations data shows admins compare roles and statuses across many users and perform bulk actions daily. Collaborate with that recommendation, produce a decision ledger, resolve the conflict from evidence, and give an implementable direction.
```

Expected: preserve the other role's rationale, identify agreement and conflict, prefer a scan-efficient table or hybrid detail treatment based on evidence, and avoid resolving by title or taste.

- [ ] **Step 3: Refactor only demonstrated gaps**

If guided responses omit a required dimension, strengthen the positive output slot or the relevant conditional instruction. If the behavior depends on a condition, key the guidance to an observable predicate. Do not add a rationalization table unless agents knowingly skip a rule under pressure.

- [ ] **Step 4: Re-run any failing scenario with a fresh agent**

Expected: the demonstrated gap is corrected without degrading another rubric dimension. Record the result and exact supporting excerpt.

- [ ] **Step 5: Commit behavioral evidence and supported refinements**

Run:

```powershell
git add -- 'docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md' '.codex/skills/principal-saas-ux-engineer'
git diff --cached --check -- 'docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md' '.codex/skills/principal-saas-ux-engineer'
git commit -m "test: verify principal SaaS UX skill behavior" -- 'docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md' '.codex/skills/principal-saas-ux-engineer'
```

---

### Task 7: Validate Structure, Links, and Final State

**Files:**
- Verify: `.codex/skills/principal-saas-ux-engineer/SKILL.md`
- Verify: `.codex/skills/principal-saas-ux-engineer/agents/openai.yaml`
- Verify: `.codex/skills/principal-saas-ux-engineer/references/*.md`
- Verify: `docs/superpowers/evaluations/2026-08-22-principal-saas-ux-engineer.md`

**Interfaces:**
- Consumes: the final skill and evaluation evidence.
- Produces: validator output, link/frontmatter checks, scope confirmation, and a clean handoff.

- [ ] **Step 1: Run the bundled structural validator**

Run:

```powershell
python 'C:\Users\kim\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'E:\Github\NexaForge\.codex\skills\principal-saas-ux-engineer'
```

Expected: `Skill is valid!`

- [ ] **Step 2: Run targeted content checks**

Run:

```powershell
rg -n 'TBD|TODO|FIXME|placeholder' '.codex/skills/principal-saas-ux-engineer'
rg -n '^name:|^description:|interaction-architecture\.md|visual-layout\.md|implementation-verification\.md' '.codex/skills/principal-saas-ux-engineer/SKILL.md'
rg -n 'display_name|short_description|default_prompt|\$principal-saas-ux-engineer' '.codex/skills/principal-saas-ux-engineer/agents/openai.yaml'
git diff --check
```

Expected: no placeholder hits; all metadata and reference links are present; no whitespace errors in plan-owned files.

- [ ] **Step 3: Check progressive disclosure and word count**

Read every final skill file. Confirm the entrypoint contains shared decisions only, each detail appears in one authoritative location, every reference has an observable loading condition, the worked example appears once, and no unused file exists.

Run:

```powershell
$skill = Get-Content -Raw -LiteralPath '.codex\skills\principal-saas-ux-engineer\SKILL.md'
($skill -split '\s+' | Where-Object { $_ }).Count
```

Expected: the entrypoint is concise for a complex skill; if it exceeds roughly 700 words, move conditional detail into the relevant reference and revalidate.

- [ ] **Step 4: Confirm repository scope**

Run:

```powershell
git status --short
git log --oneline -8
```

Expected: pre-existing user changes remain present and untouched; plan-owned commits contain only the specification, plan, evaluation, and new skill files.

- [ ] **Step 5: Deliver the result**

Report the skill path, invocation name, collaboration behavior, validator result, baseline-to-guided evidence, and any remaining limitation. Link directly to `SKILL.md`, the three references, and the evaluation report.
