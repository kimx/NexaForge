import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../context/LanguageContext";
import { ProcessingStatus } from "./ProcessingStatus";

describe("ProcessingStatus", () => {
  it("exposes determinate processing progress", () => {
    render(
      <LanguageProvider initialLocale="en">
        <ProcessingStatus state="processing" progress={42} />
      </LanguageProvider>
    );

    expect(screen.getByRole("progressbar")).toHaveValue(42);
    expect(screen.getByRole("status")).toHaveTextContent("Processing");
  });
});
