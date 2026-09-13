# PDF delivery audit — issue #88

Checked on 2026-09-12 against the existing production deployment. No deployment was triggered for this audit, and no PDF feature was rebuilt.

## Traceable delivery

| Requirement | Implementation | Merged into main | Existing live entry |
| --- | --- | --- | --- |
| [#65 Page Numbers](https://github.com/kimx/NexaForge/issues/65) | [PR #76](https://github.com/kimx/NexaForge/pull/76), head `7928419028066cce037699759dec91bdfe3ca0ad` | [`bbc564a`](https://github.com/kimx/NexaForge/commit/bbc564a4689cfc8b723cb8e3f542757d163a70f1), 2026-09-04 07:13 UTC | [繁中](https://nexaforge.kimx.info/pdf/add-page-numbers), [English](https://nexaforge.kimx.info/en/pdf/add-page-numbers) |
| [#66 Watermark](https://github.com/kimx/NexaForge/issues/66) | [PR #77](https://github.com/kimx/NexaForge/pull/77), head `bdc9141e40b00136fbed80dce3e0109ca08244ca` | [`076f1e2`](https://github.com/kimx/NexaForge/commit/076f1e24c7c2ed8056cce8440b449d0c4b67d779), 2026-09-04 09:27 UTC | [繁中](https://nexaforge.kimx.info/pdf/watermark), [English](https://nexaforge.kimx.info/en/pdf/watermark) |

The old develop snapshot `8800201f16b5f11af6f4f55621ec0607b600fe8f` cited by #88 predates synchronization with main. Both routes are present after [merge `7410f94`](https://github.com/kimx/NexaForge/commit/7410f94), which is included in current develop `3e78ef1`. There is no missing implementation, renamed entry, cancellation, or deployment gap for these two features.

## Deployment evidence

- [Azure CI/CD run 34549341055](https://github.com/kimx/NexaForge/actions/runs/34549341055), commit [`bd3cd082137c6795f95b0636f7ac81d235ed48dd`](https://github.com/kimx/NexaForge/commit/bd3cd082137c6795f95b0636f7ac81d235ed48dd).
- Build and Deploy Job `103108754609` completed successfully on 2026-09-11 at 01:08:33 UTC. Its log reports deployment ID `edaa956b-40e0-4204-8131-b7c9efc1940d`, status `Succeeded`, and the Azure production host `gentle-coast-0a2a89100.7.azurestaticapps.net`.
- The build log's client entry `index-D6EHyDmb.js` matches the script served by `nexaforge.kimx.info/en/pdf/add-page-numbers` during this audit. This connects the working live routes to the successful deployed build; it does not infer deployment merely from closed issues.

## Representative output acceptance

Ran `node scripts/verify-pdf-delivery.mjs` against production in Chromium at desktop 1440×1000 and mobile emulation 390×844. The script generates only synthetic fixtures and exercises the actual upload selectors, settings, Generate and Download controls.

All eight combinations passed:

| Output | Desktop | Mobile | Output inspection |
| --- | --- | --- | --- |
| Page numbers | Pass | Pass | Start 7, `Page {n} of {total}`, range `1,3`: first page contains `Page 7 of 3`, third contains `Page 8 of 3`, second has no added number. |
| Text watermark | Pass | Pass | `AUDIT WATERMARK` appears on pages 1 and 3, not 2. |
| PNG watermark | Pass | Pass | Image drawing operations exist on pages 1 and 3, not 2. |
| JPEG watermark | Pass | Pass | Image drawing operations exist on pages 1 and 3, not 2. |

Every downloaded file was reopened with PDF.js, text/image operations inspected, and all pages rendered to images. Source text, three-page count, and mixed 600×400, 400×700 and 800×500 sizes were preserved. Screenshots and rendered samples were visually inspected; controls fit the mobile viewport. The output shows the expected default 35% watermark opacity.

[Machine-readable results](../artifacts/issue-88/results.json) record URLs, byte counts, page text/image counts, sizes, outgoing writes and runtime messages. [Representative numbered PDF](../artifacts/issue-88/desktop-numbers.pdf), [text watermark](../artifacts/issue-88/desktop-text.pdf), [PNG watermark](../artifacts/issue-88/desktop-png.pdf), and [JPEG watermark](../artifacts/issue-88/desktop-jpeg.pdf) are synthetic output evidence.

Focused automated checks: 5 files / 18 tests passed for the two PDF pages, both output services, and shared PDF Toolkit. These include invalid ranges and starting values, positioning helpers, and PNG/JPEG output reopening.

## Explicit limits and observations

- Browser QA used Chromium mobile emulation, not physical iOS/Android devices. Native embedded PDF preview is unavailable in the headless browser, so its visual fidelity is **not verified**. Downloaded output rendering is verified independently.
- Some mobile loads report recoverable React hydration error #421 and then complete client rendering. The audit records these messages rather than claiming a clean console; all eight operations and downloads still passed.
- The site may POST unrelated AdSense `/pagead/ping` events. The audit records these separately and found no PDF/watermark processing uploads. This is not a claim that the entire website performs zero network requests.
- This is representative acceptance for #88, not exhaustive re-certification of every original #65/#66 setting. Physical-device preview, 10–50 page performance, all position/rotation combinations and encrypted/broken inputs were not re-tested in production. Existing automated coverage is recorded separately above.

The delivery-status investigation in #88 is complete: code exists, merge and deployment are evidenced, live entries work, and the limits of acceptance are explicit. Original feature specifications remain in #65 and #66.

## Reproduce

Use `npm ci`, then make optional QA dependencies `playwright` and `@napi-rs/canvas` available locally and install Chromium (`npx playwright install chromium`). Run `node scripts/verify-pdf-delivery.mjs`. `AUDIT_BASE_URL` and `AUDIT_OUTPUT` can override the base URL and artifact directory. The script never invokes a deployment tool.
