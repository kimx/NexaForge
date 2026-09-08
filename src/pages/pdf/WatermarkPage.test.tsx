import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { FileProcessResult } from "../../types/tool";
import * as pdfService from "../../services/pdf/pdfService";
import * as watermarkService from "../../services/pdf/watermarkService";
import { WatermarkPage } from "./WatermarkPage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PDF watermark page", () => {
  it("shows watermark settings after selecting a PDF", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(3);
    renderWithProviders(<WatermarkPage />, { route: "/pdf/watermark" });

    fireEvent.change(screen.getByLabelText(/Drop a PDF file.*click to select/i), {
      target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
    });

    await waitFor(() => expect(screen.getByText("3 pages total")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Text" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Watermark text")).toHaveValue("Confidential");
    expect(screen.getByLabelText("Font size (pt)")).toHaveValue(48);
    expect(screen.getByRole("slider", { name: /Opacity/ })).toHaveValue("35");
    expect(screen.getByLabelText("Watermark position")).toHaveValue("center");
    expect(screen.getByRole("button", { name: "Add Watermark" })).toBeEnabled();
  });

  it("passes text settings, position, and custom page range to the PDF service", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(3);
    const result: FileProcessResult = {
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      fileName: "watermarked.pdf",
      mimeType: "application/pdf",
      size: 9,
    };
    const addWatermarkSpy = vi
      .spyOn(watermarkService, "addWatermarkToPdf")
      .mockResolvedValue(result);
    renderWithProviders(<WatermarkPage />, { route: "/pdf/watermark" });
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText(/Drop a PDF file.*click to select/i), {
      target: { files: [file] },
    });
    await screen.findByText("3 pages total");

    fireEvent.change(screen.getByLabelText("Watermark text"), { target: { value: "Draft" } });
    fireEvent.change(screen.getByLabelText("Font size (pt)"), { target: { value: "24" } });
    fireEvent.change(screen.getByLabelText("Watermark position"), { target: { value: "bottom-right" } });
    fireEvent.click(screen.getByRole("radio", { name: "Custom pages" }));
    fireEvent.change(screen.getByPlaceholderText("For example: 1-5, 8, 10-15"), { target: { value: "1,3" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Watermark" }));

    await waitFor(() => expect(addWatermarkSpy).toHaveBeenCalledWith(file, {
      mode: "text",
      text: "Draft",
      fontSize: 24,
      color: "#222222",
      opacity: 0.35,
      rotation: 0,
      position: "bottom-right",
      pageRanges: "1,3",
    }));
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
  });

  it("requires an image in image mode and forwards PNG settings", async () => {
    vi.spyOn(pdfService, "getPdfPageCount").mockResolvedValue(1);
    const addWatermarkSpy = vi.spyOn(watermarkService, "addWatermarkToPdf").mockResolvedValue({
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      fileName: "watermarked.pdf",
      mimeType: "application/pdf",
      size: 9,
    });
    renderWithProviders(<WatermarkPage />, { route: "/pdf/watermark" });
    fireEvent.change(screen.getByLabelText(/Drop a PDF file.*click to select/i), {
      target: { files: [new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" })] },
    });
    await screen.findByText("1 pages total");

    fireEvent.click(screen.getByRole("tab", { name: "Image" }));
    expect(screen.getByRole("button", { name: "Add Watermark" })).toBeDisabled();
    const image = new File(["png"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Drop a PNG or JPEG image.*click to select/i), {
      target: { files: [image] },
    });
    fireEvent.change(screen.getByRole("slider", { name: /Image scale/ }), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Watermark" }));

    await waitFor(() => expect(addWatermarkSpy).toHaveBeenCalledWith(expect.any(File), {
      mode: "image",
      image,
      scale: 0.4,
      opacity: 0.35,
      rotation: 0,
      position: "center",
      pageRanges: undefined,
    }));
  });
});
