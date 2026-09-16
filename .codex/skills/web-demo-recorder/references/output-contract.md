# Output Contract

## Required tree

```text
output/
├── video/
│   └── demo.webm
├── screenshots/
│   ├── 01-*.png
│   └── ...
├── demo.spec.ts
├── action-timeline.json
├── actions.md
├── capcut-script.md
├── subtitles.srt
├── summary.md
└── errors.md          # unresolved failures only
```

`run-manifest.json` may remain as reproducibility evidence but is not part of the required delivery list.

## Canonical manifest

Use integer milliseconds as the only maintained time representation:

```json
{
  "version": 1,
  "url": "https://example.com/image-crop",
  "title": "圖片裁切示範",
  "durationMs": 12600,
  "video": "video/demo.webm",
  "replayScript": "demo.spec.ts",
  "status": "complete",
  "steps": [
    {
      "step": 1,
      "startMs": 0,
      "endMs": 4200,
      "action": "navigate",
      "target": "圖片裁切工具",
      "description": "開啟圖片裁切工具",
      "result": "工具介面顯示完成",
      "screen": "開啟圖片裁切工具。",
      "narration": "先開啟圖片裁切工具。",
      "subtitle": "開啟圖片裁切工具",
      "screenshot": "screenshots/01-open-tool.png",
      "url": "https://example.com/image-crop"
    }
  ]
}
```

`file` is optional and records an uploaded or downloaded fixture path. Step numbers are one-based and contiguous. Ranges are non-negative, increasing, non-overlapping, and no later than `durationMs`. Every string describes what was actually observed during the retained take.

Status is `complete` only after the requested feature succeeds. Use `incomplete` when `errors.md` exists.

## Generate synchronized files

From the workspace root, resolve the installed Skill directory and run:

```text
node <skill-directory>/scripts/build-artifacts.mjs output/run-manifest.json output
node <skill-directory>/scripts/verify-output.mjs output
```

The builder writes:

- `action-timeline.json`: one array entry per step with formatted start/end, action, target, description, result, URL, and screenshot;
- `actions.md`: detailed action, target, optional file, purpose, result, screenshot, and exact time range;
- `capcut-script.md`: one segment per observed step with `畫面`, short natural `旁白`, and concise `字幕`;
- `subtitles.srt`: sequential UTF-8 cues derived from the same ranges;
- `summary.md`: URL, video, replay script, rounded duration, status, step count, flow, and generated assets.

Narration defaults to Traditional Chinese, uses short AI-voice-friendly sentences, and states only what the footage shows. Avoid hype, technical documentation voice, or features absent from the take.

## Screenshot contract

Name screenshots with a two-digit step prefix and a short action slug, such as `03-adjust-crop.png`. Capture the settled result of the matching step at 1440×900. Every timeline screenshot path must exist, remain inside `output/`, and be non-empty.

## Error document

When the site remains unusable after bounded recovery, create:

```markdown
# Recording Errors

## Step 3 - 旋轉圖片

URL:
https://example.com/image-crop

Locator:
getByRole("button", { name: "向右旋轉" })

Expected:
預覽圖片向右旋轉 90 度。

Error:
按鈕在目前頁面狀態中不可用。

Evidence:
screenshots/error-step-03.png

Attempts:
1. 重新分析可存取名稱。
2. 從乾淨狀態重試已驗證 locator。

Blocker:
網站功能未進入可操作狀態。
```

Do not create `errors.md` for a recovered dry-run issue or discarded take. When it exists, preserve valid artifacts, set manifest and summary status to `incomplete`, and make no success claim for the failed step.

## Verification gate

The output verifier must pass before reporting a complete run. It checks:

- required files are present and non-empty;
- timeline JSON parses and has contiguous ordered steps;
- time ranges are valid and non-overlapping;
- referenced screenshots exist and stay inside the output directory;
- action, CapCut, SRT, summary, and timeline step counts agree;
- SRT numbering and ranges are valid;
- summary names `video/demo.webm` and `demo.spec.ts`;
- `errors.md`, when present, is paired with incomplete status.

Also inspect the video itself, confirm its real duration and visible states, and validate any downloaded result. The structural verifier cannot prove visual correctness.
