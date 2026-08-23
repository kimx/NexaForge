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

  it("makes tool search the primary hero action without repeating a JSON-only product story", () => {
    renderWithProviders(<HomePage />);

    const search = screen.getByRole("textbox", { name: "Search Tools" });
    expect(search.closest(".home-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("json-workflows")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /all json tools/i })).not.toBeInTheDocument();
  });

  it("keeps one consolidated introduction in the hero without a redundant workspace heading", () => {
    renderWithProviders(<HomePage />);

    const introduction = screen.getByText(
      "Fast, free, and easy to use. Resize, convert, format, and split in one place—from images to PDF, find a tool and get started."
    );
    expect(introduction.closest(".home-hero")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "All-in-One File Tools" })).not.toBeInTheDocument();
    expect(screen.queryByText("TOOL WORKSPACE")).not.toBeInTheDocument();
  });

  it("shows a concise featured collection instead of every tool by default", () => {
    renderWithProviders(<HomePage />);

    const featured = screen.getByTestId("featured-tools");
    expect(within(featured).getByRole("heading", { level: 2, name: "Popular Tools" })).toBeVisible();
    expect(within(featured).getAllByRole("article")).toHaveLength(8);
    expect(within(featured).queryByRole("heading", { name: "SVG Optimizer" })).not.toBeInTheDocument();
  });

  it("gives every tool card a unique action name under a level-three heading", () => {
    renderWithProviders(<HomePage />);

    const featured = screen.getByTestId("featured-tools");
    const imageResizeHeading = within(featured).getByRole("heading", { level: 3, name: "Image Resize" });
    const imageResizeCard = imageResizeHeading.closest("article");

    if (!imageResizeCard) {
      throw new Error("Expected Image Resize heading to belong to a tool card.");
    }

    expect(within(imageResizeCard).getByRole("link", { name: "Open Image Resize" })).toHaveAttribute(
      "href",
      "/en/image/resize"
    );
  });

  it("keeps the homepage focused on recent and featured tools without a repeated category grid", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("heading", { level: 2, name: "Recent Tools" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Popular Tools" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2, name: "Browse by Category" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-browser")).not.toBeInTheDocument();
  });

  it("caps recent tools at four and removes them from the featured collection", () => {
    window.localStorage.setItem(
      "nexaforge-recent-tools",
      JSON.stringify(["image-resize", "pdf-merge", "uuid", "json-diff", "base64", "csv-viewer"])
    );

    renderWithProviders(<HomePage />);

    const recent = screen.getByTestId("recent-tools");
    const featured = screen.getByTestId("featured-tools");
    expect(within(recent).getAllByRole("article")).toHaveLength(4);
    expect(within(featured).queryByRole("heading", { name: "Image Resize" })).not.toBeInTheDocument();
    expect(within(featured).queryByRole("heading", { name: "PDF Merge" })).not.toBeInTheDocument();
  });

  it("offers QR and barcode discovery in the single category filter row", () => {
    renderWithProviders(<HomePage />);

    const qrCategoryButtons = screen.getAllByRole("button", { name: /QR & Barcode/i });
    expect(qrCategoryButtons).toHaveLength(1);

    fireEvent.click(qrCategoryButtons[0]);
    expect(screen.getByRole("heading", { name: "QR Code" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Image Resize" })).not.toBeInTheDocument();
  });

  it("ranks the closest task match ahead of broad keyword matches", () => {
    renderWithProviders(<HomePage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), {
      target: { value: "base64" },
    });

    expect(screen.getByRole("heading", { name: "Search results" })).toBeVisible();
    const firstCard = screen.getAllByRole("article")[0];
    expect(within(firstCard).getByRole("heading", { name: "Base64" })).toBeVisible();
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

  it("compresses supporting homepage content while a keyword search is active", () => {
    renderWithProviders(<HomePage />);
    const search = screen.getByRole("textbox", { name: "Search Tools" });

    fireEvent.change(search, { target: { value: "json" } });

    expect(screen.getByRole("heading", { name: "NexaForge", level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/Resize, convert, format, and split/i)).not.toBeInTheDocument();
    expect(screen.queryByText("All-in-One File Tools")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("How NexaForge works")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Search results" })).toBeInTheDocument();
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
