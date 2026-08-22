# Interaction Architecture for Websites and SaaS

Read this reference when the task changes navigation, a multi-step flow, forms, tables, search/filtering, bulk work, permissions, destructive actions, asynchronous behavior, or recovery.

## Required outcome

Produce an operation model precise enough that implementation does not have to invent behavior. It should identify the primary actor and job, entry and exit, shortest coherent primary path, state ownership, permissions, feedback, exceptions, and recovery.

## Decision framework

| Decision | Determine | Produce |
|---|---|---|
| Actor and job | Role, trigger, frequency, desired outcome, error cost | One primary actor/job statement; secondary roles separate |
| Entry and orientation | Route, page identity, scope, prior context, back path | Entry points, persistent context, return behavior |
| Primary path | Minimum decisions/actions, defaults, latency | Ordered steps with system feedback |
| Exceptions | Validation, conflict, partial failure, permission, cancellation, retry, undo | Branch and recovery for each consequential failure |
| Disclosure | Needed now, on intent, in details, or not at all | Visible hierarchy and reveal rules |
| State ownership | Shareable, server-authoritative, cross-component, transient | URL, server, shared client, or local component ownership |

Prefer a reversible, visible action over confirmation for routine low-risk work. Use confirmation when the consequence is costly, difficult to reverse, changes authority, has surprising scope, or requires informed consent. Confirmation copy names the object, consequence, scope, and recovery.

## Model the task before controls

Write the primary path as actor intent and system response, not component names:

```text
Admin identifies a person → system narrows results without losing the query
Admin selects an allowed role → system explains privilege change when material
Admin commits → system preserves context and reports pending/success/failure
Admin recovers or continues → focus and selection remain predictable
```

For each step, specify:

- information needed to decide;
- action and accessible name;
- system feedback and latency treatment;
- permission or validation rule;
- cancel, retry, undo, or recovery path;
- focus destination after completion or removal.

## SaaS surface patterns

| Surface | Use when | Minimum behavior | Failure to prevent |
|---|---|---|---|
| Data table | Actors compare aligned fields or act across many records | Stable identity, meaningful sort, row/bulk scope, loading/empty/error, overflow behavior | Card-like rows that destroy comparison |
| Search | Actor knows a name, ID, or attribute | Visible label, clear, result feedback, stale-request handling, URL persistence when shareable | Results detached from query |
| Filters | Actor narrows a known collection | Applied-state summary, clear/reset, no-match recovery, count when useful | Hidden filters or surprising reset |
| Bulk actions | Same action applies to a known scope | Selection scope, eligible/excluded counts, frozen query, confirmation/recovery | Acting on hidden or changed scope |
| Form | Structured data must be created or changed | Labels, format help, validation timing, dirty state, submit status, error summary | Data loss or inaccessible errors |
| Wizard/setup | Dependencies require staged decisions | Progress, saved state, back behavior, optional/required distinction, resume | Forced linearity without recovery |
| Dashboard | Signals lead to operational decisions | Time range, definitions, freshness, comparison, next action | Decorative metrics with unclear meaning |
| Settings | Changes affect future behavior or other users | Current value, scope, permissions, save model, audit/reversal | Unclear application scope |
| Permission UI | Affordances differ by capability | Server authority, row/action capability, reason for contextual restrictions | Client role names treated as security |
| Destructive action | Data/access may be lost | Exact object/scope, consequence, protected cases, progress, result, recovery | Generic confirmation or silent partial failure |
| Async work | Completion exceeds immediate feedback | Durable status, idempotency, progress, cancel/retry policy, final summary | Toast-only work that vanishes |

## Tables, search, and bulk work

Start with the comparison and action model:

1. Identify the fields actors compare, the row identity, and the most frequent row action.
2. Keep primary comparison fields aligned. Move low-frequency detail to disclosure rather than adding every available field.
3. Use server-side query, filter, sort, and pagination when the data cannot be reliably loaded as one set.
4. Put shareable query state in the URL. Keep transient menus and ordinary dialog state local.
5. Define whether the header checkbox selects visible eligible rows, the current page, or all matches; label that scope.
6. For all-matching selection, freeze a query/snapshot and track exclusions. Do not silently apply later filter changes.
7. Preflight consequential bulk work and show eligible, excluded, already-complete, and protected counts.

