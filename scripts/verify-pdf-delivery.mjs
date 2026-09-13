// Optional acceptance audit: requires playwright and @napi-rs/canvas locally.
// Visits the existing deployment; never triggers a deployment or uploads files.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const base = process.env.AUDIT_BASE_URL || 'https://nexaforge.kimx.info';
const out = resolve(process.env.AUDIT_OUTPUT || 'artifacts/issue-88');
await mkdir(out, { recursive: true });
const source = await PDFDocument.create();
const font = await source.embedFont(StandardFonts.Helvetica);
for (const [i, size] of [[600, 400], [400, 700], [800, 500]].entries()) {
  source.addPage(size).drawText(`Source page ${i + 1}`, { x: 36, y: 100, size: 16, font });
}
const sourcePath = resolve(out, 'source.pdf');
await writeFile(sourcePath, await source.save());
const logo = createCanvas(160, 80);
const ctx = logo.getContext('2d');
ctx.fillStyle = '#1256a0'; ctx.fillRect(0, 0, 160, 80);
ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('NEXA', 32, 48);
for (const format of ['png', 'jpeg']) await writeFile(resolve(out, `logo.${format}`), logo.toBuffer(`image/${format}`));

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
    const page = await context.newPage();
    const uploads = [];
    const errors = [];
    page.on('request', req => {
      if (!['POST', 'PUT', 'PATCH'].includes(req.method())) return;
      const body = req.postDataBuffer() ?? Buffer.alloc(0);
      uploads.push({ url: req.url(), bytes: body.length, containsFile: body.includes(Buffer.from('%PDF-')) || body.includes(Buffer.from('AUDIT WATERMARK')) || body.includes(Buffer.from('source.pdf')) || body.includes(Buffer.from('iVBORw0KGgo')) });
    });
    page.on('pageerror', e => errors.push(e.message));
    for (const kind of ['numbers', 'text', 'png', 'jpeg']) {
      const name = `${mobile ? 'mobile' : 'desktop'}-${kind}`;
      await page.goto(`${base}/en/pdf/${kind === 'numbers' ? 'add-page-numbers' : 'watermark'}`, { waitUntil: 'networkidle' });
      await page.locator('input[type=file]').first().setInputFiles(sourcePath);
      if (kind === 'numbers') {
        await page.getByLabel('Starting number', { exact: true }).fill('7');
        await page.getByLabel(/^Number format/).selectOption('Page {n} of {total}');
        await page.getByRole('radio', { name: 'Custom range', exact: true }).check();
        await page.getByRole('textbox', { name: 'Custom range', exact: true }).fill('1,3');
      } else {
        if (kind === 'text') await page.getByLabel('Watermark text', { exact: true }).fill('AUDIT WATERMARK');
        else {
          await page.getByRole('tab', { name: 'Image', exact: true }).click();
          await page.locator('input[type=file]').nth(1).setInputFiles(resolve(out, `logo.${kind}`));
        }
        await page.getByRole('radio', { name: 'Custom pages', exact: true }).check();
        await page.getByRole('textbox', { name: 'Custom pages', exact: true }).fill('1,3');
      }
      const action = page.getByRole('button', { name: kind === 'numbers' ? 'Add Page Numbers' : 'Add Watermark', exact: true });
      await action.click();
      const downloadButton = page.getByRole('button', { name: 'Download PDF', exact: true });
      await downloadButton.waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${name} must fit viewport`);
      await page.screenshot({ path: resolve(out, `${name}.png`), fullPage: true });
      const downloadEvent = page.waitForEvent('download');
      await downloadButton.click();
      const file = resolve(out, `${name}.pdf`);
      await (await downloadEvent).saveAs(file);
      const bytes = await readFile(file);
      const loadingTask = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
      const doc = await loadingTask.promise;
      assert.equal(doc.numPages, 3);
      const pages = [];
      for (let i = 1; i <= 3; i++) {
        const pdfPage = await doc.getPage(i);
        const text = (await pdfPage.getTextContent()).items.map(item => item.str).join(' ');
        const ops = await pdfPage.getOperatorList();
        const imageCount = ops.fnArray.filter(op => [OPS.paintImageXObject, OPS.paintInlineImageXObject].includes(op)).length;
        assert.ok(text.includes(`Source page ${i}`));
        if (kind === 'numbers') assert.equal(text.includes(`Page ${i === 1 ? 7 : 8} of 3`), i !== 2);
        if (kind === 'text') assert.equal(text.includes('AUDIT WATERMARK'), i !== 2);
        if (['png', 'jpeg'].includes(kind)) assert.equal(imageCount > 0, i !== 2);
        const viewport = pdfPage.getViewport({ scale: 1 });
        const canvas = createCanvas(viewport.width, viewport.height);
        await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        await writeFile(resolve(out, `${name}-page-${i}.png`), canvas.toBuffer('image/png'));
        pages.push({ page: i, text, imageCount, width: viewport.width, height: viewport.height });
      }
      await loadingTask.destroy();
      results.push({ name, url: page.url(), bytes: bytes.length, overflow, pages });
      console.log(`PASS ${name}`);
    }
    assert.ok(uploads.every(req => !req.containsFile && new URL(req.url).origin === 'https://pagead2.googlesyndication.com' && new URL(req.url).pathname === '/pagead/ping'), 'Only unrelated ad pings may POST; no processing uploads');
    // Existing mobile SSR can recover to client rendering (React 421). Record it
    // explicitly; it must not hide unrelated runtime errors or output failures.
    assert.ok(errors.every(message => message.startsWith('Minified React error #421;')), 'No unexpected runtime errors');
    results.push({ viewport: mobile ? 'mobile' : 'desktop', outgoingWrites: uploads, runtimeErrors: errors });
    await context.close();
  }
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), base, results }, null, 2));
} finally {
  await browser.close();
}
