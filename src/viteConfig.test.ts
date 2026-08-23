// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vite development dependency optimization", () => {
  it("allows dependencies that use top-level await", () => {
    const source = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

    expect(source).toMatch(/optimizeDeps\s*:\s*{[\s\S]*?esbuildOptions\s*:\s*{[\s\S]*?target\s*:\s*"esnext"/);
  });
});