Pagination usually fits comparison, stable position, and bulk selection. Infinite loading fits continuous discovery. Virtualization solves rendering volume, not server query volume; introduce it only when the rendered set is itself large.

## Permission and capability model

Treat the backend as authoritative. Prefer capability data at the scope where the UI needs it:

```ts
interface RowCapabilities<Role extends string> {
  allowedRoles: Role[];
  canSelect: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  restrictionReason?: string;
}
```

- Hide an action when the actor never has the capability in this context.
- Disable it when a record-specific or temporary restriction is worth explaining.
- Do not expose a misleading control merely to advertise that it is unavailable.
- Reauthorize every mutation on the server; UI capabilities control presentation, not security.
- Model self-management, protected records, last-owner rules, stale permissions, and mid-session permission loss when they apply.

## State matrix

Use only applicable rows, but make each included row implementable.

| State | Trigger | Visible content | Available action | Announcement/focus | Recovery |
|---|---|---|---|---|---|
| Initial | Before first request | Stable shell or useful default | Start primary task | Page identity | None needed |
| Loading | First request pending | Layout-preserving progress | Cancel if meaningful | Busy state without noisy repetition | Retry on failure |
| Populated | Valid data | Primary content and scope | Main and allowed secondary actions | Result summary when changed | Continue |
| Empty | Collection truly has no items | Cause and appropriate next step | Create/invite if authorized | Heading receives context | Exit or create |
| Filtered-empty | Query has no matches | Query/filter summary | Clear or edit filters | Announce no matches after settled request | Preserve editable query |
| Refreshing/stale | Existing data revalidates | Retained data plus subtle progress/staleness | Continue safe work | Avoid focus reset | Revalidate |
| Partial | Some data/action failed | Success and failed subsets/reasons | Retry failed subset or inspect | Summary with counts | Preserve successful work |
| Error | Request/action failed | Error near affected region | Retry, edit, cancel, or support path | Focus/announce actionable message | Preserve prior input/context |
| Success | Action completed | New state and consequence | Continue or undo if valid | Restore/advance focus; announce once | Undo where supported |
| Disabled | Temporary/contextual restriction | Control plus reason | Resolve prerequisite if possible | Reason available without hover | Re-evaluate |
| Read-only | Actor may inspect but not mutate | Clean readable content | Allowed navigation/export | Avoid disabled-control clutter | Request access if product supports it |
| Permission denied | Authority missing or changed | Safe explanation without leaking data | Return, refresh, request access | Focus message/next action | Reauthorize or exit |
| Destructive confirmation | Consequential action requested | Object, scope, consequence, exclusions | Confirm/cancel | Safe initial focus | Cancel without loss |

## Worked example: user role change

Context: an Admin frequently finds a user and changes Admin/Viewer access. Owner transfer and exact delete policy are unverified product rules, so they remain explicit assumptions until repository or product evidence confirms them.

1. Store shareable query state in `/users?q=maya&role=admin&status=active`; keep the open role editor local.
2. Search preserves the typed query, cancels stale requests, retains current results during refetch, and distinguishes no users from no matches.
3. The result keeps identity and Role together. A capability-backed trigger is named `Change role for Maya Chen, current role Admin`.
4. The role editor shows only server-allowed values and explains material privilege changes. Save disables that control, not the page.
5. Success updates the row without losing query, scroll, selection, or focus. Failure restores the prior value next to the trigger and offers retry.
6. A version conflict refreshes only the affected row, states that it changed elsewhere, and requires a new decision.
7. On narrow screens, identity and Role remain visible in a prioritized list or sheet; the primary action is not buried in overflow.
8. Viewer/read-only presentation omits mutation and selection affordances instead of showing a field of disabled controls.

## Common failures

| Failure | Correction |
|---|---|
| Controls chosen before the job | Write actor intent and system response first |
| Filters reset selection silently | Announce reset or freeze the selected query scope |
| Entire interactive row is clickable | Give each action a distinct semantic control and target |
| Header checkbox scope is unclear | Label current page, visible eligible rows, or all matches explicitly |
| Destructive optimistic mutation | Wait for authority; show progress and exact partial results |
| Validation exists only by color or toast | Associate messages with fields/region and manage focus |
| Permission error is a dead end | Preserve safe context and provide refresh, return, or access path |
