import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ImageDeliveryPage } from "./ImageDeliveryPage";
import { DocumentTextPage } from "./DocumentTextPage";
import { PdfDeliveryPage } from "./PdfDeliveryPage";

const services = vi.hoisted(() => ({ resize: vi.fn(), watermark: vi.fn(), zip: vi.fn(), scan: vi.fn(), ocr: vi.fn(), merge: vi.fn(), numbers: vi.fn(), compress: vi.fn() }));
vi.mock("../../services/image/imageService", () => ({ resizeImage: services.resize }));
vi.mock("../../services/image/watermarkService", async original => ({ ...await original<object>(), applyWatermark: services.watermark }));
vi.mock("../../services/file/zipService", () => ({ createZip: services.zip }));
vi.mock("../../services/image/documentScanService", async original => ({ ...await original<object>(), scanDocument: services.scan }));
vi.mock("../../services/workflow/fileWorkflowService", async original => ({ ...await original<object>(), recognizeWorkflowDocument: services.ocr }));
vi.mock("../../services/pdf/pdfService", () => ({ mergePdf: services.merge }));
vi.mock("../../services/pdf/pageNumberService", async original => ({ ...await original<object>(), addPageNumbersToPdf: services.numbers }));
vi.mock("../../services/pdf/compressService", () => ({ compressPdf: services.compress }));
vi.mock("../../components/workflows/WorkflowPreviews", () => ({ ImageStagePreview: ({ result }: any) => <p>Preview: {result.fileName}</p>, PdfStagePreview: ({ result }: any) => <p>Preview: {result.fileName}</p> }));
vi.mock("../../components/DocumentScanEditor", () => ({ DocumentScanEditor: ({ onReady }: any) => <button onClick={onReady}>Photo decoded</button> }));

function output(name: string, type = "image/jpeg", text = name) {
  const blob = new Blob([text], { type }); return { blob, size: blob.size, mimeType: type, fileName: name };
}
function next() { fireEvent.click(screen.getByRole("button", { name: "Continue to next step" })); }
function select(container: HTMLElement, files: File[]) { fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files } }); }

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 600, height: 400, close: vi.fn() })));
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:photo"), revokeObjectURL: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());

it("completes image resize → watermark → ZIP with one file selection, then invalidates downstream outputs", async () => {
  services.resize.mockResolvedValue(output("resized.jpg"));
  services.watermark.mockResolvedValue(output("watermarked.jpg"));
  services.zip.mockResolvedValue(output("images-delivery.zip", "application/zip"));
  const { container } = renderWithProviders(<ImageDeliveryPage />);
  expect(screen.getByRole("button", { name: "Continue to next step" })).toBeDisabled();
  select(container, [new File(["source"], "original.png", { type: "image/png" })]);
  fireEvent.click(screen.getByRole("button", { name: "Resize images" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled()); next();
  fireEvent.change(screen.getByLabelText("Watermark text"), { target: { value: "NexaForge" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply watermark" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(services.watermark.mock.calls[0][0].name).toBe("resized.jpg");
  expect(await services.watermark.mock.calls[0][0].text()).toBe("resized.jpg"); next();
  fireEvent.click(screen.getByRole("button", { name: "Create ZIP" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled()); next();
  expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  expect(services.zip.mock.calls[0][0][0].fileName).toBe("watermarked.jpg");
  fireEvent.click(screen.getByRole("button", { name: "2. Watermark" }));
  fireEvent.change(screen.getByLabelText("Watermark text"), { target: { value: "Updated" } });
  expect(screen.getByRole("button", { name: "Continue to next step" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "4. Download" })).toBeDisabled();
  expect(services.resize).toHaveBeenCalledOnce();
});

it("corrects a photo, recognizes it, lets users edit OCR, then cleans and downloads UTF-8 text", async () => {
  services.scan.mockResolvedValue(output("scan.jpg")); services.ocr.mockResolvedValue({ text: "  wrong  OCR \n", confidence: 90 });
  const { container } = renderWithProviders(<DocumentTextPage />);
  select(container, [new File(["photo"], "document.jpg", { type: "image/jpeg" })]);
  await screen.findByRole("button", { name: "Photo decoded" }); fireEvent.click(screen.getByRole("button", { name: "Photo decoded" }));
  fireEvent.click(screen.getByRole("button", { name: "Correct document" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled()); next();
  fireEvent.click(screen.getByRole("button", { name: "Recognize text" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(services.ocr.mock.calls[0][0].name).toBe("scan.jpg"); next();
  fireEvent.change(screen.getByLabelText("Recognized text (editable)", { selector: "textarea:not([readonly])" }), { target: { value: "  繁體  中文\n\n" } });
  fireEvent.click(screen.getByLabelText("Remove empty lines"));
  fireEvent.click(screen.getByRole("button", { name: "Clean text" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(screen.getByLabelText("Cleaned text")).toHaveValue("繁體 中文"); next();
  expect(screen.getByRole("button", { name: "Download text" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Start over" }));
  expect(screen.getByRole("button", { name: "Correct document" })).toBeDisabled();
  expect(screen.queryByDisplayValue("繁體 中文")).not.toBeInTheDocument();
});

it("orders PDF inputs and chains numbered bytes into compression, keeping the numbered file when no smaller output exists", async () => {
  services.merge.mockResolvedValue(output("merged.pdf", "application/pdf"));
  services.numbers.mockResolvedValue(output("numbered.pdf", "application/pdf"));
  services.compress.mockResolvedValue({ ...output("numbered.pdf", "application/pdf"), originalSize: 500, attemptedSize: 600, status: "original-kept" });
  const { container } = renderWithProviders(<PdfDeliveryPage />);
  select(container, [new File(["A"], "A.pdf", { type: "application/pdf" }), new File(["B"], "B.pdf", { type: "application/pdf" })]);
  fireEvent.click(screen.getByRole("button", { name: "Move up: B.pdf" }));
  fireEvent.click(screen.getByRole("button", { name: "Merge PDFs" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(services.merge.mock.calls[0][0].map((file: File) => file.name)).toEqual(["B.pdf", "A.pdf"]); next();
  fireEvent.change(screen.getByLabelText("Starting page number"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Add page numbers" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(services.numbers.mock.calls[0][1].startingNumber).toBe(7); next();
  fireEvent.change(screen.getByLabelText("Compression mode"), { target: { value: "raster" } });
  expect(screen.getByText(/JPEG compression replaces pages/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Compression mode"), { target: { value: "preserve-text" } });
  fireEvent.click(screen.getByRole("button", { name: "Compress PDF" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(await services.compress.mock.calls[0][0].text()).toBe("numbered.pdf"); next();
  expect(screen.getByText(/Compression did not produce a smaller file/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
});

it("shows recoverable failure and retries without selecting PDF files again", async () => {
  services.merge.mockRejectedValueOnce(new Error("bad pdf")).mockResolvedValueOnce(output("merged.pdf", "application/pdf"));
  const { container } = renderWithProviders(<PdfDeliveryPage />);
  select(container, [new File(["A"], "A.pdf", { type: "application/pdf" })]);
  fireEvent.click(screen.getByRole("button", { name: "Merge PDFs" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Continue to next step" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Merge PDFs" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue to next step" })).toBeEnabled());
  expect(services.merge).toHaveBeenCalledTimes(2);
});
