# Web Demo Recorder Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable project-local Codex Skill that explores a website with Playwright, records a clean demonstration, and emits a synchronized editing package without requiring user-authored Playwright code.

**Architecture:** A concise `SKILL.md` orchestrates discovery, dry run, recording, artifact generation, and verification. Two focused references carry the browser procedure and output schema, while dependency-free ESM helpers render and validate all timeline-derived artifacts from one millisecond-based manifest.

**Tech Stack:** Codex Skills, Markdown/YAML, Node.js ESM built-ins, Playwright-generated TypeScript, Node `assert` tests.

**Spec:** `docs/superpowers/specs/2026-09-16-web-demo-recorder-design.md`

## Global Constraints

- Install the Skill at `.codex/skills/web-demo-recorder/` with automatic invocation enabled.
- Do not modify the application `package.json` or install a duplicate Playwright dependency.
- Use Chromium with a 1440×900 viewport and Playwright `recordVideo` for formal recording.
- Derive every displayed timestamp from canonical integer millisecond offsets.
- Prefer `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, stable `data-testid`, then narrowly scoped CSS.
- Keep dry-run discovery, mistakes, retries, and debugging out of the formal recording.
- Use Traditional Chinese for narration and subtitles unless the user requests another language.
- Never introduce sensitive fixtures or claim that an unobserved result succeeded.

## File map

| File | Responsibility |
|---|---|
| `.codex/skills/web-demo-recorder/SKILL.md` | Trigger and top-level execution contract |
| `.codex/skills/web-demo-recorder/agents/openai.yaml` | UI metadata and default invocation prompt |
| `.codex/skills/web-demo-recorder/references/recording-workflow.md` | DOM analysis, dry run, recording, retries, and replay guidance |
| `.codex/skills/web-demo-recorder/references/output-contract.md` | Manifest schema and exact artifact requirements |
| `.codex/skills/web-demo-recorder/scripts/build-artifacts.mjs` | Validate a manifest and render synchronized output files |
| `.codex/skills/web-demo-recorder/scripts/verify-output.mjs` | Validate an assembled recording package |
| `.codex/skills/web-demo-recorder/scripts/test-artifacts.mjs` | Dependency-free automated tests for both helpers |

---

### Task 1: Establish the skill-behavior baseline

**Files:**
- Read: `docs/superpowers/specs/2026-09-16-web-demo-recorder-design.md`
- Create: none; use a temporary directory outside the repository

**Interfaces:**
- Consumes: realistic recording request and the repository's existing tools, without the new Skill
- Produces: verbatim baseline observations that guide Task 4 wording

- [ ] **Step 1: Prepare an isolated scenario**

Use a temporary directory and give a fresh subagent this prompt without exposing the proposed Skill instructions:

```text
You must fulfill this request as a real task, not explain hypothetically:

Record a 30–60 second Playwright demo for a website image crop flow. The user supplied only a URL, these steps—open tool, upload an image, adjust crop, rotate, crop, download—and asked for video/demo.webm, screenshots, demo.spec.ts, action-timeline.json, actions.md, capcut-script.md, subtitles.srt, and summary.md. No Playwright program was supplied. The page may require locator discovery and one locator may fail on the first attempt.

