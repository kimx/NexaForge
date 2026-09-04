export function parsePageRanges(input: string): number[] {
  const value = input.trim();
  if (!value) {
    return [];
  }

  const pages = new Set<number>();
  const parts = value.split(",").map((item) => item.trim());

  for (const part of parts) {
    if (!part || !/^\d+(?:\s*-\s*\d+)?$/.test(part)) {
      throw new Error(`Invalid page range: ${part || value}`);
    }

    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-").map((item) => item.trim());
      if (!startRaw || !endRaw) {
        throw new Error(`Invalid range: ${part}`);
      }
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid range: ${part}`);
      }
      if (start <= 0 || end <= 0 || start > end) {
        throw new Error(`Invalid range: ${part}`);
      }
      for (let idx = start; idx <= end; idx += 1) {
        pages.add(idx - 1);
      }
    } else {
      const page = Number(part);
      if (!Number.isInteger(page) || page <= 0) {
        throw new Error(`Invalid page index: ${part}`);
      }
      pages.add(page - 1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

export function assertValidPageRanges(
  selectedPages: number[],
  totalPages: number
): void {
  if (!selectedPages.length) {
    return;
  }
  for (const index of selectedPages) {
    if (index < 0 || index >= totalPages) {
      throw new Error(`Page out of range: ${index + 1}`);
    }
  }
}
