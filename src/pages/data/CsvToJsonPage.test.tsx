import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { CsvToJsonPage } from "./CsvToJsonPage";
import * as csvService from "../../services/csv/csvService";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithRouter(ui: ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );
}

describe("CsvToJsonPage", () => {
  it("disables process button while converting is in progress", async () => {
    const convertSpy = vi
      .spyOn(csvService, "csvToJson")
      .mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithRouter(<CsvToJsonPage />);
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

    const { container } = renderWithRouter(<CsvToJsonPage />);
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

    const { container } = renderWithRouter(<CsvToJsonPage />);
    const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement;
    const file = new File(["name,age\\nA,1"], "sample.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(screen.getByText("[{\"name\":\"A\",\"age\":\"1\"}]")).toBeInTheDocument();
    });
  });
});