Describe the exact execution plan and concrete output contract you would use. State when timestamps begin, how the recorded file is finalized, how retries affect footage, and how you verify synchronization. Do not load or infer a web-demo-recorder skill.
```

- [ ] **Step 2: Run the baseline without the Skill**

Dispatch the scenario with a clean context. Keep it read-only and do not allow a live external recording. Capture its final response verbatim in the parent task notes.

- [ ] **Step 3: Score observable failure modes**

Mark each item present or absent:

```text
[ ] separates dry run from recorded run
[ ] identifies the video only after context closure
[ ] uses one monotonic millisecond clock
[ ] ties narration and subtitles to observed steps
[ ] defines bounded selector recovery with evidence
[ ] generates a replay script after DOM discovery
[ ] verifies every required output and cross-file step count
[ ] preserves authorization boundaries for consequential actions
```

Expected RED result: at least one required invariant is absent or underspecified. Record the exact omission or rationalization; if every invariant is already satisfied, revise the scenario to add time pressure and a failed locator, then rerun before authoring the Skill.

- [ ] **Step 4: Review the baseline evidence**

Confirm that Task 4 can point each observed failure to a positive instruction, contract field, or explicit stop condition. No repository commit is made for this evidence-only task.

---

### Task 2: Build the timeline-derived artifact generator with tests first

**Files:**
- Create: `.codex/skills/web-demo-recorder/scripts/test-artifacts.mjs`
- Create: `.codex/skills/web-demo-recorder/scripts/build-artifacts.mjs`

**Interfaces:**
- Consumes: `buildArtifacts(manifest, outputDir)` where `manifest` is `{ version, url, title, durationMs, video, replayScript, status, steps }`
- Produces: `formatTimeline(ms)`, `formatSrt(ms)`, `validateManifest(manifest)`, and five synchronized files

- [ ] **Step 1: Create the script directory and write failing generator tests**

Initialize the Skill folder with the official initializer only after Task 1 is RED, requesting `scripts,references` resources and UI values. Remove all generated placeholder content before the final validation. Then write `test-artifacts.mjs` using Node built-ins:

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildArtifacts,
  formatSrt,
  formatTimeline,
  validateManifest,
} from "./build-artifacts.mjs";

const manifest = {
  version: 1,
  url: "https://example.com/image-crop",
  title: "圖片裁切示範",
  durationMs: 12600,
  video: "video/demo.webm",
  replayScript: "demo.spec.ts",
  status: "complete",
  steps: [
    {
      step: 1,
      startMs: 0,
      endMs: 4200,
      action: "navigate",
      target: "圖片裁切工具",
      description: "開啟圖片裁切工具",
      result: "工具介面顯示完成",
      screen: "開啟圖片裁切工具。",
      narration: "先開啟圖片裁切工具。",
      subtitle: "開啟圖片裁切工具",
      screenshot: "screenshots/01-open-tool.png",
      url: "https://example.com/image-crop"
    },
    {
      step: 2,
      startMs: 4200,
      endMs: 12600,
      action: "upload",
      target: "圖片上傳區",
      description: "上傳測試圖片",
      result: "圖片預覽顯示完成",
      screen: "上傳圖片並顯示預覽。",
      narration: "接著選擇要處理的圖片。",
      subtitle: "選擇要處理的圖片",
      screenshot: "screenshots/02-upload.png",
      file: "assets/sample.png",
      url: "https://example.com/image-crop"
    }
  ]
};

assert.equal(formatTimeline(8200), "00:08.200");
assert.equal(formatSrt(8200), "00:00:08,200");
assert.deepEqual(validateManifest(manifest), []);
assert.match(validateManifest({ ...manifest, durationMs: 1000 })[0], /duration/i);
assert.match(validateManifest({ ...manifest, steps: [{ ...manifest.steps[0], endMs: -1 }] })[0], /time/i);

const root = await mkdtemp(path.join(tmpdir(), "web-demo-recorder-"));
await mkdir(path.join(root, "screenshots"), { recursive: true });
await mkdir(path.join(root, "video"), { recursive: true });
await writeFile(path.join(root, "video", "demo.webm"), "video");
await writeFile(path.join(root, "demo.spec.ts"), "import { test } from '@playwright/test';\n");
for (const step of manifest.steps) {
  await writeFile(path.join(root, step.screenshot), "png");
}

await buildArtifacts(manifest, root);
const srt = await readFile(path.join(root, "subtitles.srt"), "utf8");
const timeline = JSON.parse(await readFile(path.join(root, "action-timeline.json"), "utf8"));
const actions = await readFile(path.join(root, "actions.md"), "utf8");
const capcut = await readFile(path.join(root, "capcut-script.md"), "utf8");
const summary = await readFile(path.join(root, "summary.md"), "utf8");

assert.match(srt, /00:00:04,200 --> 00:00:12,600/);
assert.equal(timeline.length, 2);
assert.equal(timeline[1].start, "00:04.200");
assert.match(actions, /File:\nassets\/sample\.png/);
assert.match(capcut, /旁白：\n接著選擇要處理的圖片。/);
assert.match(summary, /Duration:\n00:13/);
assert.match(summary, /Steps:\n2/);
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
node .codex/skills/web-demo-recorder/scripts/test-artifacts.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `build-artifacts.mjs`.

- [ ] **Step 3: Implement the minimal artifact generator**

Create `build-artifacts.mjs` with these exports and CLI:

```js
const pad = (value, width) => String(value).padStart(width, "0");

