# Third-Party Notices

NexaForge uses the following third-party browser libraries:

- `heic-to` — LGPL-3.0, source: https://github.com/hoppergee/heic-to
- `@jsquash/avif` — Apache-2.0, source: https://github.com/jamsinclair/jSquash
- `sql-formatter` — MIT, source: https://github.com/sql-formatter-org/sql-formatter
- `cron-parser` — MIT, source: https://github.com/harrisiirak/cron-parser
- `curlconverter` — MIT, source: https://github.com/curlconverter/curlconverter
- `web-tree-sitter` — MIT, source: https://github.com/tree-sitter/tree-sitter
- `tree-sitter-bash` — MIT, source: https://github.com/tree-sitter/tree-sitter-bash
- `uuid` — MIT, source: https://github.com/uuidjs/uuid
- `tesseract.js` — Apache-2.0, source: https://github.com/naptha/tesseract.js
- `tesseract.js-core` — Apache-2.0, source: https://github.com/naptha/tesseract.js-core
- `@arshad-shah/qpdf-wasm` — MIT wrapper with qpdf 12.2.0 under Apache-2.0; see https://github.com/arshad-shah/qpdf-wasm and the package's `THIRD_PARTY_LICENSES` for qpdf, zlib, and libjpeg-turbo notices.

OCR worker and core assets are copied with their available license notices during
install/dev/build. The language model files are obtained from the upstream
Tesseract distribution at https://tessdata.projectnaptha.com/4.0.0.

The corresponding license terms apply to those dependencies.

NexaForge also includes a generated Emoji dataset derived from Unicode Emoji 17.0
and CLDR 48. Unicode data files are © Unicode, Inc. and are used under the
[Unicode Terms of Use](https://www.unicode.org/terms_of_use.html). The pinned
sources and update procedure are documented in `docs/emoji-data.md`.
