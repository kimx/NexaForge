import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CsvViewerPage } from "./CsvViewerPage";
import * as csvService from "../../services/csv/csvService";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CsvViewerPage", () => {
  it("enables processing only after a CSV is selected", () => {
    const { container } = renderWithProviders(<CsvViewerPage />);
    const action = screen.getByRole("button", { name: "Process" });
    expect(action).toBeDisabled();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["name,age\nA,1"], "sample.csv", { type: "text/csv" })] },
    });
    expect(action).toBeEnabled();
  });

  it("disables process button while parsing is in progress", async () => {
    const previewSpy = vi
      .spyOn(csvService, "previewCsv")
      .mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithProviders(<CsvViewerPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      const processingButton = screen.getByRole("button", { name: "Processing..." });
      expect(processingButton).toBeDisabled();
      expect(processingButton).toHaveAttribute("aria-busy", "true");
    });

    previewSpy.mockRestore();
  });

  it("shows error when csv parse fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(csvService, "previewCsv").mockRejectedValue(new Error("parse failed"));

    const { container } = renderWithProviders(<CsvViewerPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to process this file.");
    });

    consoleError.mockRestore();
  });

  it("renders csv preview result", async () => {
    vi.spyOn(csvService, "previewCsv").mockResolvedValue({
      headers: ["name", "age"],
      rows: [["A", "1"], ["B", "2"]],
      totalRows: 2,
    });

    const { container } = renderWithProviders(<CsvViewerPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1\\nB,2"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByText("Rows: 2")).toBeInTheDocument();
      expect(screen.getByText("Columns: 2")).toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
    });
  });
});
