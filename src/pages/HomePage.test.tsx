import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import { TextWorkflowProvider } from "../context/TextWorkflowContext";
import { FILE_TOOLS } from "../data/tools";
import { renderWithProviders } from "../test/renderWithProviders";
import { HomePage } from "./HomePage";

describe("HomePage task-first hierarchy", () => {
  beforeEach(() => {
    window.localStorage.setItem("nexaforge-locale", "en");
    window.localStorage.setItem("nexaforge-recent-tools", JSON.stringify(["uuid", "json-diff"]));
  });

  afterEach(() => {
    window.localStorage.removeItem("nexaforge-recent-tools");
    window.localStorage.removeItem("nexaforge-pinned-tools");
  });

  it("makes tool search the primary hero action without repeating a JSON-only product story", () => {
    renderWithProviders(<HomePage />);

    const search = screen.getByRole("textbox", { name: "Search Tools" });
    expect(search.closest(".home-hero")).toBeInTheDocument();
    expect(screen.getByText("Free browser-only online tools")).toBeVisible();
    expect(screen.getByText(
      "Process images, PDFs, JSON, and developer tasks directly in your browser. Files stay on your device, with no registration required."
    )).toBeVisible();
    expect(screen.queryByTestId("json-workflows")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /all json tools/i })).not.toBeInTheDocument();
  });

  it("offers task shortcuts below the homepage search", () => {
    renderWithProviders(<HomePage />);
    expect(within(screen.getByTestId("task-entries")).getByRole("link", { name: "Open JSON Formatter" })).toHaveAttribute("href", "/en/data/json-formatter");
    expect(screen.queryByRole("navigation", { name: "Explore main tool groups" })).not.toBeInTheDocument();
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

  it("shows the complete tool list with All selected by default", () => {
    renderWithProviders(<HomePage />);

    const featured = screen.getByTestId("featured-tools");
    expect(within(featured).getByRole("heading", { level: 2, name: "All Tools" })).toBeVisible();
    expect(within(featured).getAllByRole("article")).toHaveLength(FILE_TOOLS.length);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows every registered tool when the All filter is active", () => {
    renderWithProviders(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    const allToolsHeading = screen.getByRole("heading", { level: 2, name: "All Tools" });
    const allTools = allToolsHeading.closest(".workspace-section");
    if (!(allTools instanceof HTMLElement)) {
      throw new Error("Expected All Tools heading to belong to the tool results section.");
    }

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(within(allTools).getAllByRole("article")).toHaveLength(FILE_TOOLS.length);
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

  it("keeps recent tools and the full list without a repeated category grid", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("heading", { level: 2, name: "Recent Tools" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "All Tools" })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2, name: "Browse by Category" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-browser")).not.toBeInTheDocument();
  });

  it("shows pinned and recent shortcuts ahead of the full list", () => {
    window.localStorage.setItem(
      "nexaforge-recent-tools",
      JSON.stringify(["image-resize", "pdf-merge", "uuid", "json-diff"])
    );
    window.localStorage.setItem(
      "nexaforge-pinned-tools",
      JSON.stringify(["image-resize", "image-compress"])
    );

    renderWithProviders(<HomePage />);

    const pinned = screen.getByTestId("pinned-tools");
    const recent = screen.getByTestId("recent-tools");
    const featured = screen.getByTestId("featured-tools");
    expect(within(pinned).getByRole("heading", { name: "Image Resize" })).toBeInTheDocument();
    expect(within(pinned).getByRole("heading", { name: "Image Compress" })).toBeInTheDocument();
    expect(within(recent).queryByRole("heading", { name: "Image Resize" })).not.toBeInTheDocument();
    expect(within(recent).getAllByRole("article")).toHaveLength(3);
    expect(within(featured).getByRole("heading", { name: "Image Resize" })).toBeInTheDocument();
  });

  it("offers QR and barcode discovery in the single category filter row", () => {
    renderWithProviders(<HomePage />);

    const qrCategoryButtons = screen.getAllByRole("button", { name: /QR & Barcode/i });
    expect(qrCategoryButtons).toHaveLength(1);

    fireEvent.click(qrCategoryButtons[0]);
    expect(screen.getByRole("heading", { name: "QR Code" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Image Resize" })).not.toBeInTheDocument();
  });

  it("offers compact task shortcuts to registered tools", () => {
    renderWithProviders(<HomePage />);

    const taskEntries = screen.getByTestId("task-entries");
    expect(within(taskEntries).getByRole("link", { name: "Open Image to PDF" })).toHaveAttribute(
      "href",
      "/en/image/to-pdf"
    );
    expect(within(taskEntries).getByRole("link", { name: "Open JSON Formatter" })).toHaveAttribute(
      "href",
      "/en/data/json-formatter"
    );
    expect(within(taskEntries).getByRole("link", { name: "Open List Cleanup" })).toHaveAttribute(
      "href",
      "/en/text/list-cleanup"
    );
    expect(within(taskEntries).getByRole("link", { name: "Open Image Compress" })).toHaveAttribute(
      "href",
      "/en/image/compress"
    );
  });

  it("labels search matches by category and announces the updated result count", () => {
    renderWithProviders(<HomePage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), {
      target: { value: "compress" },
    });

    const imageCard = screen.getByRole("heading", { name: "Image Compress" }).closest("article");
    expect(imageCard).not.toBeNull();
    expect(within(imageCard as HTMLElement).getByText("Image")).toBeVisible();
    expect(screen.getByRole("status", { name: "Search result count" })).toHaveTextContent(/results?/i);
  });

  it("restores a search and category after returning from a tool without putting the query in the URL", () => {
    function ToolRoute(): JSX.Element {
      const navigate = useNavigate();
      return <button onClick={() => navigate(-1)}>Back to tools</button>;
    }

    render(
      <MemoryRouter initialEntries={["/en"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider initialLocale="en">
          <TextWorkflowProvider>
            <Routes>
              <Route path="/en" element={<HomePage />} />
              <Route path="/en/image/compress" element={<ToolRoute />} />
            </Routes>
          </TextWorkflowProvider>
        </LanguageProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), { target: { value: "compress" } });
    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    fireEvent.click(screen.getByRole("link", { name: "Open Image Compress" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to tools" }));

    expect(screen.getByRole("textbox", { name: "Search Tools" })).toHaveValue("compress");
    expect(screen.getByRole("button", { name: "Image" })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.href).not.toContain("compress");
  });

  it.each([
    ["照片縮小", "Image Resize"],
    ["圖片變小", "Image Resize"],
    ["PDF 合在一起", "PDF Merge"],
    ["名單去重", "Remove Duplicate Lines"],
  ])("finds the %s task phrase", (query, toolTitle) => {
    renderWithProviders(<HomePage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), {
      target: { value: query },
    });

    expect(screen.getByRole("heading", { name: toolTitle })).toBeVisible();
  });

  it("records a task identifier and launch action without input content", () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => {
      if (event instanceof CustomEvent) events.push(event);
    };
    window.addEventListener("browser-file-tools:event", listener);

    renderWithProviders(<HomePage />);
    fireEvent.click(within(screen.getByTestId("task-entries")).getByRole("link", { name: "Open List Cleanup" }));

    window.removeEventListener("browser-file-tools:event", listener);
    const taskEvent = events.find((event) => event.detail.name === "task_launch");
    expect(taskEvent?.detail.payload).toEqual({
      taskId: "list-cleanup",
      tool: "list-cleanup",
      action: "open",
    });
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
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does not clear search or filters when Escape is used outside the search input", () => {
    renderWithProviders(<HomePage />);
    const search = screen.getByRole("textbox", { name: "Search Tools" });
    fireEvent.change(search, { target: { value: "json" } });
    const dataFilter = screen.getByRole("button", { name: "Data" });
    fireEvent.click(dataFilter);
    dataFilter.focus();
    fireEvent.keyDown(dataFilter, { key: "Escape" });

    expect(search).toHaveValue("json");
    expect(dataFilter).toHaveAttribute("aria-pressed", "true");
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
