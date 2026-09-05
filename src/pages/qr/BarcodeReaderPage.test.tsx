import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as barcodeReaderService from "../../services/qr/barcodeReaderService";
import { BarcodeReaderPage } from "./BarcodeReaderPage";

afterEach(() => vi.restoreAllMocks());

describe("BarcodeReaderPage", () => {
  it("reads an uploaded image, lists decoded values, and copies a value", async () => {
    vi.spyOn(barcodeReaderService, "readBarcodesFromImage").mockResolvedValue([
      { value: "4006381333931", format: "ean_13" },
      { value: "ABC-128", format: "code_128" },
    ]);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    renderWithProviders(<BarcodeReaderPage />);

    const file = new File(["image"], "barcode.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Drop a barcode image here or click to select"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Read barcode" }));

    expect(await screen.findByText("4006381333931")).toBeInTheDocument();
    expect(screen.getByText("ABC-128")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Copy value" })[0]);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("4006381333931"));
    expect(screen.getByText("Barcode value copied.")).toBeInTheDocument();
  });

  it("offers a scan-another action after a successful decode", async () => {
    vi.spyOn(barcodeReaderService, "readBarcodesFromImage").mockResolvedValue([
      { value: "ABC-128", format: "code_128" },
    ]);
    renderWithProviders(<BarcodeReaderPage />);

    const file = new File(["image"], "barcode.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Drop a barcode image here or click to select"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Read barcode" }));
    await screen.findByText("ABC-128");

    fireEvent.click(screen.getByRole("button", { name: "Scan another image" }));
    expect(screen.getByRole("button", { name: "Read barcode" })).toBeDisabled();
  });
});
