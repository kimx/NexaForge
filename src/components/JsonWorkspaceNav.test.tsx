import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { JSON_TOOLS } from "../utils/toolPaths";
import { JsonWorkspaceNav } from "./JsonWorkspaceNav";

describe("JsonWorkspaceNav", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
  });

  it("links every JSON workflow and marks the current tool", () => {
    renderWithProviders(<JsonWorkspaceNav />, { route: "/data/json-diff" });

    const nav = screen.getByRole("navigation", { name: "JSON workspace" });
    const links = Array.from(nav.querySelectorAll("a"));
    expect(links).toHaveLength(JSON_TOOLS.length);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      JSON_TOOLS.map((tool) => `/en${tool.path}`)
    );
    expect(screen.getByRole("link", { name: "JSON Diff" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("does not render outside a JSON workflow", () => {
    renderWithProviders(<JsonWorkspaceNav />, { route: "/image/resize" });

    expect(
      screen.queryByRole("navigation", { name: "JSON workspace" })
    ).not.toBeInTheDocument();
  });
});
