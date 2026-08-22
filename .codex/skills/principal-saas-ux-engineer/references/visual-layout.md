# Visual Layout for Websites and SaaS

Read this reference when the task changes hierarchy, composition, density, spacing, typography, responsive behavior, visual style, design tokens, or quantitative display.

## Required outcome

Produce layout rules that implementation can test: region order, width behavior, alignment, spacing rhythm, type roles, action emphasis, wrapping/overflow, responsive transformations, state styling, and token sources. Aesthetic adjectives alone are not a specification.

## Decision sequence

Decide in this order:

```text
task priority → content model → regions → hierarchy → density → responsive transformation → visual finish
```

Later decisions must not undermine earlier ones. A brand flourish cannot obscure the primary task; a breakpoint cannot destroy necessary comparison; extra whitespace cannot push frequent controls out of working context.

For every page or component, record:

| Decision | Specify |
|---|---|
| Priority | Primary task/content, secondary tasks, exceptional/destructive actions |
| Regions | Persistent navigation, page identity, controls, primary content, detail/support |
| Width | Fixed, intrinsic, fluid, minimum/maximum, wrapping, overflow, sticky behavior |
| Alignment | Shared edges, text baselines, numeric alignment, control alignment |
| Density | Row/control height, information per region, disclosure depth |
| Type | Role, size/line height, weight, measure, wrapping/truncation |
| Spacing | Token/rhythm, group spacing, inset, vertical cadence |
| Responsive | Failure condition, transformed structure, preserved task/context |
| States | Hover, focus, selected, active, disabled, error, loading, read-only |
| Evidence | Existing tokens/components, content fixture, screenshot, browser observation |

## Build hierarchy from the task

Hierarchy is the order in which an actor should notice, understand, and act—not the number of font sizes.

1. Give page identity enough prominence to orient, not enough to displace work.
2. Place the primary control near the content it changes. Keep its relationship visible during loading and error states.
3. Group by shared purpose, scope, and consequence. Proximity is stronger than decorative containers.
4. Give one action primary emphasis per local decision point. Destructive emphasis appears when the destructive choice is relevant, not across the whole page.
5. Put exception details near their cause; do not route routine correction through global toasts alone.
6. Keep comparison fields aligned. Use panels or cards when items are independent units, not to decorate each row or metric.

## Regions and grids

Start with the project's shell and tokens. If no system exists, define the smallest useful layout contract rather than an entire speculative design system.

- Use a fluid working region for operational SaaS screens that need table, timeline, or editor width.
- Use a readable maximum measure for prose, onboarding, help, and settings descriptions.
- Use a split layout only when simultaneous context/detail comparison matters; otherwise prefer progressive disclosure.
- Align page title, toolbar, content, empty/error states, and pagination to stable shared edges.
- Let intrinsic content determine control width where labels vary; reserve full width for search, editors, or controls whose task benefits from it.
- Avoid nested scroll containers unless a region must remain independently operable and its keyboard/scroll behavior is verified.

Breakpoints come from content failure: clipped identity, lost comparison, wrapped action groups, or unreadable measure. Record the failing condition and resulting transformation instead of copying device categories blindly.

## Density

Choose density from task frequency, scan pattern, input method, and error cost:

| Context | Density direction | Preserve |
|---|---|---|
| Repetitive expert operations | Compact but calm | Alignment, targets, focus, status legibility |
| Mixed-frequency administration | Moderate | Clear grouping and primary action |
| High-risk or unfamiliar setup | Spacious/progressive | Explanation, review, recovery |
| Read-heavy content | Low visual density | Measure, rhythm, navigation context |

Compact does not mean smaller than usable. Increase information per viewport mainly by removing redundant containers, labels, and decoration; do not shrink text, targets, or error messages first.

## Typography and spacing

Reuse the existing type scale and spacing tokens. When none exist, define roles before values:

- Page title: orientation.
- Section title: local structure.
- Body/control: primary working text.
- Metadata: secondary context that remains readable.
- Numeric/data: tabular alignment when comparison benefits.

Specify size and line height together. Test long names, translations, zoom, browser font substitution, and validation messages. Truncate only when the full value remains available by a keyboard- and touch-accessible method; wrapping is usually safer for identity and error content.

Use a small spacing rhythm consistently, then adjust optically where typography, icons, or borders change perceived spacing. Spacing inside a group is smaller than spacing between groups. Section boundaries should remain understandable even when borders and backgrounds are removed.

