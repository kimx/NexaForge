import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_RUN_FIELDS = [
  "url",
  "title",
  "video",
  "replayScript",
  "status",
];
const REQUIRED_STEP_FIELDS = [
  "action",
  "target",
  "description",
  "result",
  "screen",
  "narration",
  "subtitle",
  "screenshot",
  "url",
];

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

function text(value) {
  return String(value).trim().replace(/\s+/gu, " ");
}

function summaryDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`
    : `${pad(minutes, 2)}:${pad(seconds, 2)}`;
}

export function formatTimeline(ms) {
  const time = splitTime(ms);
  const hourPrefix = time.hours > 0 ? `${pad(time.hours, 2)}:` : "";
  return `${hourPrefix}${pad(time.minutes, 2)}:${pad(time.seconds, 2)}.${pad(time.milliseconds, 3)}`;
}

export function formatSrt(ms) {
  const time = splitTime(ms);
  return `${pad(time.hours, 2)}:${pad(time.minutes, 2)}:${pad(time.seconds, 2)},${pad(time.milliseconds, 3)}`;
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["Manifest must be an object"];
  }
  if (manifest.version !== 1) errors.push("Manifest version must be 1");
  for (const field of REQUIRED_RUN_FIELDS) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      errors.push(`Missing ${field}`);
    }
  }
  if (!new Set(["complete", "incomplete"]).has(manifest.status)) {
    errors.push("Status must be exactly complete or incomplete");
  }
  if (!Number.isInteger(manifest.durationMs) || manifest.durationMs <= 0) {
    errors.push("Invalid durationMs");
  }
  if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
    return [...errors, "Steps must be non-empty"];
  }

  let previousEnd = 0;
  manifest.steps.forEach((step, index) => {
    const label = `Step ${index + 1}`;
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (step.step !== index + 1) errors.push(`${label} is not contiguous`);
    if (
      !Number.isInteger(step.startMs) ||
      !Number.isInteger(step.endMs) ||
      step.startMs < 0 ||
      step.endMs <= step.startMs
    ) {
      errors.push(`${label} has an invalid time range`);
    }
    if (Number.isInteger(step.startMs) && step.startMs < previousEnd) {
      errors.push(`${label} overlaps the previous step`);
    }
    if (
      Number.isInteger(step.endMs) &&
      Number.isInteger(manifest.durationMs) &&
      step.endMs > manifest.durationMs
    ) {
      errors.push(`${label} exceeds durationMs`);
    }
    for (const field of REQUIRED_STEP_FIELDS) {
      if (typeof step[field] !== "string" || !step[field].trim()) {
        errors.push(`${label} is missing ${field}`);
      }
    }
    if (step.file !== undefined && typeof step.file !== "string") {
      errors.push(`${label} file must be a string when provided`);
    }
    if (Number.isInteger(step.endMs)) previousEnd = step.endMs;
  });
  return errors;
}

function renderTimeline(manifest) {
  return `${JSON.stringify(
    manifest.steps.map((step) => ({
      step: step.step,
      start: formatTimeline(step.startMs),
      end: formatTimeline(step.endMs),
      action: text(step.action),
      target: text(step.target),
      description: text(step.description),
      result: text(step.result),
      url: text(step.url),
      screenshot: text(step.screenshot),
    })),
    null,
    2,
  )}\n`;
}

function renderActions(manifest) {
  const sections = manifest.steps.map((step) => {
    const file = step.file ? `\n\nFile:\n${text(step.file)}` : "";
    return `## Step ${step.step} - ${text(step.description)}
Time: ${formatTimeline(step.startMs)} - ${formatTimeline(step.endMs)}

Action:
${text(step.action)}

Target:
${text(step.target)}${file}

Purpose:
${text(step.description)}

Result:
${text(step.result)}

Screenshot:
${text(step.screenshot)}`;
  });
  return `# Recording Actions\n\n${sections.join("\n\n---\n\n")}\n`;
}

function renderCapcut(manifest) {
  const sections = manifest.steps.map(
    (step) => `## ${formatTimeline(step.startMs)} - ${formatTimeline(step.endMs)}
畫面：
${text(step.screen)}

旁白：
${text(step.narration)}

字幕：
${text(step.subtitle)}`,
  );
  return `# Video Script\n\n${sections.join("\n\n---\n\n")}\n`;
}

function renderSrt(manifest) {
  return `${manifest.steps
    .map(
      (step, index) =>
        `${index + 1}\r\n${formatSrt(step.startMs)} --> ${formatSrt(step.endMs)}\r\n${text(step.subtitle)}`,
    )
    .join("\r\n\r\n")}\r\n`;
}

function renderSummary(manifest) {
  const flow = manifest.steps
    .map((step) => `${step.step}. ${text(step.description)}`)
    .join("\n");
  return `# Demo Recording Summary

URL:
${text(manifest.url)}

Video:
${text(manifest.video)}

Replay Script:
${text(manifest.replayScript)}

Duration:
${summaryDuration(manifest.durationMs)}

Duration Milliseconds:
${manifest.durationMs}

Steps:
${manifest.steps.length}

Status:
${text(manifest.status)}

## Demo Flow

${flow}

## Generated Assets

- Video
- Playwright Script
- Action Timeline
- Screenshots
- Recording Actions
- CapCut Script
- SRT Subtitle
- Summary
`;
}

export function renderArtifacts(manifest) {
  return {
    "action-timeline.json": renderTimeline(manifest),
    "actions.md": renderActions(manifest),
    "capcut-script.md": renderCapcut(manifest),
    "subtitles.srt": renderSrt(manifest),
    "summary.md": renderSummary(manifest),
  };
}

export async function buildArtifacts(manifest, outputDir) {
  const errors = validateManifest(manifest);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  await mkdir(outputDir, { recursive: true });
  const artifacts = renderArtifacts(manifest);
  await Promise.all(
    Object.entries(artifacts).map(([name, content]) =>
      writeFile(path.join(outputDir, name), content, "utf8"),
    ),
  );
  return Object.keys(artifacts);
}

async function runCli() {
  const [manifestPath, outputDir] = process.argv.slice(2);
  if (!manifestPath || !outputDir || process.argv.length !== 4) {
    throw new Error(
      "Usage: node build-artifacts.mjs <manifest.json> <output-dir>",
    );
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = await buildArtifacts(manifest, outputDir);
  console.log(`Generated ${files.length} synchronized artifacts in ${outputDir}`);
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
