import { fireEvent, render, screen } from "@testing-library/react";
import { FileDropzone } from "./FileDropzone";
import { LanguageProvider } from "../context/LanguageContext";

describe("FileDropzone", () => {
  it("deduplicates format hints without changing accepted file types", () => {
    const accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
    render(<LanguageProvider initialLocale="en"><FileDropzone label="Drop images" accept={accept} maxSize={1024} onFiles={vi.fn()} /></LanguageProvider>);

    expect(screen.getByText("Supported: JPG, PNG, WEBP")).toBeInTheDocument();
    expect(screen.getByText("Maximum per file: 1.00 KB")).toBeInTheDocument();
    expect(screen.queryByText("Drag and drop or click to choose files.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Drop images or click to select")).toHaveAttribute("accept", accept);
  });

  it("uses the native file input as its only keyboard stop", () => {
    const { container } = render(
      <LanguageProvider initialLocale="en">
        <FileDropzone label="Upload CSV" accept="text/csv" onFiles={vi.fn()} />
      </LanguageProvider>
    );

    const dropzone = screen.getByLabelText(/file dropzone|檔案拖放區/i);
    expect(dropzone).not.toHaveAttribute("tabindex");
    expect(container.querySelectorAll('[tabindex="0"], input[type="file"]')).toHaveLength(1);
  });

  it("accepts matching files via drop", () => {
    const onFiles = vi.fn();
    const onRejectedFiles = vi.fn();

    render(<LanguageProvider initialLocale="en"><FileDropzone
      label="Upload CSV"
      accept="text/csv"
      onFiles={onFiles}
      onRejectedFiles={onRejectedFiles}
    /></LanguageProvider>);

    const dropzone = screen.getByLabelText("File dropzone");
    const csv = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    const dataTransfer = {
      files: [csv] as unknown as FileList,
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(onFiles).toHaveBeenCalledWith([csv]);
    expect(onRejectedFiles).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", () => {
    const onFiles = vi.fn();
    const onRejectedFiles = vi.fn();

    render(<LanguageProvider initialLocale="en"><FileDropzone
      label="Upload CSV"
      accept="text/csv"
      onFiles={onFiles}
      onRejectedFiles={onRejectedFiles}
    /></LanguageProvider>);

    const dropzone = screen.getByLabelText("File dropzone");
    const textFile = new File(["hello"], "data.txt", { type: "text/plain" });
    const dataTransfer = {
      files: [textFile] as unknown as FileList,
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(onFiles).not.toHaveBeenCalled();
    expect(onRejectedFiles).toHaveBeenCalledWith([
      {
        fileName: "data.txt",
        reason: "invalid mime",
        message: "Unsupported file type: text/plain",
      },
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent("data.txt: Unsupported format");
  });

  it("turns a compact single-file dropzone into a replace action", () => {
    render(
      <LanguageProvider initialLocale="en">
        <FileDropzone label="Drop image" compact accept="image/*" onFiles={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByLabelText("Replace file or click to select")).toBeInTheDocument();
    expect(screen.queryByText("Drag and drop or click to choose files.")).not.toBeInTheDocument();
  });

  it("supports phone camera capture and explains the actual size limit", () => {
    const { container } = render(<LanguageProvider initialLocale="en"><FileDropzone label="Select photo" accept="image/jpeg,image/png" capture="environment" maxSize={10} onFiles={vi.fn()} /></LanguageProvider>);
    expect(container.querySelector('input[type="file"]')).toHaveAttribute("capture", "environment");
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["too many bytes"], "photo.jpg", { type: "image/jpeg" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("File exceeds 10 B");
    expect(screen.getByRole("alert")).toHaveTextContent("choose a smaller version");
  });

  it("turns a compact multi-file dropzone into an add-files action", () => {
    render(
      <LanguageProvider initialLocale="en">
        <FileDropzone label="Drop images" compact multiple accept="image/*" onFiles={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByLabelText("Add more files or click to select")).toBeInTheDocument();
  });
});
