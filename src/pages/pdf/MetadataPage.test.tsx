import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { MetadataPage } from "./MetadataPage";
import * as metadataService from "../../services/pdf/metadataService";
import type { FileProcessResult } from "../../types/tool";
import { renderWithProviders } from "../../test/renderWithProviders";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MetadataPage", () => {
  it("reads and displays common metadata after a PDF is selected", async () => {
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    vi.spyOn(metadataService, "readPdfMetadata").mockResolvedValue({
      title: "Project brief",
      author: "NexaForge",
      creationDate: new Date("2024-01-02T03:04:05.000Z"),
    });

    const { container } = renderWithProviders(<MetadataPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });

    expect(await screen.findByText("Project brief")).toBeInTheDocument();
    expect(screen.getByText("NexaForge")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove PDF metadata" })).toBeEnabled();
  });

  it("shows the required empty state when no supported metadata is present", async () => {
    vi.spyOn(metadataService, "readPdfMetadata").mockResolvedValue({});
    const { container } = renderWithProviders(<MetadataPage />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["%PDF-1.4"], "empty.pdf", { type: "application/pdf" })] },
    });

    expect(await screen.findByText("No document metadata found.")).toBeInTheDocument();
  });

  it("creates a clean PDF only after the remove action", async () => {
    const file = new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
    vi.spyOn(metadataService, "readPdfMetadata").mockResolvedValue({ title: "Project brief" });
    const result: FileProcessResult = {
      blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      fileName: "sample-no-metadata.pdf",
      mimeType: "application/pdf",
      size: 9,
    };
    const removeSpy = vi.spyOn(metadataService, "removePdfMetadata").mockResolvedValue(result);

    const { container } = renderWithProviders(<MetadataPage />);
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    await screen.findByText("Project brief");

    fireEvent.click(screen.getByRole("button", { name: "Remove PDF metadata" }));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith(file));
    expect(await screen.findByRole("button", { name: "Download clean PDF" })).toBeInTheDocument();
  });
});
