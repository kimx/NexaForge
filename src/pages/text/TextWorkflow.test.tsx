import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { useLanguage, type Locale } from "../../context/LanguageContext";
import { localizePath } from "../../routing/localePaths";
import { renderWithProviders } from "../../test/renderWithProviders";
import { downloadBlob } from "../../utils/download";

vi.mock("../../utils/download", () => ({ downloadBlob: vi.fn() }));

const SOURCE = "  pear  \n\n apple \n  pear  ";
const CLEANED = "pear\napple\npear";

function NavigationProbe(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = useLanguage();
  return <>
    <output data-testid="location">{JSON.stringify({ path: location.pathname, search: location.search, hash: location.hash, state: location.state })}</output>
    <button onClick={() => navigate(-1)}>History back</button>
    {["text-cleaner", "remove-duplicate-lines", "sort-lines"].map((tool) => (
      <button key={tool} onClick={() => navigate(localizePath(`/text/${tool}`, locale))}>Open {tool}</button>
    ))}
  </>;
}

function renderWorkflow(route = "/en/text/text-cleaner", locale: Locale = "en") {
  return renderWithProviders(<><NavigationProbe /><App /></>, { route, locale });
}

async function cleanEnglish(input = SOURCE): Promise<void> {
  fireEvent.change(await screen.findByLabelText("Input text"), { target: { value: input } });
  fireEvent.click(screen.getByLabelText("Trim each line"));
  fireEvent.click(screen.getByLabelText("Remove empty lines"));
  fireEvent.click(screen.getByRole("button", { name: "Clean text" }));
}