function splitTime(ms) {
  const whole = Math.max(0, Math.trunc(ms));
  return {
    hours: Math.floor(whole / 3_600_000),
    minutes: Math.floor((whole % 3_600_000) / 60_000),
    seconds: Math.floor((whole % 60_000) / 1_000),
    milliseconds: whole % 1_000,
  };
}

export function formatTimeline(ms) {
  const time = splitTime(ms);
  return `${pad(time.hours, 2)}:${pad(time.minutes, 2)}.${pad(time.seconds, 2)}.${pad(time.milliseconds, 3)}`
    .replace(/^(\d{2}):(\d{2})\./, "$1:$2:");
}

export function formatSrt(ms) {
  return formatTimeline(ms).replace(/\.(\d{3})$/, ",$1");
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return ["Manifest must be an object"];
  for (const field of ["url", "title", "video", "replayScript", "status"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) errors.push(`Missing ${field}`);
  }
  if (!Number.isInteger(manifest.durationMs) || manifest.durationMs <= 0) errors.push("Invalid durationMs");
  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) return [...errors, "Steps must be non-empty"];
  let previousEnd = 0;
  manifest.steps.forEach((step, index) => {
    if (step.step !== index + 1) errors.push(`Step ${index + 1} is not contiguous`);
    if (!Number.isInteger(step.startMs) || !Number.isInteger(step.endMs) || step.startMs < 0 || step.endMs <= step.startMs) {
      errors.push(`Step ${index + 1} has an invalid time range`);
    }
    if (step.startMs < previousEnd) errors.push(`Step ${index + 1} overlaps the previous step`);
    if (step.endMs > manifest.durationMs) errors.push(`Step ${index + 1} exceeds durationMs`);
    for (const field of ["action", "target", "description", "result", "screen", "narration", "subtitle", "screenshot", "url"]) {
      if (typeof step[field] !== "string" || !step[field].trim()) errors.push(`Step ${index + 1} is missing ${field}`);
    }
    previousEnd = step.endMs;
  });
  return errors;
}

export async function buildArtifacts(manifest, outputDir) {
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join("\n"));
  await mkdir(outputDir, { recursive: true });
  const artifacts = renderArtifacts(manifest);
  await Promise.all(Object.entries(artifacts).map(([name, content]) =>
    writeFile(path.join(outputDir, name), content, "utf8")
  ));
  return Object.keys(artifacts);
}
```

Import `mkdir`, `readFile`, and `writeFile` from `node:fs/promises`, `path` from `node:path`, and `pathToFileURL` from `node:url`. Implement `renderArtifacts(manifest)` as a pure function returning an object with the exact five filenames as keys; build each value with `steps.map(...).join(...)` according to the output rules below. Guard the CLI with `import.meta.url === pathToFileURL(process.argv[1]).href`, require exactly two arguments, parse the manifest as UTF-8 JSON, and set `process.exitCode = 1` after printing any caught error.

Implementation rules:

- Reject non-object manifests, missing run fields, empty steps, non-contiguous step numbers, negative or overlapping ranges, `endMs <= startMs`, and `endMs > durationMs`.
- Escape Markdown-sensitive user content only where it could alter headings or tables; preserve readable Traditional Chinese prose.
- `action-timeline.json` includes `step`, formatted `start` and `end`, `action`, `target`, `description`, `result`, `url`, and `screenshot`.
- `actions.md` includes Step, Time, Action, Target, optional File, Purpose, Result, and screenshot path.
- `capcut-script.md` uses `# Video Script`, one time section per step, and the labels `畫面：`, `旁白：`, `字幕：` separated by blank lines and `---`.
- `subtitles.srt` uses one-based contiguous cue numbers and CRLF-safe blank-line separation.
- `summary.md` includes URL, video path, rounded-up `MM:SS` duration, step count, numbered demo flow, generated assets, and completion status.
- The CLI reads UTF-8 JSON, reports all validation errors together, creates the output directory, and exits nonzero on failure.

