import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CsvToJsonPage } from "./CsvToJsonPage";
import * as csvService from "../../services/csv/csvService";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CsvToJsonPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  it("enables processing only after a CSV is selected", () => {
    const { container } = renderWithProviders(<CsvToJsonPage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["name,age\nA,1"], "sample.csv", { type: "text/csv" })] },
    });
    expect(action).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
  });

  it("disables process button while converting is in progress", async () => {
    const convertSpy = vi
      .spyOn(csvService, "csvToJson")
      .mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithProviders(<CsvToJsonPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    convertSpy.mockRestore();
  });

  it("shows error when conversion fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(csvService, "csvToJson").mockRejectedValue(new Error("convert failed"));

    const { container } = renderWithProviders(<CsvToJsonPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("renders preview after successful conversion", async () => {
    vi.spyOn(csvService, "csvToJson").mockResolvedValue({
      output: "[{\"name\":\"A\",\"age\":\"1\"}]",
      fileName: "sample.json",
      size: 21,
    });

    const { container } = renderWithProviders(<CsvToJsonPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByText("[{\"name\":\"A\",\"age\":\"1\"}]")).toBeInTheDocument();
    });
  });

  it("clears a stale result when a replacement CSV is selected", async () => {
    vi.spyOn(csvService, "csvToJson").mockResolvedValue({
      output: "[{\"name\":\"A\"}]",
      fileName: "sample.json",
      size: 14,
    });
    const { container } = renderWithProviders(<CsvToJsonPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["name\nA"], "first.csv", { type: "text/csv" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument());

    fireEvent.change(input, {
      target: { files: [new File(["name\nB"], "second.csv", { type: "text/csv" })] },
    });

    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process" })).toBeEnabled();
  });
});
