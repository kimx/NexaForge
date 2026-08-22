import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import type { BatchItem } from "../services/batch/batchService";
import { BatchFileResults } from "./BatchFileResults";

const successFile = new File(["a"], "a.png", { type: "image/png" });
const errorFile = new File(["b"], "b.png", { type: "image/png" });
const items: BatchItem[] = [
  { file: successFile, status: "success", result: { blob: new Blob(["ok"]), fileName: "a-small.png", mimeType: "image/png", size: 2 } },
  { file: errorFile, status: "error", error: new Error("broken image") },
];

describe("BatchFileResults", () => {
  it("renders ordered success and error outcomes with individual download", () => {
    renderWithProviders(<BatchFileResults items={items} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("a.png");
    expect(rows[0]).toHaveTextContent("Success");
    expect(rows[1]).toHaveTextContent("b.png");
    expect(rows[1]).toHaveTextContent("broken image");
    expect(screen.getByRole("button", { name: "Download a-small.png" })).toBeEnabled();
  });
});
