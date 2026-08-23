const path = require("node:path");
const sharp = require("sharp");

const workspace = "E:/Github/NexaForge";
const auditDir = path.join(workspace, "artifacts/product-audit-2026-08-23");
const qaDir = path.join(workspace, "artifacts/design-qa-2026-08-23");

const comparisons = [
  {
    output: "comparison-home-desktop.png",
    before: path.join(auditDir, "01-home-desktop.png"),
    after: path.join(qaDir, "implementation-home-desktop.png"),
    context: "Home · desktop",
    panelWidth: 680,
  },
  {
    output: "comparison-home-mobile.png",
    before: path.join(auditDir, "05-home-mobile.png"),
    after: path.join(qaDir, "implementation-home-mobile-v2.png"),
    context: "Home · mobile",
    panelWidth: 390,
  },
  {
    output: "comparison-json-mobile.png",
    before: path.join(auditDir, "06-json-formatter-mobile.png"),
    after: path.join(qaDir, "implementation-json-mobile-final.png"),
    context: "JSON formatter · mobile",
    panelWidth: 390,
  },
];

function labelSvg(width, primary, context) {
  const safePrimary = primary.replaceAll("&", "&amp;");
  const safeContext = context.replaceAll("&", "&amp;");
  return Buffer.from(`
    <svg width="${width}" height="62" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="18" y="31" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="#10213b">${safePrimary}</text>
      <text x="18" y="50" font-family="Arial, sans-serif" font-size="13" fill="#61708a">${safeContext}</text>
    </svg>
  `);
}

async function buildPanel(file, width, primary, context) {
  const image = await sharp(file).resize({ width }).png().toBuffer();
  const { height } = await sharp(image).metadata();

  return sharp({
    create: {
      width,
      height: height + 62,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([
      { input: labelSvg(width, primary, context), top: 0, left: 0 },
      { input: image, top: 62, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function createComparison(config) {
  const before = await buildPanel(
    config.before,
    config.panelWidth,
    "Before",
    config.context,
  );
  const after = await buildPanel(
    config.after,
    config.panelWidth,
    "After",
    config.context,
  );
  const beforeMeta = await sharp(before).metadata();
  const afterMeta = await sharp(after).metadata();
  const gap = 20;
  const padding = 20;
  const outputWidth = config.panelWidth * 2 + gap + padding * 2;
  const outputHeight = Math.max(beforeMeta.height, afterMeta.height) + padding * 2;

  await sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: "#e9eef8",
    },
  })
    .composite([
      { input: before, top: padding, left: padding },
      { input: after, top: padding, left: padding + config.panelWidth + gap },
    ])
    .png()
    .toFile(path.join(qaDir, config.output));
}

Promise.all(comparisons.map(createComparison)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
