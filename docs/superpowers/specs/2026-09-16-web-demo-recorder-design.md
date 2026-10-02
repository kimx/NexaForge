# Web Demo Recorder Skill Design

## Purpose

Create a project-local Codex Skill named `web-demo-recorder` that turns a website URL, a natural-language feature brief, and an intended demo flow into a clean, reproducible Playwright recording package. The user supplies intent rather than Playwright code.

The finished run must provide a recorded video, reproducible Playwright script, synchronized action timeline, step screenshots, detailed action log, CapCut-ready narration, SRT subtitles, and a final summary. A failed website feature must produce diagnostic evidence instead of a false success claim.

## Location and discovery

The skill lives at `.codex/skills/web-demo-recorder/` so it is versioned with NexaForge and discoverable in this project. Automatic invocation remains enabled. Its trigger description covers requests to demonstrate, record, or document an actual website workflow with Playwright; it does not claim general-purpose video editing or ordinary automated testing.

The skill includes:

```text
.codex/skills/web-demo-recorder/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── recording-workflow.md
│   └── output-contract.md
└── scripts/
    ├── build-artifacts.mjs
    ├── verify-output.mjs
    └── test-artifacts.mjs
```

No README, sample output directory, or duplicate Playwright installation is added to the repository.

## Architecture

The Skill is an orchestration layer with deterministic artifact helpers.

`SKILL.md` defines the operating contract: understand the request, inspect the site, plan a purposeful flow, perform a dry run when uncertainty exists, record a clean run, generate artifacts from observed events, and verify the package before reporting completion. It points to detailed references only when executing a recording.

`references/recording-workflow.md` defines browser discovery, resilient locator selection, dry-run boundaries, recording cadence, action timing, screenshots, retries, downloads, and failure evidence. `references/output-contract.md` defines the event input schema and exact output formats.

`scripts/build-artifacts.mjs` converts a normalized run manifest into `action-timeline.json`, `actions.md`, `capcut-script.md`, `subtitles.srt`, and `summary.md`. This keeps time formatting and cross-file synchronization deterministic. `scripts/verify-output.mjs` validates required files, timeline ordering, time bounds, subtitle numbering, video presence, screenshots, and the generated Playwright script. Both scripts use Node built-ins only.

The generated `output/demo.spec.ts` remains site-specific because locators and interactions must reflect the observed page. The Skill instructs the agent to write this file only after exploration and to prefer accessible locators over brittle CSS.

## Input contract

The user may provide prose or labeled fields. The Skill extracts:

- target URL;
- feature or workflow to demonstrate;
- requested or inferred ordered actions;
- desired duration, defaulting to 30–60 seconds when omitted;
- optional test assets, authentication context, browser constraints, and language.

Missing details are inferred when they do not materially change permissions, security, cost, or the demonstrated outcome. Credentials, destructive operations, purchases, publishing, or consequential external writes require the same authorization they would outside the Skill.

## Execution flow

### 1. Preflight and site analysis

Resolve an output directory, confirm Playwright and Chromium availability, inspect `assets/` for suitable non-sensitive fixtures, and create only the smallest missing fixture required by the flow. Open the URL and wait for DOM readiness plus the relevant application state rather than relying on a fixed global sleep.

