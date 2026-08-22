import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../context/LanguageContext";
import { SizeComparison } from "./SizeComparison";

describe("SizeComparison", () => {
  it("shows original, output, and saved sizes", () => {
    render(
      <LanguageProvider initialLocale="en">
        <SizeComparison originalSize={2048} outputSize={1024} />
      </LanguageProvider>
    );

    expect(screen.getByLabelText("File size comparison")).toBeInTheDocument();
    expect(screen.getByText("2.00 KB")).toBeInTheDocument();
    expect(screen.getByText("1.00 KB")).toBeInTheDocument();
    expect(screen.getByText(/Saved 1.00 KB/)).toBeInTheDocument();
  });
});
