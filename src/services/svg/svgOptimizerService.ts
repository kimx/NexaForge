import type { Config } from "svgo";

export interface SvgOptimizationOptions {
  multipass?: boolean;
}

export interface SvgOptimizationResult {
  source: string;
  output: string;
  sourceBytes: number;
  outputBytes: number;
  previewSafe: boolean;
  unsafeReason?: "active-content" | "external-reference";
}

interface SvgDependencies {
  optimize: (source: string, options: Config) => { data: string };
}

function previewSafety(source: string): Pick<SvgOptimizationResult, "previewSafe" | "unsafeReason"> {
  if (/<\s*(?:script|foreignObject)\b|\son[a-z]+\s*=/i.test(source)) {
    return { previewSafe: false, unsafeReason: "active-content" };
  }
  if (/\b(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/)/i.test(source)) {
    return { previewSafe: false, unsafeReason: "external-reference" };
  }
  return { previewSafe: true };
}

export async function optimizeSvg(source: string, options: SvgOptimizationOptions = {}, dependencies?: SvgDependencies): Promise<SvgOptimizationResult> {
  if (!/<svg\b/i.test(source)) throw new Error("Enter a valid SVG document.");
  const { optimize } = dependencies ?? await import("svgo");
  const config: Config = {
    multipass: options.multipass ?? true,
    // SVGO 4's default preset does not include removeViewBox.
    plugins: ["preset-default"],
  };
  const optimized = optimize(source, config);
  const encoder = new TextEncoder();
  return { source, output: optimized.data, sourceBytes: encoder.encode(source).byteLength, outputBytes: encoder.encode(optimized.data).byteLength, ...previewSafety(source) };
}
