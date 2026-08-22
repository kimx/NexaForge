import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";

const ROUTE_HEADINGS: Record<string, string> = {
  "/": "NexaForge",
  "/json": "JSON Workspace",
  "/image/resize": "Image Resize",
  "/image/crop": "Image Crop",
  "/image/convert": "Image Converter",
  "/image/compress": "Image Compress",
  "/image/exif-viewer": "EXIF Viewer",
  "/image/remove-exif": "Remove EXIF",
  "/pdf/merge": "PDF Merge",
  "/pdf/split": "PDF Split",
  "/pdf/rotate": "PDF Rotate",
  "/data/json-formatter": "JSON Formatter",
  "/data/csv-viewer": "CSV Viewer",
  "/data/csv-to-json": "CSV to JSON",
  "/data/json-to-csv": "JSON to CSV",
  "/developer/base64": "Base64",
  "/text/hash": "Hash Generator",
  "/text/uuid": "UUID Generator",
  "/text/word-counter": "Word Counter",
  "/text/case-converter": "Case Converter",
  "/text/remove-duplicate-lines": "Remove Duplicate Lines",
  "/text/sort-lines": "Sort Lines",
  "/text/markdown": "Markdown Preview",
  "/qr-code": "QR Code",
};

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
    writable: true,
  });
});

function setNarrowViewport(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 900px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("App routes", () => {
  it("announces route loading while a lazy page module is pending", () => {
    render(
      <MemoryRouter
        initialEntries={["/en/developer/jwt-key"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading workspace");
  });

  it.each(Object.entries(ROUTE_HEADINGS))("renders %s and updates page metadata", async (path, heading) => {
    const localizedPath = path === "/" ? "/en" : `/en${path}`;
    render(
      <MemoryRouter
        initialEntries={[localizedPath]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findAllByRole(
        "heading",
        { name: heading, level: 1 },
        { timeout: 12_000 }
      )
    ).toHaveLength(1);
    expect(document.querySelector(".page-landing")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("link", { name: /skip to main content|跳至主要內容/i })).toHaveAttribute(
      "href",
      "#main-content"
    );
    await waitFor(() => {
      expect(document.title).toContain(heading);
    });
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute("content", expect.stringContaining(heading));
    expect(document.querySelector('script[data-nexaforge-seo]')).toHaveTextContent(heading);

    expect(document.querySelector("link[rel='canonical']")).toBeTruthy();
  }, 15_000);

  it("opens mobile tool navigation as a modal and returns focus when closed", async () => {
    setNarrowViewport(true);
    render(
      <MemoryRouter
        initialEntries={["/en/data/json-formatter"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    const opener = screen.getByRole("button", { name: /open tools|開啟工具/i });
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: /tools navigation|工具導覽/i });
    const close = within(dialog).getByRole("button", { name: /close tools|關閉工具/i });
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: /tools navigation|工具導覽/i })).not.toBeInTheDocument();
  });

  it("renders English-prefixed routes and localizes internal navigation", async () => {
    render(
      <MemoryRouter
        initialEntries={["/en/data/json-formatter"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "JSON Formatter" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "JSON Diff" })).toHaveAttribute(
      "href",
      "/en/developer/json-diff"
    );

    fireEvent.click(screen.getByRole("button", { name: "繁中" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "JSON 格式化" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "JSON Diff" })).toHaveAttribute(
      "href",
      "/developer/json-diff"
    );
  });


  it("redirects the legacy base64 route to the developer route", async () => {
    render(
      <MemoryRouter
        initialEntries={["/en/text/base64"]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect((await screen.findAllByRole("heading", { name: "Base64", level: 1 })).length).toBeGreaterThan(0);
    await waitFor(() => {
      const canonical = document.querySelector("link[rel='canonical']");
      expect(canonical).toHaveAttribute("href", "https://nexaforge.kimx.info/en/developer/base64");
    });
  });

  it("renders a noindex not-found page for unknown client routes", async () => {
    render(
      <MemoryRouter
        initialEntries={["/en/invalid"]}
        initialIndex={0}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/en");
    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex,nofollow"
      );
    });
  });
});