- [ ] **Step 4: Run tests and verify GREEN**

Run the same Node command. Expected: exit code 0 with a concise success line.

- [ ] **Step 5: Commit the generator**

```powershell
git add .codex/skills/web-demo-recorder/scripts/test-artifacts.mjs .codex/skills/web-demo-recorder/scripts/build-artifacts.mjs
git commit -m "feat: generate web demo recording artifacts"
```

---

### Task 3: Add recording-package verification with tests first

**Files:**
- Modify: `.codex/skills/web-demo-recorder/scripts/test-artifacts.mjs`
- Create: `.codex/skills/web-demo-recorder/scripts/verify-output.mjs`

**Interfaces:**
- Consumes: `verifyOutput(outputDir)`
- Produces: `{ ok: boolean, errors: string[], warnings: string[] }`; CLI exits 0 only when `ok`

- [ ] **Step 1: Add failing verifier tests**

Append tests that import `verifyOutput`, verify the complete fixture succeeds, then delete or corrupt one required artifact at a time and assert meaningful failures for:

```js
const verified = await verifyOutput(root);
assert.equal(verified.ok, true, verified.errors.join("\n"));

await writeFile(path.join(root, "subtitles.srt"), "2\ninvalid\n");
const brokenSrt = await verifyOutput(root);
assert.equal(brokenSrt.ok, false);
assert.match(brokenSrt.errors.join("\n"), /subtitle|SRT/i);
```

Use fresh temporary output directories for destructive negative cases so one case cannot contaminate another.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `verify-output.mjs`.

- [ ] **Step 3: Implement package verification**

Create `verify-output.mjs` with:

```js
export async function verifyOutput(outputDir) {
  const errors = [];
  const warnings = [];
  const required = [
    "video/demo.webm",
    "demo.spec.ts",
    "action-timeline.json",
    "actions.md",
    "capcut-script.md",
    "subtitles.srt",
    "summary.md",
  ];

  const contents = new Map();
  for (const relativePath of required) {
    const absolutePath = path.join(outputDir, relativePath);
    try {
      const bytes = await readFile(absolutePath);
      if (bytes.length === 0) errors.push(`${relativePath} is empty`);
      contents.set(relativePath, bytes);
    } catch {
      errors.push(`${relativePath} is missing`);
    }
  }

  if (errors.length === 0) {
    validateTimelineAndScreenshots(outputDir, contents, errors);
    validateCrossFileCounts(contents, errors);
    validateSummary(contents, errors);
  }

  if (await exists(path.join(outputDir, "errors.md"))) {
    warnings.push("errors.md is present; recording is incomplete");
    const summary = contents.get("summary.md")?.toString("utf8") ?? "";
    if (!/Status:\s*incomplete/i.test(summary)) errors.push("summary.md must mark an errored run incomplete");
  }

  return { ok: errors.length === 0, errors, warnings };
}
```

Import `readFile` and `stat` from `node:fs/promises`, plus `path` and `pathToFileURL`. Implement `exists()` with `stat()` and a caught `ENOENT`. Implement the three named validation helpers as pure functions following the checks below. The CLI accepts one output directory, prints every error to stderr and warnings to stdout, prints the verified step count on success, and uses exit code 1 for invalid packages.

Validate:

