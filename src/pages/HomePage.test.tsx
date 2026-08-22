import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { HomePage } from "./HomePage";

describe("HomePage task-first hierarchy", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
    window.localStorage.setItem("nexaforge-recent-tools", JSON.stringify(["uuid", "json-diff"]));
  });

  afterEach(() => {
    window.localStorage.removeItem("nexaforge-recent-tools");
  });

  it("makes tool search the primary hero action and keeps JSON as a secondary workflow", () => {
    renderWithProviders(<HomePage />);

    const search = screen.getByRole("textbox", { name: "Search Tools" });
    expect(search.closest(".home-hero")).toBeInTheDocument();

    const featuredSection = screen.getByTestId("featured-tools");
    const jsonSection = screen.getByTestId("json-workflows");
    expect(featuredSection.compareDocumentPosition(jsonSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: /all json tools/i })).toHaveAttribute(
      "href",
      "/en/json"
    );
  });

  it("shows a concise featured collection instead of every tool by default", () => {
    renderWithProviders(<HomePage />);

    const featured = screen.getByTestId("featured-tools");
    expect(within(featured).getAllByRole("article")).toHaveLength(8);
    expect(within(featured).queryByRole("heading", { name: "SVG Optimizer" })).not.toBeInTheDocument();
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

  it("reports privacy-safe search usage without the typed query", () => {
    vi.useFakeTimers();
    const events: CustomEvent[] = [];
    const listener = (event: Event) => {
      if (event instanceof CustomEvent) events.push(event);
    };
    window.addEventListener("browser-file-tools:event", listener);

    renderWithProviders(<HomePage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), {
      target: { value: "private client filename" },
    });
    act(() => vi.advanceTimersByTime(500));

    window.removeEventListener("browser-file-tools:event", listener);
    vi.useRealTimers();
    const searchEvent = events.find((event) => event.detail.name === "tool_search");
    expect(searchEvent?.detail.payload).toEqual({
      category: "All",
      queryLength: 23,
      resultCount: 0,
    });
    expect(JSON.stringify(searchEvent?.detail)).not.toContain("private client filename");
  });
});
