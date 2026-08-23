export type RandomSource = (target: Uint8Array) => Uint8Array;

export class SecureRandomUnavailableError extends Error {
  constructor() {
    super("secure random generation is unavailable");
    this.name = "SecureRandomUnavailableError";
  }
}

export interface PasswordCharacterSets {
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
}

export interface PasswordOptions {
  kind: "password";
  length: number;
  sets: PasswordCharacterSets;
}

export type SecretRequest =
  | PasswordOptions
  | { kind: "api-key"; length: number }
  | { kind: "hex"; bytes: number }
  | { kind: "base64"; bytes: number };

export interface SecretResult {
  value: string;
  entropyBits: number;
  entropyKind: "estimate" | "exact";
  alphabetSize?: number;
}

const CHARACTER_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;

const API_KEY_ALPHABET = `${CHARACTER_SETS.lower}${CHARACTER_SETS.upper}${CHARACTER_SETS.digits}-_`;

const defaultRandomSource: RandomSource = (target) => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
    throw new SecureRandomUnavailableError();
  }
  return cryptoApi.getRandomValues(target);
};

function requireIntegerInRange(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}`);
  }
}

export function randomIndex(limit: number, randomSource: RandomSource = defaultRandomSource): number {
  requireIntegerInRange(limit, 1, 256, "limit");
  const acceptanceLimit = Math.floor(256 / limit) * limit;
  const sample = new Uint8Array(1);

  do {
    randomSource(sample);
  } while (sample[0] >= acceptanceLimit);

  return sample[0] % limit;
}

export function estimateAlphabetEntropy(length: number, alphabetSize: number): number {
  if (length < 0 || alphabetSize < 1) {
    throw new Error("length and alphabet size must be positive");
  }
  return length * Math.log2(alphabetSize);
}

function randomCharacter(alphabet: string, randomSource: RandomSource): string {
  return alphabet[randomIndex(alphabet.length, randomSource)];
}

function shuffleCharacters(characters: string[], randomSource: RandomSource): string {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, randomSource);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join("");
}

function generatePassword(request: PasswordOptions, randomSource: RandomSource): SecretResult {
  requireIntegerInRange(request.length, 8, 128, "length");
  const selected = (Object.keys(CHARACTER_SETS) as Array<keyof PasswordCharacterSets>)
    .filter((key) => request.sets[key])
    .map((key) => CHARACTER_SETS[key]);
  if (selected.length === 0) {
    throw new Error("at least one password character set is required");
  }

  const alphabet = selected.join("");
  const characters = selected.map((set) => randomCharacter(set, randomSource));
  while (characters.length < request.length) {
    characters.push(randomCharacter(alphabet, randomSource));
  }

  return {
    value: shuffleCharacters(characters, randomSource),
    entropyBits: estimateAlphabetEntropy(request.length, alphabet.length),
    entropyKind: "estimate",
    alphabetSize: alphabet.length,
  };
}

function generateApiKey(length: number, randomSource: RandomSource): SecretResult {
  requireIntegerInRange(length, 16, 128, "length");
  const characters = Array.from({ length }, () => randomCharacter(API_KEY_ALPHABET, randomSource));
  return {
    value: characters.join(""),
    entropyBits: estimateAlphabetEntropy(length, API_KEY_ALPHABET.length),
    entropyKind: "estimate",
    alphabetSize: API_KEY_ALPHABET.length,
  };
}

function randomBytes(count: number, randomSource: RandomSource): Uint8Array {
  requireIntegerInRange(count, 8, 64, "bytes");
  return randomSource(new Uint8Array(count));
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

export function generateSecret(
  request: SecretRequest,
  randomSource: RandomSource = defaultRandomSource
): SecretResult {
  if (request.kind === "password") {
    return generatePassword(request, randomSource);
  }
  if (request.kind === "api-key") {
    return generateApiKey(request.length, randomSource);
  }

  const bytes = randomBytes(request.bytes, randomSource);
  return {
    value: request.kind === "hex"
      ? Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
      : bytesToBase64(bytes),
    entropyBits: request.bytes * 8,
    entropyKind: "exact",
  };
}
