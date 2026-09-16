import assert from "node:assert/strict";
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
assert.match(summary, /Steps:\n2/);

const verified = await verifyOutput(root);
assert.equal(verified.ok, true, verified.errors.join("\n"));
assert.equal(verified.stepCount, 2);

const brokenSrtRoot = await createCompleteFixture();
await writeFile(path.join(brokenSrtRoot, "subtitles.srt"), "2\ninvalid\n");
const brokenSrt = await verifyOutput(brokenSrtRoot);
assert.equal(brokenSrt.ok, false);
assert.match(brokenSrt.errors.join("\n"), /subtitle|SRT/i);

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

await rm(root, { recursive: true, force: true });
await rm(brokenSrtRoot, { recursive: true, force: true });
await rm(missingVideoRoot, { recursive: true, force: true });
await rm(missingScreenshotRoot, { recursive: true, force: true });
await rm(erroredRoot, { recursive: true, force: true });
console.log("artifact generator tests passed");
