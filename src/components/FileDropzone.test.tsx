import { fireEvent, render, screen } from "@testing-library/react";
import { FileDropzone } from "./FileDropzone";
import { LanguageProvider } from "../context/LanguageContext";

describe("FileDropzone", () => {
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
    expect(screen.getByRole("alert")).toHaveTextContent("data.txt: invalid mime");
  });
});
