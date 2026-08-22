import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../context/LanguageContext";
import { renderWithProviders } from "../../test/renderWithProviders";
import {
  RegexTimeoutError,
  RegexValidationError,
  testRegex,
} from "../../services/regex/regexService";
import { RegexTesterPage } from "./RegexTesterPage";

vi.mock("../../services/regex/regexService", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../services/regex/regexService")
  >();
  return { ...actual, testRegex: vi.fn() };
});

beforeEach(() => {
  vi.mocked(testRegex).mockReset();
});

describe("RegexTesterPage", () => {
  it("submits editable inputs and selected flags, then presents aligned match details", async () => {
    vi.mocked(testRegex).mockResolvedValue({
      matches: [
        {
          value: "alpha-12",
          index: 0,
          groups: ["alpha", "12"],
          namedGroups: { word: "alpha" },
        },
      ],
      truncated: false,
    });
    renderWithProviders(<RegexTesterPage />);

    fireEvent.change(screen.getByLabelText("Pattern"), {
      target: { value: "(?<word>[a-z]+)-(\\d+)" },
    });
    fireEvent.change(screen.getByLabelText("Test text"), {
      target: { value: "alpha-12" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Case insensitive (i)" }));
    fireEvent.click(screen.getByRole("button", { name: "Test regex" }));

    await waitFor(() =>
      expect(testRegex).toHaveBeenCalledWith(
        {
          pattern: "(?<word>[a-z]+)-(\\d+)",
          flags: "gi",
          text: "alpha-12",
          maxMatches: 500,
        },
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          timeoutMs: 750,
        })
      )
    );

    const results = await screen.findByRole("table", { name: "Regex matches" });
    expect(results).toHaveTextContent("alpha-12");
    expect(results).toHaveTextContent("0");
    expect(results).toHaveTextContent("1: alpha");
    expect(results).toHaveTextContent("word: alpha");
    expect(screen.getByRole("status", { name: "Match summary" })).toHaveTextContent(
      "1 match"
    );
  });

  it("shows explicit no-match and truncated-result states", async () => {
    vi.mocked(testRegex)
      .mockResolvedValueOnce({ matches: [], truncated: false })
      .mockResolvedValueOnce({
        matches: [{ value: "a", index: 0, groups: [], namedGroups: {} }],
        truncated: true,
      });
    renderWithProviders(<RegexTesterPage />);

    fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
    expect(await screen.findByText("No matches found.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
    expect(await screen.findByText("Only the first 500 matches are shown.")).toBeInTheDocument();
  });

  it("associates invalid-pattern and timeout errors with the workflow", async () => {
    vi.mocked(testRegex)
      .mockRejectedValueOnce(new RegexValidationError("Unterminated group"))
      .mockRejectedValueOnce(new RegexTimeoutError());
    renderWithProviders(<RegexTesterPage />);

    fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid regular expression: Unterminated group"
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That expression took too long and was stopped."
    );
  });

  it("aborts a previous run before starting a replacement", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(testRegex).mockImplementation((_request, options) => {
      signals.push(options?.signal as AbortSignal);
      return new Promise(() => undefined);
    });
    renderWithProviders(<RegexTesterPage />);

    fireEvent.click(screen.getByRole("button", { name: "Test regex" }));
    fireEvent.click(await screen.findByRole("button", { name: "Testing..." }));

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("provides the primary form labels and flag meanings in Traditional Chinese", () => {
    renderWithProviders(
      <LanguageProvider initialLocale="zh-TW">
        <RegexTesterPage />
      </LanguageProvider>
    );

    expect(screen.getByLabelText("正則表達式")).toBeInTheDocument();
    expect(screen.getByLabelText("測試文字")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "旗標" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "全域搜尋 (g)" })).toBeChecked();
  });
});
