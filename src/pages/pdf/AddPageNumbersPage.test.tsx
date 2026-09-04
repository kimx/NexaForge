import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AddPageNumbersPage } from "./AddPageNumbersPage";
import * as pageNumberService from "../../services/pdf/pageNumberService";
import * as pdfService from "../../services/pdf/pdfService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AddPageNumbersPage", () => {
  it("shows the page count and required settings after selecting a PDF", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(3);

    const { container } = renderWithProviders(<AddPageNumbersPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
    });

    await waitFor(() => expect(screen.getByText("3 pages total")).toBeInTheDocument());
    expect(screen.getByLabelText("Page number position")).toBeInTheDocument();
    expect(screen.getByLabelText("Starting number")).toHaveValue(1);
    expect(screen.getByText("All pages")).toBeInTheDocument();
    expect(screen.getByText("Custom range")).toBeInTheDocument();
    expect(screen.getByLabelText("Font size")).toHaveValue(12);
    expect(screen.getByLabelText("Margin (pt)")).toHaveValue(24);
  });

  it("passes selected options to the browser-only PDF service", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(3);
    const result: FileProcessResult = {
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      fileName: "numbered.pdf",
      mimeType: "application/pdf",
      size: 9,
    };
    const addPageNumbersSpy = vi
      .spyOn(pageNumberService, "addPageNumbersToPdf")
      .mockResolvedValue(result);

    const { container } = renderWithProviders(<AddPageNumbersPage />);
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByText("3 pages total")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Page number position"), {
      target: { value: "top-right" },
    });
    fireEvent.change(screen.getByLabelText("Starting number"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("radio", { name: "Custom range" }));
    fireEvent.change(screen.getByPlaceholderText("For example: 1-5, 8, 10-15"), {
      target: { value: "1,3" },
    });
    fireEvent.change(screen.getByLabelText("Number format"), {
      target: { value: "Page {n} of {total}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Page Numbers" }));

    await waitFor(() => expect(addPageNumbersSpy).toHaveBeenCalledWith(file, {
      position: "top-right",
      startingNumber: 0,
      pageRanges: "1,3",
      format: "Page {n} of {total}",
      fontSize: 12,
      color: "#222222",
      margin: 24,
    }));
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
  });
});
