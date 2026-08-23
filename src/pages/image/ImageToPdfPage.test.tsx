import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import * as conversionService from "../../services/pdf/conversionService";
import { ImageToPdfPage } from "./ImageToPdfPage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ImageToPdfPage", () => {
  it("keeps the visible image order as the PDF page order", async () => {
    const createSpy = vi.spyOn(conversionService, "createPdfFromImages").mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "images.pdf",
      mimeType: "application/pdf",
      size: 3,
    });
    const first = new File(["one"], "first.png", { type: "image/png" });
    const second = new File(["two"], "second.png", { type: "image/png" });
    const { container } = renderWithProviders(<ImageToPdfPage />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [first, second] },
    });

    expect(screen.getByText("1. first.png")).toBeInTheDocument();
    expect(screen.getByText("2. second.png")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move first.png down" }));
    expect(screen.getByText("1. second.png")).toBeInTheDocument();
    expect(screen.getByText("2. first.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create PDF" }));
    await waitFor(() => expect(createSpy).toHaveBeenCalledWith([second, first]));
    expect(await screen.findByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("announces an unsupported file once and keeps PDF creation disabled", () => {
    const { container } = renderWithProviders(<ImageToPdfPage />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(["notes"], "notes.txt", { type: "text/plain" })] },
    });

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Create PDF" })).toBeDisabled();
  });

  it("locks source and ordering controls while PDF creation is pending", async () => {
    vi.spyOn(conversionService, "createPdfFromImages").mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithProviders(<ImageToPdfPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [
        new File(["one"], "first.png", { type: "image/png" }),
        new File(["two"], "second.png", { type: "image/png" }),
      ] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create PDF" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled());
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move first.png down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove first.png" })).toBeDisabled();
  });
});