- all eight required paths exist and video, replay script, JSON, Markdown, and SRT files are non-empty;
- `action-timeline.json` parses to a non-empty array with contiguous steps and ordered, parseable time ranges;
- every referenced screenshot exists and is non-empty;
- `actions.md`, `capcut-script.md`, `subtitles.srt`, and `summary.md` expose the same number of steps/cues as the timeline;
- SRT cue numbers are contiguous and each cue has a valid increasing time range;
- `summary.md` names `video/demo.webm` and `demo.spec.ts`;
- `errors.md`, when present, produces a warning and requires the summary status to be incomplete.

The CLI prints errors to stderr and exits 1 when invalid; otherwise it prints the verified step count and exits 0.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
node .codex/skills/web-demo-recorder/scripts/test-artifacts.mjs
```

Expected: all generator and verifier assertions pass.

- [ ] **Step 5: Commit the verifier**

```powershell
git add .codex/skills/web-demo-recorder/scripts/test-artifacts.mjs .codex/skills/web-demo-recorder/scripts/verify-output.mjs
git commit -m "feat: verify web demo recording packages"
```

---

### Task 4: Author the Skill contract and references from baseline evidence

**Files:**
- Create or replace: `.codex/skills/web-demo-recorder/SKILL.md`
- Create: `.codex/skills/web-demo-recorder/agents/openai.yaml`
- Create: `.codex/skills/web-demo-recorder/references/recording-workflow.md`
- Create: `.codex/skills/web-demo-recorder/references/output-contract.md`

**Interfaces:**
- Consumes: user URL, natural-language requirements, desired flow, available assets, and Task 1 baseline failures
- Produces: a complete `output/` recording package and a reusable `output/demo.spec.ts`

- [ ] **Step 1: Write the concise entry-point contract**

Use this frontmatter shape:

```yaml
---
name: web-demo-recorder
description: Use when a user wants an actual website workflow explored and recorded with Playwright as a clean demo video, synchronized action timeline, screenshots, replay script, narration, or subtitles.
---
```

The body must contain:

- a core principle distinguishing demonstration recording from test automation;
- an input-normalization step that infers safe omissions but does not infer authorization;
- a required read of `recording-workflow.md` before browser work and `output-contract.md` before recording;
- the phase order `analyze → plan → dry run when uncertain → reset → record → build → replay when safe → verify`;
- a rule that only observed formal-run events enter the manifest;
- an explicit completion gate requiring `verify-output.mjs` to pass;
- a compact quick-reference table and common corrections grounded in Task 1 failures;
- one concise invocation example matching the user's image-crop use case.

- [ ] **Step 2: Write the browser and recording reference**

`recording-workflow.md` must define:

- Playwright/Chromium preflight without silently installing dependencies;
- DOM inventory and locator priority;
- when dry run is required and how to restore a clean state;
- a generated `demo.spec.ts` skeleton using `test`, `expect`, `recordVideo`, explicit viewport, accessible locators, downloads, screenshots, and `performance.now()` offsets;
- presentation pauses of 500–1200 ms only after meaningful visible actions;
- conditional waits rather than arbitrary page-load sleeps;
- how to capture the `Video` handle, close the context, then save as `video/demo.webm`;
- bounded per-step recovery: capture evidence, log URL/locator/error, reinspect DOM, correct once or twice from a known state, otherwise stop and create `errors.md`;
- authentication, destructive action, purchase, publishing, and credential boundaries.

- [ ] **Step 3: Write the output reference**

`output-contract.md` must include:

- the exact manifest schema from the design, including run metadata and optional `file`;
- the required output tree;
- field-level definitions and invariants;
- commands for `build-artifacts.mjs` and `verify-output.mjs`;
- the required content shape for `errors.md`;
- verification criteria for timestamps, step counts, files, screenshots, replay, and status.

- [ ] **Step 4: Write UI metadata**

Use:

```yaml
interface:
  display_name: "Web Demo Recorder"
  short_description: "Record website demos with synced editing assets"
  default_prompt: "Use $web-demo-recorder to explore this website flow, record a clean Playwright demo, and generate synchronized narration and subtitles."

