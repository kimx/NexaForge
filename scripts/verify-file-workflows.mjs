// Optional browser acceptance checks. Install Playwright or set PLAYWRIGHT_MODULE_PATH.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument, decodePDFRawStream } from "pdf-lib";
import { unzipSync } from "fflate";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:5175";
const out = resolve(process.env.AUDIT_OUTPUT || ".codex/file-workflows-qa-2026-10-02");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
let activePage;
const copies = {
  en: { next: "Continue to next step", resize: "Resize images", text: "Watermark text", watermark: "Apply watermark", zip: "Create ZIP", downloadZip: "Download ZIP", merge: "Merge PDFs", number: "Add page numbers", start: "Starting page number", compress: "Compress PDF", downloadPdf: "Download PDF", scan: "Correct document", language: "Recognition language", recognize: "Recognize text", clean: "Clean text", recognized: "Recognized text (editable)", cleaned: "Cleaned text", downloadText: "Download text", cancel: "Cancel processing", blank: "Remove empty lines", reset: "Start over" },
  zh: { next: "繼續下一步", resize: "縮放圖片", text: "浮水印文字", watermark: "加入浮水印", zip: "產生 ZIP", downloadZip: "下載 ZIP", merge: "合併 PDF", number: "加入頁碼", start: "起始頁碼", compress: "壓縮 PDF", downloadPdf: "下載 PDF", scan: "校正文件", language: "辨識語言", recognize: "辨識文字", clean: "清理文字", recognized: "辨識結果（可編輯）", cleaned: "清理後文字", downloadText: "下載文字", cancel: "取消處理", blank: "移除空白行", reset: "重新開始" },
};
const pdfs = [];
for (let index = 0; index < 2; index++) {
  const doc = await PDFDocument.create();
  doc.addPage([420 + index * 100, 600]).drawText(`Document ${index + 1}`, { x: 40, y: 500, size: 24 });
  const path = resolve(out, `part-${index + 1}.pdf`); await writeFile(path, await doc.save()); pdfs.push(path);
}
try {
  for (const [locale, mobile] of [["en", false], ["zh", true]]) {
    const c = copies[locale]; const prefix = locale === "en" ? "/en" : "";
    const name = `${locale}-${mobile ? "mobile" : "desktop"}`;
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(20000);
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    const goto = async path => { await page.goto(`${base}${prefix}${path}`); await page.locator("article.file-workflow h1").waitFor(); };
    const click = label => page.getByRole("button", { name: label, exact: true }).click();
    const next = async () => {
      const button = page.getByRole("button", { name: c.next, exact: true });
      await button.click();
      assert.equal(await page.locator(".file-workflow__panel h2").first().evaluate(element => element === document.activeElement), true, "Focus moves to the new step");
    };
    const screenshot = async suffix => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No horizontal page overflow");
      await page.screenshot({ path: resolve(out, `${name}-${suffix}.png`), fullPage: true });
    };
    const download = async (label, filename) => {
      const pending = page.waitForEvent("download"); await click(label);
      const result = await pending; const path = resolve(out, `${name}-${filename}`); await result.saveAs(path); assert.equal(await result.failure(), null); return path;
    };

    await goto("/workflows/image-delivery");
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 500;
      const context = canvas.getContext("2d"); context.fillStyle = "#fff"; context.fillRect(0, 0, 900, 500);
      context.fillStyle = "#172b46"; context.font = "44px sans-serif";
      context.fillText("NEXAFORGE DOCUMENT", 40, 150); context.fillText("Hello workflow 123", 40, 250);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const image = { name: "photo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
    await page.locator("input[type=file]").setInputFiles([image, image]); await click(c.resize); await next();
    await page.getByLabel(c.text, { exact: true }).fill("NexaForge"); await click(c.watermark); await next();
    await click(c.zip); await next();
    const archive = unzipSync(await readFile(await download(c.downloadZip, "images.zip")));
    assert.deepEqual(Object.keys(archive), ["photo-watermarked.jpg", "photo-watermarked-2.jpg"]);
    assert.ok(Object.values(archive).every(bytes => bytes[0] === 255 && bytes[1] === 216));
    await screenshot("images");
    await page.getByRole("button", { name: locale === "en" ? "2. Watermark" : "2. 浮水印", exact: true }).click();
    await page.getByLabel(c.text, { exact: true }).fill("Updated");
    assert.equal(await page.getByRole("button", { name: c.next, exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: locale === "en" ? "4. Download" : "4. 下載", exact: true }).isDisabled(), true);
    console.log(`${name}: image flow and invalidation passed`);

    await goto("/workflows/pdf-delivery");
    await page.locator("input[type=file]").setInputFiles(pdfs);
    await page.getByRole("button", { name: `${locale === "en" ? "Move up" : "上移"}: part-2.pdf`, exact: true }).click();
    await click(c.merge); await next(); await page.getByLabel(c.start, { exact: true }).fill("7"); await click(c.number); await next(); await click(c.compress); await next();
    const pdf = await PDFDocument.load(await readFile(await download(c.downloadPdf, "delivery.pdf")));
    assert.deepEqual(pdf.getPages().map(page => page.getWidth()), [520, 420]);
    const contents = pdf.getPages().map(page => page.node.Contents().asArray().map(ref => new TextDecoder().decode(decodePDFRawStream(pdf.context.lookup(ref)).decode())).join(""));
    assert.ok(contents[0].includes("<37202F2032>")); assert.ok(contents[1].includes("<38202F2032>"));
    await page.locator("canvas[role=img]").waitFor({ state: "visible" }); await screenshot("pdf");
    await click(c.reset); await page.locator("input[type=file]").setInputFiles({ name: "broken.pdf", mimeType: "application/pdf", buffer: Buffer.from("broken") });
    await click(c.merge); await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("button", { name: c.next, exact: true }).isDisabled(), true);
    await page.locator("input[type=file]").setInputFiles(pdfs); await click(c.merge); await next();
    console.log(`${name}: PDF flow, actual page contents, error and recovery passed`);

    await goto("/workflows/document-text");
    await page.locator("input[type=file]").first().setInputFiles(image);
    await click(c.scan); console.log(`${name}: scan started`);
    await next(); console.log(`${name}: scan completed`);
    await screenshot("scan-to-ocr");
    await page.getByLabel(c.language, { exact: true }).selectOption("eng");
    await click(c.recognize); await click(c.cancel);
    assert.equal(await page.getByRole("button", { name: c.next, exact: true }).isDisabled(), true);
    await click(c.recognize);
    await page.getByRole("button", { name: c.next, exact: true }).click({ timeout: 120000 });
    const draft = page.getByLabel(c.recognized, { exact: true });
    const recognized = await draft.inputValue(); assert.match(recognized, /workflow/i);
    await draft.fill("  繁體  中文\n\n"); await page.getByLabel(c.blank, { exact: true }).check();
    await click(c.clean); await next();
    assert.equal(await readFile(await download(c.downloadText, "text.txt"), "utf8"), "繁體 中文");
    await screenshot("ocr"); await page.reload();
    assert.equal(await page.getByRole("button", { name: c.scan, exact: true }).isDisabled(), true);
    assert.equal(errors.length, 0, errors.join("\n"));
    results.push({ name, images: Object.keys(archive), pdfPages: pdf.getPageCount(), recognized: recognized.trim(), downloadedText: "繁體 中文", overflow: false, pageErrors: errors });
    console.log(`${name}: real OCR, cancel/retry, corrected UTF-8 download and refresh reset passed`);
    await context.close();
  }
  await writeFile(resolve(out, "results.json"), JSON.stringify(results, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await writeFile(resolve(out, "failure.txt"), await activePage.locator("body").innerText()).catch(() => {});
    await activePage.screenshot({ path: resolve(out, "failure.png"), fullPage: true }).catch(() => {});
  }
  throw error;
} finally { await browser.close(); }