Inspect headings, landmarks, accessible names, forms, buttons, tabs, menus, file inputs, and relevant linked pages. Locator priority is `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, stable `data-testid`, and finally a narrowly scoped CSS locator. Text and role locators must be disambiguated when multiple matches exist.

### 2. Demo planning and dry run

Translate the brief into numbered steps with one visible purpose per step. Each step records its intended action, target, expected result, and screenshot name. Exclude navigation mistakes, debugging, repeated actions, and idle waiting.

Perform a dry run when the route, control identity, upload behavior, state transition, or download behavior is uncertain. The dry run may inspect and correct locators but does not contribute footage or timestamps. Confirm the final path and reset state before recording.

### 3. Clean recording

Start a new Chromium browser context at 1440×900 with Playwright video recording enabled. Start the monotonic recording clock when the page is ready for the first intended shot. Execute only approved demo steps. Use condition-based waits for application state and add a 500–1200 ms presentation pause after visible actions when needed for comprehension.

For every major action, record monotonic start and end offsets, action kind, human-readable target, description, observed result, current URL, screenshot path, and the stable locator strategy written to the replay script. Screenshots are captured after the relevant result is visible.

Close the page and context before resolving the Playwright video path. Copy or rename the completed recording to `output/video/demo.webm`; do not assume Playwright's temporary filename.

### 4. Artifact generation

Write the observed run manifest, generate the five text artifacts through `build-artifacts.mjs`, and retain `demo.spec.ts`. Narration is short, natural Traditional Chinese by default, limited to what the footage shows, and normally one or two sentences per segment. Subtitle text is concise and uses the actual segment boundaries.

The final directory is:

```text
output/
├── video/demo.webm
├── screenshots/01-*.png
├── demo.spec.ts
├── action-timeline.json
├── actions.md
├── capcut-script.md
├── subtitles.srt
├── summary.md
└── errors.md            # only when unresolved failures exist
```

### 5. Verification and completion

Run the generated replay script when the target remains safely repeatable. Then run `verify-output.mjs`. Completion requires a non-empty video, valid chronological timestamps within the measured duration, matching step counts across artifacts, referenced screenshots that exist, a replay script, and no claim that an unobserved result succeeded.

If a safe replay is impossible because the flow is destructive or externally consequential, document that limitation in `summary.md` and verify all non-mutating artifacts instead.

## Error recovery

On a failed action, capture a failure screenshot and record the current URL, attempted locator, error text, and expected state. Reinspect the current DOM and try a corrected locator or state-aware wait. Retry the affected step from a known state, with a small bounded retry count; do not continue building a polished timeline on top of an unknown state.

If the website itself remains unusable, write `output/errors.md` with the failed step, evidence, attempts, and remaining blocker. Preserve any valid artifacts, mark the run incomplete in `summary.md`, and never fabricate a result, timestamp, screenshot, or successful download.

## Data model

The helper consumes a JSON manifest containing run metadata and ordered steps. Each step contains:

```json
{
  "step": 3,
  "startMs": 8200,
  "endMs": 12600,
  "action": "click",
  "target": "旋轉按鈕",
  "description": "將圖片向右旋轉 90 度",
  "result": "預覽圖片完成旋轉",
  "screen": "預覽圖片向右旋轉",
  "narration": "接著將圖片向右旋轉九十度。",
  "subtitle": "向右旋轉圖片",
  "screenshot": "screenshots/04-rotate.png",
  "url": "https://example.com/image-crop"
}
```

Milliseconds are the canonical time representation. Display formats are derived, never hand-maintained independently.

## Testing strategy

Skill authoring follows a RED–GREEN–REFACTOR cycle:

1. Run a realistic baseline task without the new Skill and record omissions or unsafe assumptions.
2. Add the minimum instructions and helpers that correct those failures.
3. Run the same task with the Skill in an isolated temporary workspace and inspect its decisions and output plan.
4. Test helper behavior with a fixture manifest covering millisecond formatting, SRT formatting, ordered steps, escaping, missing fields, and invalid time ranges.
5. Run the Codex Skill validator and the output verifier against a complete fixture plus deliberately broken fixtures.

A live public-site end-to-end recording is optional for authoring because external pages change. The deterministic scripts, Skill structure, and a controlled local fixture provide the stable acceptance gate. A real user invocation still performs live Playwright exploration and recording.

## Repository integration

The project already uses ESM and optional Playwright audit scripts. The new Skill follows those conventions but does not modify the application package manifest or reuse product-specific smoke flows. At runtime it first uses an available project Playwright installation; when unavailable, it reports the exact setup needed instead of silently changing dependencies.

## Acceptance criteria

- `$web-demo-recorder` is discoverable as a project Skill and accepts a URL plus natural-language demo intent.
- The instructions require discovery before replay-script generation and separate dry-run activity from recorded footage.
- The recording contract uses a clean Chromium context, 1440×900 viewport, Playwright video, readable pacing, and stable locators.
- One canonical millisecond timeline generates JSON, action documentation, CapCut narration, SRT, and summary timestamps.
- Every required output is named and verified; `errors.md` appears only for unresolved failures.
- The replay script uses locators based on the observed page and can reproduce the safe demo path.
- The Skill neither requests user-written Playwright code nor treats the work as ordinary test automation.
- No sensitive fixture data, credentials, or unapproved consequential actions are introduced.
