import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildArtifacts,
  formatSrt,
  formatTimeline,
  validateManifest,
} from "./build-artifacts.mjs";
import { verifyOutput } from "./verify-output.mjs";

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
      url: "https://example.com/image-crop",
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
      url: "https://example.com/image-crop",
    },
  ],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function createCompleteFixture(source = manifest) {
  const root = await mkdtemp(path.join(tmpdir(), "web-demo-recorder-"));
  await mkdir(path.join(root, "screenshots"), { recursive: true });
  await mkdir(path.join(root, "video"), { recursive: true });
  await writeFile(path.join(root, "video", "demo.webm"), "video");
  await writeFile(
    path.join(root, "demo.spec.ts"),
    "import { test } from '@playwright/test';\n",
  );
  for (const step of source.steps) {
    await writeFile(path.join(root, step.screenshot), "png");
  }
  await buildArtifacts(source, root);
  return root;
}

assert.equal(formatTimeline(8200), "00:08.200");
assert.equal(formatTimeline(3_608_200), "01:00:08.200");
assert.equal(formatSrt(8200), "00:00:08,200");
assert.deepEqual(validateManifest(manifest), []);

const tooShort = clone(manifest);
tooShort.durationMs = 1000;
assert.match(validateManifest(tooShort).join("\n"), /duration/i);

const negativeTime = clone(manifest);
negativeTime.steps[0].endMs = -1;
assert.match(validateManifest(negativeTime).join("\n"), /time/i);

const overlap = clone(manifest);
overlap.steps[1].startMs = 4000;
assert.match(validateManifest(overlap).join("\n"), /overlap/i);

const invalidStatus = clone(manifest);
invalidStatus.status = "successful-ish";
assert.match(validateManifest(invalidStatus).join("\n"), /status/i);

const root = await createCompleteFixture();
const srt = await readFile(path.join(root, "subtitles.srt"), "utf8");
const timeline = JSON.parse(
  await readFile(path.join(root, "action-timeline.json"), "utf8"),
);
const actions = await readFile(path.join(root, "actions.md"), "utf8");
const capcut = await readFile(path.join(root, "capcut-script.md"), "utf8");
const summary = await readFile(path.join(root, "summary.md"), "utf8");

assert.match(srt, /00:00:04,200 --> 00:00:12,600/);
assert.equal(timeline.length, 2);
assert.equal(timeline[1].start, "00:04.200");
assert.match(actions, /File:\nassets\/sample\.png/);
assert.match(capcut, /旁白：\n接著選擇要處理的圖片。/);
assert.match(summary, /Duration:\n00:13/);
assert.match(summary, /Duration Milliseconds:\n12600/);
assert.match(summary, /Steps:\n2/);

const verified = await verifyOutput(root);
assert.equal(verified.ok, true, verified.errors.join("\n"));
assert.equal(verified.stepCount, 2);

const brokenSrtRoot = await createCompleteFixture();
await writeFile(path.join(brokenSrtRoot, "subtitles.srt"), "2\ninvalid\n");
const brokenSrt = await verifyOutput(brokenSrtRoot);
assert.equal(brokenSrt.ok, false);
assert.match(brokenSrt.errors.join("\n"), /subtitle|SRT/i);

const driftedSrtRoot = await createCompleteFixture();
const driftedSrtSource = await readFile(path.join(driftedSrtRoot, "subtitles.srt"), "utf8");
await writeFile(
  path.join(driftedSrtRoot, "subtitles.srt"),
  driftedSrtSource.replace("00:00:00,000 --> 00:00:04,200", "00:00:01,000 --> 00:00:04,200"),
);
const driftedSrt = await verifyOutput(driftedSrtRoot);
assert.equal(driftedSrt.ok, false);
assert.match(driftedSrt.errors.join("\n"), /SRT.*timeline|timeline.*SRT/i);

const driftedActionsRoot = await createCompleteFixture();
const driftedActionsSource = await readFile(path.join(driftedActionsRoot, "actions.md"), "utf8");
await writeFile(
  path.join(driftedActionsRoot, "actions.md"),
  driftedActionsSource.replace("00:00.000 - 00:04.200", "00:01.000 - 00:04.200"),
);
const driftedActions = await verifyOutput(driftedActionsRoot);
assert.equal(driftedActions.ok, false);
assert.match(driftedActions.errors.join("\n"), /actions.*timeline|timeline.*actions/i);

const driftedCapcutRoot = await createCompleteFixture();
const driftedCapcutSource = await readFile(path.join(driftedCapcutRoot, "capcut-script.md"), "utf8");
await writeFile(
  path.join(driftedCapcutRoot, "capcut-script.md"),
  driftedCapcutSource.replace("00:00.000 - 00:04.200", "00:01.000 - 00:04.200"),
);
const driftedCapcut = await verifyOutput(driftedCapcutRoot);
assert.equal(driftedCapcut.ok, false);
assert.match(driftedCapcut.errors.join("\n"), /CapCut.*timeline|timeline.*CapCut/i);

const structuredText = clone(manifest);
structuredText.steps[0].description = "開啟工具\n## Step 99 - injected";
structuredText.steps[0].subtitle = "開啟工具\n\n額外段落";
const structuredTextRoot = await createCompleteFixture(structuredText);
const structuredTextResult = await verifyOutput(structuredTextRoot);
assert.equal(structuredTextResult.ok, true, structuredTextResult.errors.join("\n"));

