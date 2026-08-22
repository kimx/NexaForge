interface AvifDependencies {
  decode: (buffer: ArrayBuffer) => Promise<ImageData | null>;
  encode: (data: ImageData, options?: Record<string, unknown>) => Promise<ArrayBuffer | Uint8Array>;
}

async function dependencies(provided?: AvifDependencies): Promise<AvifDependencies> {
  return provided ?? await import("@jsquash/avif");
}

export async function decodeAvif(file: Blob, provided?: AvifDependencies): Promise<ImageData> {
  const codec = await dependencies(provided);
  const decoded = await codec.decode(await file.arrayBuffer());
  if (!decoded) throw new Error("The AVIF image could not be decoded.");
  return decoded;
}

export async function encodeAvif(image: ImageData, quality = 75, provided?: AvifDependencies): Promise<Blob> {
  const codec = await dependencies(provided);
  const data = await codec.encode(image, { cqLevel: Math.max(0, Math.min(63, Math.round((100 - quality) * 0.63))) });
  return new Blob([data as BlobPart], { type: "image/avif" });
}
