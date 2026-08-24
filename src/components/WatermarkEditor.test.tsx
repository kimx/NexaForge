import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/renderWithProviders";
import type { TextWatermarkOptions } from "../services/image/watermarkService";
import { WatermarkEditor, type WatermarkEditorLabels } from "./WatermarkEditor";

const labels: WatermarkEditorLabels = {
  preview: "Watermark preview",
  loading: "Loading preview",
  error: "Unable to preview image",
  position: "Watermark position",
  horizontal: "Horizontal position",
  vertical: "Vertical position",
  positions: {
    "top-left": "Top left",
    "top-center": "Top center",
    "top-right": "Top right",
    "middle-left": "Middle left",
    center: "Center",
    "middle-right": "Middle right",
    "bottom-left": "Bottom left",
    "bottom-center": "Bottom center",
    "bottom-right": "Bottom right",
  },
};

const options: TextWatermarkOptions = {
  mode: "text",
  text: "NexaForge",
  fontFamily: "Arial, sans-serif",
  color: "#ffffff",
  sizeRatio: 0.08,
  opacity: 0.7,
  rotation: 0,
  position: { x: 0.5, y: 0.5 },
};

const context = {
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 120 }),
  globalAlpha: 1,
  font: "",
  fillStyle: "",
  textAlign: "start",
  textBaseline: "alphabetic",
};

let bitmapClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.values(context).forEach((value) => {
    if (typeof value === "function" && "mockClear" in value) {
      (value as ReturnType<typeof vi.fn>).mockClear();
    }
  });
  context.measureText.mockReturnValue({ width: 120 });
  bitmapClose = vi.fn();
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1200, height: 800, close: bitmapClose }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WatermarkEditor", () => {
  it("exposes nine keyboard buttons and selects a preset position", async () => {
    const onPositionChange = vi.fn();
    renderWithProviders(
      <WatermarkEditor
        source={new File(["photo"], "photo.png", { type: "image/png" })}
        options={options}
        labels={labels}
        onPositionChange={onPositionChange}
      />
    );
    await waitFor(() => expect(screen.queryByText("Loading preview")).not.toBeInTheDocument());
    await waitFor(() => expect(context.fillText).toHaveBeenCalled());

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Center" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Bottom right" }));
    expect(onPositionChange).toHaveBeenCalledWith({ x: 0.94, y: 0.94 });
  });

  it("changes normalized coordinates through labeled range inputs", async () => {
    const onPositionChange = vi.fn();
    renderWithProviders(
      <WatermarkEditor
        source={new File(["photo"], "photo.png", { type: "image/png" })}
        options={options}
        labels={labels}
        onPositionChange={onPositionChange}
      />
    );
    await waitFor(() => expect(screen.queryByText("Loading preview")).not.toBeInTheDocument());
    await waitFor(() => expect(context.fillText).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("slider", { name: "Horizontal position" }), { target: { value: "25" } });
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 0.25, y: 0.5 });
    fireEvent.change(screen.getByRole("slider", { name: "Vertical position" }), { target: { value: "75" } });
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 0.5, y: 0.75 });
  });

  it("renders a scaled Canvas preview and releases its decoded bitmap", async () => {
    const { unmount } = renderWithProviders(
      <WatermarkEditor
        source={new File(["photo"], "photo.png", { type: "image/png" })}
        options={options}
        labels={labels}
        onPositionChange={vi.fn()}
      />
    );

    const canvas = await screen.findByRole("img", { name: "Watermark preview" }) as HTMLCanvasElement;
    await waitFor(() => expect(context.fillText).toHaveBeenCalledWith("NexaForge", 0, 0));
    expect(canvas.width).toBe(960);
    expect(canvas.height).toBe(640);
    unmount();
    expect(bitmapClose).toHaveBeenCalledOnce();
  });

  it("converts pointer coordinates into a normalized watermark position", async () => {
    const onPositionChange = vi.fn();
    renderWithProviders(
      <WatermarkEditor
        source={new File(["photo"], "photo.png", { type: "image/png" })}
        options={options}
        labels={labels}
        onPositionChange={onPositionChange}
      />
    );
    const canvas = await screen.findByRole("img", { name: "Watermark preview" }) as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 100,
      width: 200, height: 100, toJSON: () => ({}),
    });

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 50, clientY: 75 });
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 0.25, y: 0.75 });
  });

  it("decodes and draws the selected logo in image mode", async () => {
    const sourceBitmap = { width: 1000, height: 500, close: vi.fn() } as unknown as ImageBitmap;
    const logoBitmap = { width: 200, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn()
      .mockResolvedValueOnce(sourceBitmap)
      .mockResolvedValueOnce(logoBitmap));
    const logo = new File(["logo"], "logo.png", { type: "image/png" });
    const { unmount } = renderWithProviders(
      <WatermarkEditor
        source={new File(["photo"], "photo.jpg", { type: "image/jpeg" })}
        options={{
          mode: "image",
          logo,
          widthRatio: 0.2,
          opacity: 0.7,
          rotation: 0,
          position: { x: 0.5, y: 0.5 },
        }}
        labels={labels}
        onPositionChange={vi.fn()}
      />
    );

    await waitFor(() => expect(context.drawImage).toHaveBeenCalledWith(logoBitmap, -96, -48, 192, 96));
    unmount();
    expect(sourceBitmap.close).toHaveBeenCalledOnce();
    expect(logoBitmap.close).toHaveBeenCalledOnce();
  });
});
