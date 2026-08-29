import { screen } from "@testing-library/react";
import { JSON_TOOLS } from "../../utils/toolPaths";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JsonHubPage } from "./JsonHubPage";

describe("JsonHubPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  it("registers every JSON workflow in the approved task order", () => {
    expect(JSON_TOOLS.map((tool) => tool.id)).toEqual([
      "json-formatter",
      "json-diff",
      "json-yaml",
      "json-to-csv",
      "csv-to-json",
    ]);
  });

  it("renders a crawlable, privacy-forward JSON workspace", () => {
    renderWithProviders(<JsonHubPage />, { route: "/json" });

    expect(screen.getByRole("heading", { level: 1, name: "JSON Workspace" })).toBeInTheDocument();
    expect(screen.getByText(/processed locally/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /json formatter/i })).toHaveAttribute(
      "href",
      "/en/data/json-formatter"
    );
    expect(screen.getByRole("link", { name: /json diff/i })).toHaveAttribute(
      "href",
      "/en/data/json-diff"
    );
    expect(screen.getAllByRole("link")).toHaveLength(JSON_TOOLS.length);
  });
});
