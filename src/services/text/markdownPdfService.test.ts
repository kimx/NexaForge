import { vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import html2pdf from "html2pdf.js";
import { exportMarkdownPreviewToPdf } from "./markdownPdfService";

const set = vi.fn();
const from = vi.fn();
const save = vi.fn();

vi.mock("html2pdf.js", () => ({
  default: vi.fn(() => ({ set, from, save })),
}));

describe("exportMarkdownPreviewToPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    set.mockReturnValue({ from });
    from.mockReturnValue({ save });
    save.mockResolvedValue(undefined);
  });

  it("exports the rendered element as an A4 portrait PDF entirely in the browser", async () => {
    const preview = document.createElement("article");
    preview.innerHTML = "<h1>中文標題</h1><p>Rendered content</p>";

    await exportMarkdownPreviewToPdf(preview);

    expect(html2pdf).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      filename: "markdown-preview.pdf",
      jsPDF: expect.objectContaining({ format: "a4", orientation: "portrait" }),
      pagebreak: expect.objectContaining({ mode: ["css", "legacy"] }),
    }));
    expect(from).toHaveBeenCalledWith(preview);
    expect(save).toHaveBeenCalledOnce();
    expect(preview).not.toHaveClass("markdown-preview--pdf-export");
  });

  it("restores the preview styles when PDF generation fails", async () => {
    const preview = document.createElement("article");
    save.mockRejectedValueOnce(new Error("canvas failed"));

    await expect(exportMarkdownPreviewToPdf(preview)).rejects.toThrow("canvas failed");
    expect(preview).not.toHaveClass("markdown-preview--pdf-export");
  });

  it("uses an html2canvas-compatible background for exported code blocks", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const exportPreRule = styles.match(/\.markdown-preview--pdf-export pre\s*\{([^}]*)\}/)?.[1];

    expect(exportPreRule).toContain("background: #eaf2ff");
    expect(exportPreRule).not.toContain("color-mix(");
  });
});
