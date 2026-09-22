import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { EmojiPickerPage } from "./EmojiPickerPage";

describe("EmojiPickerPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("searches English case-insensitively and intersects the active category", () => {
    renderWithProviders(<EmojiPickerPage />);
    const search = screen.getByRole("searchbox", { name: "Search emoji" });
    fireEvent.change(search, { target: { value: " FIRE " } });
    expect(screen.getByRole("button", { name: /Copy 🔥 fire/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Flags" }));
    expect(screen.getByText("No emoji found")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "All categories" }));
    expect(screen.getByRole("button", { name: /Copy 🔥 fire/i })).toBeVisible();
  });

  it("searches Traditional Chinese names and keywords", () => {
    renderWithProviders(<EmojiPickerPage />, { locale: "zh-TW" });
    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋 Emoji" }), { target: { value: "愛心" } });
    expect(screen.getAllByRole("button", { name: /複製 ❤️/i }).length).toBeGreaterThan(0);
  });

  it("updates recents only after the emoji copy succeeds", async () => {
    renderWithProviders(<EmojiPickerPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search emoji" }), { target: { value: "rocket" } });
    fireEvent.click(screen.getByRole("button", { name: /Copy 🚀 rocket/i }));
    expect(await screen.findByRole("status")).toHaveTextContent("Copied 🚀");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("🚀");

    fireEvent.click(screen.getByRole("button", { name: "Recently used" }));
    expect(screen.getByRole("button", { name: /Copy 🚀 rocket/i })).toBeVisible();
  });

  it("reports clipboard rejection without false success or a recent item", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new DOMException("denied"));
    renderWithProviders(<EmojiPickerPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search emoji" }), { target: { value: "rocket" } });
    fireEvent.click(screen.getByRole("button", { name: /Copy 🚀 rocket/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Clipboard access failed");
    expect(screen.queryByText("Copied 🚀")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recently used" }));
    expect(screen.getByText("No recently used emoji")).toBeVisible();
  });

  it("keeps favorite and information actions separate from copying", async () => {
    renderWithProviders(<EmojiPickerPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search emoji" }), { target: { value: "rocket" } });
    fireEvent.click(screen.getByRole("button", { name: /Add 🚀 to favorites/i }));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getByRole("button", { name: /Copy 🚀 rocket/i })).toBeVisible();

    const infoButton = screen.getByRole("button", { name: /View information for 🚀/i });
    fireEvent.click(infoButton);
    const dialog = screen.getByRole("dialog", { name: "🚀 rocket" });
    expect(within(dialog).getByText("U+1F680")).toBeVisible();
    expect(within(dialog).getByText("F0 9F 9A 80")).toBeVisible();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(infoButton).toHaveFocus();
  });

  it("clears a query and exposes the filtered-empty recovery", () => {
    renderWithProviders(<EmojiPickerPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search emoji" }), { target: { value: "definitely-not-an-emoji" } });
    expect(screen.getByText("No emoji found")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox", { name: "Search emoji" })).toHaveValue("");
    expect(screen.getByText("3944 emoji")).toBeVisible();
  });

  it("warns but remains usable when local storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked"); });
    renderWithProviders(<EmojiPickerPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Changes will be kept for this page only");
    expect(screen.getByRole("searchbox", { name: "Search emoji" })).toBeEnabled();
  });
});
