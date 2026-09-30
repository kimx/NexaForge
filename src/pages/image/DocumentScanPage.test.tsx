import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../../context/LanguageContext";
import { DocumentScanPage } from "./DocumentScanPage";
import * as service from "../../services/image/documentScanService";
import type { FileProcessResult } from "../../types/tool";

const result: FileProcessResult = { blob: new Blob(["jpeg"], { type: "image/jpeg" }), fileName: "photo-scanned.jpg", mimeType: "image/jpeg", size: 4, width: 200, height: 300 };

beforeEach(() => {
  let sequence = 0;
  vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => `blob:document-${++sequence}`); static revokeObjectURL = vi.fn(); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(locale: "en" | "zh-TW" = "en") {
  const view = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LanguageProvider initialLocale={locale}><DocumentScanPage /></LanguageProvider></MemoryRouter>);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  const select = (name = "photo.png") => fireEvent.change(input, { target: { files: [new File(["image"], name, { type: "image/png" })] } });
  const load = () => {
    const image = screen.getByRole("img", { name: locale === "en" ? "Document photo" : "文件照片" });
    Object.defineProperties(image, { naturalWidth: { configurable: true, value: 200 }, naturalHeight: { configurable: true, value: 300 } });
    fireEvent.load(image);
  };
  return { ...view, input, select, load };
}

describe("DocumentScanPage", () => {
  it("requires decoded input, blocks crossed geometry, and supports camera capture", () => {
    const view = setup();
    expect(view.input).toHaveAttribute("capture", "environment");
    const savedPhotoInput = view.container.querySelectorAll('input[type="file"]')[1];
    expect(savedPhotoInput).toBeInTheDocument();
    expect(savedPhotoInput).not.toHaveAttribute("capture");
    expect(screen.getByRole("button", { name: "Correct document" })).toBeDisabled();
    view.select(); view.load();
    expect(screen.getByRole("button", { name: "Correct document" })).toBeEnabled();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Top left X (%)" }), { target: { value: "100" } });
    expect(screen.getByRole("button", { name: "Correct document" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/clockwise/);
  });
  it("invalidates the JPEG preview and PDF download when corners or mode change", async () => {
    vi.spyOn(service, "scanDocument").mockResolvedValue(result);
    vi.spyOn(service, "createDocumentPdf").mockResolvedValue({ ...result, fileName: "photo-scanned.pdf", mimeType: "application/pdf" });
    const view = setup(); view.select(); view.load();
    fireEvent.click(screen.getByRole("button", { name: "Correct document" }));
    await screen.findByRole("img", { name: "Corrected document preview" });
    fireEvent.click(screen.getByRole("button", { name: "Create PDF" }));
    await screen.findByRole("button", { name: "Download PDF" });
    fireEvent.change(screen.getByRole("combobox", { name: "Image mode" }), { target: { value: "grayscale" } });
    expect(screen.queryByRole("img", { name: "Corrected document preview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Correct document" }));
    await screen.findByRole("button", { name: "Download JPEG" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Top left corner" }), { key: "ArrowRight" });
    expect(screen.queryByRole("button", { name: "Download JPEG" })).not.toBeInTheDocument();
  });
  it("ignores late processing results after clearing the selected photo", async () => {
    let resolve!: (value: FileProcessResult) => void;
    vi.spyOn(service, "scanDocument").mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = setup(); view.select(); view.load();
    fireEvent.click(screen.getByRole("button", { name: "Correct document" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await act(async () => resolve(result));
    expect(screen.queryByRole("button", { name: "Download JPEG" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correct document" })).toBeDisabled();
  });
  it("localizes actionable decode errors in Traditional Chinese", async () => {
    const view = setup("zh-TW"); view.select();
    fireEvent.error(screen.getByRole("img", { name: "文件照片" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("無法讀取"));
    expect(screen.getByRole("button", { name: "校正文件" })).toBeDisabled();
  });
  it("requires the replacement image to decode before enabling correction", () => {
    const view = setup(); view.select(); view.load();
    expect(screen.getByRole("button", { name: "Correct document" })).toBeEnabled();
    view.select("replacement.png");
    expect(screen.getByRole("button", { name: "Correct document" })).toBeDisabled();
    view.load();
    expect(screen.getByRole("button", { name: "Correct document" })).toBeEnabled();
  });
  it("ignores a late PDF after the selected input is cleared", async () => {
    vi.spyOn(service, "scanDocument").mockResolvedValue(result);
    let resolve!: (value: FileProcessResult) => void;
    vi.spyOn(service, "createDocumentPdf").mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = setup(); view.select(); view.load();
    fireEvent.click(screen.getByRole("button", { name: "Correct document" }));
    await screen.findByRole("button", { name: "Download JPEG" });
    fireEvent.click(screen.getByRole("button", { name: "Create PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await act(async () => resolve({ ...result, fileName: "photo.pdf", mimeType: "application/pdf" }));
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download JPEG" })).not.toBeInTheDocument();
  });
});
