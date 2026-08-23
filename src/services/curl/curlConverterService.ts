export type CurlTarget = "csharp" | "javascript" | "python" | "powershell";

export const DEFAULT_CURL_SAMPLE = `curl 'https://api.example.com/v1/messages' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Hello, NexaForge!"}'`;

export interface CurlConversionWarning {
  code: string;
  message: string;
}

export interface CurlConversionResult {
  code: string;
  warnings: CurlConversionWarning[];
  fileExtension: ".cs" | ".js" | ".py" | ".ps1";
}

type RawConversion = readonly [string, readonly unknown[]];
type CurlConverter = (source: string) => RawConversion | Promise<RawConversion>;

export interface CurlConverterDependencies {
  csharp: CurlConverter;
  javascript: CurlConverter;
  python: CurlConverter;
  powershell: CurlConverter;
}

export type CurlConversionErrorCode = "empty-input" | "load-failed" | "invalid-curl";

export class CurlConversionError extends Error {
  readonly code: CurlConversionErrorCode;

  constructor(code: CurlConversionErrorCode, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = "CurlConversionError";
    this.code = code;
  }
}

const EXTENSIONS: Record<CurlTarget, CurlConversionResult["fileExtension"]> = {
  csharp: ".cs",
  javascript: ".js",
  python: ".py",
  powershell: ".ps1",
};

let dependencyPromise: Promise<CurlConverterDependencies> | null = null;

async function loadCurlConverter(): Promise<CurlConverterDependencies> {
  dependencyPromise ??= import("curlconverter")
    .then((module) => ({
      csharp: module.toCSharpWarn,
      javascript: module.toJavaScriptWarn,
      python: module.toPythonWarn,
      powershell: module.toPowershellRestMethodWarn,
    }))
    .catch((error) => {
      dependencyPromise = null;
      throw new CurlConversionError("load-failed", error);
    });
  return dependencyPromise;
}

function normalizeWarnings(warnings: readonly unknown[]): CurlConversionWarning[] {
  return warnings.flatMap((warning) => {
    if (
      Array.isArray(warning) &&
      typeof warning[0] === "string" &&
      typeof warning[1] === "string"
    ) {
      return [{ code: warning[0], message: warning[1] }];
    }
    return [];
  });
}

export async function convertCurl(
  source: string,
  target: CurlTarget,
  dependencies?: CurlConverterDependencies
): Promise<CurlConversionResult> {
  const normalized = source.trim();
  if (!normalized) {
    throw new CurlConversionError("empty-input");
  }

  const converters = dependencies ?? (await loadCurlConverter());
  try {
    const [code, warnings] = await converters[target](normalized);
    return {
      code,
      warnings: normalizeWarnings(warnings),
      fileExtension: EXTENSIONS[target],
    };
  } catch (error) {
    if (error instanceof CurlConversionError) throw error;
    throw new CurlConversionError("invalid-curl", error);
  }
}
