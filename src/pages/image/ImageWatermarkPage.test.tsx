import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ImageWatermarkPage } from "./ImageWatermarkPage";

const applyWatermarkMock = vi.fn();

vi.mock("../../services/image/watermarkService", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../services/image/watermarkService")>(),
  applyWatermark: (...args: unknown[]) => applyWatermarkMock(...args),
}));

const context = {
  drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(), fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 120 }), globalAlpha: 1, font: "", fillStyle: "",
  textAlign: "start", textBaseline: "alphabetic",
};

beforeEach(() => {
  applyWatermarkMock.mockReset().mockResolvedValue({
    blob: new Blob(["result"], { type: "image/png" }),
    fileName: "photo-watermarked.png",
    mimeType: "image/png",
    size: 6,
  });
  context.measureText.mockReturnValue({ width: 120 });
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1200, height: 800, close: vi.fn() }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ImageWatermarkPage", () => {
  const sourceInput = (): HTMLElement => screen.getByLabelText(/Drop JPG, PNG, or WebP images.*click to select/i);

  it("enables text watermark processing after a supported image is selected", async () => {
    renderWithProviders(<ImageWatermarkPage />);

    const processButton = screen.getByRole("button", { name: "Apply watermark" });
    expect(processButton).toBeDisabled();
    fireEvent.change(sourceInput(), {
      target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(screen.getByRole("img", { name: "Watermark preview" })).toBeInTheDocument());
    expect(processButton).toBeEnabled();
    expect(screen.getByDisplayValue("© NexaForge")).toBeInTheDocument();
  });

  it("keeps content, appearance, and position settings together in the options panel", async () => {
    renderWithProviders(<ImageWatermarkPage />);
    fireEvent.change(sourceInput(), {
      target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] },
    });

    await screen.findByRole("img", { name: "Watermark preview" });
    const optionsPanel = screen.getByRole("heading", { level: 2, name: "Options" }).closest("section");
    expect(optionsPanel).not.toBeNull();
    const settings = within(optionsPanel as HTMLElement);
    expect(settings.getByRole("heading", { level: 3, name: "Watermark content" })).toBeVisible();
    expect(settings.getByRole("heading", { level: 3, name: "Appearance" })).toBeVisible();
    expect(settings.getByRole("heading", { level: 3, name: "Position" })).toBeVisible();
    expect(settings.getByRole("slider", { name: "Text size" })).toBeVisible();
    expect(settings.getByRole("slider", { name: "Opacity" })).toBeVisible();
    expect(settings.getByRole("slider", { name: "Rotation" })).toBeVisible();
    expect(settings.getByRole("group", { name: "Watermark position" })).toBeVisible();
    const workspacePanel = screen.getByRole("heading", { level: 2, name: "Tool Workspace" }).closest("section");
    expect(within(workspacePanel as HTMLElement).queryByRole("group", { name: "Watermark position" })).not.toBeInTheDocument();
  });

  it("requires a logo before enabling logo watermark processing", async () => {
    renderWithProviders(<ImageWatermarkPage />);
    fireEvent.change(sourceInput(), {
      target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] },
    });

    fireEvent.click(screen.getByRole("radio", { name: "Logo image" }));
    const processButton = screen.getByRole("button", { name: "Apply watermark" });
    expect(processButton).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Select a logo image.");

    fireEvent.change(screen.getByLabelText(/Drop a JPG, PNG, or WebP logo.*click to select/i), {
      target: { files: [new File(["logo"], "logo.webp", { type: "image/webp" })] },
    });

    await waitFor(() => expect(processButton).toBeEnabled());
  });

  it("rejects a source selection containing more than 20 images", () => {
    renderWithProviders(<ImageWatermarkPage />);
    const files = Array.from({ length: 21 }, (_, index) =>
      new File([String(index)], `photo-${index}.png`, { type: "image/png" })
    );

    fireEvent.change(sourceInput(), { target: { files } });

    expect(screen.getByRole("alert")).toHaveTextContent("Select no more than 20 images.");
    expect(screen.getByRole("button", { name: "Apply watermark" })).toBeDisabled();
  });

  it("keeps successful results downloadable when part of a batch fails", async () => {
    applyWatermarkMock
      .mockResolvedValueOnce({
        blob: new Blob(["result"], { type: "image/png" }),
        fileName: "first-watermarked.png",
        mimeType: "image/png",
        size: 6,
      })
      .mockRejectedValueOnce(new Error("Could not decode image"));
    renderWithProviders(<ImageWatermarkPage />);
    fireEvent.change(sourceInput(), {
      target: {
        files: [
          new File(["first"], "first.png", { type: "image/png" }),
          new File(["second"], "second.png", { type: "image/png" }),
        ],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply watermark" }));

    await waitFor(() => expect(screen.getByText("Completed 2/2")).toBeInTheDocument());
    expect(applyWatermarkMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Could not decode image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download first-watermarked\.png/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Download ZIP/i })).toBeEnabled();
  });
});
