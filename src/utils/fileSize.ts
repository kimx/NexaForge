const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

export function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) {
    return "0 B";
  }
  if (size >= GB) {
    return `${(size / GB).toFixed(2)} GB`;
  }
  if (size >= MB) {
    return `${(size / MB).toFixed(2)} MB`;
  }
  if (size >= KB) {
    return `${(size / KB).toFixed(2)} KB`;
  }
  return `${size} B`;
}