async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Text workflow", () => {
  it("opens list templates and explicitly imports the workflow original without putting content in the URL", async () => {
    renderWorkflow();
    await cleanEnglish();
    fireEvent.click(within(screen.getByRole("main")).getByRole("link", { name: "List Cleanup" }));
    expect(await screen.findByLabelText("Original list")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Use original text from the current workflow" }));
    expect(screen.getByLabelText("Original list")).toHaveValue(SOURCE);
    expect(screen.queryByLabelText("Final list")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run cleanup" }));
    expect(screen.getByLabelText("Final list")).toHaveValue("apple\npear");
    expect(screen.getByTestId("location")).toHaveTextContent(JSON.stringify({ path: "/en/text/list-cleanup", search: "", hash: "", state: null }));
  });

  it.each(["en", "zh-TW"] as const)("completes cleanup, deduplication and sorting without persisting content (%s)", async (locale) => {
    const isEnglish = locale === "en";
    const localWrites = vi.spyOn(Storage.prototype, "setItem");
    const events = vi.spyOn(window, "dispatchEvent");
    renderWorkflow(localizePath("/text/text-cleaner", locale), locale);
    fireEvent.change(await screen.findByLabelText(isEnglish ? "Input text" : "輸入文字"), { target: { value: SOURCE } });
    fireEvent.click(screen.getByLabelText(isEnglish ? "Trim each line" : "移除每行前後空白"));
    fireEvent.click(screen.getByLabelText(isEnglish ? "Remove empty lines" : "移除空白行"));
    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Clean text" : "清理文字" }));
    expect(screen.getByLabelText(isEnglish ? "Cleaned text" : "清理結果")).toHaveValue(CLEANED);

    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Continue with this result: Remove Duplicate Lines" : "以此結果繼續：移除重複行" }));
    expect(await screen.findByLabelText(isEnglish ? "Enter lines to deduplicate" : "輸入要去重複的內容")).toHaveValue(CLEANED);
    expect(screen.queryByRole("button", { name: isEnglish ? "Download .txt" : "下載文字檔" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Process" : "處理" }));
    expect(screen.getByText("pear\napple", { selector: "pre", normalizer: (value) => value })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Continue with this result: Sort Lines" : "以此結果繼續：逐行排序" }));
    expect(await screen.findByLabelText(isEnglish ? "Enter lines to sort" : "輸入要排序的內容")).toHaveValue("pear\napple");
    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Process" : "處理" }));
    expect(screen.getByText("apple\npear", { selector: "pre", normalizer: (value) => value })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Copy" : "複製" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("apple\npear"));
    fireEvent.click(screen.getByRole("button", { name: isEnglish ? "Download .txt" : "下載文字檔" }));
    expect(downloadBlob).toHaveBeenCalledOnce();
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(filename).toBe("sort-lines.txt");
    expect(await readBlob(blob)).toBe("apple\npear");

    expect(screen.getByTestId("location")).toHaveTextContent(JSON.stringify({ path: localizePath("/text/sort-lines", locale), search: "", hash: "", state: null }));
    expect(JSON.stringify(localWrites.mock.calls)).not.toContain("pear");
    const analytics = events.mock.calls.map(([event]) => event instanceof CustomEvent ? event.detail : null);
    expect(JSON.stringify(analytics)).not.toContain("pear");
    expect(window.sessionStorage.length).toBe(0);
  });

  it("restores each step's input, result and options when navigating back", async () => {
    renderWorkflow();
    await cleanEnglish();
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Remove Duplicate Lines" }));
    await screen.findByLabelText("Enter lines to deduplicate");
    fireEvent.click(screen.getByLabelText("Ignore case"));
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Sort Lines" }));
    await screen.findByLabelText("Enter lines to sort");
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(await screen.findByLabelText("Enter lines to deduplicate")).toHaveValue(CLEANED);
    expect(screen.getByLabelText("Ignore case")).not.toBeChecked();
    expect(screen.getByText("pear\napple", { selector: "pre", normalizer: (value) => value })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(await screen.findByLabelText("Input text")).toHaveValue(SOURCE);
    expect(screen.getByLabelText("Cleaned text")).toHaveValue(CLEANED);
    expect(screen.getByLabelText("Trim each line")).toBeChecked();
    expect(screen.getByLabelText("Remove empty lines")).toBeChecked();
    fireEvent.click(screen.getByText("View original input"));
    expect(screen.getByLabelText("Original input (read only)")).toHaveValue(SOURCE);
  });

  it("lets users cancel, keep or replace an existing destination draft", async () => {
    renderWorkflow("/en/text/sort-lines");
    fireEvent.change(await screen.findByLabelText("Enter lines to sort"), { target: { value: "keep this draft" } });
    fireEvent.change(screen.getByLabelText("Sort direction"), { target: { value: "desc" } });
    fireEvent.click(screen.getByRole("button", { name: "Open text-cleaner" }));
    await cleanEnglish();
    const continueButton = screen.getByRole("button", { name: "Continue with this result: Sort Lines" });
    fireEvent.click(continueButton);
    const prompt = screen.getByRole("group", { name: "The destination already contains text" });
    expect(prompt).toHaveFocus();
    fireEvent.keyDown(prompt, { key: "Escape" });
    expect(prompt).not.toBeInTheDocument();
    expect(continueButton).toHaveFocus();
    expect(screen.getByLabelText("Cleaned text")).toHaveValue(CLEANED);
    fireEvent.click(continueButton);
    fireEvent.click(screen.getByRole("button", { name: "Keep existing text and continue" }));
    expect(await screen.findByLabelText("Enter lines to sort")).toHaveValue("keep this draft");
    expect(screen.getByLabelText("Sort direction")).toHaveValue("desc");
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    await screen.findByLabelText("Input text");
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Sort Lines" }));
    fireEvent.click(screen.getByRole("button", { name: "Replace existing text and continue" }));
    expect(await screen.findByLabelText("Enter lines to sort")).toHaveValue(CLEANED);
    expect(screen.getByLabelText("Sort direction")).toHaveValue("desc");
    expect(screen.queryByRole("button", { name: "Download .txt" })).not.toBeInTheDocument();
  });

  it("clears all step content, original input and a pending transfer while keeping saved cleaner rules", async () => {
    renderWorkflow("/en/text/sort-lines");
    fireEvent.change(await screen.findByLabelText("Enter lines to sort"), { target: { value: "draft" } });
    fireEvent.change(screen.getByLabelText("Sort direction"), { target: { value: "desc" } });
    fireEvent.click(screen.getByRole("button", { name: "Open text-cleaner" }));
    await cleanEnglish();
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Remove Duplicate Lines" }));
    await screen.findByLabelText("Enter lines to deduplicate");
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Sort Lines" }));
    expect(screen.getByRole("group", { name: "The destination already contains text" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear entire workflow" }));
    expect(screen.getByLabelText("Enter lines to deduplicate")).toHaveValue("");
    expect(screen.queryByRole("group", { name: "The destination already contains text" })).not.toBeInTheDocument();
    expect(screen.queryByText("View original input")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open sort-lines" }));
    expect(await screen.findByLabelText("Enter lines to sort")).toHaveValue("");
    expect(screen.getByLabelText("Sort direction")).toHaveValue("asc");
    fireEvent.click(screen.getByRole("button", { name: "Open text-cleaner" }));
    expect(await screen.findByLabelText("Input text")).toHaveValue("");
    expect(screen.getByLabelText("Trim each line")).toBeChecked();
    expect(screen.queryByLabelText("Cleaned text")).not.toBeInTheDocument();
  });

  it("starts empty after a fresh App mount and supports direct tool entry", async () => {
    const first = renderWorkflow();
    await cleanEnglish();
    expect(screen.getByText(/refreshing or closing it clears/)).toBeVisible();
    first.unmount();
    renderWorkflow("/en/text/remove-duplicate-lines");
    expect(await screen.findByLabelText("Enter lines to deduplicate")).toHaveValue("");
    expect(screen.queryByText("View original input")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Enter lines to deduplicate"), { target: { value: "one\none\ntwo" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    expect(screen.getByText("one\ntwo", { selector: "pre", normalizer: (value) => value })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Sort Lines" }));
    expect(await screen.findByLabelText("Enter lines to sort")).toHaveValue("one\ntwo");
  });

  it("invalidates stale results after input or option changes", async () => {
    renderWorkflow();
    await cleanEnglish();
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "changed" } });
    expect(screen.queryByRole("button", { name: /Continue with this result/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clean text" }));
    fireEvent.click(screen.getByLabelText("Trim each line"));
    expect(screen.queryByLabelText("Cleaned text")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clean text" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with this result: Sort Lines" }));
    await screen.findByLabelText("Enter lines to sort");
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.change(screen.getByLabelText("Sort direction"), { target: { value: "desc" } });
    expect(screen.queryByRole("button", { name: "Continue with this result: Remove Duplicate Lines" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.change(screen.getByLabelText("Enter lines to sort"), { target: { value: "edited" } });
    expect(screen.queryByRole("button", { name: "Download .txt" })).not.toBeInTheDocument();
  });

  it("disables handoff when cleaning produces an empty result", async () => {
    renderWorkflow();
    expect(await screen.findByRole("button", { name: "Clean text" })).toBeDisabled();
    await cleanEnglish("\n\n");
    expect(screen.getByLabelText("Cleaned text")).toHaveValue("");
    for (const button of screen.getAllByRole("button", { name: /Continue with this result/ })) expect(button).toBeDisabled();
    expect(within(screen.getByRole("navigation", { name: "Text workflow steps" })).queryByRole("link", { name: "Sort Lines" })).not.toBeInTheDocument();
  });
});
