---
name: web-demo-recorder
description: Use when a user wants an actual website workflow explored and recorded with Playwright as a clean demo video, synchronized action timeline, screenshots, replay script, narration, or subtitles.
---

# Web Demo Recorder

## Core principle

Produce an understandable demonstration, not a test-run screen capture. Discover first, then record one uninterrupted successful take whose video, actions, screenshots, narration, and subtitles share one measured timeline. The user supplies intent; never ask them to author Playwright code.

## Before browser work

Extract the URL, feature goal, desired actions, duration, language, assets, authentication, and consequential operations. Infer harmless omissions; never infer permission for credentials, purchases, publishing, destructive actions, or security bypasses.

Read [recording-workflow.md](references/recording-workflow.md) before opening the site. Read [output-contract.md](references/output-contract.md) before formal recording or artifact generation.

## Required sequence

1. **Analyze** — confirm Playwright/Chromium availability, inspect `assets/`, open the URL, inventory relevant controls, and prefer accessible locators.
2. **Plan** — write numbered steps with one visible purpose and expected result each. Target 30–60 seconds when no duration is supplied.
3. **Dry run when uncertain** — resolve routes, locators, uploads, drag gestures, state changes, and downloads outside the formal recording.
4. **Reset** — use a new context and known initial state.
5. **Record** — use Chromium, 1440×900, `recordVideo`, condition-based waits, and readable 500–1200 ms presentation pauses.
6. **Replay when safe** — rerun `demo.spec.ts` in non-recording replay mode unless it would repeat a consequential action. Replay must not overwrite delivered video, screenshots, or manifest.
7. **Build** — retain only observed formal-run events in the manifest, save `demo.webm` after context closure, then generate text artifacts with `scripts/build-artifacts.mjs`.
8. **Verify** — run `scripts/verify-output.mjs`; report completion only when it passes.

If any wrong click, timeout, selector repair, debug action, or visible failure occurs during formal recording, discard that entire take. Reinspect in a non-recorded context and record again from the beginning. Time pressure is not a reason to deliver dirty footage or hide an interval from the timeline.

## Completion contract

The output directory contains `video/demo.webm`, step screenshots, `demo.spec.ts`, `action-timeline.json`, `actions.md`, `capcut-script.md`, `subtitles.srt`, and `summary.md`. Use `errors.md` only for an unresolved failure and mark the summary incomplete. Never fabricate a result, successful download, screenshot, or timestamp.

| Need | Source of truth |
|---|---|
| Timing | Monotonic millisecond offsets from the retained take |
| Replay | Locators verified during discovery |
| Narration/subtitles | What the retained video visibly shows |
| Success | Observed result plus output verifier |

## Common corrections

| Failure | Correction |
|---|---|
| Locator fails in the take | Discard, reinspect outside recording, restart |
| Video filename is unknown | Close context, then use the `Video` handle to save it |
| Fixed sleeps hide state problems | Wait for the visible result; pause afterward only for presentation |
| Timelines drift across files | Generate every text artifact from one manifest |
| No suitable upload fixture | Create the smallest synthetic, non-sensitive asset |

## Example invocation

`使用 $web-demo-recorder，開啟指定圖片裁切網站，上傳測試圖片、調整範圍、旋轉、裁切並下載，製作 30～60 秒示範與 CapCut 旁白字幕。`
