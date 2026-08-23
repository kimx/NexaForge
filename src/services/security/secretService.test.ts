import {
  estimateAlphabetEntropy,
  generateSecret,
  randomIndex,
  SecureRandomUnavailableError,
  type RandomSource,
} from "./secretService";

function sequenceRandom(values: number[]): RandomSource {
  let index = 0;
  return (target) => {
    for (let byte = 0; byte < target.length; byte += 1) {
      target[byte] = values[index % values.length];
      index += 1;
    }
    return target;
  };
}

describe("secret service", () => {
  it("includes every enabled password set and reports estimated alphabet entropy", () => {
    const result = generateSecret({
      kind: "password",
      length: 12,
      sets: { lower: true, upper: true, digits: true, symbols: true },
    }, sequenceRandom([0, 1, 2, 3, 4, 5, 6, 7]));

    expect(result.value).toHaveLength(12);
    expect(result.value).toMatch(/[a-z]/);
    expect(result.value).toMatch(/[A-Z]/);
    expect(result.value).toMatch(/[0-9]/);
    expect(result.value).toMatch(/[^A-Za-z0-9]/);
    expect(result.entropyKind).toBe("estimate");
    expect(result.entropyBits).toBeCloseTo(12 * Math.log2(result.alphabetSize ?? 0), 6);
  });

  it("generates URL-safe API keys", () => {
    const result = generateSecret(
      { kind: "api-key", length: 24 },
      sequenceRandom([0, 10, 20, 30, 40, 50, 60])
    );

    expect(result.value).toHaveLength(24);
    expect(result.value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.entropyKind).toBe("estimate");
    expect(result.alphabetSize).toBe(64);
  });

  it("reports exact source entropy for hex and Base64 byte modes", () => {
    const random = sequenceRandom([0, 1, 2, 253, 254, 255]);
    const hex = generateSecret({ kind: "hex", bytes: 16 }, random);
    const base64 = generateSecret({ kind: "base64", bytes: 8 }, random);

    expect(hex.value).toMatch(/^[0-9a-f]{32}$/);
    expect(hex.entropyBits).toBe(128);
    expect(hex.entropyKind).toBe("exact");
    expect(base64.value).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(base64.entropyBits).toBe(64);
    expect(base64.entropyKind).toBe("exact");
  });

  it("rejects bytes outside the unbiased sampling range", () => {
    const random = sequenceRandom([255, 7]);
    expect(randomIndex(10, random)).toBe(7);
  });

  it("computes alphabet entropy as an upper-bound estimate", () => {
    expect(estimateAlphabetEntropy(16, 64)).toBe(96);
  });

  it("reports a typed error when Web Crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    try {
      expect(() => generateSecret({ kind: "api-key", length: 16 }))
        .toThrow(SecureRandomUnavailableError);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    { kind: "password", length: 7, sets: { lower: true, upper: true, digits: true, symbols: true } },
    { kind: "password", length: 12, sets: { lower: false, upper: false, digits: false, symbols: false } },
    { kind: "api-key", length: 129 },
    { kind: "hex", bytes: 7 },
    { kind: "base64", bytes: 65 },
  ] as const)("rejects invalid request $kind", (request) => {
    expect(() => generateSecret(request, sequenceRandom([1]))).toThrow();
  });
});
