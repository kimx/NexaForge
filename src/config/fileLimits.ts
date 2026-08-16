export const FILE_LIMITS = {
  image: 50 * 1024 * 1024,
  pdf: 100 * 1024 * 1024,
  csv: 100 * 1024 * 1024,
  other: 50 * 1024 * 1024,
} as const;

export const PREVIEW_LIMIT = {
  csvRows: 1000,
};