const missingVideoRoot = await createCompleteFixture();
await rm(path.join(missingVideoRoot, "video", "demo.webm"));
const missingVideo = await verifyOutput(missingVideoRoot);
assert.equal(missingVideo.ok, false);
assert.match(missingVideo.errors.join("\n"), /video\/demo\.webm.*missing/i);

const missingScreenshotRoot = await createCompleteFixture();
await rm(path.join(missingScreenshotRoot, manifest.steps[0].screenshot));
const missingScreenshot = await verifyOutput(missingScreenshotRoot);
assert.equal(missingScreenshot.ok, false);
assert.match(missingScreenshot.errors.join("\n"), /screenshot.*missing/i);

const erroredRoot = await createCompleteFixture({ ...manifest, status: "incomplete" });
await writeFile(path.join(erroredRoot, "errors.md"), "# Recording Errors\n\nBlocked.\n");
const errored = await verifyOutput(erroredRoot);
assert.equal(errored.ok, true, errored.errors.join("\n"));
assert.match(errored.warnings.join("\n"), /incomplete/i);

const incompleteWithoutErrorsRoot = await createCompleteFixture({ ...manifest, status: "incomplete" });
const incompleteWithoutErrors = await verifyOutput(incompleteWithoutErrorsRoot);
assert.equal(incompleteWithoutErrors.ok, false);
assert.match(incompleteWithoutErrors.errors.join("\n"), /requires errors\.md/i);

const errorsWithCompleteRoot = await createCompleteFixture();
await writeFile(path.join(errorsWithCompleteRoot, "errors.md"), "# Recording Errors\n\nBlocked.\n");
const errorsWithComplete = await verifyOutput(errorsWithCompleteRoot);
assert.equal(errorsWithComplete.ok, false);
assert.match(errorsWithComplete.errors.join("\n"), /mark.*incomplete/i);

const shortDurationRoot = await createCompleteFixture();
const shortDurationSummary = await readFile(path.join(shortDurationRoot, "summary.md"), "utf8");
await writeFile(
  path.join(shortDurationRoot, "summary.md"),
  shortDurationSummary.replace("Duration Milliseconds:\n12600", "Duration Milliseconds:\n10000"),
);
const shortDuration = await verifyOutput(shortDurationRoot);
assert.equal(shortDuration.ok, false);
assert.match(shortDuration.errors.join("\n"), /timeline exceeds.*duration/i);

const cliRoot = await mkdtemp(path.join(tmpdir(), "web-demo-recorder-cli-"));
const cliOutput = path.join(cliRoot, "output");
await mkdir(path.join(cliOutput, "screenshots"), { recursive: true });
await mkdir(path.join(cliOutput, "video"), { recursive: true });
await writeFile(path.join(cliOutput, "video", "demo.webm"), "video");
await writeFile(path.join(cliOutput, "demo.spec.ts"), "import { test } from '@playwright/test';\n");
for (const step of manifest.steps) {
  await writeFile(path.join(cliOutput, step.screenshot), "png");
}
const cliManifest = path.join(cliRoot, "manifest.json");
await writeFile(cliManifest, `${JSON.stringify(manifest, null, 2)}\n`);

const buildCli = spawnSync(
  process.execPath,
  [path.resolve(".codex/skills/web-demo-recorder/scripts/build-artifacts.mjs"), cliManifest, cliOutput],
  { encoding: "utf8" },
);
assert.equal(buildCli.status, 0, buildCli.stderr);
assert.match(buildCli.stdout, /Generated 5 synchronized artifacts/);

const verifyCli = spawnSync(
  process.execPath,
  [path.resolve(".codex/skills/web-demo-recorder/scripts/verify-output.mjs"), cliOutput],
  { encoding: "utf8" },
);
assert.equal(verifyCli.status, 0, verifyCli.stderr);
assert.match(verifyCli.stdout, /Verified 2 synchronized recording steps/);

const invalidCliManifest = clone(manifest);
invalidCliManifest.steps[1].startMs = 4000;
const invalidCliManifestPath = path.join(cliRoot, "invalid-manifest.json");
await writeFile(invalidCliManifestPath, `${JSON.stringify(invalidCliManifest, null, 2)}\n`);
const invalidBuildCli = spawnSync(
  process.execPath,
  [path.resolve(".codex/skills/web-demo-recorder/scripts/build-artifacts.mjs"), invalidCliManifestPath, cliOutput],
  { encoding: "utf8" },
);
assert.notEqual(invalidBuildCli.status, 0);
assert.match(invalidBuildCli.stderr, /overlap/i);

await rm(root, { recursive: true, force: true });
await rm(brokenSrtRoot, { recursive: true, force: true });
await rm(driftedSrtRoot, { recursive: true, force: true });
await rm(driftedActionsRoot, { recursive: true, force: true });
await rm(driftedCapcutRoot, { recursive: true, force: true });
await rm(structuredTextRoot, { recursive: true, force: true });
await rm(missingVideoRoot, { recursive: true, force: true });
await rm(missingScreenshotRoot, { recursive: true, force: true });
await rm(erroredRoot, { recursive: true, force: true });
await rm(incompleteWithoutErrorsRoot, { recursive: true, force: true });
await rm(errorsWithCompleteRoot, { recursive: true, force: true });
await rm(shortDurationRoot, { recursive: true, force: true });
await rm(cliRoot, { recursive: true, force: true });
console.log("artifact generator tests passed");
