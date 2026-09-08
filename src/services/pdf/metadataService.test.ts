import { PDFDocument } from "pdf-lib";
import { readPdfMetadata, removePdfMetadata } from "./metadataService";

async function createPdfFile(): Promise<File> {
  const document = await PDFDocument.create({ updateMetadata: false });
  const page = document.addPage([600, 400]);
  page.drawText("Keep this page content");
  document.setTitle("Project brief");
  document.setAuthor("NexaForge");
  document.setSubject("Metadata test");
  document.setKeywords(["pdf", "metadata"]);
  document.setCreator("Test creator");
  document.setProducer("Test producer");
  document.setCreationDate(new Date("2024-01-02T03:04:05.000Z"));
  document.setModificationDate(new Date("2024-02-03T04:05:06.000Z"));
  return new File([new Uint8Array(await document.save())], "project.pdf", {
    type: "application/pdf",
  });
}

describe("PDF metadata service", () => {
  it("reads document information dictionary metadata", async () => {
    await expect(readPdfMetadata(await createPdfFile())).resolves.toEqual({
      title: "Project brief",
      author: "NexaForge",
      subject: "Metadata test",
      keywords: "pdf metadata",
      creator: "Test creator",
      producer: "Test producer",
      creationDate: new Date("2024-01-02T03:04:05.000Z"),
      modificationDate: new Date("2024-02-03T04:05:06.000Z"),
    });
  });

  it("removes supported metadata while preserving page content", async () => {
    const source = await createPdfFile();
    const result = await removePdfMetadata(source);
    const clean = await PDFDocument.load(await result.blob.arrayBuffer(), {
      updateMetadata: false,
    });

    expect(result.fileName).toBe("project-no-metadata.pdf");
    expect(clean.getPageCount()).toBe(1);
    expect(clean.getPage(0).getSize()).toEqual({ width: 600, height: 400 });
    expect(await readPdfMetadata(new File([await result.blob.arrayBuffer()], result.fileName, {
      type: result.mimeType,
    }))).toEqual({});
  });

  it("returns an empty metadata object when the document has no information dictionary", async () => {
    const document = await PDFDocument.create({ updateMetadata: false });
    document.addPage();
    const file = new File([new Uint8Array(await document.save())], "empty.pdf", {
      type: "application/pdf",
    });

    await expect(readPdfMetadata(file)).resolves.toEqual({});
  });
});
