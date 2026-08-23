import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { getSeoLandingContent } from "../seo/landingPages";
import { SeoLandingContent } from "./SeoLandingContent";

describe("SeoLandingContent", () => {
  it("renders useful semantic content and locale-preserving related links", () => {
    const content = getSeoLandingContent("/image/jpg-to-webp", "en");
    if (!content) {
      throw new Error("Expected the JPG to WebP landing content fixture.");
    }

    renderWithProviders(
      <SeoLandingContent content={content} locale="en" />,
      { route: "/en/image/jpg-to-webp" }
    );

    expect(screen.getByText(/Start immediately without creating an account/)).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Why convert JPG to WebP" })
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "How to use this tool" })
    ).toBeVisible();
    expect(screen.getByText(/Your input is processed locally by the browser/)).toBeVisible();
    expect(screen.getByText("No. The tool creates a separate WebP file and leaves the original JPG on your device unchanged.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PNG to WebP" })).toHaveAttribute(
      "href",
      "/en/image/png-to-webp"
    );
  });
});
