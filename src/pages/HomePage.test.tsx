import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { HomePage } from "./HomePage";

describe("HomePage JSON-first hierarchy", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
    window.localStorage.setItem("nexaforge-recent-tools", JSON.stringify(["uuid", "json-diff"]));
  });

  afterEach(() => {
    window.localStorage.removeItem("nexaforge-recent-tools");
  });

  it("starts with JSON and places the JSON workflow group before recent tools", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("link", { name: /format json/i })).toHaveAttribute(
      "href",
      "/en/data/json-formatter"
    );
    const jsonSection = screen.getByTestId("json-workflows");
    const recentSection = screen.getByTestId("recent-tools");
    expect(jsonSection.compareDocumentPosition(recentSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: /all json tools/i })).toHaveAttribute(
      "href",
      "/en/json"
    );
  });

  it("shows one focused result collection while search is active", () => {
    renderWithProviders(<HomePage />);
    const search = screen.getByRole("textbox", { name: "Search Tools" });

    fireEvent.change(search, { target: { value: "not-a-real-tool" } });

    expect(screen.getByText("No matching tools")).toBeInTheDocument();
    expect(screen.queryByTestId("json-workflows")).not.toBeInTheDocument();
    expect(screen.queryByTestId("recent-tools")).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-browser")).not.toBeInTheDocument();
  });

  it("focuses search with slash and clears an active query with Escape", () => {
    renderWithProviders(<HomePage />);
    const search = screen.getByRole("textbox", { name: "Search Tools" });

    fireEvent.keyDown(window, { key: "/" });
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "json" } });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(search).toHaveValue("");
  });
});