## Operational surfaces

### Tables and lists

- Align comparable text and numbers; right-align numeric measures when it improves scanning.
- Keep identity and the most frequent action visible through responsive changes.
- Avoid a badge for every categorical value. Use plain text when shape/color adds no scanning value.
- Keep row hover subtle and focus unmistakable. Hover must not move geometry.
- Use sticky headers only within a well-defined scroll context and verify zoom, keyboard, and obscured content.

### Forms and settings

- Use one strong vertical reading path for related fields.
- Put labels above controls when labels vary, translations expand, or narrow widths matter.
- Place help before the decision and errors at the affected field; add a summary for long or multi-region forms.
- Align action placement with scope. Sticky actions must not cover final content or errors.

### Dashboards

- Rank by decision importance, not metric count.
- Put definition, time range, comparison, freshness, and next action close enough to interpret together.
- Use charts only when shape, change, distribution, or relationship matters; use text/table for exact lookup.
- Do not use equal card weight when metrics have unequal consequence.

## Responsive transformation

Choose a transformation from the task:

| Need | Preferred response |
|---|---|
| Compare many aligned fields | Preserve table and allow controlled horizontal access; freeze identity only if tested |
| Act on one record at a time | Switch to a prioritized semantic list with primary action visible |
| Keep secondary fields available | Merge related fields, disclose detail, or open a sheet/page |
| Edit complex content | Move from side panel to full page/sheet when usable width fails |
| Narrow many filters | Show applied summary plus a filter sheet/drawer |
| Compare two entities | Retain side-by-side until comparison fails, then provide explicit switching with identity persistent |
| Maintain bulk mode | Keep scope/count visible and place actions in a non-obscuring contextual bar |

Do not automatically replace every table with cards. If horizontal comparison is the job, controlled table scrolling may be more usable than repeated labels. If the job is individual action, a prioritized list may be better. State which need decides.

## Visual accessibility

- Meet the applicable contrast standard for text, components, focus, and meaningful graphics.
- Convey state with text or semantics in addition to color.
- Keep visible focus distinct from hover and selection.
- Preserve DOM/reading order across CSS rearrangement.
- Provide adequate pointer targets and spacing without making dense screens inefficient.
- Respect reduced motion; motion explains continuity or consequence rather than delaying work.
- Verify reflow/zoom, long localized content, browser font scaling, high contrast/forced colors when relevant, and errors at narrow widths.
- Ensure charts have textual meaning, accessible names, and non-color differentiation.

## Diagnose generic AI styling

Treat these as prompts to inspect purpose, not universal bans:

| Symptom | Ask | Likely correction |
|---|---|---|
| Nested cards everywhere | What relationship does each surface encode? | Remove containers that add no containment |
| Ornamental gradients/glows | What brand or state meaning is carried? | Use the product palette and reserve emphasis |
| Pills for every label/action | Does shape indicate state, filter, or compact selection? | Use text or standard controls when it does not |
| Oversized page headings | Does orientation displace frequent work? | Reduce scale/space while retaining hierarchy |
| Weak muted text | Is secondary content still required to decide? | Raise contrast or remove truly unnecessary content |
| Arbitrary shadows/radii | Which elevation or containment level is represented? | Map them to a small semantic token set |
| Decorative whitespace | Does it improve grouping or readability? | Return space to working content when it does not |

## Design-system and research inputs

Repository tokens, components, and brand rules are authoritative unless the task explicitly changes them. Map new decisions to semantic tokens such as surface, text, border, action, focus, danger, success, and data-series roles; avoid one-off values without rationale.

The project-local `ui-ux-pro-max` skill may be used when the task genuinely needs style, palette, typography, chart, or stack research. Treat its results as candidate evidence to synthesize with product context—not as an automatic design system and not as a required dependency.

## Common failures

| Failure | Correction |
|---|---|
| Choosing a style before content/task | Complete priority and region decisions first |
| Applying a fixed max-width everywhere | Match measure to reading, comparison, or editing needs |
| Shrinking desktop UI into mobile | Define the failure and transform the information/action structure |
| Hiding essential content without access | Merge, wrap, disclose, or provide an intentional alternate view |
| Inconsistent spacing patched locally | Restore token rhythm and shared alignment edges |
| Screenshot looks polished but states break | Test realistic content, states, zoom, and input modes |
