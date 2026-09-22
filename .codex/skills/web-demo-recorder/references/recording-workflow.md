# Recording Workflow

## Preflight

1. Resolve the requested output directory, defaulting to `output/` in the active workspace.
2. Check for the project-preferred Playwright installation and Chromium executable without changing the application manifest. A useful check is `node -e "import('playwright').then(() => console.log('playwright ok'))"` followed by the installed Playwright CLI's Chromium check.
3. If Playwright or Chromium is unavailable, report the exact missing prerequisite. Install into a disposable runner directory only when dependency installation is authorized; do not silently add it to the product's `package.json`.
4. Inspect `assets/` for a relevant non-sensitive fixture. When none exists, create the smallest synthetic PNG, PDF, CSV, JSON, or text file needed for the requested flow.
5. Confirm whether authentication, CAPTCHA, payment, publishing, destructive actions, personal data, or downloads outside the requested flow are involved. Keep existing authorization boundaries.

## Analyze the site

Open the URL in a non-recorded context and wait for `domcontentloaded`, then for the relevant visible application state. Inventory headings, landmarks, links, buttons, inputs, labels, tabs, menus, dialogs, file inputs, canvases, and download controls.

Choose locators in this order:

1. `getByRole` with an accessible name;
2. `getByLabel`;
3. `getByText` for unique visible text;
4. `getByPlaceholder`;
5. stable `data-testid`;
6. narrowly scoped CSS only when the page exposes no stable semantic target.

Disambiguate multiple matches with a stable parent region or verified index. Do not use generated class chains, DOM-depth selectors, coordinates for ordinary controls, `force: true`, or JavaScript-triggered clicks as locator substitutes.

For canvas crop handles or other graphical controls, first look for keyboard or numeric alternatives. When a drag is truly required, derive coordinates from the current element bounding box and express the gesture proportionally so the replay remains valid at 1440×900.

## Plan and dry run

Turn the request into numbered steps. Each step has a visible purpose, target, action, expected result, and screenshot name. Exclude searching, consent unrelated to the task, debug clicks, repeated operations, and idle waits.

Run a dry pass whenever any route, locator, upload, gesture, result state, or download behavior is uncertain. Verify:

- every locator is unique and actionable;
- uploads decode and reach the expected preview;
- gestures cause the intended visible change;
- result assertions identify the actual completion state;
- downloads emit a Playwright download event and produce a non-empty file;
- the flow can return to a known initial state.

Dry-run actions never enter the manifest, screenshots, or delivered video.

## Generate the replay script

Create `output/demo.spec.ts` after discovery. Use verified page language and names; adapt this structure rather than copying example locators blindly:

```ts
import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test.use({ browserName: "chromium" });

test("records the requested website demo", async ({ browser }) => {
  const outputDir = path.resolve("output");
  const videoDir = path.join(outputDir, "video");
  const screenshotDir = path.join(outputDir, "screenshots");
  const recordMode = process.env.DEMO_MODE !== "replay";
  await Promise.all([
    mkdir(videoDir, { recursive: true }),
    mkdir(screenshotDir, { recursive: true }),
  ]);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(recordMode
      ? { recordVideo: { dir: path.join(outputDir, ".video-tmp"), size: { width: 1440, height: 900 } } }
      : {}),
  });

  const page = await context.newPage();
  const video = recordMode ? page.video() : null;
  // Video begins when the page is created. Establish the practical timeline
  // origin immediately afterward; the tiny retained opening lead-in is intentional.
  const recordingStart = performance.now();
  const steps: Array<Record<string, unknown>> = [];
  let completed = false;

  const recordStep = async (
    details: Omit<Record<string, unknown>, "step" | "startMs" | "endMs">,
    action: () => Promise<void>,
  ) => {
    const startMs = Math.round(performance.now() - recordingStart);
    await action();
    const endMs = Math.round(performance.now() - recordingStart);
    steps.push({ step: steps.length + 1, startMs, endMs, ...details });
  };

  try {
    await recordStep(
      {
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
      async () => {
        await page.goto("https://example.com/image-crop", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "圖片裁切" })).toBeVisible();
        await page.waitForTimeout(800);
        if (recordMode) {
          await page.screenshot({ path: path.join(screenshotDir, "01-open-tool.png") });
        }
      },
    );

    // Add the remaining discovered steps with the same recordStep contract.
    // Await visible results before the presentation pause and screenshot.

    completed = true;
  } finally {
    const durationMs = Math.round(performance.now() - recordingStart);
    await context.close();
    if (recordMode && completed && video) {
      await video.saveAs(path.join(videoDir, "demo.webm"));
      await writeFile(
        path.join(outputDir, "run-manifest.json"),
        `${JSON.stringify({
          version: 1,
          url: "https://example.com/image-crop",
          title: "圖片裁切示範",
          durationMs,
          video: "video/demo.webm",
          replayScript: "demo.spec.ts",
          status: "complete",
          steps,
        }, null, 2)}\n`,
      );
    } else if (recordMode && video) {
      await video.delete();
    }
  }
});
```

The agent writes all actual steps; the user does not. Add `test.use({ browserName: "chromium" })` at file scope and run exactly one worker so project configuration cannot select another engine or race on output paths. A formal script should fail on a bad locator rather than repair itself inside the take.

## Formal recording

- Use a fresh Chromium context with a fixed 1440×900 viewport and video size.
- Create the recorded page, obtain its `Video` handle, then start one monotonic clock immediately. Treat its zero as the first actionable frame; the very short opening lead-in created with the page remains intentionally outside step ranges.
- Use condition-based waits for readiness and results. Use `waitForTimeout(500..1200)` only after a meaningful visible state is ready, so viewers can understand it.
- Move at teaching pace. Avoid rapid consecutive clicks, long idle intervals, unrelated scrolling, notifications, cursor searching, and debug UI.
- Capture each step screenshot only after its result is visible.
- For a download, start `page.waitForEvent("download")` before clicking, await it, save it inside the run workspace, and verify non-zero size when possible.

Only append a step after its action and expected result succeed. Store integer `startMs` and `endMs`; never hand-maintain parallel formatted timestamps.

## Failed take recovery

If any action, assertion, locator, navigation, upload, gesture, or download fails during formal recording:

1. capture a diagnostic screenshot before closing when possible;
2. record current URL, attempted locator, expected state, and exact error;
3. close the context so the temporary video finalizes, then delete or quarantine that failed take;
4. reinspect the DOM in a separate non-recorded context;
5. update the replay script with a verified stable locator or wait;
6. reset to a known initial state and rerun the entire formal take.

Allow at most two corrected formal retries for the same step. Never keep a take containing the timeout, wrong click, recovery, or hidden interval. If the feature remains unusable, stop and create `errors.md` according to the output contract.

## Finalization and replay

Retain the `Video` handle before closing the context. Close the page/context before calling `video.saveAs()`; saving waits for the encoder to finish. Write the manifest only for the retained successful take.

Replay `demo.spec.ts` once with `DEMO_MODE=replay`, Chromium, and one worker when the action is safely repeatable. For PowerShell, set `$env:DEMO_MODE = "replay"`, run `npx playwright test output/demo.spec.ts --workers=1`, then remove the environment variable. Replay mode must omit `recordVideo` and must not write delivered screenshots, video, or manifest. Skip replay for destructive or consequential external mutations, explain the limitation in `summary.md`, and verify all captured evidence instead. Build text artifacts only after replay succeeds, then verify using the commands in the output contract.
