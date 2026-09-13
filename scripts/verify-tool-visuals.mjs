// Optional acceptance check: npm dev server and local Playwright required.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4187";
const out = resolve("artifacts/issue-98");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const english of [true, false]) for (const width of [1440, 390]) {
    const name = `${english ? "en" : "zh"}-${width}`;
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + (english ? "/en" : "/"), { waitUntil: "networkidle" });
    await page.getByRole("button", { name: english ? "All" : "全部", exact: true }).click();
    assert.equal(await page.locator("#featured-tools .home-tool-card").count(), 64);
    const labels = await page.locator("#featured-tools .home-tool-card__icon").allTextContents();
    assert.ok(labels.every(label => label.trim() && label !== "FILE"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const clipped = await page.locator("#featured-tools .home-tool-card h3").evaluateAll(nodes =>
      nodes.filter(node => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).map(node => node.textContent));
    assert.deepEqual(clipped, [], "Tool titles must not be clipped");
    await page.locator("#featured-tools").screenshot({ path: resolve(out, `${name}-cards.png`) });
    const filters = (await page.locator(".finder-filter").allTextContents()).slice(2);
    if (width === 390) await page.getByRole("button", { name: english ? "Open tools navigation" : "開啟工具導覽", exact: true }).click();
    const toggles = page.locator(".tool-sidebar__category-toggle");
    const categories = await toggles.locator(".tool-sidebar__label").allTextContents();
    assert.deepEqual(categories.map(text => text.replace(/ tools$| 工具$/i, "")), filters);
    for (let i = 0; i < 6; i++) {
      const toggle = toggles.nth(i);
      await toggle.click();
      const id = await toggle.getAttribute("aria-controls");
      const svg = await toggle.locator(".tool-sidebar__icon svg").innerHTML();
      const icons = await page.locator(`[id="${id}"] li svg`).evaluateAll(nodes => nodes.map(node => node.innerHTML));
      assert.ok(icons.length && icons.every(icon => icon === svg));
      await toggle.click();
    }
    await toggles.nth(3).click();
    await page.locator("#tool-sidebar").screenshot({ path: resolve(out, `${name}-sidebar.png`) });
    if (width === 390) await page.keyboard.press("Escape");
    await page.locator("#search-tools").fill("metadata");
    assert.ok(await page.locator("#featured-tools .home-tool-card").count() > 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator("#featured-tools").screenshot({ path: resolve(out, `${name}-search.png`) });
    await page.locator("#featured-tools .home-tool-card__action").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(url => url.pathname !== (english ? "/en" : "/"));
    assert.deepEqual(errors, []);
    results.push({ name, toolCount: labels.length, categories: filters, clippedTitles: clipped, errors });
    console.log("PASS", name);
    await context.close();
  }
  await writeFile(resolve(out, "results.json"), JSON.stringify({ base, results }, null, 2));
} finally {
  await browser.close();
}
