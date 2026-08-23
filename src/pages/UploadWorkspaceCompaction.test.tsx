import type { ReactElement } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { CsvToJsonPage } from "./data/CsvToJsonPage";
import { CsvViewerPage } from "./data/CsvViewerPage";
import { JsonFormatterPage } from "./data/JsonFormatterPage";
import { JsonToCsvPage } from "./data/JsonToCsvPage";
import { ImageCompressPage } from "./image/CompressPage";
import { ImageConvertPage } from "./image/ConvertPage";
import { ExifPage } from "./image/ExifPage";
import { FaviconGeneratorPage } from "./image/FaviconGeneratorPage";
import { HeicConverterPage } from "./image/HeicConverterPage";
import { ImageBase64Page } from "./image/ImageBase64Page";
import { ImageResizePage } from "./image/ResizePage";
import { SocialResizerPage } from "./image/SocialResizerPage";
import { PdfMergePage } from "./pdf/MergePage";
import { PdfRotatePage } from "./pdf/RotatePage";
import { PdfSplitPage } from "./pdf/SplitPage";
import { QrReaderPage } from "./qr/QrReaderPage";
import { Base64Page } from "./text/Base64Page";
import { HashPage } from "./text/HashPage";

interface UploadCase {
  name: string;
  page: ReactElement;
  files: File[];
  multiple?: boolean;
  prepare?: () => void;
}

const image = () => new File(["image"], "sample.png", { type: "image/png" });
const csv = () => new File(["a,b\n1,2"], "sample.csv", { type: "text/csv" });
const json = () => new File(['{"a":1}'], "sample.json", { type: "application/json" });
const pdf = (name = "sample.pdf") => new File(["%PDF-1.4"], name, { type: "application/pdf" });

const cases: UploadCase[] = [
  { name: "CSV to JSON", page: <CsvToJsonPage />, files: [csv()] },
  { name: "CSV Viewer", page: <CsvViewerPage />, files: [csv()] },
  {
    name: "JSON Formatter file mode",
    page: <JsonFormatterPage />,
    files: [json()],
    prepare: () => fireEvent.change(screen.getByRole("combobox", { name: "Input source" }), { target: { value: "file" } }),
  },
  {
    name: "JSON to CSV file mode",
    page: <JsonToCsvPage />,
    files: [json()],
    prepare: () => fireEvent.change(screen.getByRole("combobox", { name: "Input source" }), { target: { value: "file" } }),
  },
  { name: "Image Compress", page: <ImageCompressPage />, files: [image(), image()], multiple: true },
  { name: "Image Convert", page: <ImageConvertPage />, files: [image()] },
  { name: "EXIF Viewer", page: <ExifPage kind="image-exif-viewer" />, files: [new File(["jpeg"], "sample.jpg", { type: "image/jpeg" })] },
  { name: "Favicon Generator", page: <FaviconGeneratorPage />, files: [image()] },
  { name: "HEIC Converter", page: <HeicConverterPage />, files: [new File(["heic"], "sample.heic", { type: "image/heic" })] },
  { name: "Image Base64", page: <ImageBase64Page />, files: [image()] },
  { name: "Image Resize", page: <ImageResizePage />, files: [image(), image()], multiple: true },
  { name: "Social Resizer", page: <SocialResizerPage />, files: [image()] },
  { name: "PDF Merge", page: <PdfMergePage />, files: [pdf("a.pdf"), pdf("b.pdf")], multiple: true },
  { name: "PDF Rotate", page: <PdfRotatePage />, files: [pdf()] },
  { name: "PDF Split", page: <PdfSplitPage />, files: [pdf()] },
  { name: "QR Reader", page: <QrReaderPage />, files: [image()] },
  {
    name: "Base64 file mode",
    page: <Base64Page />,
    files: [new File(["text"], "sample.txt", { type: "text/plain" })],
    prepare: () => fireEvent.change(screen.getByRole("combobox", { name: "Mode" }), { target: { value: "fileToBase64" } }),
  },
  { name: "Hash", page: <HashPage />, files: [new File(["text"], "sample.txt", { type: "text/plain" })] },
];

describe("upload workspace compaction", () => {
  it.each(cases)("uses the selected-file layout in $name", ({ page, files, multiple, prepare }) => {
    const { container } = renderWithProviders(page);
    prepare?.();

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files },
    });

    const actionName = multiple
      ? "Add more files or click to select"
      : "Replace file or click to select";
    expect(screen.getByLabelText(actionName)).toBeInTheDocument();
    expect(screen.queryByText("Drag and drop or click to choose files.")).not.toBeInTheDocument();
  });
});
