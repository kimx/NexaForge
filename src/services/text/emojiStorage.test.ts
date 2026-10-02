import { describe, expect, it } from "vitest";
import { addRecentEmoji, loadEmojiState, saveEmojiState, toggleFavoriteEmoji } from "./emojiStorage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("emoji persistence", () => {
  it("deduplicates recents, moves the newest first, and caps at 30", () => {
    const initial = Array.from({ length: 30 }, (_, index) => `id-${index}`);
    expect(addRecentEmoji(initial, "id-4").slice(0, 3)).toEqual(["id-4", "id-0", "id-1"]);
    const next = addRecentEmoji(initial, "new-id");
    expect(next).toHaveLength(30);
    expect(next[0]).toBe("new-id");
    expect(next).not.toContain("id-29");
  });

  it("toggles favorites without changing other ids", () => {
    expect(toggleFavoriteEmoji(["a", "b"], "b")).toEqual(["a"]);
    expect(toggleFavoriteEmoji(["a"], "b")).toEqual(["a", "b"]);
  });

  it("round-trips emoji state in its own storage key", () => {
    const storage = new MemoryStorage();
    expect(saveEmojiState({ recentIds: ["r"], favoriteIds: ["f"] }, storage)).toBe(true);
    expect(loadEmojiState(storage)).toEqual({ recentIds: ["r"], favoriteIds: ["f"], persistenceAvailable: true });
  });

  it("falls back safely when stored JSON is corrupt", () => {
    const storage = new MemoryStorage();
    storage.setItem("nexaforge.emoji-picker.v1", "not-json");
    expect(loadEmojiState(storage)).toEqual({ recentIds: [], favoriteIds: [], persistenceAvailable: false });
  });

  it("falls back safely when storage access or writes throw", () => {
    const storage = new MemoryStorage();
    storage.getItem = () => { throw new DOMException("blocked"); };
    storage.setItem = () => { throw new DOMException("quota"); };
    expect(loadEmojiState(storage).persistenceAvailable).toBe(false);
    expect(saveEmojiState({ recentIds: ["r"], favoriteIds: ["f"] }, storage)).toBe(false);
    expect(loadEmojiState(null).persistenceAvailable).toBe(false);
  });
});
