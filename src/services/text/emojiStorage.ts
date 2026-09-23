const STORAGE_KEY = "nexaforge.emoji-picker.v1";
const RECENT_LIMIT = 30;

export interface EmojiStoredValues {
  recentIds: string[];
  favoriteIds: string[];
}

export interface EmojiPersistenceState extends EmojiStoredValues {
  persistenceAvailable: boolean;
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function cleanIds(value: unknown, limit?: number): string[] {
  if (!Array.isArray(value)) return [];
  const ids = [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
  return typeof limit === "number" ? ids.slice(0, limit) : ids;
}

export function loadEmojiState(storage: Storage | null = browserStorage()): EmojiPersistenceState {
  if (!storage) return { recentIds: [], favoriteIds: [], persistenceAvailable: false };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { recentIds: [], favoriteIds: [], persistenceAvailable: true };
    const parsed = JSON.parse(raw) as Partial<EmojiStoredValues>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid emoji state");
    return {
      recentIds: cleanIds(parsed.recentIds, RECENT_LIMIT),
      favoriteIds: cleanIds(parsed.favoriteIds),
      persistenceAvailable: true,
    };
  } catch {
    return { recentIds: [], favoriteIds: [], persistenceAvailable: false };
  }
}

export function saveEmojiState(values: EmojiStoredValues, storage: Storage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      recentIds: cleanIds(values.recentIds, RECENT_LIMIT),
      favoriteIds: cleanIds(values.favoriteIds),
    }));
    return true;
  } catch {
    return false;
  }
}

export function addRecentEmoji(recentIds: readonly string[], id: string): string[] {
  return [id, ...recentIds.filter((candidate) => candidate !== id)].slice(0, RECENT_LIMIT);
}

export function toggleFavoriteEmoji(favoriteIds: readonly string[], id: string): string[] {
  return favoriteIds.includes(id)
    ? favoriteIds.filter((candidate) => candidate !== id)
    : [...favoriteIds, id];
}
