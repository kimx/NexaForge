export function createObjectUrl(blob: Blob): string {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("Object URLs are unavailable in this browser.");
  }
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string): void {
  if (url && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || !document.body) {
    throw new Error("Blob downloads are unavailable outside a browser.");
  }
  const url = createObjectUrl(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
  }
  setTimeout(() => {
    revokeObjectUrl(url);
  }, 0);
}
