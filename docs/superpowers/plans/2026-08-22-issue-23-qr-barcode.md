# Issue #23 QR and Barcode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image/camera QR reading, Code 128 and EAN-13 generation, Wi-Fi QR generation, and vCard QR generation as local-only bilingual tools.

**Architecture:** Pure TypeScript modules build and validate payloads. Browser adapters dynamically import ZXing and bwip-js for reading/rendering, while four focused React pages use the existing tool workflow and QR generator service.

**Tech Stack:** React 18, TypeScript 5.8, `qrcode`, `@zxing/browser`, `@bwipjs/browser`, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-22-issue-23-complete-tool-suite-design.md`

## Global Constraints

- Process QR/barcode content locally and never include source content in analytics.
- Dynamically import ZXing and bwip-js only when a reader or barcode operation starts.
- Stop camera tracks on stop, route change, unmount, and decode success.
- Support uploaded-image reading even when camera access is unavailable or denied.
- Preserve `/qr-code`; add dedicated canonical and English routes for every new tool.
- Provide Traditional Chinese and English copy and accessible field/error associations.

---

### Task 1: Pure QR payload and EAN domain rules

**Files:**
- Create: `src/services/qr/qrPayloads.ts`
- Test: `src/services/qr/qrPayloads.test.ts`

**Interfaces:**
- Produces: `buildWifiPayload(input: WifiQrInput): string`, `buildVCardPayload(input: VCardQrInput): string`, `normalizeEan13(value: string): string`, `WifiQrInput`, and `VCardQrInput`.

- [ ] **Step 1: Write failing domain tests**

```ts
expect(buildWifiPayload({ ssid: "Cafe;5G", password: "p:a\\ss", security: "WPA", hidden: true }))
  .toBe("WIFI:T:WPA;S:Cafe\\;5G;P:p\\:a\\\\ss;H:true;;");
