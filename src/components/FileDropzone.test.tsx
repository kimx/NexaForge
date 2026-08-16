import { fireEvent, render, screen } from "@testing-library/react";
import { FileDropzone } from "./FileDropzone";

describe("FileDropzone", () => {
  it("accepts matching files via drop", () => {
    const onFiles = vi.fn();
    const onRejectedFiles = vi.fn();

    render(
      <FileDropzone
        label="Upload CSV"
        accept="text/csv"
        onFiles={onFiles}
        onRejectedFiles={onRejectedFiles}
      />
    );

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

    render(
      <FileDropzone
        label="Upload CSV"
        accept="text/csv"
        onFiles={onFiles}
        onRejectedFiles={onRejectedFiles}
      />
    );

    const dropzone = screen.getByLabelText("File dropzone");
    const textFile = new File(["hello"], "data.txt", { type: "text/plain" });
    const dataTransfer = {
      files: [textFile] as unknown as FileList,
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(onFiles).not.toHaveBeenCalled();
    expect(onRejectedFiles).toHaveBeenCalledWith(["data.txt"]);
  });
});
