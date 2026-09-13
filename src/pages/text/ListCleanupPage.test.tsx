import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ListCleanupPage } from "./ListCleanupPage";
import { LIST_TEMPLATES_KEY } from "../../services/text/listCleanupService";
import { downloadBlob } from "../../utils/download";

vi.mock("../../utils/download", () => ({ downloadBlob: vi.fn() }));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("List cleanup templates", () => {
  it.each(["en", "zh-TW"] as const)("reviews rules, runs explicitly and exports the final result (%s)", async (locale) => {
    const en = locale === "en";
    renderWithProviders(<ListCleanupPage />, { locale });
    const input = screen.getByLabelText(en ? "Original list" : "原始清單");
    const run = screen.getByRole("button", { name: en ? "Run cleanup" : "執行清理" });
    expect(run).toBeDisabled();
    fireEvent.change(input, { target: { value: " pear \n\nApple\n pear \napple" } });
    expect(screen.queryByLabelText(en ? "Final list" : "最終清單")).not.toBeInTheDocument();
    fireEvent.click(run);
    expect(screen.getByLabelText(en ? "Final list" : "最終清單")).toHaveValue("Apple\npear");
    expect(screen.getByLabelText(en ? "1. Clean — preview" : "1. 清理 — 預覽")).toHaveValue("pear\nApple\npear\napple");
    fireEvent.click(screen.getByRole("button", { name: en ? "Copy result" : "複製結果" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Apple\npear"));
    fireEvent.click(screen.getByRole("button", { name: en ? "Download .txt" : "下載文字檔" }));
    expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "cleaned-list.txt");
    fireEvent.click(screen.getByLabelText(en ? "Ignore case" : "忽略大小寫"));
    expect(screen.queryByLabelText(en ? "Final list" : "最終清單")).not.toBeInTheDocument();
    fireEvent.click(run);
    expect(screen.getByLabelText(en ? "Final list" : "最終清單").getAttribute("readonly")).not.toBeNull();
    expect((screen.getByLabelText(en ? "Final list" : "最終清單") as HTMLTextAreaElement).value.split("\n")).toHaveLength(3);
    expect(input).toHaveValue(" pear \n\nApple\n pear \napple");
  });

  it("saves, loads, renames, deletes and resets templates without storing input or results", () => {
    const first = renderWithProviders(<ListCleanupPage />);
    fireEvent.change(screen.getByLabelText("Original list"), { target: { value: "PRIVATE\nDATA" } });
    fireEvent.click(screen.getByLabelText("Sort the list"));
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "My weekly list" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new template" }));
    expect(localStorage.getItem(LIST_TEMPLATES_KEY)).not.toMatch(/PRIVATE|DATA/);
    first.unmount();
    renderWithProviders(<ListCleanupPage />);
    expect(screen.getByLabelText("Original list")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Saved templates"), { target: { value: "My weekly list" } });
    expect(screen.getByLabelText("Sort the list")).not.toBeChecked();
    expect(screen.queryByLabelText("Final list")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename template" }));
    expect(screen.getByRole("option", { name: "Renamed" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete template" }));
    expect(screen.queryByRole("option", { name: "Renamed" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset rules" }));
    expect(screen.getByLabelText("Sort the list")).toBeChecked();
  });

  it("keeps templates usable in memory when storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    renderWithProviders(<ListCleanupPage />);
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Session only" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new template" }));
    expect(screen.getByRole("option", { name: "Session only" })).toBeInTheDocument();
    expect(screen.getByText(/Templates are available for this visit/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Original list"), { target: { value: "b\na\nb" } });
    fireEvent.click(screen.getByRole("button", { name: "Run cleanup" }));
    expect(screen.getByLabelText("Final list")).toHaveValue("a\nb");
  });
});
