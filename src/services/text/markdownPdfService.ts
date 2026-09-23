export const MARKDOWN_PDF_FILENAME = "markdown-preview.pdf";

export async function exportMarkdownPreviewToPdf(preview: HTMLElement): Promise<void> {
  const { default: html2pdf } = await import("html2pdf.js");
  const options = {
    margin: [12, 12, 12, 12] as [number, number, number, number],
    filename: MARKDOWN_PDF_FILENAME,
    image: { type: "jpeg" as const, quality: 0.98 },
    enableLinks: true,
    html2canvas: {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
      compressPDF: true,
    },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: ["h1", "h2", "h3", "h4", "h5", "h6", "pre", "blockquote", "table", "tr", "li"],
    },
  };

  preview.classList.add("markdown-preview--pdf-export");
  try {
    await html2pdf().set(options).from(preview).save();
  } finally {
    preview.classList.remove("markdown-preview--pdf-export");
  }
}
