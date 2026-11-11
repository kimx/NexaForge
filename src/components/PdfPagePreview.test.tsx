import { act, render, screen, waitFor } from "@testing-library/react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { vi } from "vitest";
import { PdfPagePreview } from "./PdfPagePreview";

const copy = { label: "Page 1 / 3", loadingText: "Loading preview", errorText: "Preview unavailable", loadError: false };
const documentWith = (getPage: ReturnType<typeof vi.fn>): Pick<PDFDocumentProxy, "getPage"> => ({ getPage }) as unknown as Pick<PDFDocumentProxy, "getPage">;
function pageWith(render: ReturnType<typeof vi.fn>, width = 600, height = 800) {
  return { getViewport: ({ scale }: { scale: number }) => ({ width: width * scale, height: height * scale }), render };
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("renders a sharp, proportional page and requests only the new page on navigation", async () => {
  const draw = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const getPage = vi.fn().mockResolvedValue(pageWith(draw));
  const doc = documentWith(getPage);
  const { container, rerender } = render(<PdfPagePreview {...copy} document={doc} page={1} />);
  await screen.findByRole("img", { name: copy.label });
  const canvas = container.querySelector("canvas")!;
  expect([canvas.width, canvas.height]).toEqual([1200, 1600]);
  expect(canvas.style.width).toBe("100%");
  rerender(<PdfPagePreview {...copy} label="Page 3 / 3" document={doc} page={3} />);
  await screen.findByRole("img", { name: "Page 3 / 3" });
  expect(getPage.mock.calls).toEqual([[1], [3]]);
});

it("cancels obsolete renders and never displays a late previous page", async () => {
  let finishFirst!: () => void;
  const pending = new Promise<void>((resolve) => { finishFirst = resolve; });
  const cancel = vi.fn();
  const firstDraw = vi.fn(() => ({ promise: pending, cancel }));
  const secondDraw = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const doc = documentWith(vi.fn().mockResolvedValueOnce(pageWith(firstDraw)).mockResolvedValueOnce(pageWith(secondDraw, 800, 600)));
  const { container, rerender, unmount } = render(<PdfPagePreview {...copy} document={doc} page={1} />);
  await waitFor(() => expect(firstDraw).toHaveBeenCalled());
  rerender(<PdfPagePreview {...copy} label="Page 2 / 3" document={doc} page={2} />);
  await screen.findByRole("img", { name: "Page 2 / 3" });
  expect(cancel).toHaveBeenCalledOnce();
  const secondCanvas = container.querySelector("canvas");
  await act(async () => { finishFirst(); await pending; });
  expect(container.querySelector("canvas")).toBe(secondCanvas);
  unmount();
});

it("resizes without cropping the page and bounds the canvas for very long pages", async () => {
  let resize!: () => void;
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect() {}
  });
  const draw = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const doc = documentWith(vi.fn().mockResolvedValue(pageWith(draw, 600, 30000)));
  const { container } = render(<PdfPagePreview {...copy} document={doc} page={1} />);
  await screen.findByRole("img");
  let canvas = container.querySelector("canvas")!;
  expect(canvas.height).toBeLessThanOrEqual(16000);
  expect(canvas.width / canvas.height).toBeCloseTo(600 / 30000, 2);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
  act(() => resize());
  await waitFor(() => expect(draw).toHaveBeenCalledTimes(2));
  await screen.findByRole("img");
  canvas = container.querySelector("canvas")!;
  expect(canvas.style.height).toBe("auto");
});

it("shows rendering and loading errors instead of leaving a blank preview", async () => {
  const { rerender } = render(<PdfPagePreview {...copy} document={documentWith(vi.fn().mockRejectedValue(new Error("broken page")))} page={1} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errorText);
  rerender(<PdfPagePreview {...copy} document={null} page={1} loadError />);
  expect(screen.getByRole("alert")).toHaveTextContent(copy.errorText);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
