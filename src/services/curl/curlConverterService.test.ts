import { describe, expect, it, vi } from "vitest";
import { CurlConversionError, convertCurl } from "./curlConverterService";

const command = "curl 'https://example.com/api' -H 'Accept: application/json'";

describe("convertCurl", () => {
  it.each([
    ["csharp", "using var client = new HttpClient();", ".cs"],
    ["javascript", "const response = await fetch(url);", ".js"],
    ["python", "response = requests.get(url)", ".py"],
    ["powershell", "Invoke-RestMethod -Uri $url", ".ps1"],
  ] as const)("converts to %s with the matching file extension", async (target, code, extension) => {
    const dependencies = {
      csharp: vi.fn(() => [code, []] as const),
      javascript: vi.fn(() => [code, []] as const),
      python: vi.fn(() => [code, []] as const),
      powershell: vi.fn(() => [code, []] as const),
    };

    const result = await convertCurl(command, target, dependencies);

    expect(result).toEqual({ code, warnings: [], fileExtension: extension });
    expect(dependencies[target]).toHaveBeenCalledWith(command);
  });

  it("normalizes non-blocking converter warnings", async () => {
    const result = await convertCurl(command, "python", {
      csharp: () => ["", []],
      javascript: () => ["", []],
      python: () => ["response = requests.get(url)", [
        ["bad-scheme", "Only HTTP requests are supported"],
        ["redirect", "Runtime redirect defaults can differ"],
      ]],
      powershell: () => ["", []],
    });

    expect(result.warnings).toEqual([
      { code: "bad-scheme", message: "Only HTTP requests are supported" },
      { code: "redirect", message: "Runtime redirect defaults can differ" },
    ]);
  });

  it("rejects blank input before invoking a converter", async () => {
    const python = vi.fn(() => ["unused", []] as const);

    await expect(convertCurl("  ", "python", {
      csharp: python,
      javascript: python,
      python,
      powershell: python,
    })).rejects.toMatchObject({ code: "empty-input" });
    expect(python).not.toHaveBeenCalled();
  });

  it("sanitizes parser failures without echoing dependency details", async () => {
    const failing = () => {
      throw new Error("secret command parser details");
    };

    let caught: unknown;
    try {
      await convertCurl(command, "csharp", {
        csharp: failing,
        javascript: failing,
        python: failing,
        powershell: failing,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(CurlConversionError);
    expect(caught).toMatchObject({ code: "invalid-curl", message: "invalid-curl" });
    expect((caught as Error).message).not.toContain("secret command");
  });
});
