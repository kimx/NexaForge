import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_FILES = [
  "video/demo.webm",
  "demo.spec.ts",
  "action-timeline.json",
  "actions.md",
  "capcut-script.md",
  "subtitles.srt",
  "summary.md",
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

function parseTimelineTime(value) {
  const match = /^(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})$/.exec(value);
  if (!match) return null;
  const [, hours = "0", minutes, seconds, milliseconds] = match;
  if (Number(minutes) > 59 || Number(seconds) > 59) return null;
  return (
    Number(hours) * 3_600_000 +
    Number(minutes) * 60_000 +
    Number(seconds) * 1_000 +
    Number(milliseconds)
  );
}

function parseSrtTime(value) {
  const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(value);
  if (!match) return null;
  const [, hours, minutes, seconds, milliseconds] = match;
  if (Number(minutes) > 59 || Number(seconds) > 59) return null;
  return (
    Number(hours) * 3_600_000 +
    Number(minutes) * 60_000 +
    Number(seconds) * 1_000 +
    Number(milliseconds)
  );
}

function countMatches(value, expression) {
  return [...value.matchAll(expression)].length;
}

function validateSrt(source, expectedCount, errors) {
  const normalized = source.replace(/\r\n?/g, "\n").trim();
  const blocks = normalized ? normalized.split(/\n{2,}/) : [];
  if (blocks.length !== expectedCount) {
    errors.push(
      `SRT subtitle cue count ${blocks.length} does not match timeline step count ${expectedCount}`,
    );
  }
  let previousEnd = 0;
  const ranges = [];
  blocks.forEach((block, index) => {
    const lines = block.split("\n");
    if (lines[0] !== String(index + 1)) {
      errors.push(`SRT subtitle cue ${index + 1} is not numbered contiguously`);
    }
    const timing = /^(\S+) --> (\S+)$/.exec(lines[1] ?? "");
    const start = timing ? parseSrtTime(timing[1]) : null;
    const end = timing ? parseSrtTime(timing[2]) : null;
    if (start === null || end === null || end <= start) {
      errors.push(`SRT subtitle cue ${index + 1} has an invalid time range`);
    } else if (start < previousEnd) {
      errors.push(`SRT subtitle cue ${index + 1} overlaps the previous cue`);
    }
    ranges.push({ start, end });
    if (end !== null) previousEnd = end;
    if (!lines.slice(2).join("\n").trim()) {
      errors.push(`SRT subtitle cue ${index + 1} has no text`);
    }
  });
  return ranges;
}

function parseMarkdownRanges(source, expression) {
  return [...source.matchAll(expression)].map((match) => ({
    start: parseTimelineTime(match[1]),
    end: parseTimelineTime(match[2]),
  }));
}

function compareRanges(label, actual, expected, errors) {
  if (actual.length !== expected.length) return;
  actual.forEach((range, index) => {
    if (
      range.start === null ||
      range.end === null ||
      range.start !== expected[index].start ||
      range.end !== expected[index].end
    ) {
      errors.push(`${label} step ${index + 1} time range does not match timeline`);
    }
  });
}

async function validateTimeline(outputDir, source, errors) {
  let timeline;
  try {
    timeline = JSON.parse(source);
  } catch {
    errors.push("action-timeline.json is not valid JSON");
    return [];
  }
  if (!Array.isArray(timeline) || timeline.length === 0) {
    errors.push("action-timeline.json must contain a non-empty array");
    return [];
  }

  let previousEnd = 0;
  for (const [index, item] of timeline.entries()) {
    if (item.step !== index + 1) {
      errors.push(`Timeline step ${index + 1} is not contiguous`);
    }
    const start = parseTimelineTime(item.start);
    const end = parseTimelineTime(item.end);
    if (start === null || end === null || end <= start) {
      errors.push(`Timeline step ${index + 1} has an invalid time range`);
    } else if (start < previousEnd) {
      errors.push(`Timeline step ${index + 1} overlaps the previous step`);
    }
    if (end !== null) previousEnd = end;
    if (typeof item.screenshot !== "string" || !item.screenshot.trim()) {
      errors.push(`Timeline step ${index + 1} has no screenshot`);
    } else {
      const screenshotPath = path.resolve(outputDir, item.screenshot);
      const relative = path.relative(path.resolve(outputDir), screenshotPath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        errors.push(`Timeline step ${index + 1} screenshot escapes output directory`);
      } else if (!(await exists(screenshotPath))) {
        errors.push(`Timeline step ${index + 1} screenshot is missing: ${item.screenshot}`);
      } else if ((await stat(screenshotPath)).size === 0) {
        errors.push(`Timeline step ${index + 1} screenshot is empty: ${item.screenshot}`);
      }
    }
  }
  return timeline;
}

