import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../context/LanguageContext";
import { DownloadButton } from "./DownloadButton";

describe("download feedback", () => {
  it("shows file details and explains a blocked download instead of throwing", () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const previous = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => { throw new Error("unavailable"); } });
    try {
      render(<LanguageProvider initialLocale="en"><DownloadButton result={{ blob, fileName: "result.txt", mimeType: blob.type, size: blob.size }} /></LanguageProvider>);
      expect(screen.getByText(/result.txt/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Download" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Allow downloads");
    } finally { if (previous) Object.defineProperty(URL, "createObjectURL", previous); else Reflect.deleteProperty(URL, "createObjectURL"); }
  });
});
