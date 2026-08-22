import { optimizeSvg } from "./svgOptimizerService";

describe("SVG optimizer service", () => {
  it("preserves viewBox with the real optimizer", async () => {
    const result = await optimizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>');
    expect(result.output).toContain("viewBox");
  }, 15_000);

  it("returns size reduction and keeps viewBox", async () => {
    const optimize = vi.fn().mockReturnValue({ data: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>' });
    const result = await optimizeSvg('<svg viewBox="0 0 10 10">  <path d="M0 0h10v10z" />  </svg>', {}, { optimize });
    expect(result.outputBytes).toBeLessThan(result.sourceBytes);
    expect(result.output).toContain("viewBox");
    expect(result.previewSafe).toBe(true);
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>x</div></foreignObject></svg>',
    '<svg onload="alert(1)"></svg>',
    '<svg><image href="https://example.com/x.png"/></svg>',
  ])("disables preview for active or external content", async (source) => {
    const result = await optimizeSvg(source, {}, { optimize: () => ({ data: source }) });
    expect(result.previewSafe).toBe(false);
  });
});
