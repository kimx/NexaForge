// Optional browser acceptance checks. Set PLAYWRIGHT_MODULE_PATH if needed.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:5175";
const out = resolve(process.env.AUDIT_OUTPUT || "artifacts/issue-124");
await mkdir(out, { recursive: true });
const source = await PDFDocument.create();
for (let page = 1; page <= 39; page++) {
  const height = page === 39 ? 2400 : 800;
  const pdfPage = source.addPage(page === 10 ? [800, 600] : [600, height]);
  pdfPage.drawText(`Source page ${page} - TOP`, { x: 30, y: pdfPage.getHeight() - 50, size: 24 });
  pdfPage.drawText(`Source page ${page} - BOTTOM`, { x: 30, y: 30, size: 24 });
}
const input = resolve(out, "source.pdf");
await writeFile(input, await source.save());
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: 2, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/en/pdf/delete-pages`);
    await page.locator('input[type="file"]').setInputFiles(input);
    const preview = page.locator(".pdf-page-preview__canvas");
    const waitPreview = async (number) => {
      await page.getByRole("img", { name: `Page ${number} / 39`, exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: new RegExp(`^Page ${number}(,|$)`) }).getAttribute("aria-pressed"), "true");
      assert.equal(await preview.locator("canvas").count(), 1);
    };
    await waitPreview(1);
    const thumbnailBox = await page.getByRole("button", { name: "Page 1", exact: true }).boundingBox();
    assert.ok(thumbnailBox.height >= 172, "Scrollable grid preserves readable thumbnail card heights");
    for (const number of [2, 10, 39]) {
      await page.getByRole("button", { name: `Page ${number}`, exact: true }).click();
    }
    await waitPreview(39);
    await page.getByRole("button", { name: "Page 1", exact: true }).focus();
    await page.keyboard.press("Enter");
    await waitPreview(1);
    const canvasSize = await preview.locator("canvas").evaluate((canvas) => ({ pixels: canvas.width, width: canvas.getBoundingClientRect().width }));
    assert.ok(canvasSize.pixels >= canvasSize.width * 1.9, "HiDPI preview is sharp");
    const checkbox = page.getByRole("checkbox", { name: "Select page 2 for deletion", exact: true });
    await checkbox.check();
    for (const number of [2, 10, 39]) {
      await page.getByRole("button", { name: `Page ${number}`, exact: true }).click();
      await waitPreview(number);
      assert.equal(await checkbox.isChecked(), true);
      assert.equal(await page.getByText("0 page(s) marked for deletion", { exact: true }).count(), 1);
    }
    const scroll = page.locator(".pdf-page-preview__scroll");
    const longPage = await scroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return { scrollHeight: element.scrollHeight, height: element.clientHeight, scrollTop: element.scrollTop };
    });
    assert.ok(longPage.scrollHeight > longPage.height && longPage.scrollTop > 0, "Long page can be scrolled to the bottom");
    await page.getByRole("button", { name: "Delete selected", exact: true }).click();
    await page.getByRole("button", { name: "Page 2, Marked for deletion", exact: true }).click();
    await waitPreview(2);
    assert.equal(await page.getByText("1 page(s) marked for deletion", { exact: true }).count(), 1);
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    assert.equal(await page.getByText("0 page(s) marked for deletion", { exact: true }).count(), 1);
    await checkbox.check();
    await page.getByRole("button", { name: "Delete selected", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    const download = await downloadPromise;
    const exported = await PDFDocument.load(await readFile(await download.path()));
    assert.equal(exported.getPageCount(), 38);
    assert.equal(exported.getPage(8).getWidth(), 800, "Original page 10 retains its order and dimensions");
    await page.getByRole("button", { name: "Page 39", exact: true }).click();
    await waitPreview(39);
    await page.getByText(/PDF created \(/).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No horizontal viewport overflow");
    await page.locator(".tool-page__workbench").screenshot({ path: resolve(out, `${mobile ? "mobile" : "desktop"}.png`) });
    await page.locator(".tool-page__panel--workspace").screenshot({ path: resolve(out, `${mobile ? "mobile" : "desktop"}-preview.png`) });
    await page.locator('input[type="file"]').setInputFiles(input);
    await waitPreview(1);
    assert.equal(await page.getByText("0 page(s) marked for deletion", { exact: true }).count(), 1);
    assert.deepEqual(errors, []);
    results.push({ mobile, pages: 39, exportedPages: 38, canvasSize, longPage, errors });
    await context.close();
  }
  await writeFile(resolve(out, "results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