expect(normalizeEan13("400638133393")).toBe("4006381333931");
expect(() => normalizeEan13("4006381333932")).toThrow("check digit");
expect(buildVCardPayload({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" }))
  .toContain("N:Lovelace;Ada;;;");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/qr/qrPayloads.test.ts`

Expected: FAIL because `qrPayloads.ts` does not exist.

- [ ] **Step 3: Implement escaping, checksum, and vCard serialization**

Use QR Wi-Fi escaping for backslash, semicolon, comma, colon, and quotes. Strip spaces/hyphens from EAN input, require twelve or thirteen digits, compute the modulo-10 check digit, and reject a mismatched thirteenth digit. Emit CRLF-delimited vCard 3.0 text and escape backslash, semicolon, comma, and newlines in vCard values.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- --run src/services/qr/qrPayloads.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/services/qr/qrPayloads.ts src/services/qr/qrPayloads.test.ts
git commit -m "feat: add QR payload builders"
```

### Task 2: QR reader and barcode renderer adapters

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/qr/qrReaderService.ts`
- Test: `src/services/qr/qrReaderService.test.ts`
- Create: `src/services/qr/barcodeService.ts`
- Test: `src/services/qr/barcodeService.test.ts`

**Interfaces:**
- Produces: `readQrFromImage(file, dependencies?): Promise<QrReadResult>`, `startQrCamera(video, onResult, onError, dependencies?): Promise<QrCameraSession>`, and `generateBarcode(value, options, dependencies?): Promise<BarcodeRenderResult>`.
- `QrCameraSession` exposes `stop(): void`; `BarcodeRenderResult` contains PNG `FileProcessResult` and SVG text/blob.

- [ ] **Step 1: Write failing adapter tests**

```ts
const result = await readQrFromImage(file, { decodeImage: async () => ({ text: "https://example.com", format: "QR_CODE" }) });
expect(result.text).toBe("https://example.com");

const session = await startQrCamera(video, onResult, onError, fakeCameraDependencies);
session.stop();
expect(fakeTrack.stop).toHaveBeenCalledOnce();

const barcode = await generateBarcode("400638133393", { format: "ean13", scale: 3 }, fakeRenderer);
expect(barcode.png.fileName).toBe("ean13-4006381333931.png");
expect(barcode.svgText).toContain("<svg");
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/services/qr/qrReaderService.test.ts src/services/qr/barcodeService.test.ts`

Expected: FAIL because both services are missing.

- [ ] **Step 3: Install browser dependencies and implement adapters**

Run: `npm install @zxing/browser @bwipjs/browser`

The default image decoder dynamically imports `BrowserQRCodeReader` and decodes an object URL in a `try/finally` that revokes the URL. The camera adapter returns a session whose idempotent `stop` calls ZXing controls and every media track. The barcode adapter calls the bwip-js browser canvas renderer with `code128` or `ean13`, exports PNG through `canvas.toBlob`, and calls its SVG renderer for SVG output.

- [ ] **Step 4: Verify GREEN and cleanup behavior**

Run: `npm test -- --run src/services/qr/qrReaderService.test.ts src/services/qr/barcodeService.test.ts`

Expected: PASS, including object URL revocation and idempotent camera stop.

- [ ] **Step 5: Commit**

```powershell
git add -- package.json package-lock.json src/services/qr/qrReaderService.ts src/services/qr/qrReaderService.test.ts src/services/qr/barcodeService.ts src/services/qr/barcodeService.test.ts
git commit -m "feat: add local QR reading and barcode rendering"
```

### Task 3: Four accessible tool pages

**Files:**
- Create: `src/pages/qr/QrReaderPage.tsx`
- Test: `src/pages/qr/QrReaderPage.test.tsx`
- Create: `src/pages/qr/BarcodeGeneratorPage.tsx`
- Test: `src/pages/qr/BarcodeGeneratorPage.test.tsx`
- Create: `src/pages/qr/WifiQrPage.tsx`
- Test: `src/pages/qr/WifiQrPage.test.tsx`
- Create: `src/pages/qr/VCardQrPage.tsx`
- Test: `src/pages/qr/VCardQrPage.test.tsx`
- Create: `src/i18n/issue23Messages.ts`
- Modify: `src/context/LanguageContext.tsx`
- Create: `src/styles/issue23-tools.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: Task 1 and 2 services, existing `generateQrImage`, `ToolPageTemplate`, `FileDropzone`, `DownloadButton`, `useSeo`, and analytics helpers.
- Produces: four lazy-route-ready page components.

- [ ] **Step 1: Write failing page tests**

Cover uploaded QR success/no-code errors; camera start/stop and unmount cleanup; Code 128/EAN switching and checksum errors; Wi-Fi payload submission without logging secrets; vCard required name plus optional fields; PNG/SVG downloads; and Traditional Chinese labels.

```ts
fireEvent.change(screen.getByLabelText("SSID"), { target: { value: "Cafe;5G" } });
fireEvent.change(screen.getByLabelText("Password"), { target: { value: "private" } });
fireEvent.click(screen.getByRole("button", { name: "Generate Wi-Fi QR code" }));
await waitFor(() => expect(generateQrImage).toHaveBeenCalledWith(
  "WIFI:T:WPA;S:Cafe\\;5G;P:private;H:false;;",
  expect.any(Object)
));
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/pages/qr/QrReaderPage.test.tsx src/pages/qr/BarcodeGeneratorPage.test.tsx src/pages/qr/WifiQrPage.test.tsx src/pages/qr/VCardQrPage.test.tsx`

Expected: FAIL because the pages do not exist.

- [ ] **Step 3: Implement pages, bilingual messages, and scoped styles**

Use semantic `fieldset`/`legend` groups, field-associated errors, live processing status, explicit camera start/stop buttons, text output with copy for QR reads, and image/SVG download actions. Add `ISSUE_23_ZH_MESSAGES` and `ISSUE_23_EN_MESSAGES` records and spread them into the existing dictionaries. Import `issue23-tools.css` after the global stylesheet.

- [ ] **Step 4: Verify GREEN**

Run the four page test files from Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/qr src/i18n/issue23Messages.ts src/context/LanguageContext.tsx src/styles/issue23-tools.css src/main.tsx
git commit -m "feat: add QR and barcode tool interfaces"
```

### Task 4: Discovery and batch verification

**Files:**
- Modify: `src/types/tool.ts`
- Modify: `src/data/tools.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/ToolSidebar.test.tsx`
- Modify: `src/seo/siteMeta.test.ts`
- Modify: `src/seo/artifacts.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: four canonical routes, four English routes, the `QR & Barcode` category, and registry-driven SEO/sitemap entries.

- [ ] **Step 1: Add failing route/registry assertions**

Assert paths `/qr-code/reader`, `/barcode/generator`, `/qr-code/wifi`, and `/qr-code/vcard` plus their `/en` forms; assert that QR/barcode tools appear under the localized new category.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/App.test.tsx src/components/ToolSidebar.test.tsx src/seo/siteMeta.test.ts src/seo/artifacts.test.ts`

Expected: FAIL because registry entries/routes are absent.

- [ ] **Step 3: Register lazy routes and public inventory**

Extend `ToolDefinition["category"]`, add five QR/barcode entries including the existing generator, lazy-load the four pages, and update README. Keep `/qr-code` unchanged.

- [ ] **Step 4: Run batch verification**

Run: `npm test -- --run src/services/qr src/pages/qr src/App.test.tsx src/components/ToolSidebar.test.tsx src/seo`

Run: `npm run build`

Expected: all commands exit 0 and prerender includes all locale routes.

- [ ] **Step 5: Commit**

```powershell
git add -- src/types/tool.ts src/data/tools.ts src/App.tsx src/App.test.tsx src/components/ToolSidebar.test.tsx src/seo README.md
git commit -m "feat: publish QR and barcode tool suite"
```