policy:
  allow_implicit_invocation: true
```

- [ ] **Step 5: Run structural and wording checks**

Run:

```powershell
python C:\Users\kim\.codex\skills\.system\skill-creator\scripts\quick_validate.py .codex\skills\web-demo-recorder
rg -n "TBD|TODO|placeholder|example resource" .codex\skills\web-demo-recorder
```

Expected: validator success and no unfinished scaffold matches.

- [ ] **Step 6: Run the same behavior scenario with the Skill**

Dispatch a fresh subagent in a temporary workspace with the Task 1 scenario plus:

```text
Use the web-demo-recorder skill at E:/Github/NexaForge/.codex/skills/web-demo-recorder/SKILL.md. Read every reference it requires and produce the exact execution plan and output contract; do not perform a live external recording.
```

Score the same eight invariants. Expected GREEN: all eight are explicit and mutually consistent. If a new omission appears, revise only the instruction or contract responsible for it and rerun once.

- [ ] **Step 7: Commit the Skill instructions**

```powershell
git add .codex/skills/web-demo-recorder/SKILL.md .codex/skills/web-demo-recorder/agents/openai.yaml .codex/skills/web-demo-recorder/references/recording-workflow.md .codex/skills/web-demo-recorder/references/output-contract.md
git commit -m "feat: add web demo recorder skill"
```

---

### Task 5: Run integrated acceptance and finalize documentation

**Files:**
- Modify if needed: `.codex/skills/web-demo-recorder/SKILL.md`
- Modify if needed: `.codex/skills/web-demo-recorder/references/recording-workflow.md`
- Modify if needed: `.codex/skills/web-demo-recorder/references/output-contract.md`
- Modify if needed: `.codex/skills/web-demo-recorder/scripts/*.mjs`

**Interfaces:**
- Consumes: the complete Skill directory and a controlled temporary fixture package
- Produces: validated Skill, passing automated tests, and clean repository diff

- [ ] **Step 1: Run all deterministic tests**

```powershell
node .codex/skills/web-demo-recorder/scripts/test-artifacts.mjs
python C:\Users\kim\.codex\skills\.system\skill-creator\scripts\quick_validate.py .codex\skills\web-demo-recorder
```

Expected: both commands exit 0.

- [ ] **Step 2: Exercise both helper CLIs**

Create a temporary manifest and placeholder non-empty video/screenshots/replay files using PowerShell's temporary directory APIs, then run:

```powershell
node .codex/skills/web-demo-recorder/scripts/build-artifacts.mjs <manifest.json> <output-dir>
node .codex/skills/web-demo-recorder/scripts/verify-output.mjs <output-dir>
```

Expected: five generated text assets and verifier exit code 0. Use an invalid manifest with an overlapping time range and expect both a clear diagnostic and nonzero exit.

- [ ] **Step 3: Review discovery and output completeness**

Confirm manually that:

```text
[ ] SKILL.md is concise and routes to both references
[ ] references are read only when executing a recording
[ ] generated replay is based on observed DOM, not invented selectors
[ ] dry-run events cannot leak into formal timestamps
[ ] errors.md cannot coexist with a falsely complete summary
[ ] all user-requested output names are exact
[ ] helper scripts use Node built-ins only
[ ] package.json is unchanged
```

- [ ] **Step 4: Run repository integrity checks**

```powershell
git diff --check
git status --short
git log -5 --oneline
```

Expected: no whitespace errors, only intended Skill/plan changes, and all implementation commits visible.

- [ ] **Step 5: Commit any test-driven refinements**

If integrated testing required a correction:

```powershell
git add .codex/skills/web-demo-recorder
git commit -m "fix: harden web demo recorder validation"
```

If no correction was needed, do not create an empty commit.

- [ ] **Step 6: Report the completed capability**

Report the Skill path, helper commands, tests executed with their observed results, baseline failure corrected by the Skill, and any limit not exercised live. Do not claim that a live website video was recorded during authoring unless one was actually recorded and reviewed.