export async function verifyOutput(outputDir) {
  const errors = [];
  const warnings = [];
  const contents = new Map();

  for (const relativePath of REQUIRED_FILES) {
    const absolutePath = path.join(outputDir, relativePath);
    try {
      const bytes = await readFile(absolutePath);
      if (bytes.length === 0) errors.push(`${relativePath} is empty`);
      contents.set(relativePath, bytes);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        errors.push(`${relativePath} is missing`);
      } else {
        errors.push(`${relativePath} could not be read: ${error.message}`);
      }
    }
  }

  let timeline = [];
  if (contents.has("action-timeline.json")) {
    timeline = await validateTimeline(
      outputDir,
      contents.get("action-timeline.json").toString("utf8"),
      errors,
    );
  }

  const expectedCount = timeline.length;
  const actions = contents.get("actions.md")?.toString("utf8") ?? "";
  const capcut = contents.get("capcut-script.md")?.toString("utf8") ?? "";
  const subtitles = contents.get("subtitles.srt")?.toString("utf8") ?? "";
  const summary = contents.get("summary.md")?.toString("utf8") ?? "";

  if (expectedCount > 0) {
    const timelineRanges = timeline.map((item) => ({
      start: parseTimelineTime(item.start),
      end: parseTimelineTime(item.end),
    }));
    const actionCount = countMatches(actions, /^## Step \d+ - /gm);
    const capcutCount = countMatches(capcut, /^## (?!Generated Assets|Demo Flow)/gm);
    if (actionCount !== expectedCount) {
      errors.push(`actions.md step count ${actionCount} does not match timeline step count ${expectedCount}`);
    }
    if (capcutCount !== expectedCount) {
      errors.push(`capcut-script.md section count ${capcutCount} does not match timeline step count ${expectedCount}`);
    }
    const actionRanges = parseMarkdownRanges(actions, /^Time: (\S+) - (\S+)$/gm);
    const capcutRanges = parseMarkdownRanges(capcut, /^## (\S+) - (\S+)$/gm);
    const srtRanges = validateSrt(subtitles, expectedCount, errors);
    compareRanges("actions.md", actionRanges, timelineRanges, errors);
    compareRanges("CapCut", capcutRanges, timelineRanges, errors);
    compareRanges("SRT", srtRanges, timelineRanges, errors);
    const summaryCount = /Steps:\s*\n(\d+)/i.exec(summary);
    if (!summaryCount || Number(summaryCount[1]) !== expectedCount) {
      errors.push("summary.md step count does not match the timeline");
    }
    const durationMatch = /Duration Milliseconds:\s*\n(\d+)/i.exec(summary);
    if (!durationMatch) {
      errors.push("summary.md must include exact duration milliseconds");
    } else {
      const durationMs = Number(durationMatch[1]);
      const lastEnd = timelineRanges.at(-1)?.end;
      if (lastEnd === null || lastEnd > durationMs) {
        errors.push("timeline exceeds summary duration milliseconds");
      }
    }
  }

  if (!/Video:\s*\nvideo\/demo\.webm/i.test(summary)) {
    errors.push("summary.md must name video/demo.webm");
  }
  if (!/Replay Script:\s*\ndemo\.spec\.ts/i.test(summary)) {
    errors.push("summary.md must name demo.spec.ts");
  }

  const hasErrorsDocument = await exists(path.join(outputDir, "errors.md"));
  const statusMatch = /Status:\s*\n([^\r\n]+)/i.exec(summary);
  const status = statusMatch?.[1].trim();
  if (status !== "complete" && status !== "incomplete") {
    errors.push("summary.md status must be exactly complete or incomplete");
  }
  if (hasErrorsDocument) {
    warnings.push("errors.md is present; recording is incomplete");
    if (status !== "incomplete") {
      errors.push("summary.md must mark an errored run incomplete");
    }
  } else if (status === "incomplete") {
    errors.push("an incomplete summary requires errors.md");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stepCount: expectedCount,
  };
}

async function runCli() {
  const [outputDir] = process.argv.slice(2);
  if (!outputDir || process.argv.length !== 3) {
    throw new Error("Usage: node verify-output.mjs <output-dir>");
  }
  const result = await verifyOutput(outputDir);
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (!result.ok) {
    for (const error of result.errors) console.error(`Error: ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Verified ${result.stepCount} synchronized recording steps in ${outputDir}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
