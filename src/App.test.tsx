import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";
import { BASE_INDEXABLE_ROUTES, INDEXABLE_ROUTES } from "./routing/routes";
import { FILE_TOOLS } from "./data/tools";
import { SEO_ALIAS_PAGES } from "./seo/landingPages";

const ROUTE_HEADINGS: Record<string, string> = {
  "/": "NexaForge",
  "/json": "JSON Workspace",
  "/image/resize": "Free Online Image Resizer",
  "/image/crop": "Free Online Image Cropper",
  "/image/convert": "Image Converter",
  "/image/compress": "Image Compress",
  "/image/exif-viewer": "EXIF Viewer",
  "/image/remove-exif": "Remove EXIF",
  "/image/heic-converter": "HEIC → JPG / PNG",
  "/image/base64": "Image → Base64",
  "/image/svg-optimizer": "SVG Optimizer",
  "/image/favicon-generator": "Favicon Generator",
  "/image/social-resizer": "Social Media Image Resizer",
  "/image/to-pdf": "Image to PDF",
  "/pdf/merge": "Free Online PDF Merger",
  "/pdf/split": "Free Online PDF Splitter",
  "/pdf/rotate": "Free Online PDF Rotator",
  "/pdf/to-image": "PDF to Image",
  "/data/json-formatter": "Free Online JSON Formatter",
  "/data/csv-viewer": "CSV Viewer",
  "/data/csv-to-json": "CSV to JSON",
  "/data/json-to-csv": "JSON to CSV",
  "/data/json-xml": "JSON ↔ XML",
  "/data/xml-formatter": "XML Formatter",
  "/developer/base64": "Base64",
  "/developer/json-to-csharp": "JSON → C# Class",
  "/developer/json-to-typescript": "JSON → TypeScript Interface",
  "/developer/regex-tester": "Regex Tester",
  "/developer/sql-formatter": "SQL Formatter",
  "/developer/cron-builder": "Cron Expression Builder",
  "/developer/url-parser": "URL Parser",
  "/developer/curl-to-code": "cURL to Code",
  "/developer/secret-generator": "Password & Key Generator",
  "/text/hash": "Hash Generator",
  "/text/uuid": "Free Online UUID Generator",
  "/text/word-counter": "Word Counter",
  "/text/case-converter": "Case Converter",
  "/text/remove-duplicate-lines": "Remove Duplicate Lines",
  "/text/sort-lines": "Sort Lines",
  "/text/markdown": "Free Online Markdown Preview",
  "/qr-code": "Free Online QR Code Generator",
  "/qr-code/reader": "QR Code Reader",
  "/barcode/generator": "Code128 / EAN-13 Barcode Generator",
  "/qr-code/wifi": "Wi-Fi QR Generator",
  "/qr-code/vcard": "vCard QR Generator",
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
  it.each(SEO_ALIAS_PAGES.map(({ path, content }) => [
    `/en${path}`,
    content.en.h1,
  ] as const))("renders the search-intent route %s as a working tool", async (path, heading) => {
    render(
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: heading },
        { timeout: 5_000 }
      )
    ).toBeVisible();
    await waitFor(() => expect(document.title).toContain(heading));
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://nexaforge.kimx.info${path}`
    );
  });

  it("publishes canonical and English Regex Tester routes for indexing", () => {
    expect(BASE_INDEXABLE_ROUTES).toContain("/developer/regex-tester");
    expect(INDEXABLE_ROUTES).toContain("/en/developer/regex-tester");
  });

  it("publishes every QR and barcode route in both locales", () => {
    const paths = [
      "/qr-code/reader",
      "/barcode/generator",
      "/qr-code/wifi",
      "/qr-code/vcard",
    ];
    paths.forEach((path) => {
      expect(BASE_INDEXABLE_ROUTES).toContain(path);
      expect(INDEXABLE_ROUTES).toContain(`/en${path}`);
    });
  });

  it("publishes every structured data route in both locales", () => {
    const paths = [
      "/developer/json-to-csharp",
      "/developer/json-to-typescript",
      "/data/json-xml",
      "/data/xml-formatter",
    ];
    paths.forEach((path) => {
      expect(BASE_INDEXABLE_ROUTES).toContain(path);
      expect(INDEXABLE_ROUTES).toContain(`/en${path}`);
    });
  });

  it("publishes every advanced image route and advertises batch/AVIF upgrades", () => {
    ["/image/heic-converter", "/image/base64", "/image/svg-optimizer", "/image/favicon-generator", "/image/social-resizer"].forEach((path) => {
      expect(BASE_INDEXABLE_ROUTES).toContain(path);
      expect(INDEXABLE_ROUTES).toContain(`/en${path}`);
    });
    expect(FILE_TOOLS.find((tool) => tool.id === "image-convert")?.description).toContain("AVIF");
    expect(FILE_TOOLS.find((tool) => tool.id === "image-resize")?.description).toMatch(/batch/i);
    expect(FILE_TOOLS.find((tool) => tool.id === "image-compress")?.description).toMatch(/batch/i);
  });

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

  it("places the home-page brand in the header instead of the sidebar", async () => {
    render(
      <MemoryRouter
        initialEntries={["/"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="zh-TW">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "NexaForge", level: 1 });
    expect(screen.queryAllByRole("link", { name: "首頁" })).toHaveLength(0);

    const header = screen.getByRole("banner");
    const sidebar = screen.getByRole("complementary", { name: /工具側欄/i });
    const brandName = /NexaForge Utility File Workspace/i;

    expect(within(header).getByRole("link", { name: brandName })).toHaveAttribute("href", "/");
    expect(within(sidebar).queryByRole("link", { name: brandName })).not.toBeInTheDocument();
  });

  it("publishes SQL Formatter and Cron Builder in both locales", () => {
    ["/developer/sql-formatter", "/developer/cron-builder"].forEach((path) => {
      expect(BASE_INDEXABLE_ROUTES).toContain(path);
      expect(INDEXABLE_ROUTES).toContain(`/en${path}`);
    });
    expect(FILE_TOOLS.find((tool) => tool.id === "sql-formatter")?.aliases).toContain("format sql");
    expect(FILE_TOOLS.find((tool) => tool.id === "cron-builder")?.keywords).toContain("schedule");
  });

  it("publishes URL Parser and cURL to Code in both locales", () => {
    ["/developer/url-parser", "/developer/curl-to-code"].forEach((path) => {
      expect(BASE_INDEXABLE_ROUTES).toContain(path);
      expect(INDEXABLE_ROUTES).toContain(`/en${path}`);
    });
    expect(FILE_TOOLS.find((tool) => tool.id === "url-parser")?.aliases).toContain("parse url");
    expect(FILE_TOOLS.find((tool) => tool.id === "curl-to-code")?.keywords).toContain("powershell");
  });

  it("publishes Secret Generator and upgrades UUID discovery", () => {
    expect(BASE_INDEXABLE_ROUTES).toContain("/developer/secret-generator");
    expect(INDEXABLE_ROUTES).toContain("/en/developer/secret-generator");
    expect(FILE_TOOLS.find((tool) => tool.id === "secret-generator")?.keywords).toContain("api key");
    expect(FILE_TOOLS.find((tool) => tool.id === "uuid")?.aliases).toContain("uuid v7");
    expect(FILE_TOOLS.find((tool) => tool.id === "uuid")?.description).toContain(".NET Guid");
  });

  it("places the tool-page brand in the header instead of the sidebar", async () => {
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

    await screen.findByRole("heading", { name: "Free Online JSON Formatter", level: 1 });

    const header = screen.getByRole("banner");
    const sidebar = screen.getByRole("complementary", { name: /tool sidebar/i });
    const brandName = /NexaForge Utility File Workspace/i;

    expect(within(header).getByRole("link", { name: brandName })).toHaveAttribute("href", "/en");
    expect(within(sidebar).queryByRole("link", { name: brandName })).not.toBeInTheDocument();
  });

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
    expect(screen.getAllByRole("button", { name: /close tools|關閉工具/i })).toHaveLength(1);
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: /tools navigation|工具導覽/i })).not.toBeInTheDocument();
  });

  it("moves focus and scroll to the top when a tool route opens", async () => {
    render(
      <MemoryRouter
        initialEntries={["/en"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LanguageProvider initialLocale="en">
          <App />
        </LanguageProvider>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: "NexaForge", level: 1 });
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Tools" }), {
      target: { value: "PDF Merge" },
    });
    fireEvent.click(await screen.findByRole("link", { name: "Open tool" }));

    await screen.findByRole("heading", { name: "Free Online PDF Merger", level: 1 });
    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
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
      await screen.findByRole("heading", { level: 1, name: "Free Online JSON Formatter" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "JSON Diff" })).toHaveAttribute(
      "href",
      "/en/developer/json-diff"
    );

    fireEvent.click(screen.getByRole("button", { name: "繁中" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "免費線上 JSON 格式化" })
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
